  import { ResponsiveDialog } from "@/components/responsive-dialog";
 import { AgentForm } from "./agent-form";
 import {AgentOne} from "../../types";
 
  interface UpdateAgentDialogProps{
     open:boolean;
     onOpenChange:(open:boolean)=>void;
   initialValues:AgentOne;
  };
 
  export const UpdateAgentDialog =({
     open,
     onOpenChange,
     initialValues
  }:UpdateAgentDialogProps) =>{
     return(
         <ResponsiveDialog title="Edit Agent" description="Edit the agent details" open={open} onOpenChange={onOpenChange}>
           
           <AgentForm
           onSuccess={()=>onOpenChange(false)} 
           onCancel={()=>onOpenChange(false)}
           initialValues={initialValues}
           />
         </ResponsiveDialog>
         
     );
  };