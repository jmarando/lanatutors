import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, Video, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GroupClassEnrollment {
  id: string;
  enrollment_type: string;
  amount_paid: number;
  starts_at: string;
  expires_at: string;
  sessions_attended: number;
  payment_status: string;
  status: string;
  group_classes: {
    id: string;
    title: string;
    subject: string;
    curriculum: string;
    grade_level: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    meeting_link: string | null;
  };
}

interface GroupClassesTabProps {
  userId: string;
}

export default function GroupClassesTab({ userId }: GroupClassesTabProps) {
  const [enrollments, setEnrollments] = useState<GroupClassEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEnrollments();
  }, [userId]);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from("group_class_enrollments")
        .select(`
          *,
          group_classes (
            id,
            title,
            subject,
            curriculum,
            grade_level,
            day_of_week,
            start_time,
            end_time,
            meeting_link
          )
        `)
        .eq("student_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast({
        title: "Error",
        description: "Failed to load group classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleJoinClass = (meetingLink: string | null) => {
    if (!meetingLink) {
      toast({
        title: "Meeting link unavailable",
        description: "The meeting link will be available closer to class time",
        variant: "destructive",
      });
      return;
    }
    window.open(meetingLink, "_blank");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Group Classes</CardTitle>
          <CardDescription>Your enrolled group classes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No group classes enrolled yet.</p>
          <Button className="mt-4" onClick={() => window.location.href = "/group-classes"}>
            Browse Group Classes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">My Group Classes</h3>
        <div className="grid gap-4">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{enrollment.group_classes.title}</CardTitle>
                    <CardDescription>
                      {enrollment.group_classes.curriculum} • {enrollment.group_classes.grade_level}
                    </CardDescription>
                  </div>
                  <Badge variant={enrollment.payment_status === "completed" ? "default" : "secondary"}>
                    {enrollment.payment_status === "completed" ? "Active" : "Pending Payment"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{enrollment.group_classes.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{enrollment.group_classes.day_of_week}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      {formatTime(enrollment.group_classes.start_time)} - {formatTime(enrollment.group_classes.end_time)} EAT
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Expires:</span>
                    <span>{formatDate(enrollment.expires_at)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sessions attended: </span>
                    <span className="font-medium">{enrollment.sessions_attended}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleJoinClass(enrollment.group_classes.meeting_link)}
                    disabled={!enrollment.group_classes.meeting_link || enrollment.payment_status !== "completed"}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Class
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}