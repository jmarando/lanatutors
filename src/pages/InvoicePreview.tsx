import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Calendar, User, Book, CreditCard, Clock, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import lanaLogo from "@/assets/lana-tutors-logo-hd.png";

export default function InvoicePreview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const bookingId = searchParams.get("bookingId");
  const packageId = searchParams.get("packageId");
  const type = searchParams.get("type"); // 'booking', 'package', 'balance'
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!type || (!bookingId && !packageId)) {
      toast({
        title: "Error",
        description: "Invalid invoice request",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchInvoiceData();
  }, [bookingId, packageId, type]);

  const fetchInvoiceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      if (type === "booking" || type === "balance") {
        // Fetch booking details
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select(`
            *,
            tutor_availability(start_time, end_time)
          `)
          .eq("id", bookingId)
          .single();

        if (bookingError) throw bookingError;

        // Fetch tutor profile
        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("*")
          .eq("user_id", booking.tutor_id)
          .single();

        // Fetch tutor name from profiles
        const { data: tutorNameData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", booking.tutor_id)
          .single();

        setInvoiceData({
          type: type,
          bookingId: booking.id,
          tutorName: tutorNameData?.full_name || "Tutor",
          subject: booking.subject,
          startTime: booking.tutor_availability?.start_time,
          endTime: booking.tutor_availability?.end_time,
          classType: booking.class_type,
          totalAmount: booking.amount,
          depositPaid: booking.deposit_paid || 0,
          balanceDue: booking.balance_due || 0,
          paymentOption: booking.payment_option,
          currency: booking.currency || "KES",
          amountToPay: type === "balance" ? booking.balance_due : (booking.payment_option === "full" ? booking.amount : booking.amount * 0.3),
        });
      } else if (type === "package") {
        // Fetch package details
        const { data: packagePurchase, error: packageError } = await supabase
          .from("package_purchases")
          .select("*")
          .eq("id", packageId)
          .single();

        if (packageError) throw packageError;

        // Fetch tutor profile
        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("*")
          .eq("id", packagePurchase.tutor_id)
          .single();

        // Fetch tutor name from profiles
        const { data: tutorNameData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", tutorProfile?.user_id)
          .single();

        const metadata = packagePurchase.metadata as any;

        setInvoiceData({
          type: "package",
          packageId: packagePurchase.id,
          tutorName: tutorNameData?.full_name || "Multiple Tutors",
          totalSessions: packagePurchase.total_sessions,
          subjects: metadata?.subjects || [],
          totalAmount: packagePurchase.total_amount,
          amountPaid: packagePurchase.amount_paid || 0,
          paymentOption: metadata?.paymentOption || "full",
          currency: packagePurchase.currency || "KES",
          amountToPay: metadata?.paymentOption === "deposit" ? packagePurchase.total_amount * 0.3 : packagePurchase.total_amount,
          expiresAt: packagePurchase.expires_at,
        });
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`lana-tutors-invoice-${invoiceData.bookingId || invoiceData.packageId}.pdf`);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleProceedToPayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .single();

      if (!profile?.phone_number) {
        toast({
          title: "Phone number required",
          description: "Please add a phone number to your profile",
          variant: "destructive",
        });
        return;
      }

      const description = type === "package"
        ? `${invoiceData.totalSessions} session package`
        : `${invoiceData.subject} tutoring session`;

      const { data, error } = await supabase.functions.invoke("initiate-pesapal-payment", {
        body: {
          amount: Math.round(invoiceData.amountToPay),
          currency: invoiceData.currency,
          description,
          phoneNumber: profile.phone_number,
          paymentType: type === "balance" ? "booking_balance" : type === "package" ? "package_purchase" : "booking",
          referenceId: type === "package" ? invoiceData.packageId : invoiceData.bookingId,
          callbackUrl: window.location.origin + "/payment-callback",
        },
      });

      if (error) throw error;

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast({
        title: "Payment failed",
        description: "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoiceData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div ref={invoiceRef}>
          <CardHeader className="text-center border-b">
            {/* Logo and Branding */}
            <div className="flex flex-col items-center mb-6">
              <img 
                src={lanaLogo} 
                alt="Lana Tutors" 
                className="h-16 mb-4"
              />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">LANA TUTORS</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Expert tutoring for CBC, IGCSE, A-Levels & more. Empowering students to achieve their academic goals with personalized learning.
                </p>
                <p className="text-xs text-muted-foreground">
                  📧 info@lanatutors.africa | 📱 WhatsApp: +254 700 000 000
                </p>
              </div>
            </div>

            <Separator className="mb-6" />

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Invoice</CardTitle>
            <CardDescription>
              Review your booking details before completing payment
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
          {/* Booking Details */}
          {type === "booking" || type === "balance" ? (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Session Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tutor:</span>
                    <p className="font-medium">{invoiceData.tutorName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-medium">{invoiceData.subject}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Class Type:</span>
                    <p className="font-medium capitalize">{invoiceData.classType}</p>
                  </div>
                  {invoiceData.startTime && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Date & Time:
                      </span>
                      <p className="font-medium">
                        {format(new Date(invoiceData.startTime), "PPP 'at' p")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {Math.round((new Date(invoiceData.endTime).getTime() - new Date(invoiceData.startTime).getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Package Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tutor:</span>
                    <p className="font-medium">{invoiceData.tutorName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Sessions:</span>
                    <p className="font-medium">{invoiceData.totalSessions} sessions</p>
                  </div>
                  {invoiceData.subjects && invoiceData.subjects.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Subjects:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {invoiceData.subjects.map((subj: any, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                            {subj.subject} ({subj.sessions} sessions)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {invoiceData.expiresAt && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Valid Until:
                      </span>
                      <p className="font-medium">
                        {format(new Date(invoiceData.expiresAt), "PPP")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">
                  {invoiceData.currency} {invoiceData.totalAmount.toLocaleString()}
                </span>
              </div>
              
              {type !== "balance" && invoiceData.paymentOption === "deposit" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Option</span>
                    <span className="font-medium">30% Deposit</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Deposit (30%)</span>
                    <span className="font-medium">
                      {invoiceData.currency} {(invoiceData.totalAmount * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Balance Due Later</span>
                    <span>
                      {invoiceData.currency} {(invoiceData.totalAmount * 0.7).toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              {type === "balance" && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Already Paid (Deposit)</span>
                    <span className="font-medium">
                      {invoiceData.currency} {invoiceData.depositPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="font-medium">
                      {invoiceData.currency} {invoiceData.balanceDue.toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between pt-2">
                <span className="font-semibold text-lg">Amount to Pay Now</span>
                <span className="font-bold text-2xl text-primary">
                  {invoiceData.currency} {Math.round(invoiceData.amountToPay).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium">Payment Method: M-Pesa / Card</p>
            <p className="text-muted-foreground text-xs">
              You will be redirected to Pesapal to complete your payment securely.
            </p>
          </div>
        </CardContent>
        </div>

        <CardContent className="space-y-3 pb-6">
          <Button 
            onClick={handleDownloadPDF}
            disabled={downloading}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Invoice as PDF
              </>
            )}
          </Button>

          <Button 
            onClick={handleProceedToPayment}
            disabled={processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Payment...
              </>
            ) : (
              `Proceed to Pay ${invoiceData.currency} ${Math.round(invoiceData.amountToPay).toLocaleString()}`
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
            disabled={processing}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
