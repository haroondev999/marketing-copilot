import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit";

const launchSchema = z.object({
  campaignId: z.string().cuid(),
  channels: z.array(z.enum(["email", "social", "ppc", "sms"])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { campaignId, channels } = launchSchema.parse(body);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id },
    });

    if (!campaign) {
      throw new ApiError("Campaign not found", 404);
    }

    if (campaign.status === "launched") {
      throw new ApiError("Campaign already launched", 400);
    }

    const integrations = await prisma.integration.findMany({
      where: {
        userId: session.user.id,
        status: "connected",
      },
    });

    const channelsToLaunch = channels || campaign.channels;
    const launchResults: any[] = [];
    let successCount = 0;

    for (const channel of channelsToLaunch) {
      const integration = integrations.find(
        (i) =>
          (channel === "email" && i.type === "email") ||
          (channel === "social" && i.type === "social") ||
          (channel === "ppc" && i.type === "ppc") ||
          (channel === "sms" && i.type === "sms"),
      );

      if (!integration) {
        launchResults.push({
          channel,
          status: "failed",
          error: "No integration connected",
        });
        continue;
      }

      try {
        const content = (campaign.content as any)[channel];

        if (!content) {
          throw new Error(`No content generated for ${channel}`);
        }

        if (channel === "email" && integration.name === "Mailchimp") {
          const credentials = integration.credentials as any;

          if (!credentials.apiKey) {
            throw new Error("Mailchimp API key not configured");
          }

          if (!credentials.listId || credentials.listId === "placeholder") {
            throw new Error(
              "Mailchimp list ID not configured. Please update your integration settings.",
            );
          }

          if (!credentials.fromName) {
            throw new Error("Sender name not configured");
          }

          if (
            !credentials.replyTo ||
            credentials.replyTo === "noreply@example.com"
          ) {
            throw new Error("Reply-to email not configured");
          }

          const datacenter = credentials.apiKey.split("-").pop();

          const response = await fetch(
            `https://${datacenter}.api.mailchimp.com/3.0/campaigns`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${credentials.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "regular",
                recipients: {
                  list_id: credentials.listId,
                },
                settings: {
                  subject_line: content.subject,
                  from_name: credentials.fromName,
                  reply_to: credentials.replyTo,
                },
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Mailchimp API error");
          }

          const data = await response.json();
          launchResults.push({
            channel,
            status: "success",
            externalId: data.id,
          });
          successCount++;
        } else {
          launchResults.push({
            channel,
            status: "queued",
            message: "Campaign queued for launch",
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error launching ${channel}:`, {
          error: error instanceof Error ? error.message : "Unknown error",
          channel,
          campaignId,
          timestamp: new Date().toISOString(),
        });
        launchResults.push({
          channel,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (successCount === 0) {
      throw new ApiError("Failed to launch campaign on any channel", 500, {
        launchResults,
      });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status:
          successCount === channelsToLaunch.length
            ? "launched"
            : "partially_launched",
        launchedAt: new Date(),
        metrics: {
          launchResults,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "campaign.launch",
      resource: campaignId,
      metadata: {
        channels: channelsToLaunch,
        successCount,
        totalChannels: channelsToLaunch.length,
      },
      status: "success",
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      launchResults,
      successCount,
      totalChannels: channelsToLaunch.length,
    });
  } catch (error) {
    const session = await getServerSession(authOptions);
    if (session?.user?.id && body?.campaignId) {
      await createAuditLog({
        userId: session.user.id,
        action: "campaign.launch",
        resource: body.campaignId,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        status: "failure",
      });
    }

    return handleApiError(error);
  }
}
