"use client"

import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/error-state";
import { MeetingIdViewHeader } from "../components/meeting-id-view-header";
import { useRouter } from "next/navigation";
import { useConfirm } from "../../../agents/hooks/use-confirm";
import { toast } from "sonner";
import { UpdateMeetingDialog } from "../components/update-meeting-dialog";
import { useState } from "react";
import { UpcomingState } from "../components/upcoming-state";
import { ActiveState } from "../components/active-state";
import { CancelledState } from "../components/cancelled-state";
import { ProcessingState } from "../components/processing-state";
import { MeetingAssistantPanel } from "../components/meeting-assistant-panel";


interface Props { meetingId: string };

export const MeetingIdView = ({ meetingId }: Props) => {
    if (!meetingId) {
        return <MeetingIdViewError />;
    }

    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [UpdateMeetingDialogOpen, setUpdateMeetingDialogOpen] = useState(false);

    const [RemoveConfirmation, confirmRemove] = useConfirm(
        "are you sure?",
        "The following action will remove this meeting"
    );

    const queryOptions = trpc.meetings.getOne.queryOptions({ id: meetingId });
    const removeMeeting = useMutation(
        trpc.meetings.remove.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
                await queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: meetingId }));
                router.replace("/meetings");
                router.refresh();
            },
            onError: (error) => {
                toast.error(error.message);
            },
        })
    );

    

    const { data, isLoading, isError } = useQuery({
        ...queryOptions,
        enabled: Boolean(meetingId),
    });

    if (isLoading) return <MeetingIdViewLoading />;
    if (isError || !data) return <MeetingIdViewError />;

    const meeting = data as { name?: string };

    const handleRemoveMeeting = async () => {
        const ok = await confirmRemove();
        if (!ok) return;
        try {
            await removeMeeting.mutateAsync({ id: meetingId })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("Meeting not found")) {
                router.replace("/meetings");
                router.refresh();
                return;
            }
            throw error;
        }
    };

    const isActive = data.status === "active";
    const isUpcoming = data.status === "upcoming";
    const isCancelled = data.status === "cancelled";
    const isCompleted = data.status === "completed";
    const isProcessing = data.status === "processing";


    const showAssistantPanel = isActive || isCompleted;

    return (
        <>
            <RemoveConfirmation />
            <UpdateMeetingDialog open={UpdateMeetingDialogOpen} onOpenChange={setUpdateMeetingDialogOpen} initialValues={data} />
            <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <MeetingIdViewHeader
                    meetingId={meetingId}
                    meetingName={meeting.name ?? 'Untitled Meeting'}
                    onEdit={() => setUpdateMeetingDialogOpen(true)}
                    onRemove={handleRemoveMeeting}
                />
                {showAssistantPanel ? (
                    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                        <div className="flex flex-col gap-y-4">
                            {isCancelled && <CancelledState />}
                            {isProcessing && <ProcessingState />}
                            {isCompleted && <div>Completed</div>}
                            {isUpcoming && <UpcomingState meetingId={meetingId} onCancelMeeting={() => { }} isCancelling={false} />}
                            {isActive && <ActiveState meetingId={meetingId} />}
                        </div>
                        <MeetingAssistantPanel
                            meetingId={meetingId}
                            meetingName={meeting.name ?? 'Untitled Meeting'}
                            className="min-h-160"
                        />
                    </div>
                ) : (
                    <>
                        {isCancelled && <CancelledState />}
                        {isProcessing && <ProcessingState />}
                        {isCompleted && <div>Completed</div>}
                        {isUpcoming && <UpcomingState meetingId={meetingId} onCancelMeeting={() => { }} isCancelling={false} />}
                        {isActive && <ActiveState meetingId={meetingId} />}
                    </>
                )}
            </div>
        </>
    );
};

export const MeetingIdViewLoading = ({ meetingId }: Partial<Props>) => {
    return (
        <LoadingState title="Loading Meeting" description="This may take a few seconds" />
    );
};

export const MeetingIdViewError = ({ meetingId }: Partial<Props>) => {
    return (
        <ErrorState title="Error Loading Meeting" description="Please try again later" />
    );
};