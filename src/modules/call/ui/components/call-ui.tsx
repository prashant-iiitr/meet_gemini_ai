import { useCallback, useState } from "react";
import { CallingState, StreamTheme, useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";

interface Props {
    meetingId: string;
    meetingName: string;
};

export const CallUI = ({ meetingId, meetingName }: Props) => {
    const call = useCall();
    const { useCallCallingState } = useCallStateHooks();
    const callingState = useCallCallingState();
    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = useCallback(async () => {
        if (!call || isJoining) return;

        const alreadyJoined =
            call.state.callingState === CallingState.JOINED ||
            call.state.callingState === CallingState.JOINING;

        setShow("call");

        if (alreadyJoined) {
            return;
        }

        setIsJoining(true);
        try {
            await call.join();
        } catch (error) {
            setShow("lobby");
            throw error;
        } finally {
            setIsJoining(false);
        }
    }, [call, isJoining]);

    const handleLeave=()=>{
        if(!call) return;
        setShow("ended");
    };

    return (
        <StreamTheme className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,18,19,0.96),rgba(8,10,12,1))] text-white">
             {show === "ended" || callingState === CallingState.LEFT ? (
                <CallEnded />
            ) : show === "call" || callingState === CallingState.JOINED || callingState === CallingState.JOINING ? (
                <CallActive meetingId={meetingId} onLeave={handleLeave} meetingName={meetingName} />
            ) : (
                <CallLobby onJoin={handleJoin} isJoining={isJoining} />
            )}
        </StreamTheme>
    )

}