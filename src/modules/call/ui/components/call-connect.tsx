"use client"
import { useMutation } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
interface Props {
   meetingId: string;
   meetingName: string;
   userId: string;
   userName: string;
   userImage: string;
};
import { Call, CallingState, StreamCall, StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { CallUI } from "./call-ui";

export const CallConnect = ({
   meetingId, meetingName, userId, userName, userImage
}: Props) => {
   const trpc = useTRPC();
   const { mutateAsync: generateToken } = useMutation(
      trpc.meetings.generateToken.mutationOptions(),
   );
   const [client, setClient] = useState<StreamVideoClient>();
   useEffect(() => {
      const _client = new StreamVideoClient({
         apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!.trim(),
         user: {
            id: userId,
            name: userName,
            image: userImage
         },
         tokenProvider: generateToken,
      })
      setClient(_client);
      return () => {
         _client.disconnectUser();
         setClient(undefined);
      }

   }, [userId, userName, userImage, generateToken]);

   const [call, setCall] = useState<Call>();
   useEffect(() => {
      if (!client) return;
      const _call = client.call("default", meetingId);
      _call.camera.disable();
      _call.microphone.disable();
      setCall(_call);

      return () => {
         if (_call.state.callingState !== CallingState.LEFT) {
            _call.leave();
            setCall(undefined);
         }
      }
   }, [client, meetingId]);

   if (!client || !call) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(83,116,108,0.22),rgba(8,10,12,1))]">
            <LoaderIcon className="size-6 animate-spin text-white" />
         </div>
      );
   }

   return (
    <StreamVideo client={client}>
    <StreamCall call={call}>
       <CallUI meetingId={meetingId} meetingName={meetingName} />
    </StreamCall>
    </StreamVideo>
   )
};