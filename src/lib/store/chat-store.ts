import { create } from "zustand";
import { randomUUID } from "crypto";
import { CampaignIntent } from "@/lib/ai/prompt-parser";
import { GeneratedContent } from "@/lib/ai/content-generator";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "campaign" | "content" | "audience" | "analytics" | "text";
  data?: any;
}

export interface Campaign {
  id: string;
  intent: CampaignIntent;
  content: Record<string, GeneratedContent>;
  status: "draft" | "generating" | "ready" | "launched" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

interface ChatStore {
  messages: Message[];
  currentCampaign: Campaign | null;
  campaigns: Campaign[];
  isLoading: boolean;

  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentCampaign: null,
  campaigns: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

  addCampaign: (campaign) =>
    set((state) => ({
      campaigns: [...state.campaigns, campaign],
      currentCampaign: campaign,
    })),

  updateCampaign: (id, updates) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c,
      ),
      currentCampaign:
        state.currentCampaign?.id === id
          ? { ...state.currentCampaign, ...updates, updatedAt: new Date() }
          : state.currentCampaign,
    })),

  clearMessages: () => set({ messages: [], currentCampaign: null }),
}));
