import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentClassesTab } from "@/components/student/StudentClassesTab";
import { StudentClassroomsTab } from "@/components/student/StudentClassroomsTab";
import { StudentProgressTab } from "@/components/student/StudentProgressTab";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const RedesignedStudentDashboard = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("classes");

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
      }
    };
    checkAuth();

    // Handle hash navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setCurrentTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [navigate]);

  const renderTabContent = () => {
    switch (currentTab) {
      case "classes":
        return <StudentClassesTab />;
      case "classrooms":
        return <StudentClassroomsTab />;
      case "progress":
        return <StudentProgressTab />;
      default:
        return <StudentClassesTab />;
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
            >
              Sign Out
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default RedesignedStudentDashboard;
