import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AIResponse, AssistantMode, ChatMessage, SummaryResponse } from "./gemini-types";

// GEMINI IMPLEMENTATION
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_CONTEXT_MESSAGES = 12;

let geminiClient: GoogleGenAI | undefined;

export function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

function trimContext(messages: ChatMessage[] = []) {
  return messages
    .filter((message) => Boolean(message.content?.trim()))
    .slice(-MAX_CONTEXT_MESSAGES);
}

function toGeminiContents(messages: ChatMessage[]) {
  return trimContext(messages).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content.trim() }],
  }));
}

function buildSystemInstruction(params: {
  meetingName: string;
  meetingContext?: string;
  mode: AssistantMode;
}) {
  const contextBlock = params.meetingContext?.trim()
    ? `\n\nSaved meeting context:\n${params.meetingContext.trim()}`
    : "";

  const sharedInstruction = [
    "You are MeetAI, a concise text-based meeting assistant.",
    `Meeting title: ${params.meetingName}`,
    "Use the provided chat history as conversation context.",
    "Keep replies clear, practical, and grounded in the meeting context.",
    "If the available context is limited, say so instead of inventing details.",
  ].join(" ");

  if (params.mode === "summary") {
    return `${sharedInstruction}${contextBlock}\n\nReturn ONLY valid JSON with this shape: {"summary":"string","keyDiscussionPoints":["string"],"actionItems":["string"]}. Keep the language concise.`;
  }

  if (params.mode === "action-items") {
    return `${sharedInstruction}${contextBlock}\n\nReturn ONLY valid JSON with this shape: {"actionItems":["string"]}. Focus on concrete next steps, owners, and follow-ups.`;
  }

  if (params.mode === "discussion-points") {
    return `${sharedInstruction}${contextBlock}\n\nReturn ONLY valid JSON with this shape: {"summary":"string","keyDiscussionPoints":["string"],"actionItems":["string"]}. Emphasize the main discussion points.`;
  }

  return `${sharedInstruction}${contextBlock}\n\nAnswer the user's question in a short, helpful paragraph or bullets when useful. Do not return JSON.`;
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function generateTextResponse(params: {
  mode: AssistantMode;
  meetingName: string;
  meetingContext?: string;
  messages?: ChatMessage[];
  prompt: string;
  json?: boolean;
}) {
  const response = await getGeminiClient().models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: [
      ...toGeminiContents(params.messages ?? []),
      {
        role: "user",
        parts: [{ text: params.prompt }],
      },
    ],
    config: {
      systemInstruction: buildSystemInstruction({
        meetingName: params.meetingName,
        meetingContext: params.meetingContext,
        mode: params.mode,
      }),
      responseMimeType: params.json ? "application/json" : undefined,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

export async function answerMeetingQuestion(params: {
  meetingName: string;
  meetingContext?: string;
  question: string;
  messages?: ChatMessage[];
}): Promise<AIResponse> {
  const text = await generateTextResponse({
    mode: "chat",
    meetingName: params.meetingName,
    meetingContext: params.meetingContext,
    messages: params.messages,
    prompt: params.question,
  });

  const responseMessages = [
    ...(params.messages ?? []),
    { role: "assistant", content: text },
  ] satisfies ChatMessage[];

  return {
    mode: "chat",
    message: text,
    messages: responseMessages,
  };
}

export async function generateMeetingSummary(params: {
  meetingName: string;
  meetingContext?: string;
  messages?: ChatMessage[];
}): Promise<SummaryResponse> {
  const text = await generateTextResponse({
    mode: "summary",
    meetingName: params.meetingName,
    meetingContext: params.meetingContext,
    messages: params.messages,
    prompt:
      "Create a concise meeting summary with key discussion points and action items. Return only JSON.",
    json: true,
  });

  const parsed = JSON.parse(extractJsonPayload(text)) as Partial<SummaryResponse>;

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    keyDiscussionPoints: normalizeStringArray(parsed.keyDiscussionPoints),
    actionItems: normalizeStringArray(parsed.actionItems),
  };
}

export async function generateActionItems(params: {
  meetingName: string;
  meetingContext?: string;
  messages?: ChatMessage[];
}) {
  const text = await generateTextResponse({
    mode: "action-items",
    meetingName: params.meetingName,
    meetingContext: params.meetingContext,
    messages: params.messages,
    prompt: "Extract the action items from this meeting. Return only JSON.",
    json: true,
  });

  const parsed = JSON.parse(extractJsonPayload(text)) as { actionItems?: unknown };
  return normalizeStringArray(parsed.actionItems);
}

export function formatSummaryResponse(summary: SummaryResponse) {
  const lines = ["Meeting summary"];

  if (summary.summary) {
    lines.push("", summary.summary);
  }

  if (summary.keyDiscussionPoints.length > 0) {
    lines.push("", "Key discussion points");
    summary.keyDiscussionPoints.forEach((point) => {
      lines.push(`- ${point}`);
    });
  }

  if (summary.actionItems.length > 0) {
    lines.push("", "Action items");
    summary.actionItems.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  return lines.join("\n");
}
 import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});