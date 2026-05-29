 import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
 import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CallView} from "@/modules/call/ui/views/call-view";

 
 interface Props{
    params:Promise<{meetingId:string;}>;
 };

  const page=async ({params}:Props)=>{
     const {meetingId}=await params;

    const session=await auth.api.getSession({headers:await headers()});

    if(!session){redirect("/sign-in")};
 

    const queryclient=getQueryClient();
    void queryclient.prefetchQuery(trpc.meetings.getOne.queryOptions({id:meetingId}));

    return (
        <HydrationBoundary state={dehydrate(queryclient)}>
           <CallView meetingId={meetingId} />
        </HydrationBoundary>
    )

 };
 export default page;