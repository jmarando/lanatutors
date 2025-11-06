import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PaymentStatus = "processing" | "success" | "error";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    const processCallback = () => {
      const orderTrackingId = searchParams.get("OrderTrackingId");

      if (!orderTrackingId) {
        setStatus("error");
        setMessage("Invalid payment callback. Missing order information.");
        return;
      }

      // Payment was successful if we got redirected here from Pesapal
      setStatus("success");
      setMessage("Payment received successfully! Your booking is confirmed.");
    };

    processCallback();
  }, [searchParams]);

  const handleContinue = () => {
    navigate("/student/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === "processing" && (
              <>
                <div className="flex justify-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                </div>
                <h1 className="text-2xl font-bold">Processing Payment</h1>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
                <p className="text-muted-foreground">{message}</p>
                <Button onClick={handleContinue} className="w-full mt-4">
                  Continue to Dashboard
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="flex justify-center">
                  <XCircle className="w-16 h-16 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-destructive">Payment Failed</h1>
                <p className="text-muted-foreground">{message}</p>
                <Button onClick={() => navigate("/tutors")} className="w-full mt-4">
                  Back to Tutors
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
