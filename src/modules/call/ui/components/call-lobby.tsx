import { LogInIcon } from "lucide-react";
import { DefaultVideoPlaceholder, StreamVideoParticipant, ToggleAudioPreviewButton, ToggleVideoPreviewButton, useCallStateHooks, VideoPreview } from "@stream-io/video-react-sdk";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { generateAvatarUri } from "@/lib/avatar";
//import {LayOut} from "@src/app/call/layout.tsx"
// stylesheet imported at route layout (src/app/call/layout.tsx)



interface Props {
    onJoin: () => void;
    isJoining?: boolean;
};

const DisableVideoPreview = () => {
    const { data } = authClient.useSession();
    return (
        <DefaultVideoPlaceholder
            participant={
                {
                    name: data?.user.name ?? "",
                    image: data?.user.image ?? generateAvatarUri({
                        seed: data?.user.name ?? "",
                        variant: "initials",
                    }),
                } as StreamVideoParticipant
            }
        />
    )
}

const AllowBrowserPermissions = () => {
    return (
        <p className="text-sm">
            please grant your browser a permission to access your camera and microphone.
        </p>
    )
}

export const CallLobby = ({ onJoin, isJoining }: Props) => {
    const { useCameraState, useMicrophoneState } = useCallStateHooks();
    const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
    const { hasBrowserPermission: hasCameraPermission } = useCameraState();

    const hasBrowserMediaPermission = hasCameraPermission && hasMicPermission;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(83,116,108,0.26),rgba(8,10,12,1))] px-4 py-8">
            <div className="flex w-full flex-1 items-center justify-center">
                <div className="flex w-full max-w-md flex-col items-center justify-center gap-y-6 rounded-3xl border border-white/10 bg-background/95 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
                    <div className="flex flex-col gap-y-2 text-center">
                        <h6 className="text-lg font-medium">Ready to join</h6>
                        <p className="text-sm">Set up your call before joining</p>
                    </div>
                    <VideoPreview DisabledVideoPreview={hasBrowserMediaPermission ? DisableVideoPreview : AllowBrowserPermissions} />
                    <div className="flex gap-x-2">
                        <ToggleAudioPreviewButton />
                        <ToggleVideoPreviewButton />
                    </div>
                    <div className="flex w-full gap-2">
                        <Button asChild variant="ghost">
                            <Link href="/meetings">
                            Cancel
                            </Link>
                        </Button>
                        <Button onClick={onJoin} disabled={isJoining}>
                            <LogInIcon />
                            Join call
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )

}
