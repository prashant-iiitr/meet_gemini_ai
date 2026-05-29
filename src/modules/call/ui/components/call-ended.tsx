
  import Link from "next/link";

  import { Button } from "@/components/ui/button";
  
  //import {LayOut} from "@src/app/call/layout.tsx"
  // stylesheet imported at route layout (src/app/call/layout.tsx)
  
  
  export const CallEnded = () => {
      
  
      return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(83,116,108,0.18),_rgba(8,10,12,1))] px-4 py-8">
            <div className="flex w-full flex-1 items-center justify-center">
                <div className="flex w-full max-w-md flex-col items-center justify-center gap-y-6 rounded-3xl border border-white/10 bg-background/95 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
                      <div className="flex flex-col gap-y-2 text-center">
                          <h6 className="text-lg font-medium">You have ended the call</h6>
                          <p className="text-sm">Summary will appear in a few minutes.</p>
                      </div>
                      <Button asChild>
                     <Link href="/meetings">Back to meetings</Link>
                      </Button>
                  </div>
              </div>
          </div>
      )
  
  }
  