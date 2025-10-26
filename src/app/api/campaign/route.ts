import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PromptParser } from "@/lib/ai/prompt-parser";
import { ContentGenerator } from "@/lib/ai/content-generator";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";
import { aiRateLimit } from "@/lib/rate-limit";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  sanitizeInput,
  sanitizeConversationHistory,
} from "@/lib/input-sanitization";

const campaignRequestSchema = z.object({
  prompt: z.string().min(1),
  conversationHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  conversationId: z.string().optional(),
});

const updateCampaignSchema = z.object({
  campaignId: z.string().cuid(),
  updates: z.object({
    goal: z.string().optional(),
    channels: z.array(z.enum(["email", "social", "ppc", "sms"])).optional(),
    budget: z.number().positive().optional(),
    status: z
      .enum(["draft", "ready", "launched", "completed", "paused"])
      .optional(),
    content: z.record(z.any()).optional(),
    audience: z.record(z.any()).optional(),
    schedule: z.record(z.any()).optional(),
  }),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  return withRateLimit(`campaign:${session.user.id}`, aiRateLimit, async () => {
    try {
      const body = await request.json();
      const { prompt, conversationHistory, conversationId } =
        campaignRequestSchema.parse(body);

      const sanitizedPrompt = sanitizeInput(prompt, { maxLength: 2000 });
      const sanitizedHistory = conversationHistory
        ? sanitizeConversationHistory(conversationHistory)
        : [];

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ApiError("OpenAI API key not configured", 500);
      }

      const parser = new PromptParser(apiKey);
      const generator = new ContentGenerator(apiKey);

      const intent = await parser.parseCampaignIntent(
        sanitizedPrompt,
        sanitizedHistory,
      );

      let conversation;
      if (conversationId) {
        conversation = await prisma.conversation.update({
          where: { id: conversationId, userId: session.user.id },
          data: {
            messages: {
              push: [{ role: "user", content: prompt, timestamp: new Date() }],
            },
            updatedAt: new Date(),
          },
        });
      } else {
        conversation = await prisma.conversation.create({
          data: {
            userId: session.user.id,
            messages: [
              { role: "user", content: prompt, timestamp: new Date() },
            ],
          },
        });
      }

      if (intent.needsClarification) {
        const response = await parser.generateResponse(intent, prompt);

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            messages: {
              push: [
                { role: "assistant", content: response, timestamp: new Date() },
              ],
            },
          },
        });

        return NextResponse.json({
          type: "clarification",
          message: response,
          intent,
          conversationId: conversation.id,
        });
      }

      const brandKit = await prisma.brandKit.findFirst({
        where: { userId: session.user.id, isActive: true },
      });

      const generatedContent: Record<string, any> = {};
      const contentErrors: string[] = [];

      for (const channel of intent.channels) {
        try {
          if (channel === "email") {
            generatedContent.email = await generator.generateEmailContent(
              intent,
              brandKit?.tone,
            );
          } else if (channel === "social") {
            generatedContent.facebook = await generator.generateSocialContent(
              intent,
              "facebook",
              brandKit?.tone,
            );
            generatedContent.instagram = await generator.generateSocialContent(
              intent,
              "instagram",
              brandKit?.tone,
            );
          } else if (channel === "ppc") {
            generatedContent.ppc = await generator.generatePPCContent(
              intent,
              brandKit?.tone,
            );
          } else if (channel === "sms") {
            generatedContent.sms = await generator.generateSMSContent(
              intent,
              brandKit?.tone,
            );
          }
        } catch (error) {
          const errorMsg = `Failed to generate ${channel} content`;
          contentErrors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      if (Object.keys(generatedContent).length === 0) {
        throw new ApiError("Failed to generate content for any channel", 500, {
          errors: contentErrors,
        });
      }

      const campaign = await prisma.campaign.create({
        data: {
          userId: session.user.id,
          goal: intent.goal,
          channels: intent.channels,
          content: generatedContent,
          audience: intent.audienceCriteria,
          budget: intent.budget,
          schedule: intent.schedule || {},
          status: "ready",
        },
      });

      const responseMessage = `✨ Your campaign is ready! I've generated content for ${intent.channels.join(", ")}. Review the preview and let me know if you'd like any changes.`;

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: {
            push: [
              {
                role: "assistant",
                content: responseMessage,
                timestamp: new Date(),
                campaignId: campaign.id,
              },
            ],
          },
          metadata: { currentCampaignId: campaign.id },
        },
      });

      return NextResponse.json({
        type: "campaign",
        intent,
        content: generatedContent,
        campaignId: campaign.id,
        conversationId: conversation.id,
        message: responseMessage,
        ...(contentErrors.length > 0 && { warnings: contentErrors }),
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");

    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId, userId: session.user.id },
      });

      if (!campaign) {
        throw new ApiError("Campaign not found", 404);
      }

      return NextResponse.json(campaign);
    }

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.campaign.count({
        where: { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { campaignId, updates } = updateCampaignSchema.parse(body);

    const campaign = await prisma.campaign.update({
      where: { id: campaignId, userId: session.user.id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");

    if (!campaignId) {
      throw new ApiError("Campaign ID required", 400);
    }

    await prisma.campaign.delete({
      where: { id: campaignId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
