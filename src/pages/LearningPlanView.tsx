import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, FileText, Share2, Copy, Check, Phone, Mail, Building2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { analytics } from "@/utils/analytics";
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
        // Track learning plan view
        analytics.learningPlanViewed(planData.id);
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

    // Use the production URL
    const baseUrl = "https://lanatutors.africa";
    const shareUrl = plan.url_slug 
      ? `${baseUrl}/learning-plan/${plan.url_slug}`
      : `${baseUrl}/learning-plan/${plan.id}?token=${plan.share_token}`;
    
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

  const depositAmount = plan ? Math.round(plan.total_price * 0.3) : 0;
  const balanceAfterDeposit = plan ? plan.total_price - depositAmount : 0;

  // Extract student name from title (e.g., "Learning Plan for Ibrahim" -> "Ibrahim")
  const extractStudentName = () => {
    if (!plan?.title) return "your child";
    const match = plan.title.match(/Learning Plan for (.+)/i);
    return match ? match[1] : "your child";
  };

  // Calculate sessions per week
  const calculateSessionsPerWeek = () => {
    if (!plan?.validity_days || !plan?.total_sessions) return null;
    const weeks = plan.validity_days / 7;
    return Math.round(plan.total_sessions / weeks * 10) / 10;
  };

  // Generate auto intro message
  const generateAutoIntro = () => {
    const studentName = extractStudentName();
    const tutorName = plan?.profiles?.full_name || "our dedicated tutor";
    const sessionsPerWeek = calculateSessionsPerWeek();
    const weeks = plan?.validity_days ? Math.round(plan.validity_days / 7) : null;
    const subjectNames = plan?.subjects?.map((s: any) => s.name).join(", ") || "your selected subjects";
    
    return `We've designed a personalized learning journey for ${studentName}, covering ${subjectNames}. ${tutorName} will guide ${studentName} through ${sessionsPerWeek ? `${sessionsPerWeek} sessions per week over ${weeks} weeks` : 'regular sessions'} to build confidence and achieve academic success.`;
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
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E07A5F]" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Learning Plan Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This learning plan may have been removed or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/")} className="bg-[#E07A5F] hover:bg-[#D66A4F]">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionsPerWeek = calculateSessionsPerWeek();
  const weeks = plan?.validity_days ? Math.round(plan.validity_days / 7) : null;
  const studentName = extractStudentName();

  return (
    <>
      <SEO
        title={`${plan.title} | Lana Tutors`}
        description={`Review your personalized learning plan`}
      />
      <div className="min-h-screen bg-[#FDF8F6]">
        {/* Coral Header */}
        <div className="bg-[#E07A5F] py-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            {/* Logo */}
            <img 
              src={lanaLogo} 
              alt="Lana Tutors" 
              className="h-14 mx-auto mb-3"
            />
            
            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
              {plan.title}
            </h1>
            <p className="text-white/90">
              with {plan.profiles?.full_name || "Lana Tutors Team"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto py-8 px-4">
          
          {/* Auto-generated Personalized Introduction */}
          <Card className="mb-6 border-0 shadow-lg overflow-hidden bg-gradient-to-br from-[#FDF8F6] to-white">
            <CardContent className="p-6">
              <p className="text-gray-700 leading-relaxed text-center">
                {generateAutoIntro()}
              </p>
            </CardContent>
          </Card>

          {/* Schedule Overview Card - NEW */}
          <Card className="mb-6 border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">📅 Schedule Overview</h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-3xl font-bold text-blue-600">{plan.total_sessions}</p>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-3xl font-bold text-green-600">{sessionsPerWeek || "~"}</p>
                  <p className="text-sm text-gray-600">Per Week</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-3xl font-bold text-purple-600">{weeks || "~"}</p>
                  <p className="text-sm text-gray-600">Weeks</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-3xl font-bold text-amber-600">{plan.subjects?.length || 0}</p>
                  <p className="text-sm text-gray-600">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject Breakdown Card - REDESIGNED */}
          <Card className="mb-6 border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#E07A5F] to-[#D66A4F] text-white px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Subject Breakdown
              </h2>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                {plan.subjects?.map((subject: any, index: number) => {
                  // Calculate per-subject sessions per week if total sessions known
                  const subjectSessionsPerWeek = weeks ? Math.round((subject.sessions / weeks) * 10) / 10 : null;
                  
                  return (
                    <div key={index} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{subject.name}</h3>
                        <span className="font-bold text-[#E07A5F] text-lg">
                          KES {subject.total?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {subject.sessions} sessions
                        </span>
                        {subjectSessionsPerWeek && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {subjectSessionsPerWeek} per week
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          KES {subject.rate?.toLocaleString()}/session
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary Footer */}
              <div className="border-t bg-gradient-to-b from-gray-50 to-white p-6">
                {plan.discount_applied > 0 && (
                  <div className="flex justify-between text-green-600 mb-3">
                    <span>Discount Applied:</span>
                    <span className="font-semibold">-{plan.discount_applied}%</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2 border-t">
                  <span>Total Investment:</span>
                  <span className="text-[#E07A5F]">KES {plan.total_price?.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 text-right">
                  Valid for {plan.validity_days} days ({weeks} weeks)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Options Section */}
          {plan.status === "proposed" && (
            <div className="space-y-6 mb-8">
              {/* Payment Options Summary */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#E07A5F] to-[#D66A4F] text-white px-6 py-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Payment Options
                  </h3>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Full Payment */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#FDF8F6] to-white border-2 border-[#E07A5F]/20">
                      <p className="text-sm text-gray-500 mb-1">Pay in Full</p>
                      <p className="text-2xl font-bold text-[#E07A5F]">
                        KES {plan.total_price?.toLocaleString()}
                      </p>
                    </div>
                    
                    {/* 30% Deposit */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200/50">
                      <p className="text-sm text-gray-500 mb-1">Or Pay 30% Deposit</p>
                      <p className="text-2xl font-bold text-blue-600">
                        KES {depositAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Balance: KES {balanceAfterDeposit.toLocaleString()} due before sessions begin
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* M-Pesa Payment Details */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    M-Pesa Payment Details
                  </h3>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-600">NCBA Paybill</span>
                      <span className="font-bold text-gray-900 text-lg">880100</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-600">Account Number</span>
                      <span className="font-bold text-gray-900 text-lg">1006114657</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-600">Recipient</span>
                      <span className="font-bold text-gray-900">Lana Bespoke Limited</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> After making payment, please send a screenshot of your M-Pesa confirmation message via WhatsApp to confirm your booking.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Share link for admins */}
              {(plan.url_slug || plan.share_token) && !isPublicView && (
                <div className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Share Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
          {plan.status === "accepted" && (
            <Card className="mb-6 border-0 shadow-md bg-green-50">
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
            <Card className="mb-6 border-0 shadow-md bg-red-50">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-red-900">
                  This plan has been declined
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contact Section */}
          <div className="text-center border-t pt-6">
            <p className="text-gray-600 mb-4">Questions? We're here to help!</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://wa.me/254117512316" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#25D366] hover:underline"
              >
                <Phone className="w-4 h-4" />
                WhatsApp: +254 117 512 316
              </a>
              <a 
                href="mailto:info@lanatutors.africa"
                className="flex items-center gap-2 text-[#E07A5F] hover:underline"
              >
                <Mail className="w-4 h-4" />
                info@lanatutors.africa
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#E07A5F] py-4 px-4 mt-8">
          <p className="text-center text-white/80 text-sm">
            © 2025 Lana Tutors. Empowering students across Africa.
          </p>
        </div>
      </div>
    </>
  );
};

export default LearningPlanView;