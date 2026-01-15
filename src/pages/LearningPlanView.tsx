import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, FileText, Share2, Copy, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import lanaLogo from "@/assets/lana-tutors-logo.png";
const LearningPlanView = () => {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPublicView, setIsPublicView] = useState(false);

  // Check if this is a public view via share token
  const shareToken = searchParams.get("token");

  useEffect(() => {
    fetchPlan();
  }, [planId, shareToken]);

  const fetchPlan = async () => {
    try {
      // First try to fetch by url_slug (for pretty URLs like /learning-plan/john-doe-abc123)
      // If planId looks like a UUID, also try by ID for backwards compatibility
      const isUUID = planId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
      
      let planData = null;
      let isPublic = false;

      // If share token is provided, fetch via share token (legacy support)
      if (shareToken) {
        const { data, error } = await supabase
          .from("learning_plans")
          .select("*")
          .eq("share_token", shareToken)
          .single();

        if (error) throw error;
        planData = data;
        isPublic = true;
      } else if (planId) {
        // Try by url_slug first (for pretty URLs), then by ID
        // Try by slug first (unless it's a UUID)
        if (!isUUID) {
          const { data, error } = await supabase
            .from("learning_plans")
            .select("*")
            .eq("url_slug", planId)
            .single();
          
          if (!error) {
            planData = data;
            isPublic = true;
          }
        }

        // If not found by slug (or is UUID), try by ID
        if (!planData && isUUID) {
          const { data, error } = await supabase
            .from("learning_plans")
            .select("*")
            .eq("id", planId)
            .single();
          
          if (!error) {
            planData = data;
            isPublic = false;
          }
        }
      }

      if (planData) {
        // Fetch tutor name separately using the public view (which allows anon access)
        if (planData.tutor_id) {
          const { data: tutorData } = await supabase
            .from("tutor_profiles_public")
            .select("user_id")
            .eq("id", planData.tutor_id)
            .single();
          
          if (tutorData?.user_id) {
            const { data: profileData } = await supabase
              .from("public_tutor_profiles")
              .select("full_name")
              .eq("id", tutorData.user_id)
              .single();
            
            planData.profiles = profileData;
          }
        }
        
        setPlan(planData);
        setIsPublicView(isPublic);
      }
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      toast.error("Failed to load learning plan");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!plan?.url_slug && !plan?.share_token) {
      toast.error("Share link not available");
      return;
    }

    // Use prettier slug URL if available, otherwise fall back to token-based URL
    const shareUrl = plan.url_slug 
      ? `https://lanatutors.africa/learning-plan/${plan.url_slug}`
      : `https://lanatutors.africa/learning-plan/${plan.id}?token=${plan.share_token}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
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
        .eq("id", planId || plan?.id);

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
        title={`${plan.title} | Lana Tutors`}
        description={`Review your personalized learning plan`}
      />
      <div className="min-h-screen bg-secondary">
        {/* Branded Header */}
        <div className="bg-primary py-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <img 
              src={lanaLogo} 
              alt="Lana Tutors" 
              className="h-12 mx-auto mb-4"
            />
            
            {/* Tagline */}
            <p className="text-primary-foreground/90 text-sm tracking-[0.2em] uppercase mb-8">
              Empowering Students Through Personalized Learning
            </p>
            
            {/* Plan Title Card */}
            <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-3">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
                <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
                  Custom {plan.title}
                </h1>
              </div>
              <p className="text-primary-foreground/90 text-lg">
                with {plan.profiles?.full_name?.toUpperCase() || "LANA TUTORS TEAM"}
              </p>
              
              {/* Status Badge */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <Badge className={`${getStatusColor(plan.status)} text-white`}>
                  {plan.status}
                </Badge>
                {plan.share_token && !isPublicView && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share Link
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto py-8 px-4">

          {/* Share Link Info (for authenticated users) */}
          {(plan.url_slug || plan.share_token) && !isPublicView && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Share2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Share this learning plan
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Copy the link below to share this learning plan with others:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 bg-white dark:bg-blue-900 px-3 py-2 rounded text-xs break-all border">
                        {plan.url_slug 
                          ? `https://lanatutors.africa/learning-plan/${plan.url_slug}`
                          : `https://lanatutors.africa/learning-plan/${plan.id}?token=${plan.share_token}`
                        }
                      </code>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyLink}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Actions - Only show for non-public views and proposed status */}
          {!isPublicView && plan.status === "proposed" && (
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

          {/* Public view message */}
          {isPublicView && plan.status === "proposed" && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-blue-900 mb-2">
                  This is a preview of the learning plan
                </p>
                <p className="text-sm text-blue-700">
                  To accept or decline this plan, please log in to your account.
                </p>
                <Button className="mt-4" onClick={() => navigate("/login")}>
                  Log In to Accept
                </Button>
              </CardContent>
            </Card>
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