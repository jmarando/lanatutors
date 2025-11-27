import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateLearningPlanForm } from "./CreateLearningPlanForm";

interface LearningPlanRequestsProps {
  tutorProfileId: string;
}

export const LearningPlanRequests = ({ tutorProfileId }: LearningPlanRequestsProps) => {
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [learningPlans, setLearningPlans] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tutorProfileId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch inquiries
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from("tutor_inquiries")
        .select("*")
        .eq("tutor_id", tutorProfileId)
        .order("created_at", { ascending: false });

      if (inquiriesError) throw inquiriesError;
      setInquiries(inquiriesData || []);

      // Fetch learning plans
      const { data: plansData, error: plansError } = await supabase
        .from("learning_plans")
        .select("*, tutor_inquiries(parent_name, parent_email, student_name)")
        .eq("tutor_id", tutorProfileId)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;
      setLearningPlans(plansData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load learning plan requests");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setShowCreateForm(true);
  };

  const handlePlanCreated = () => {
    setShowCreateForm(false);
    setSelectedInquiry(null);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "proposed":
        return "bg-blue-500";
      case "accepted":
        return "bg-green-500";
      case "declined":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Inquiries */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          New Requests ({inquiries.filter(i => i.status === "pending").length})
        </h3>
        {inquiries.filter(i => i.status === "pending").length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No new learning plan requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inquiries
              .filter(i => i.status === "pending")
              .map((inquiry) => (
                <Card key={inquiry.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            {inquiry.student_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Parent: {inquiry.parent_name}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Grade Level:</span>
                            <p className="font-medium">{inquiry.grade_level}</p>
                          </div>
                          {inquiry.curriculum && (
                            <div>
                              <span className="text-muted-foreground">Curriculum:</span>
                              <p className="font-medium">{inquiry.curriculum}</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-sm text-muted-foreground">Subjects Needed:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {inquiry.subjects_needed?.map((subject: string) => (
                              <Badge key={subject} variant="secondary">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {inquiry.current_challenges && (
                          <div>
                            <span className="text-sm text-muted-foreground">Challenges:</span>
                            <p className="text-sm mt-1">{inquiry.current_challenges}</p>
                          </div>
                        )}

                        {inquiry.preferred_sessions && (
                          <div>
                            <span className="text-sm text-muted-foreground">
                              Preferred Sessions:
                            </span>
                            <p className="text-sm font-medium">{inquiry.preferred_sessions} sessions</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Received: {format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button onClick={() => handleCreatePlan(inquiry)} className="w-full lg:w-auto">
                          <FileText className="w-4 h-4 mr-2" />
                          Create Learning Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Created Learning Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          My Learning Plans ({learningPlans.length})
        </h3>
        {learningPlans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No learning plans created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {learningPlans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">{plan.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {plan.tutor_inquiries?.student_name} - {plan.tutor_inquiries?.parent_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Sessions:</span>
                          <p className="font-medium">{plan.total_sessions}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Price:</span>
                          <p className="font-medium">KES {plan.total_price?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Validity:</span>
                          <p className="font-medium">{plan.validity_days} days</p>
                        </div>
                      </div>

                      {plan.notes && (
                        <div>
                          <span className="text-sm text-muted-foreground">Notes:</span>
                          <p className="text-sm mt-1">{plan.notes}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(plan.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Learning Plan Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Learning Plan</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <CreateLearningPlanForm
              inquiry={selectedInquiry}
              tutorProfileId={tutorProfileId}
              onSuccess={handlePlanCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
