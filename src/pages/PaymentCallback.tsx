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
      // Pesapal can send the tracking ID in different formats
      const orderTrackingId = searchParams.get("OrderTrackingId") || 
                               searchParams.get("orderTrackingId") ||
                               searchParams.get("order_tracking_id");

      console.log("Payment callback received with OrderTrackingId:", orderTrackingId);
      console.log("All URL params:", Object.fromEntries(searchParams.entries()));

      if (!orderTrackingId) {
        console.error("No OrderTrackingId found in URL");
        setStatus("error");
        return;
      }

      try {
        // Poll for payment status for up to 30 seconds
        let attempts = 0;
        const maxAttempts = 15; // 15 attempts * 2 seconds = 30 seconds
        
        while (attempts < maxAttempts) {
          const { data: payment, error: paymentError } = await supabase
            .from("payments")
            .select("reference_id, payment_type, status")
            .eq("pesapal_order_tracking_id", orderTrackingId)
            .single();

          if (paymentError) {
            console.error("Payment lookup error:", paymentError);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          console.log("Payment found:", payment);

          // If payment is completed, redirect
          if (payment.status === "completed") {
            if (payment.payment_type === "booking" && payment.reference_id) {
              setBookingId(payment.reference_id);
              setStatus("success");
              return;
            } else {
              setStatus("success");
              return;
            }
          }

          // If still pending, wait and retry
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // If we get here, payment wasn't completed in time
        console.warn("Payment processing timeout");
        setStatus("error");
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
