import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, TrendingUp, Loader2, Plus, Edit } from "lucide-react";
import { toast } from "sonner";

interface StudentProgressTrackerProps {
  tutorId: string;
}

interface StudentProgress {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  progress_percentage: number;
  notes: string;
  last_updated: string;
  total_sessions: number;
}

export const StudentProgressTracker = ({ tutorId }: StudentProgressTrackerProps) => {
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    fetchProgressData();
    fetchStudents();
  }, [tutorId]);

  const fetchProgressData = async () => {
    try {
      // Fetch from a student_progress table (we'll need to create this)
      const { data, error } = await supabase
        .from("student_progress")
        .select(`
          *,
          profiles!student_progress_student_id_fkey(full_name)
        `)
        .eq("tutor_id", tutorId)
        .order("last_updated", { ascending: false });

      if (error) {
        console.error("Error fetching progress:", error);
        setProgressData([]);
      } else {
        const formattedData = (data || []).map((item: any) => ({
          id: item.id,
          student_id: item.student_id,
          student_name: item.profiles?.full_name || "Unknown",
          subject: item.subject,
          progress_percentage: item.progress_percentage,
          notes: item.notes || "",
          last_updated: item.last_updated,
          total_sessions: item.total_sessions || 0,
        }));
        setProgressData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching progress data:", error);
      setProgressData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Get unique students from bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          student_id,
          profiles!bookings_student_id_fkey(full_name)
        `)
        .eq("tutor_id", tutorId);

      const uniqueStudents = Array.from(
        new Map(
          (bookingsData || []).map((b: any) => [
            b.student_id,
            { id: b.student_id, name: b.profiles?.full_name || "Unknown" },
          ])
        ).values()
      );

      setStudents(uniqueStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedStudent || !selectedSubject) {
      toast.error("Please select a student and subject");
      return;
    }

    try {
      const { error } = await supabase.from("student_progress").upsert({
        tutor_id: tutorId,
        student_id: selectedStudent,
        subject: selectedSubject,
        progress_percentage: progressPercentage,
        notes: notes,
        last_updated: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Progress updated successfully");
      setDialogOpen(false);
      fetchProgressData();
      
      // Reset form
      setSelectedStudent("");
      setSelectedSubject("");
      setProgressPercentage(0);
      setNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to save progress");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Student Progress
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Track Progress
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Student Progress</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Student</label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Geography">Geography</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Progress: {progressPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercentage}
                    onChange={(e) => setProgressPercentage(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about the student's progress..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleSaveProgress} className="w-full">
                  Save Progress
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {progressData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No student progress tracked yet</p>
            <p className="text-xs mt-1">Click "Track Progress" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {progressData.map((progress) => (
              <div key={progress.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{progress.student_name}</h4>
                    <p className="text-sm text-muted-foreground">{progress.subject}</p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {progress.progress_percentage}%
                  </Badge>
                </div>

                <Progress value={progress.progress_percentage} className="h-2" />

                {progress.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {progress.notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Last updated: {new Date(progress.last_updated).toLocaleDateString()}
                  </span>
                  {progress.total_sessions > 0 && (
                    <span>{progress.total_sessions} sessions completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
