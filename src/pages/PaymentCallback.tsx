import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "processing" | "success" | "error";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const orderTrackingId = searchParams.get("OrderTrackingId");

      if (!orderTrackingId) {
        setStatus("error");
        return;
      }

      try {
        // Find the payment record
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("reference_id, payment_type")
          .eq("pesapal_order_tracking_id", orderTrackingId)
          .single();

        if (paymentError || !payment) {
          console.error("Payment not found:", paymentError);
          setStatus("error");
          return;
        }

        // If it's a booking payment, redirect to booking confirmed page
        if (payment.payment_type === "booking" && payment.reference_id) {
          setBookingId(payment.reference_id);
          setStatus("success");
        } else {
          // For other payment types, just show success
          setStatus("success");
        }
      } catch (error) {
        console.error("Error processing callback:", error);
        setStatus("error");
      }
    };

    processCallback();
  }, [searchParams]);

  useEffect(() => {
    // Redirect to booking confirmed page if we have a booking ID
    if (status === "success" && bookingId) {
      navigate(`/booking-confirmed?bookingId=${bookingId}`);
    }
  }, [status, bookingId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        {status === "processing" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">Processing Payment</h1>
            <p className="text-muted-foreground">Please wait while we verify your payment...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive">Payment Verification Failed</h1>
            <p className="text-muted-foreground">
              We couldn't verify your payment. Please contact support if you were charged.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
