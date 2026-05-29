 import { EmptyState } from "@/components/empty-state"

 
 export const CancelledState = (
 ) => {
     return (
         <div>
             <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
                 <EmptyState image="/upcoming.svg" title="Meeting cancelled" description="this meeting was cancelled " />
             </div>
         </div>
 
     )
 }