"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AlertCircleIcon, BotIcon, Loader2Icon, SendIcon, SparklesIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AIResponse, AssistantMode, ChatMessage, SummaryResponse } from "@/lib/gemini-types";

interface Props {
  meetingId: string;
  meetingName: string;
  className?: string;
}

const quickActions: Array<{ label: string; mode: AssistantMode; prompt: string }> = [
  { label: "Ask", mode: "chat", prompt: "What should I know about this meeting?" },
  { label: "Summary", mode: "summary", prompt: "Generate a concise summary of this meeting." },
  { label: "Action items", mode: "action-items", prompt: "Extract the action items from this meeting." },
  { label: "Key points", mode: "discussion-points", prompt: "List the key discussion points from this meeting." },
];

export const MeetingAssistantPanel = ({ meetingId, meetingName, className }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestSummary, setLatestSummary] = useState<SummaryResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentMessages = useMemo(() => messages.slice(-12), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, latestSummary]);

  const sendMessage = async (mode: AssistantMode, promptOverride?: string) => {
    const content = (promptOverride ?? draft).trim();

    if (!content && mode === "chat") {
      setError("Type a message before sending.");
      return;
    }

    if (isLoading) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...recentMessages, userMessage].slice(-12);

    setError(null);
    setIsLoading(true);
    setDraft("");
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          meetingName,
          mode,
          message: content,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as AIResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate a response");
      }

      setMessages(data.messages);
      setLatestSummary(data.summary ?? null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Something went wrong";
      setError(message);
      setMessages((current) => current.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn("flex h-full min-h-0 flex-col border-white/10 bg-[#101213]/90 text-white shadow-lg shadow-black/20 backdrop-blur", className)}>
      <CardHeader className="border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SparklesIcon className="size-4 text-emerald-300" />
              Meeting assistant
            </CardTitle>
            <CardDescription className="text-white/60">
              Ask questions, generate summaries, and pull action items from {meetingName}.
            </CardDescription>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Gemini
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sendMessage(action.mode, action.prompt)}
              disabled={isLoading}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              {action.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="space-y-3 pr-3">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
                Start a conversation with Gemini or use the quick actions above to summarize the meeting.
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" ? (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20">
                      <BotIcon className="size-4" />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-emerald-400 text-black"
                        : "bg-white/8 border border-white/10 text-white"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" ? (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10">
                      <UserIcon className="size-4" />
                    </div>
                  ) : null}
                </div>
              ))
            )}

            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-white/60" ref={scrollRef}>
                <Loader2Icon className="size-4 animate-spin text-emerald-300" />
                Gemini is thinking...
              </div>
            ) : null}
          </div>
        </ScrollArea>

        {latestSummary ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="mb-3 font-medium text-white">Latest structured result</div>
            <div className="space-y-2 whitespace-pre-wrap">
              {latestSummary.summary ? <p>{latestSummary.summary}</p> : null}
              {latestSummary.keyDiscussionPoints.length > 0 ? (
                <div>
                  <p className="mb-1 text-white/70">Key discussion points</p>
                  <ul className="space-y-1 text-white/80">
                    {latestSummary.keyDiscussionPoints.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {latestSummary.actionItems.length > 0 ? (
                <div>
                  <p className="mb-1 text-white/70">Action items</p>
                  <ul className="space-y-1 text-white/80">
                    {latestSummary.actionItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage("chat");
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Gemini about this meeting..."
            className="min-h-24 resize-none border-white/10 bg-black/20 text-white placeholder:text-white/40 focus-visible:border-emerald-400/40 focus-visible:ring-emerald-400/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              Gemini keeps the most recent messages for context.
            </p>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};