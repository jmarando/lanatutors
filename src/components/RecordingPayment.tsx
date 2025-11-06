import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RecordingPaymentProps {
  classId: string;
  className: string;
  onSuccess: () => void;
}

export const RecordingPayment = ({ classId, className, onSuccess }: RecordingPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async (paymentType: 'single_recording' | 'subscription') => {
    setLoading(true);
    
    try {
      const amount = paymentType === 'subscription' ? 500 : 200;
      const description = paymentType === 'subscription' 
        ? 'Monthly Recording Subscription'
        : `Recording: ${className}`;

      const { data, error } = await supabase.functions.invoke('initiate-pesapal-payment', {
        body: {
          amount,
          description,
          paymentType: paymentType,
          referenceId: paymentType === 'single_recording' ? classId : null,
          callbackUrl: window.location.origin + '/payment-callback',
        }
      });

      if (error) throw error;

      // Redirect to Pesapal payment page
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        throw new Error('No redirect URL received from payment gateway');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
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
                  Redirecting...
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
                  Redirecting...
                </>
              ) : (
                'Subscribe for KES 500/month'
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• You will be redirected to secure Pesapal payment page</p>
        <p>• Pay using M-Pesa, card, or bank transfer</p>
        <p>• Access is granted immediately after successful payment</p>
      </div>
    </div>
  );
};
