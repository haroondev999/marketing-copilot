import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";

const mailchimpSendSchema = z.object({
  apiKey: z.string().min(1),
  listId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  fromName: z.string().min(1),
  replyTo: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { apiKey, listId, subject, body: emailBody, fromName, replyTo } = mailchimpSendSchema.parse(body);

    if (listId === "placeholder") {
      throw new ApiError("Invalid list ID. Please configure your Mailchimp integration with a valid list ID.", 400);
    }

    if (replyTo === "noreply@example.com") {
      throw new ApiError("Invalid reply-to email. Please configure a valid reply-to address.", 400);
    }

    const datacenter = apiKey.split("-").pop();
    
    if (!datacenter) {
      throw new ApiError("Invalid Mailchimp API key format", 400);
    }

    const response = await fetch(
      `https://${datacenter}.api.mailchimp.com/3.0/campaigns`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "regular",
          recipients: {
            list_id: listId,
          },
          settings: {
            subject_line: subject,
            from_name: fromName,
            reply_to: replyTo,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || "Mailchimp API request failed",
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, campaignId: data.id });
  } catch (error) {
    return handleApiError(error);
  }
}