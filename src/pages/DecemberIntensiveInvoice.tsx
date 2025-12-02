import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FileText, CreditCard } from "lucide-react";
import lanaLogo from "@/assets/lana-tutors-invoice-logo.png";

interface CartItem {
  id: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
}

const DecemberIntensiveInvoice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);

  const amountToPay = parseInt(searchParams.get("amount") || "0");
  const totalAmount = parseInt(searchParams.get("total") || "0");
  const depositAmount = parseInt(searchParams.get("deposit") || "0");
  const balanceDue = parseInt(searchParams.get("balance") || "0");
  const subjects = parseInt(searchParams.get("subjects") || "0");
  const studentName = searchParams.get("student") || "";
  const parentPhone = searchParams.get("phone") || "";
  const parentEmail = searchParams.get("email") || "";
  const paymentOption = searchParams.get("option") as "deposit" | "full" || "deposit";

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate(`/login?redirect=${encodeURIComponent('/december-intensive/enroll')}`);
      return;
    }
    loadCartFromStorage();
    fetchProgram();
  }, [user, navigate]);

  const loadCartFromStorage = () => {
    const saved = localStorage.getItem("december_intensive_cart");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.selectedClasses && data.selectedClasses.length > 0) {
          setCartItems(data.selectedClasses);
        }
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    }
  };

  const fetchProgram = async () => {
    const { data } = await supabase
      .from("intensive_programs")
      .select("id")
      .eq("is_active", true)
      .single();
    if (data) setProgramId(data.id);
  };

  const handleProceedToPayment = async () => {
    if (!user?.id || !programId) {
      toast.error("Missing required data");
      return;
    }

    setLoading(true);

    try {
      const enrolledClassIds = cartItems.map((item) => item.id);

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("intensive_enrollments")
        .insert({
          program_id: programId,
          student_id: user.id,
          enrolled_class_ids: enrolledClassIds,
          total_subjects: cartItems.length,
          total_amount: totalAmount,
          payment_status: paymentOption === "deposit" ? "deposit_paid" : "pending",
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Initiate Pesapal payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: amountToPay,
            phoneNumber: parentPhone,
            email: parentEmail,
            paymentType: "intensive_enrollment",
            referenceId: enrollment.id,
            description: `December Holiday Bootcamp - ${cartItems.length} subject(s) for ${studentName}${paymentOption === "deposit" ? " (30% Deposit)" : ""}`,
            studentNames: studentName,
            paymentOption: paymentOption,
            totalAmount: totalAmount,
            balanceDue: paymentOption === "deposit" ? balanceDue : 0,
            appOrigin: window.location.origin,
          },
        }
      );

      if (paymentError) throw paymentError;

      localStorage.removeItem("december_intensive_cart");

      if (paymentData?.redirect_url) {
        window.location.href = paymentData.redirect_url;
      } else {
        toast.success("Enrollment created!");
        navigate("/student/dashboard");
      }
    } catch (error) {
      console.error("Error processing enrollment:", error);
      toast.error("Failed to process enrollment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <SEO
        title="Invoice - December Holiday Bootcamp | LANA Tutors"
        description="Review your December Holiday Bootcamp enrollment invoice."
      />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Invoice Card */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <img src={lanaLogo} alt="LANA Tutors" className="h-12" />
              <div className="text-right">
                <CardTitle className="text-xl">Invoice</CardTitle>
                <p className="text-sm text-muted-foreground">{today}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Bill To:</p>
                <p className="font-medium">{studentName || "Student"}</p>
                <p className="text-muted-foreground">{parentEmail}</p>
                <p className="text-muted-foreground">{parentPhone}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Program:</p>
                <p className="font-medium">December Holiday Bootcamp 2025</p>
                <p className="text-muted-foreground">December 8-19, 2025</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{item.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.curriculum} • {item.gradeLevel} • 10 sessions × 75 min
                        </p>
                      </td>
                      <td className="p-3 text-right">
                        KES {item.curriculum === "A-Level" || item.curriculum === "IB"
                          ? "6,000"
                          : item.curriculum === "IGCSE"
                          ? "5,000"
                          : item.curriculum === "CBC"
                          ? "100" // Test price
                          : "4,000"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({subjects} subjects)</span>
                <span>KES {totalAmount.toLocaleString()}</span>
              </div>
              {paymentOption === "deposit" && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>30% Deposit</span>
                    <span>KES {depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance Due (before Dec 8)</span>
                    <span>KES {balanceDue.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Amount to Pay Now</span>
                <span className="text-primary">KES {amountToPay.toLocaleString()}</span>
              </div>
            </div>

            {/* Program Info */}
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-1">
              <p><strong>Program Dates:</strong> December 8-19, 2025 (Mon-Fri)</p>
              <p><strong>Daily Schedule:</strong> 8:00 AM - 5:15 PM EAT</p>
              <p><strong>Session Duration:</strong> 75 minutes each</p>
              <p><strong>Class Size:</strong> Maximum 15 students</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={handleProceedToPayment} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay KES {amountToPay.toLocaleString()} via Pesapal
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to Pesapal to complete payment via M-Pesa, Card, or other methods.
          </p>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensiveInvoice;
