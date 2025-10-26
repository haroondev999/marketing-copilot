import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentGenerator } from "@/lib/ai/content-generator";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";

const contentRequestSchema = z.object({
  intent: z.object({
    goal: z.string(),
    channels: z.array(z.string()),
    contentSpec: z.object({
      tone: z.string().optional(),
      keyMessage: z.string(),
      callToAction: z.string().optional(),
    }),
    audienceCriteria: z.object({
      demographics: z.string().optional(),
      interests: z.string().optional(),
      location: z.string().optional(),
    }),
  }),
  channel: z.enum(["email", "social", "ppc", "sms"]),
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin"]).optional(),
  brandVoice: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { intent, channel, platform, brandVoice } = contentRequestSchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError("OpenAI API key not configured", 500);
    }

    const generator = new ContentGenerator(apiKey);
    let content;

    switch (channel) {
      case "email":
        content = await generator.generateEmailContent(intent, brandVoice);
        break;
      case "social":
        if (!platform) {
          throw new ApiError("Platform required for social content", 400);
        }
        content = await generator.generateSocialContent(
          intent,
          platform,
          brandVoice
        );
        break;
      case "ppc":
        content = await generator.generatePPCContent(intent, brandVoice);
        break;
      case "sms":
        content = await generator.generateSMSContent(intent, brandVoice);
        break;
      default:
        throw new ApiError("Invalid channel", 400);
    }

    return NextResponse.json({ content });
  } catch (error) {
    return handleApiError(error);
  }
}