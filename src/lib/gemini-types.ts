export type ChatRole = "user" | "assistant";

export type AssistantMode = "chat" | "summary" | "action-items" | "discussion-points";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  id?: string;
  createdAt?: string;
}

export interface SummaryResponse {
  summary: string;
  keyDiscussionPoints: string[];
  actionItems: string[];
}

export interface AIResponse {
  mode: AssistantMode;
  message: string;
  messages: ChatMessage[];
  summary?: SummaryResponse;
}