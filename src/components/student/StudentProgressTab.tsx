import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, TrendingUp } from "lucide-react";

interface StudentProgress {
  id: string;
  subject: string;
  progress_percentage: number;
  total_sessions: number;
  notes: string | null;
  last_updated: string;
}

export function StudentProgressTab() {
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", user.id)
        .order("subject", { ascending: true });

      if (fetchError) throw fetchError;

      setProgressData(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Progress Data Yet</h3>
        <p className="text-muted-foreground">
          Your tutors will track your progress as you complete sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Learning Progress</h2>
        <p className="text-muted-foreground">
          Track your progress across all subjects with your tutors.
        </p>
      </div>

      <div className="grid gap-6">
        {progressData.map((item) => (
          <Card key={item.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{item.subject}</h3>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {item.progress_percentage}%
                  </span>
                </div>
                
                <Progress value={item.progress_percentage} className="h-3" />
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{item.total_sessions || 0} sessions completed</span>
                  <span>
                    Last updated: {new Date(item.last_updated).toLocaleDateString()}
                  </span>
                </div>

                {item.notes && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Tutor Notes:</p>
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
