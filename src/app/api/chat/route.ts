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

function normalizeTranscriptText(rawTranscript: string) {
  const cleanedLines = rawTranscript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^WEBVTT$/i.test(line))
    .filter((line) => !/^\d+$/.test(line))
    .filter((line) => !/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(line))
    .filter((line) => !/^\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}\.\d{3}/.test(line));

  return cleanedLines.join("\n").trim();
}

async function loadMeetingTranscript(transcriptUrl?: string | null) {
  const resolvedTranscriptUrl = transcriptUrl?.trim();

  if (!resolvedTranscriptUrl) {
    return null;
  }

  const response = await fetch(resolvedTranscriptUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load the meeting transcript from Stream");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return "";
  }

  if (contentType.includes("application/json") || contentType.includes("application/x-ndjson")) {
    const jsonlLines = trimmedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const transcriptLines: string[] = [];

    for (const line of jsonlLines) {
      try {
        const item = JSON.parse(line) as { text?: unknown; speaker_id?: unknown };

        if (typeof item.text === "string" && item.text.trim()) {
          const speakerPrefix =
            typeof item.speaker_id === "string" && item.speaker_id.trim()
              ? `${item.speaker_id.trim()}: `
              : "";

          transcriptLines.push(`${speakerPrefix}${item.text.trim()}`);
        }
      } catch {
        // Ignore malformed JSONL lines and continue parsing the rest.
      }
    }

    if (transcriptLines.length > 0) {
      return normalizeTranscriptText(transcriptLines.join("\n"));
    }

    try {
      const data = JSON.parse(trimmedText) as {
        transcript?: string;
        text?: string;
        data?: Array<{ text?: string; words?: Array<{ text?: string }> }>;
      };

      const transcriptText =
        data.transcript ??
        data.text ??
        data.data
          ?.flatMap((segment) => [segment.text, ...(segment.words?.map((word) => word.text) ?? [])])
          .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
          .join("\n");

      return normalizeTranscriptText(transcriptText ?? "");
    } catch {
      return normalizeTranscriptText(trimmedText);
    }
  }

  return normalizeTranscriptText(trimmedText);
}

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
  const meetingTranscript = await loadMeetingTranscript(meeting.transcriptUrl);

  if (!meetingTranscript) {
    return NextResponse.json(
      { error: "Meeting transcript is not available yet. Please try again after transcription finishes." },
      { status: 409 }
    );
  }

  try {
    if (mode === "summary" || mode === "discussion-points") {
      const summary = await generateMeetingSummary({
        meetingName: resolvedMeetingName,
        meetingContext: meetingTranscript,
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
        meetingContext: meetingTranscript,
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
      meetingContext: meetingTranscript,
      question,
      messages: normalizedMessages,
    });

    return NextResponse.json(response);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to generate a Gemini response";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}