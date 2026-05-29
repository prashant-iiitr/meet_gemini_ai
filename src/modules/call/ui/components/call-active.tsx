import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CallControls, CallParticipantsList, SpeakerLayout } from "@stream-io/video-react-sdk";



interface Props {
    onLeave: () => void;
    meetingName: string;
}

export const CallActive = ({ onLeave, meetingName }: Props) => {
    const [showParticipants, setShowParticipants] = useState(true);

    return (
        <div className="flex min-h-screen flex-1 flex-col gap-4 overflow-hidden p-4 text-white md:p-6">
            <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#101213]/90 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur">
                <Link href="/" className="flex items-center justify-center rounded-full bg-white/10 p-2 transition hover:bg-white/15">
                    <Image src="/logo.svg" width={22} height={22} alt="Logo" />
                </Link>
                <div className="min-w-0">
                    <h4 className="truncate text-base font-medium">
               {meetingName}
                </h4>
                </div>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-2xl shadow-black/30 backdrop-blur">
                    <SpeakerLayout />
                </div>
                {showParticipants ? (
                    <aside className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-[#101213]/90 shadow-lg shadow-black/20 backdrop-blur">
                        <CallParticipantsList onClose={() => setShowParticipants(false)} />
                    </aside>
                ) : null}
            </div>
            <div className="rounded-full border border-white/10 bg-[#101213]/90 p-4 shadow-lg shadow-black/20 backdrop-blur" >
                <CallControls onLeave={onLeave} />
            </div>
        </div>
        
    );
};