import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentClassesTab } from "@/components/student/StudentClassesTab";
import { StudentClassroomsTab } from "@/components/student/StudentClassroomsTab";
import { StudentProgressTab } from "@/components/student/StudentProgressTab";
import { Button } from "@/components/ui/button";
import { Calendar, GraduationCap, TrendingUp, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import lanaLogo from "@/assets/lana-header-logo-2025.png";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Logo and Sign Out */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img 
            src={lanaLogo} 
            alt="Lana Tutors"
            className="h-12 w-auto object-contain cursor-pointer"
            onClick={() => navigate("/")}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content with Centered Tabs */}
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            {/* Centered Navigation Tabs */}
            <div className="flex justify-center mb-8">
              <TabsList className="inline-flex bg-muted p-1 rounded-lg">
                <TabsTrigger 
                  value="classes" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background"
                  onClick={() => window.location.hash = "classes"}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">My Classes</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="classrooms" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background"
                  onClick={() => window.location.hash = "classrooms"}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span className="font-medium">Classrooms</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="progress" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background"
                  onClick={() => window.location.hash = "progress"}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Progress</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <TabsContent value="classes" className="mt-0">
              {renderTabContent()}
            </TabsContent>
            <TabsContent value="classrooms" className="mt-0">
              {renderTabContent()}
            </TabsContent>
            <TabsContent value="progress" className="mt-0">
              {renderTabContent()}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default RedesignedStudentDashboard;
