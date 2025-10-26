import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyticsAnalyzer } from "@/lib/ai/analytics-analyzer";
import { z } from "zod";
import { handleApiError, ApiError } from "@/lib/api-error";

const analyticsRequestSchema = z.object({
  campaignId: z.string().cuid(),
  goal: z.string().min(1),
  channels: z.array(z.string()).min(1),
  metrics: z.record(z.any()),
});

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { campaignId, goal, channels, metrics } =
      analyticsRequestSchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError("OpenAI API key not configured", 500);
    }

    const analyzer = new AnalyticsAnalyzer(apiKey);

    const insights = (await Promise.race([
      analyzer.analyzePerformance({ goal, channels, metrics }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Analytics request timeout")), 20000),
      ),
    ])) as any;

    return NextResponse.json({ insights, campaignId });
  } catch (error) {
    return handleApiError(error);
  }
}
