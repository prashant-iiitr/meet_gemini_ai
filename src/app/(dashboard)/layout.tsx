"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <main className="flex flex-col h-screen w-full bg-muted">
          <DashboardNavbar />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
