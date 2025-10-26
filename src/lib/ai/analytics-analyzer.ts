import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import * as Sentry from "@sentry/nextjs";

export interface AnalyticsInsight {
  summary: string;
  keyMetrics: Array<{
    label: string;
    value: string;
    trend?: "up" | "down" | "stable";
  }>;
  recommendations: string[];
  optimizations: string[];
}

export class AnalyticsAnalyzer {
  private model: ChatOpenAI;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.5,
      openAIApiKey: apiKey,
    });
  }

  async analyzePerformance(campaignData: {
    goal: string;
    channels: string[];
    metrics: Record<string, any>;
  }): Promise<AnalyticsInsight> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a marketing analytics expert. Analyze campaign performance and provide actionable insights.

Campaign Goal: {goal}
Channels: {channels}
Performance Metrics: {metrics}

Provide:
1. Executive summary (2-3 sentences)
2. Key metrics analysis (identify 3-5 most important metrics with trends)
3. Specific recommendations (3-5 actionable items)
4. Optimization opportunities (2-3 concrete suggestions)

Format as JSON:
{{
  "summary": "...",
  "keyMetrics": [
    {{"label": "...", "value": "...", "trend": "up|down|stable"}}
  ],
  "recommendations": ["...", "..."],
  "optimizations": ["...", "..."]
}}

Output:`,
    );

    const input = await promptTemplate.format({
      goal: campaignData.goal,
      channels: campaignData.channels.join(", "),
      metrics: JSON.stringify(campaignData.metrics, null, 2),
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON from AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.summary || !parsed.recommendations || !parsed.optimizations) {
        throw new Error("Invalid response structure from AI");
      }

      return parsed;
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "AnalyticsAnalyzer",
          method: "analyzePerformance",
        },
        extra: {
          goal: campaignData.goal,
          channels: campaignData.channels,
          metrics: campaignData.metrics,
        },
      });

      throw new Error(
        "Failed to generate analytics insights. Please try again later.",
      );
    }
  }

  async generateOptimizationSuggestions(campaignData: {
    goal: string;
    channels: string[];
    currentPerformance: Record<string, any>;
    targetMetrics?: Record<string, any>;
  }): Promise<string[]> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a campaign optimization specialist. Generate specific, actionable optimization suggestions.

Campaign Goal: {goal}
Channels: {channels}
Current Performance: {currentPerformance}
Target Metrics: {targetMetrics}

Generate 5-7 specific optimization suggestions that can improve campaign performance.
Focus on:
- Audience targeting refinements
- Content improvements
- Budget allocation
- Timing and scheduling
- Channel-specific tactics

Format as JSON array:
["suggestion 1", "suggestion 2", ...]

Output:`,
    );

    const input = await promptTemplate.format({
      goal: campaignData.goal,
      channels: campaignData.channels.join(", "),
      currentPerformance: JSON.stringify(
        campaignData.currentPerformance,
        null,
        2,
      ),
      targetMetrics: campaignData.targetMetrics
        ? JSON.stringify(campaignData.targetMetrics, null, 2)
        : "Not specified",
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON from AI response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "AnalyticsAnalyzer",
          method: "generateOptimizationSuggestions",
        },
        extra: campaignData,
      });

      throw new Error(
        "Failed to generate optimization suggestions. Please try again later.",
      );
    }
  }
}
