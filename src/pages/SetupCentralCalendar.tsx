import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SetupCentralCalendar = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const email = params.get('email');
    
    if (success === 'true' && email) {
      setConnectedEmail(decodeURIComponent(email));
      toast.success(`Successfully connected ${decodeURIComponent(email)}`);
      // Clean up URL
      window.history.replaceState({}, '', '/setup-central-calendar');
    }

    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('central_calendar_config')
        .select('google_email')
        .eq('id', 'central-calendar')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.google_email) {
        setConnectedEmail(data.google_email);
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('setup-central-calendar-oauth', {
        body: {},
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
      setIsConnecting(false);
      toast.error('Failed to connect calendar');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Central Calendar Setup</CardTitle>
                <CardDescription>
                  Connect the info@lanatutors.africa Google Calendar for automatic Google Meet link creation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {connectedEmail ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Connected:</strong> {connectedEmail}
                  <p className="mt-2 text-sm">
                    All new bookings will automatically receive Google Meet links from this calendar.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Connect the central Google Calendar account to enable automatic Google Meet link generation for all tutoring sessions.
                </p>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">What this does:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Creates Google Meet links automatically for every booking</li>
                    <li>Sends calendar invites to both students and tutors</li>
                    <li>Manages all meeting links from one central account</li>
                    <li>No need for tutors to connect their own calendars</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="w-full"
                  size="lg"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Central Calendar'}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  You will be redirected to Google to sign in with info@lanatutors.africa and authorize calendar access.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupCentralCalendar;
