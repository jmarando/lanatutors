import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function TestBookingEmail() {
  const [bookingId, setBookingId] = useState("339bac43-e95d-4167-8195-4d570b4fec9a");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    setLoading(true);
    setResult(null);
    try {
      console.log("Triggering test email for booking:", bookingId);
      
      const { data, error } = await supabase.functions.invoke("send-booking-email", {
        body: {
          bookingId,
          meetingLink: "https://meet.google.com/test-meeting-link",
          recipientType: "both"
        },
      });

      if (error) {
        console.error("Error sending email:", error);
        throw error;
      }

      console.log("Email send result:", data);
      setResult(data);

      toast({
        title: "Success",
        description: "Booking confirmation email sent successfully!",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Booking Confirmation Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Booking ID</Label>
              <Input
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="Enter booking ID"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: Justin Anyona's Mathematics booking (600 KES deposit)
              </p>
            </div>

            <Button 
              onClick={handleSendEmail}
              disabled={loading || !bookingId}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                "Send Booking Confirmation Email"
              )}
            </Button>

            {result && (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
