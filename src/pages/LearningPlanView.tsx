import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";

const LearningPlanView = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      // Ensure the user is authenticated before loading the plan, otherwise RLS will hide it
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login; after login the parent can reopen the email link
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("learning_plans")
        .select(`
          *,
          tutor_profiles!inner(user_id),
          profiles!tutor_profiles_user_id_fkey(full_name)
        `)
        .eq("id", planId)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      toast.error("Failed to load learning plan");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      // Navigate to invoice preview with plan data
      navigate("/invoice-preview", {
        state: {
          type: "learning_plan",
          planId: plan.id,
          tutorId: plan.tutor_id,
          totalAmount: plan.total_price,
          items: plan.subjects,
          totalSessions: plan.total_sessions,
          currency: "KES",
        },
      });
    } catch (error: any) {
      console.error("Error accepting plan:", error);
      toast.error("Failed to proceed with payment");
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this learning plan?")) {
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("learning_plans")
        .update({ status: "declined" })
        .eq("id", planId);

      if (error) throw error;

      toast.success("Learning plan declined");
      navigate("/");
    } catch (error: any) {
      console.error("Error declining plan:", error);
      toast.error("Failed to decline plan");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Learning Plan Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This learning plan may have been removed or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
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

  return (
    <>
      <SEO
        title={`${plan.title} | LANA Tutors`}
        description={`Review your personalized learning plan`}
      />
      <div className="min-h-screen bg-[image:var(--gradient-page)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{plan.title}</CardTitle>
                  <p className="text-muted-foreground">
                    Tutor: {plan.profiles?.full_name || "LANA Tutors Team"}
                  </p>
                </div>
                <Badge className={getStatusColor(plan.status)}>
                  {plan.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Plan Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Learning Plan Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Subject</th>
                      <th className="text-center py-3 px-4 font-semibold">Sessions</th>
                      <th className="text-right py-3 px-4 font-semibold">Rate/Session</th>
                      <th className="text-right py-3 px-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.subjects?.map((subject: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">
                          <strong>{subject.name}</strong>
                        </td>
                        <td className="text-center py-3 px-4">{subject.sessions}</td>
                        <td className="text-right py-3 px-4">
                          KES {subject.rate?.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          <strong>KES {subject.total?.toLocaleString()}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-lg">
                <span>Total Sessions:</span>
                <span className="font-semibold">{plan.total_sessions}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Valid for:</span>
                <span className="font-semibold">{plan.validity_days} days</span>
              </div>
              {plan.discount_applied > 0 && (
                <div className="flex justify-between text-lg text-green-600">
                  <span>Discount Applied:</span>
                  <span className="font-semibold">{plan.discount_applied}%</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold border-t pt-3">
                <span>Total Investment:</span>
                <span>KES {plan.total_price?.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {plan.notes && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{plan.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {plan.status === "proposed" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={processing}
                className="flex-1"
              >
                Decline Plan
              </Button>
              <Button
                onClick={handleAccept}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          )}

          {plan.status === "accepted" && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <p className="text-lg font-semibold text-green-900 mb-1">
                  Plan Accepted!
                </p>
                <p className="text-sm text-green-700">
                  Your tutor will reach out shortly to schedule your first session.
                </p>
              </CardContent>
            </Card>
          )}

          {plan.status === "declined" && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-red-900">
                  This plan has been declined
                </p>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Questions? Contact us at{" "}
            <a
              href="mailto:info@lanatutors.africa"
              className="text-primary hover:underline"
            >
              info@lanatutors.africa
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default LearningPlanView;
