import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { CampaignIntent } from "./prompt-parser";
import * as Sentry from "@sentry/nextjs";

export interface GeneratedContent {
  subject?: string;
  body: string;
  preview?: string;
  headline?: string;
  description?: string;
  cta?: string;
}

export class ContentGenerator {
  private model: ChatOpenAI;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: apiKey,
    });
  }

  async generateEmailContent(
    intent: CampaignIntent,
    brandVoice?: string,
  ): Promise<GeneratedContent> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an expert email marketing copywriter. Generate compelling email content.

Campaign Goal: {goal}
Key Message: {keyMessage}
Call to Action: {cta}
Target Audience: {audience}
Brand Voice: {brandVoice}

Generate:
1. Subject line (compelling, under 60 characters)
2. Preview text (under 100 characters)
3. Email body (HTML-friendly, 200-400 words, persuasive, with clear structure)

Format as JSON:
{{
  "subject": "...",
  "preview": "...",
  "body": "..."
}}

Output:`,
    );

    const input = await promptTemplate.format({
      goal: intent.goal,
      keyMessage: intent.contentSpec.keyMessage,
      cta: intent.contentSpec.callToAction || "Learn More",
      audience: intent.audienceCriteria.demographics || "general audience",
      brandVoice: brandVoice || "professional and friendly",
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.subject || !parsed.body) {
        throw new Error("Missing required fields in AI response");
      }

      return parsed;
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "ContentGenerator",
          method: "generateEmailContent",
        },
        extra: {
          intent: intent.goal,
          brandVoice,
        },
      });

      throw new Error("Failed to generate email content. Please try again.");
    }
  }

  async generateSocialContent(
    intent: CampaignIntent,
    platform: "facebook" | "instagram" | "twitter" | "linkedin",
    brandVoice?: string,
  ): Promise<GeneratedContent> {
    const platformSpecs = {
      facebook: { maxLength: 500, style: "conversational and engaging" },
      instagram: { maxLength: 300, style: "visual-focused with emojis" },
      twitter: { maxLength: 280, style: "concise and punchy" },
      linkedin: { maxLength: 700, style: "professional and insightful" },
    };

    const spec = platformSpecs[platform];

    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a social media content creator for {platform}. Generate engaging post content.

Campaign Goal: {goal}
Key Message: {keyMessage}
Platform: {platform}
Max Length: {maxLength} characters
Style: {style}
Brand Voice: {brandVoice}

Generate a compelling social media post with:
1. Main copy (within character limit)
2. Relevant hashtags (3-5)
3. Call to action

Format as JSON:
{{
  "body": "...",
  "hashtags": ["...", "..."],
  "cta": "..."
}}

Output:`,
    );

    const input = await promptTemplate.format({
      platform,
      goal: intent.goal,
      keyMessage: intent.contentSpec.keyMessage,
      maxLength: spec.maxLength.toString(),
      style: spec.style,
      brandVoice: brandVoice || "engaging and authentic",
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.body) {
        throw new Error("Missing required fields in AI response");
      }

      return {
        body: parsed.body,
        cta: parsed.cta,
        description: parsed.hashtags?.join(" ") || "",
      };
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "ContentGenerator",
          method: "generateSocialContent",
        },
        extra: {
          intent: intent.goal,
          platform,
          brandVoice,
        },
      });

      throw new Error("Failed to generate social content. Please try again.");
    }
  }

  async generatePPCContent(
    intent: CampaignIntent,
    brandVoice?: string,
  ): Promise<GeneratedContent> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a PPC advertising expert. Generate high-converting ad copy.

Campaign Goal: {goal}
Key Message: {keyMessage}
Call to Action: {cta}
Target Audience: {audience}
Brand Voice: {brandVoice}

Generate:
1. Headline (under 30 characters, attention-grabbing)
2. Description (under 90 characters, benefit-focused)
3. Display URL path (2-3 words)

Format as JSON:
{{
  "headline": "...",
  "description": "...",
  "cta": "..."
}}

Output:`,
    );

    const input = await promptTemplate.format({
      goal: intent.goal,
      keyMessage: intent.contentSpec.keyMessage,
      cta: intent.contentSpec.callToAction || "Get Started",
      audience: intent.audienceCriteria.demographics || "general audience",
      brandVoice: brandVoice || "persuasive and clear",
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.headline || !parsed.description) {
        throw new Error("Missing required fields in AI response");
      }

      return parsed;
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "ContentGenerator",
          method: "generatePPCContent",
        },
        extra: {
          intent: intent.goal,
          brandVoice,
        },
      });

      throw new Error("Failed to generate PPC content. Please try again.");
    }
  }

  async generateSMSContent(
    intent: CampaignIntent,
    brandVoice?: string,
  ): Promise<GeneratedContent> {
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an SMS marketing expert. Generate concise, effective SMS content.

Campaign Goal: {goal}
Key Message: {keyMessage}
Call to Action: {cta}
Brand Voice: {brandVoice}

Generate SMS message (under 160 characters, clear and actionable).

Format as JSON:
{{
  "body": "..."
}}

Output:`,
    );

    const input = await promptTemplate.format({
      goal: intent.goal,
      keyMessage: intent.contentSpec.keyMessage,
      cta: intent.contentSpec.callToAction || "Reply YES",
      brandVoice: brandVoice || "friendly and direct",
    });

    try {
      const response = await this.model.invoke(input);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.body) {
        throw new Error("Missing required fields in AI response");
      }

      return parsed;
    } catch (error) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          component: "ContentGenerator",
          method: "generateSMSContent",
        },
        extra: {
          intent: intent.goal,
          brandVoice,
        },
      });

      throw new Error("Failed to generate SMS content. Please try again.");
    }
  }
}
