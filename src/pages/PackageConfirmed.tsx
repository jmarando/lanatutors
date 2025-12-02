import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Package, User, BookOpen, Mail, ArrowRight, Home, Calendar } from "lucide-react";

interface PackageDetails {
  id: string;
  total_sessions: number;
  sessions_remaining: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  tutor_name: string;
  student_name: string;
  student_email: string;
  created_at: string;
  subjects: string[];
}

const PackageConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const packageId = searchParams.get("packageId");
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) {
      toast.error("No package ID provided");
      navigate("/");
      return;
    }

    fetchPackageDetails();
  }, [packageId]);

  const fetchPackageDetails = async () => {
    try {
      // Fetch package purchase with related data
      const { data: packageData, error: packageError } = await supabase
        .from("package_purchases")
        .select(`
          *,
          tutor_profiles:tutor_id(user_id)
        `)
        .eq("id", packageId)
        .maybeSingle();

      if (packageError) throw packageError;
      if (!packageData) {
        toast.error("Package not found");
        setLoading(false);
        return;
      }

      // Fetch student details
      const { data: studentData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", packageData.student_id)
        .maybeSingle();

      const { data: studentUser } = await supabase.auth.getUser();

      // Fetch tutor name from profiles using tutor_profiles.user_id
      let tutorName = "Tutor";
      if (packageData.tutor_profiles?.user_id) {
        const { data: tutorData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", packageData.tutor_profiles.user_id)
          .maybeSingle();
        tutorName = tutorData?.full_name || "Tutor";
      }

      // Also check metadata for tutor name
      const metadata = packageData.metadata as any;
      if (metadata?.tutorName) {
        tutorName = metadata.tutorName;
      }

      // Fetch subject allocations
      const { data: allocations } = await supabase
        .from("package_subject_allocations")
        .select("subject, sessions_allocated")
        .eq("package_purchase_id", packageId);

      const subjects = allocations?.map(a => `${a.subject} (${a.sessions_allocated} sessions)`) || [];

      setPackageDetails({
        id: packageData.id,
        total_sessions: packageData.total_sessions,
        sessions_remaining: packageData.sessions_remaining,
        total_amount: packageData.total_amount,
        amount_paid: packageData.amount_paid || 0,
        payment_status: packageData.payment_status || 'pending',
        tutor_name: tutorName,
        student_name: studentData?.full_name || "Student",
        student_email: studentUser?.user?.email || "",
        created_at: packageData.created_at,
        subjects: subjects.length > 0 ? subjects : [`${packageData.total_sessions} sessions`],
      });
    } catch (error) {
      console.error("Error fetching package:", error);
      toast.error("Failed to load package details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading package details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!packageDetails) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Package not found</p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const balanceDue = packageDetails.total_amount - packageDetails.amount_paid;
  const isDepositPayment = balanceDue > 0;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Package Purchased!</h1>
            <p className="text-muted-foreground text-lg">
              Your tutoring package has been successfully purchased
            </p>
          </div>

          {/* Main Package Card */}
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Package</p>
                    <p className="font-semibold">{packageDetails.total_sessions} Session Bundle</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tutor</p>
                    <p className="font-semibold">{packageDetails.tutor_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions Included</p>
                    {packageDetails.subjects.map((subject, idx) => (
                      <p key={idx} className="font-semibold text-sm">{subject}</p>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions Available</p>
                    <p className="font-semibold">{packageDetails.sessions_remaining} sessions ready to book</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmation Email</p>
                    <p className="font-semibold text-sm">Sent to {packageDetails.student_email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={packageDetails.payment_status === 'completed' ? 'default' : 'secondary'}>
                      {packageDetails.payment_status === 'completed' ? 'Active' : 'Pending Payment'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardHeader className="bg-amber-50 dark:bg-amber-950">
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Package Price</span>
                  <span className="font-semibold">KES {packageDetails.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{isDepositPayment ? 'Deposit Paid (30%)' : 'Amount Paid'}</span>
                  <span className="font-semibold">KES {packageDetails.amount_paid.toLocaleString()}</span>
                </div>
                {isDepositPayment && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold text-red-600">
                      <span>Balance Due</span>
                      <span>KES {balanceDue.toLocaleString()}</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg mt-4">
                      <p className="text-sm text-red-900 dark:text-red-100">
                        ⚠️ Please pay the remaining balance before scheduling your sessions. You can complete payment from your Student Dashboard.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <p className="text-sm">
                    Check your email for the detailed package confirmation and next steps
                  </p>
                </li>
                {isDepositPayment && (
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      2
                    </span>
                    <p className="text-sm">
                      Complete the remaining payment from your Student Dashboard
                    </p>
                  </li>
                )}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {isDepositPayment ? "3" : "2"}
                  </span>
                  <p className="text-sm">
                    Go to your Student Dashboard to schedule your sessions with {packageDetails.tutor_name}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {isDepositPayment ? "4" : "3"}
                  </span>
                  <p className="text-sm">
                    Your tutor will receive notification of your purchase and be ready to help you learn!
                  </p>
                </li>
              </ol>

              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button onClick={() => navigate("/student/dashboard")} className="flex-1">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button onClick={() => navigate("/tutors")} variant="outline" className="flex-1">
                  Browse More Tutors
                </Button>
                <Button onClick={() => navigate("/")} variant="ghost">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PackageConfirmed;