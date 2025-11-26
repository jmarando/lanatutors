import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentOverviewTab } from "@/components/student/StudentOverviewTab";
import { StudentClassesTab } from "@/components/student/StudentClassesTab";
import { StudentClassroomsTab } from "@/components/student/StudentClassroomsTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare } from "lucide-react";
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
        return <ProgressTabPlaceholder />;
      case "messages":
        return <MessagesTabPlaceholder />;
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

// Placeholder components for Progress and Messages tabs
function ProgressTabPlaceholder() {
  const learningProgress = [
    { subject: "Math", progress: 85, sessions: 12, color: "bg-blue-500" },
    { subject: "Physics", progress: 78, sessions: 8, color: "bg-purple-500" },
    { subject: "Chemistry", progress: 92, sessions: 15, color: "bg-green-500" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Learning Progress</h2>
        <p className="text-muted-foreground">Track your progress across all subjects.</p>
      </div>

      <div className="grid gap-6">
        {learningProgress.map((item) => (
          <Card key={item.subject}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{item.subject}</h3>
                  <span className="text-2xl font-bold text-primary">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-3" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{item.sessions} sessions completed</span>
                  <span>{Math.round((item.progress / 100) * item.sessions)} / {item.sessions} goals achieved</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MessagesTabPlaceholder() {
  const messages = [
    { 
      from: "David Kamau", 
      message: "Great work on the assignment! Just a few notes on problem 3...", 
      time: "2 hours ago",
      unread: true 
    },
    { 
      from: "Sarah Wanjiru", 
      message: "Our session for tomorrow is confirmed. See you then!", 
      time: "5 hours ago",
      unread: false 
    },
    { 
      from: "Jane Muthoni", 
      message: "I've rescheduled our class to 5 PM. Please confirm.", 
      time: "1 day ago",
      unread: true 
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Messages</h2>
        <p className="text-muted-foreground">Communicate with your tutors.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {msg.unread && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                )}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-semibold ${msg.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {msg.from}
                    </p>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RedesignedStudentDashboard;
