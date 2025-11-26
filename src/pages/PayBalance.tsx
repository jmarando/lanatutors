import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PayBalance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const bookingId = searchParams.get("bookingId");
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      toast({
        title: "Error",
        description: "No booking ID provided",
        variant: "destructive",
      });
      navigate("/student/dashboard");
      return;
    }

    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_profile:tutor_profiles!tutor_id(*)
        `)
        .eq("id", bookingId)
        .eq("student_id", user.id)
        .single();

      if (error) throw error;

      if (!data.balance_due || data.balance_due <= 0) {
        toast({
          title: "No balance due",
          description: "This booking has no outstanding balance",
        });
        navigate("/student/dashboard");
        return;
      }

      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
      navigate("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handlePayBalance = async () => {
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

      const { data, error } = await supabase.functions.invoke("initiate-pesapal-payment", {
        body: {
          amount: booking.balance_due,
          currency: booking.currency || "KES",
          description: `Balance payment for ${booking.subject} session`,
          phoneNumber: profile.phone_number,
          paymentType: "booking_balance",
          referenceId: bookingId,
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
        description: "Failed to initiate balance payment",
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

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay Balance
          </CardTitle>
          <CardDescription>
            Complete payment for your {booking.subject} session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">
                {booking.currency} {booking.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid (Deposit)</span>
              <span className="font-medium text-green-600">
                {booking.currency} {booking.deposit_paid?.toLocaleString() || 0}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Balance Due</span>
              <span className="font-semibold text-lg">
                {booking.currency} {booking.balance_due.toLocaleString()}
              </span>
            </div>
          </div>

          <Button 
            onClick={handlePayBalance}
            disabled={processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${booking.currency} ${booking.balance_due.toLocaleString()}`
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/student/dashboard")}
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
