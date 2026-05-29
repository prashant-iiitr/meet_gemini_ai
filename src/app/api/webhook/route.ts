import { CallSessionEndedEvent, CallSessionStartedEvent } from "@stream-io/node-sdk";
import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { MeetingStatus } from "@/modules/meetings/types";

const activeAgentConnections = new Map<string, { disconnect: () => void }>();

function verifySignatureWithSDK(body: string, signature: string): boolean {
    return streamVideo.verifyWebhook(body, signature);
};

function getRealtimeModelCandidates(): string[] {
    const configuredModel = process.env.OPENAI_REALTIME_MODEL?.trim();
    const candidates = [
        configuredModel,
        "gpt-4o-realtime-preview-2024-10-01",
        "gpt-4o-realtime-preview-2024-12-17",
        "gpt-4o-realtime-preview-2025-06-03",
        "gpt-4o-realtime-preview",
    ];

    return candidates.filter((model, index, values): model is string => Boolean(model) && values.indexOf(model) === index);
}

async function bootstrapAgentForMeeting(meetingId: string, agentId: string, instructions: string) {
    const call = streamVideo.video.call("default", meetingId);
    const models = getRealtimeModelCandidates();
    let lastError: unknown;

    activeAgentConnections.get(meetingId)?.disconnect();
    activeAgentConnections.delete(meetingId);

    const { createRealtimeClient } = await import("@stream-io/openai-realtime-api");
    const streamClient = (streamVideo.video as any).streamClient;
    const streamUserToken = streamClient.generateCallToken({
        user_id: agentId,
        role: "admin",
        call_cids: [call.cid],
        validity_in_seconds: 60 * 60 * 24,
    });

    for (const model of models) {
        try {
            const realtimeClient = createRealtimeClient({
                baseUrl: streamClient.apiClient.apiConfig.baseUrl,
                call,
                streamApiKey: streamClient.apiClient.apiConfig.apiKey,
                streamUserToken,
                openAiApiKey: process.env.OPENAI_API_KEY?.trim() as string,
                model,
            });

            await realtimeClient.connect();

            realtimeClient.updateSession({
                instructions,
                modalities: ["audio", "text"],
                voice: "verse",
            });

            activeAgentConnections.set(meetingId, realtimeClient);

            return model;
        } catch (error) {
            lastError = error;
            console.error("Realtime bootstrap failed for model", model, JSON.stringify(error, null, 2));
        }
    }

    throw new Error(
        `Failed to bootstrap agent: ${lastError instanceof Error ? lastError.message : JSON.stringify(lastError)}`
    );
}

export async function POST(req: NextRequest) {
    const signature = req.headers.get("x-signature");
    const apiKey = req.headers.get("x-api-key");

    if (!signature || !apiKey) {
        return NextResponse.json(
            { error: "Missing signature or API key" },
            { status: 400 }
        );
    }

    const body = await req.text();
    if (!verifySignatureWithSDK(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
        payload = JSON.parse(body) as Record<string, unknown>;
    }
    catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = (payload as Record<string, unknown>)?.type;
    if (eventType === "call.session_started") {
        const event = payload as CallSessionStartedEvent;
        const meetingId = event.call.custom?.meetingId as string | undefined;


        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        const [existingMeeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, meetingId),
                    not(eq(meetings.status, "completed")),
                    not(eq(meetings.status, "active")),
                    not(eq(meetings.status, "cancelled")),
                    not(eq(meetings.status, "processing")),
                )
            );

        if (!existingMeeting) { return NextResponse.json({ error: "Meeting not found" }, { status: 400 }) };

        const [existingAgent] = await db.select().from(agents).where(eq(agents.id, existingMeeting.agentId));
        if (!existingAgent) { return NextResponse.json({ error: "Agent not found" }, { status: 400 }) };

        if (!process.env.OPENAI_API_KEY?.trim()) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        try {
            const [claimedMeeting] = await db.update(meetings).set({
                status: MeetingStatus.Processing,
            }).where(
                and(
                    eq(meetings.id, existingMeeting.id),
                    eq(meetings.status, MeetingStatus.Upcoming),
                )
            ).returning();

            if (!claimedMeeting) {
                return NextResponse.json({ status: "already-processed" });
            }

            await bootstrapAgentForMeeting(meetingId, existingAgent.id, existingAgent.instructions);

            await db.update(meetings).set({
                status: MeetingStatus.Active,
                startedAt: new Date(),
            }).where(eq(meetings.id, existingMeeting.id));
        } catch (error) {
            await db.update(meetings).set({
                status: MeetingStatus.Upcoming,
            }).where(eq(meetings.id, existingMeeting.id));

            console.error("Failed to bootstrap agent for meeting", meetingId, JSON.stringify(error, null, 2));
            return NextResponse.json({ error: "Failed to bootstrap agent" });
        }
    }
    else if (eventType === "call.session_ended") {
        const event = payload as CallSessionEndedEvent;
        const meetingId = event.call.custom?.meetingId as string | undefined;

        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        activeAgentConnections.get(meetingId)?.disconnect();
        activeAgentConnections.delete(meetingId);

        await db.update(meetings).set({
            status: MeetingStatus.Completed,
            endedAt: new Date(),
        }).where(eq(meetings.id, meetingId));
    }
    return NextResponse.json({ status: "ok" });

}