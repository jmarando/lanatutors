import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RecordingPaymentProps {
  classId: string;
  className: string;
  onSuccess: () => void;
}

export const RecordingPayment = ({ classId, className, onSuccess }: RecordingPaymentProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async (paymentType: 'single_recording' | 'subscription') => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const amount = paymentType === 'subscription' ? 500 : 200;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: {
          phoneNumber: `254${phoneNumber.substring(1)}`,
          amount,
          paymentType: paymentType,
          classId: paymentType === 'single_recording' ? classId : null,
          referenceId: paymentType === 'single_recording' ? classId : null
        }
      });

      if (error) throw error;

      toast({
        title: "Payment Initiated",
        description: "Please check your phone and enter your M-Pesa PIN to complete the payment",
      });

      // Poll for payment completion (in production, use webhooks)
      setTimeout(() => {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. You'll be notified once complete.",
        });
        onSuccess();
      }, 5000);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Access Recording: {className}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a payment option to access this class recording
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="phone">M-Pesa Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={10}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter your Safaricom number (format: 07XXXXXXXX)
          </p>
        </div>

        <div className="grid gap-3">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">Single Recording</h4>
                <p className="text-sm text-muted-foreground">Access this recording only</p>
              </div>
              <span className="text-lg font-bold">KES 200</span>
            </div>
            <Button 
              onClick={() => handlePayment('single_recording')}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay KES 200'
              )}
            </Button>
          </div>

          <div className="border-2 border-primary rounded-lg p-4 space-y-2 bg-primary/5">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">Monthly Subscription</h4>
                <p className="text-sm text-muted-foreground">Unlimited access to all recordings</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">KES 500</span>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>
            <Button 
              onClick={() => handlePayment('subscription')}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe for KES 500/month'
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• You will receive an M-Pesa prompt on your phone</p>
        <p>• Enter your M-Pesa PIN to complete the payment</p>
        <p>• Access is granted immediately after successful payment</p>
      </div>
    </div>
  );
};
