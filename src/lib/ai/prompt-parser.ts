import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const campaignSchema = z.object({
  goal: z.string().describe("The primary goal of the campaign"),
  channels: z.array(z.enum(["email", "social", "ppc", "sms"])).describe("Marketing channels to use"),
  contentSpec: z.object({
    tone: z.string().optional(),
    keyMessage: z.string(),
    callToAction: z.string().optional(),
  }).describe("Content specifications"),
  audienceCriteria: z.object({
    demographics: z.string().optional(),
    interests: z.string().optional(),
    location: z.string().optional(),
  }).describe("Target audience criteria"),
  budget: z.number().optional().describe("Campaign budget in USD"),
  schedule: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
  needsClarification: z.boolean().describe("Whether more information is needed"),
  clarificationQuestions: z.array(z.string()).optional(),
});

export type CampaignIntent = z.infer<typeof campaignSchema>;

export class PromptParser {
  private model: ChatOpenAI;
  private parser: StructuredOutputParser<CampaignIntent>;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: apiKey,
    });

    this.parser = StructuredOutputParser.fromZodSchema(campaignSchema);
  }

  async parseCampaignIntent(
    userPrompt: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<CampaignIntent> {
    const formatInstructions = this.parser.getFormatInstructions();

    const historyContext = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an AI marketing assistant that parses user prompts into structured campaign data.

Conversation History:
{history}

Current User Prompt: {prompt}

Parse the user's marketing campaign request into structured JSON format. Extract:
- Campaign goal (what they want to achieve)
- Channels (email, social, ppc, sms)
- Content specifications (tone, key message, CTA)
- Audience criteria (demographics, interests, location)
- Budget (if mentioned)
- Schedule (start/end dates if mentioned)

If critical information is missing (like goal, channels, or key message), set needsClarification to true and provide 2-3 specific clarification questions.

Use conversation history for context. If the user is answering previous questions, incorporate that information.

{format_instructions}

Output:`
    );

    const input = await promptTemplate.format({
      prompt: userPrompt,
      history: historyContext || "No previous conversation",
      format_instructions: formatInstructions,
    });

    const response = await this.model.invoke(input);
    const parsed = await this.parser.parse(response.content as string);

    return parsed;
  }

  async generateResponse(
    intent: CampaignIntent,
    userPrompt: string
  ): Promise<string> {
    if (intent.needsClarification && intent.clarificationQuestions) {
      return `I'd love to help you create this campaign! To get started, I need a bit more information:\n\n${intent.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nPlease provide these details so I can create the perfect campaign for you.`;
    }

    const channelList = intent.channels.join(", ");
    const budgetText = intent.budget ? ` with a budget of $${intent.budget}` : "";

    return `Perfect! I'm creating a ${channelList} campaign${budgetText} to ${intent.goal}.\n\nKey Message: ${intent.contentSpec.keyMessage}\n\nTarget Audience: ${intent.audienceCriteria.demographics || "General audience"}\n\nI'll now generate the campaign content and set everything up. Would you like to review the content before we launch?`;
  }
}
