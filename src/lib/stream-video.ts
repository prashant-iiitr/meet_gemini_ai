
import "server-only";
import { StreamClient } from "@stream-io/node-sdk";

export const streamVideo = new StreamClient(
    process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY?.trim() as string,
    process.env.STREAM_VIDEO_SECRET_KEY?.trim() as string,
);