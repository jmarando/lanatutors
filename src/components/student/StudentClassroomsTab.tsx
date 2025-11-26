import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, BookOpen, FileText, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Classroom {
  id: string;
  name: string;
  subject: string;
  link: string;
  bookingId: string;
  createdAt: string;
}

export function StudentClassroomsTab() {
  const { toast } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndClassrooms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchClassrooms(user.id);
      }
      setLoading(false);
    };
    fetchUserAndClassrooms();
  }, []);

  const fetchClassrooms = async (studentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-student-classrooms", {
        body: { studentId },
      });

      if (error) throw error;

      if (data?.classrooms) {
        setClassrooms(data.classrooms);
      }
    } catch (error: any) {
      console.error("Error fetching classrooms:", error);
      toast({
        title: "Error",
        description: "Failed to load your classrooms",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading classrooms...</p>
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">No Classrooms Yet</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                When you book a session, a Google Classroom will be automatically created where your tutor can share materials, assignments, and track your progress.
              </p>
            </div>
            <Button asChild className="mt-4">
              <a href="/tutors">Find a Tutor</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Your Classrooms</h2>
        <p className="text-muted-foreground">
          Access your Google Classrooms to view materials, complete assignments, and track your progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map((classroom) => (
          <Card key={classroom.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{classroom.subject}</CardTitle>
                  <CardDescription className="text-sm">
                    Created {new Date(classroom.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="ml-2">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Materials & Worksheets</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Assignments & Deadlines</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>Announcements</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => window.open(classroom.link, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Classroom
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-blue-900 dark:text-blue-100">
                About Google Classroom
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your tutors use Google Classroom to share lesson materials, assign homework, provide feedback, and track your progress. 
                Check regularly for new materials and upcoming assignments!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
