import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    pendingApplications: number;
    interviewRecords: number;
    pendingTutors: number;
    pendingReviews: number;
    consultationBookings: number;
    tutoringBookings: number;
    unassignedIntensiveClasses: number;
  };
}

export function AdminLayout({ children, activeTab, onTabChange, counts }: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          counts={counts} 
        />
        <main className="flex-1 overflow-auto bg-background">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            </div>
          </header>
          <div className="p-4 md:p-6 bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
