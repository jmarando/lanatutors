import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <main className="flex-1 overflow-auto bg-white dark:bg-background relative z-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-white dark:bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" /> Today
              </Link>
            </Button>
          </header>
          <div className="p-4 md:p-6 bg-white dark:bg-background min-h-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
