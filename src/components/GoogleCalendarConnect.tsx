import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleCalendarConnectProps {
  tutorId: string;
  isConnected?: boolean;
  calendarEmail?: string;
}

export const GoogleCalendarConnect = ({ 
  tutorId, 
  isConnected = false,
  calendarEmail 
}: GoogleCalendarConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { 
          tutorId,
          appOrigin: window.location.origin
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }

    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">Google Calendar Integration</h3>
          
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Connected</span>
              </div>
              {calendarEmail && (
                <p className="text-sm text-muted-foreground">
                  Connected to: {calendarEmail}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Your bookings will automatically sync to your Google Calendar and generate Meet links.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Connect your Google Calendar to automatically:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Create calendar events for bookings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Generate Google Meet links automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Sync availability with your calendar</span>
                </li>
              </ul>
              
              <Button 
                onClick={handleConnect}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Link2 className="h-4 w-4 mr-2" />
                {loading ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
