import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import {
  answerMeetingQuestion,
  formatSummaryResponse,
  generateActionItems,
  generateMeetingSummary,
} from "@/lib/gemini";
import type { AIResponse, ChatMessage } from "@/lib/gemini-types";

const chatRequestSchema = z.object({
  meetingId: z.string().min(1),
  meetingName: z.string().min(1).optional(),
  mode: z.enum(["chat", "summary", "action-items", "discussion-points"]).default("chat"),
  message: z.string().trim().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).default([]),
});

function toAssistantMessageList(messages: ChatMessage[], assistantText: string): ChatMessage[] {
  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: assistantText,
  };

  return [...messages, assistantMessage];
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { meetingId, meetingName, mode, message } = parsed.data;
  const normalizedMessages: ChatMessage[] = parsed.data.messages
    .filter((entry) => Boolean(entry.content.trim()))
    .slice(-12);

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, session.user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const resolvedMeetingName = meetingName?.trim() || meeting.name;
  const meetingContext = meeting.summary?.trim() || undefined;

  try {
    if (mode === "summary" || mode === "discussion-points") {
      const summary = await generateMeetingSummary({
        meetingName: resolvedMeetingName,
        meetingContext,
        messages: normalizedMessages,
      });

      const response: AIResponse = {
        mode,
        message: formatSummaryResponse(summary),
        messages: toAssistantMessageList(normalizedMessages, formatSummaryResponse(summary)),
        summary,
      };

      return NextResponse.json(response);
    }

    if (mode === "action-items") {
      const actionItems = await generateActionItems({
        meetingName: resolvedMeetingName,
        meetingContext,
        messages: normalizedMessages,
      });

      const summary = {
        summary: "",
        keyDiscussionPoints: [],
        actionItems,
      };

      const response: AIResponse = {
        mode,
        message: formatSummaryResponse(summary),
        messages: toAssistantMessageList(normalizedMessages, formatSummaryResponse(summary)),
        summary,
      };

      return NextResponse.json(response);
    }

    const question = message?.trim() || normalizedMessages.at(-1)?.content?.trim() || "";

    if (!question) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const response = await answerMeetingQuestion({
      meetingName: resolvedMeetingName,
      meetingContext,
      question,
      messages: normalizedMessages,
    });

    return NextResponse.json(response);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to generate a Gemini response";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}