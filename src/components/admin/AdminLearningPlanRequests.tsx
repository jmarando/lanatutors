import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  User, Mail, Phone, BookOpen, Clock, Calendar, 
  CheckCircle, XCircle, MessageCircle, ChevronDown, ChevronUp,
  GraduationCap, FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LearningPlanRequest {
  id: string;
  parent_id: string | null;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  student_name: string;
  grade_level: string;
  curriculum: string | null;
  subjects: string[];
  last_exam_performance: string | null;
  challenges: string | null;
  preferred_sessions: number | null;
  desired_duration_weeks: number | null;
  available_time_per_week: string | null;
  account_type: string;
  status: string;
  admin_notes: string | null;
  assigned_tutor_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Tutor {
  id: string;
  user_id: string;
  subjects: string[];
  profiles?: { full_name: string };
}

export const AdminLearningPlanRequests = () => {
  const [requests, setRequests] = useState<LearningPlanRequest[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesContent, setNotesContent] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchRequests();
    fetchTutors();
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("general_learning_plan_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchTutors = async () => {
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select("id, user_id, subjects")
      .eq("verified", true);

    if (error) {
      console.error("Error fetching tutors:", error);
      return;
    }

    // Enrich with profile names
    const enriched = await Promise.all(
      (data || []).map(async (tutor) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", tutor.user_id)
          .single();
        return { ...tutor, profiles: profile };
      })
    );

    setTutors(enriched);
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("general_learning_plan_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${status}`);
      fetchRequests();
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase
      .from("general_learning_plan_requests")
      .update({ admin_notes: notesContent, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      setEditingNotes(null);
      fetchRequests();
    }
  };

  const assignTutor = async (requestId: string, tutorId: string) => {
    const { error } = await supabase
      .from("general_learning_plan_requests")
      .update({ 
        assigned_tutor_id: tutorId, 
        status: 'in_progress',
        updated_at: new Date().toISOString() 
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to assign tutor");
    } else {
      toast.success("Tutor assigned");
      fetchRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "destructive", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      plan_sent: { variant: "secondary", label: "Plan Sent" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "outline", label: "Cancelled" },
    };
    const { variant, label } = variants[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const filteredRequests = statusFilter === "all" 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Learning Plan Requests</h2>
          <p className="text-muted-foreground">
            Manage requests from parents for personalized learning plans
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="plan_sent">Plan Sent</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No learning plan requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const isExpanded = expandedId === request.id;
            const assignedTutor = tutors.find(t => t.id === request.assigned_tutor_id);

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : request.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{request.student_name}</CardTitle>
                        {getStatusBadge(request.status)}
                        <Badge variant="outline">{request.account_type}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.parent_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {request.parent_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4 space-y-6">
                    {/* Student Details */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Student Information
                        </h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grade Level:</span>
                            <span className="font-medium">{request.grade_level}</span>
                          </div>
                          {request.curriculum && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Curriculum:</span>
                              <span className="font-medium">{request.curriculum}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subjects:</span>
                            <span className="font-medium">{request.subjects.join(", ")}</span>
                          </div>
                          {request.preferred_sessions && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Preferred Sessions:</span>
                              <span className="font-medium">{request.preferred_sessions}</span>
                            </div>
                          )}
                          {request.desired_duration_weeks && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">{request.desired_duration_weeks} weeks</span>
                            </div>
                          )}
                          {request.available_time_per_week && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Available Time:</span>
                              <span className="font-medium">{request.available_time_per_week}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact & Notes
                        </h4>
                        <div className="grid gap-2 text-sm">
                          {request.parent_phone && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone:</span>
                              <a href={`tel:${request.parent_phone}`} className="font-medium text-primary hover:underline">
                                {request.parent_phone}
                              </a>
                            </div>
                          )}
                          {request.last_exam_performance && (
                            <div>
                              <span className="text-muted-foreground">Last Exam Performance:</span>
                              <p className="mt-1">{request.last_exam_performance}</p>
                            </div>
                          )}
                          {request.challenges && (
                            <div>
                              <span className="text-muted-foreground">Challenges & Goals:</span>
                              <p className="mt-1">{request.challenges}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Admin Notes
                      </h4>
                      {editingNotes === request.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesContent}
                            onChange={(e) => setNotesContent(e.target.value)}
                            placeholder="Add notes about this request..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveNotes(request.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-3 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                          onClick={() => {
                            setEditingNotes(request.id);
                            setNotesContent(request.admin_notes || "");
                          }}
                        >
                          {request.admin_notes || <span className="text-muted-foreground italic">Click to add notes...</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Assign Tutor:</span>
                        <Select 
                          value={request.assigned_tutor_id || ""} 
                          onValueChange={(value) => assignTutor(request.id, value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select tutor" />
                          </SelectTrigger>
                          <SelectContent>
                            {tutors.map((tutor) => (
                              <SelectItem key={tutor.id} value={tutor.id}>
                                {tutor.profiles?.full_name || "Unknown"} - {tutor.subjects.slice(0, 2).join(", ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Select 
                          value={request.status} 
                          onValueChange={(value) => updateRequestStatus(request.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="plan_sent">Plan Sent</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`mailto:${request.parent_email}`, '_blank')}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                        {request.parent_phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://wa.me/${request.parent_phone.replace(/\D/g, '')}`, '_blank')}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
