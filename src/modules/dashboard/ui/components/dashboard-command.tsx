"use client";

import { CommandDialog, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup, CommandResponsiveDialog } from "@/components/ui/command";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export const DashboardCommand = ({ open, setOpen }: Props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (

    <CommandResponsiveDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Find a meeting or agent..." />
      <CommandList>

        <CommandItem>
          Test
        </CommandItem>

        <CommandItem>
          Test2
        </CommandItem>


      </CommandList>
    </CommandResponsiveDialog>

  );
};


