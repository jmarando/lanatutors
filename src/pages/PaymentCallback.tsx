import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "processing" | "success" | "error";

interface PaymentInfo {
  reference_id: string | null;
  payment_type: string | null;
  status: string | null;
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Pesapal can send the tracking ID in different formats
      const orderTrackingId = searchParams.get("OrderTrackingId") || 
                               searchParams.get("orderTrackingId") ||
                               searchParams.get("order_tracking_id");

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
          // Prefer backend status check to avoid RLS / auth issues
          const { data, error } = await supabase.functions.invoke("get-payment-status", {
            body: { orderTrackingId },
          });

          if (error) {
            console.error("Payment status function error:", error);
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          const payment = (data?.payment as PaymentInfo | null) ?? null;

          if (!payment) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          // If payment is completed, process accordingly
          if (payment.status === "completed") {
            // Handle package purchases with recurring slots
            if (payment.payment_type === "package_purchase" && payment.reference_id) {
              try {
                await supabase.functions.invoke("block-recurring-slots", {
                  body: { packagePurchaseId: payment.reference_id },
                });
              } catch (error) {
                console.error("Error blocking recurring slots:", error);
                // Continue anyway - slots can be manually blocked later
              }
            }

            // Store payment info for redirect
            setPaymentInfo(payment);
            setStatus("success");
            return;
          }

          // If still pending, wait and retry
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
    // Redirect to appropriate page based on payment type
    if (status === "success" && paymentInfo) {
      const redirectDelay = 1500;
      
      if (paymentInfo.payment_type === "intensive_enrollment" && paymentInfo.reference_id) {
        // December Intensive enrollment - redirect to confirmation page
        setTimeout(() => {
          navigate(`/december-intensive/confirmed?enrollment_id=${paymentInfo.reference_id}`);
        }, redirectDelay);
      } else if ((paymentInfo.payment_type === "booking" || paymentInfo.payment_type === "booking_balance") && paymentInfo.reference_id) {
        // Booking payment - redirect to booking confirmed
        setTimeout(() => {
          navigate(`/booking-confirmed?bookingId=${paymentInfo.reference_id}`);
        }, redirectDelay);
      } else if (paymentInfo.payment_type === "package_purchase" && paymentInfo.reference_id) {
        // Package purchase - redirect to package confirmed
        setTimeout(() => {
          navigate(`/package-confirmed?packageId=${paymentInfo.reference_id}`);
        }, redirectDelay);
      } else {
        // Other payment - redirect to dashboard
        setTimeout(() => {
          navigate("/student/dashboard");
        }, redirectDelay);
      }
    }
  }, [status, paymentInfo, navigate]);

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

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground">
              {paymentInfo?.payment_type === "intensive_enrollment"
                ? "Redirecting to enrollment confirmation..."
                : paymentInfo?.payment_type === "booking" || paymentInfo?.payment_type === "booking_balance"
                ? "Redirecting to booking confirmation..."
                : paymentInfo?.payment_type === "package_purchase"
                ? "Redirecting to package confirmation..."
                : "Redirecting to dashboard..."}
            </p>
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
