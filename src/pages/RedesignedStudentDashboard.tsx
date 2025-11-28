import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentClassesTab } from "@/components/student/StudentClassesTab";
import { StudentClassroomsTab } from "@/components/student/StudentClassroomsTab";
import { StudentProgressTab } from "@/components/student/StudentProgressTab";
import { Calendar, GraduationCap, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RedesignedStudentDashboard = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("classes");
  const [groupClasses, setGroupClasses] = useState<any[]>([]);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      
      // Fetch enrolled group classes
      const { data: enrollments } = await supabase
        .from("group_class_enrollments")
        .select(`
          *,
          group_classes(*)
        `)
        .eq("student_id", user.id)
        .eq("status", "active");
      
      setGroupClasses(enrollments || []);
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
      case "group-classes":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Group Classes</h2>
              <Button onClick={() => navigate("/group-classes")}>
                Browse Classes
              </Button>
            </div>
            {groupClasses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">You're not enrolled in any group classes yet</p>
                  <Button onClick={() => navigate("/group-classes")}>
                    Explore Group Classes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {groupClasses.map((enrollment: any) => {
                  const classData = enrollment.group_classes;
                  return (
                    <Card key={enrollment.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{classData.title}</CardTitle>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{classData.curriculum}</Badge>
                              <Badge>{classData.subject}</Badge>
                            </div>
                          </div>
                          <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{classData.day_of_week} at {classData.start_time} - {classData.end_time} EAT</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>Sessions attended: {enrollment.sessions_attended}</span>
                          </div>
                          {classData.meeting_link && (
                            <Button 
                              onClick={() => window.open(classData.meeting_link, '_blank')}
                              className="w-full mt-4"
                            >
                              Join Class
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      default:
        return <StudentClassesTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main Content with Centered Tabs */}
      <main className="flex-1 py-8 mt-4">
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
                <TabsTrigger 
                  value="group-classes" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background"
                  onClick={() => window.location.hash = "group-classes"}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Group Classes</span>
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
            <TabsContent value="group-classes" className="mt-0">
              {renderTabContent()}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default RedesignedStudentDashboard;
