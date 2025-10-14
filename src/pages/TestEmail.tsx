import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TestEmail = () => {
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill with current user's email if available
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setTo(user.email);
    });
  }, []);

  const sendTest = async () => {
    if (!to) {
      toast.error("Please enter an email address");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-test-email", {
      body: { to },
    });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Failed to send test email");
    } else {
      toast.success("Test email sent. Check your inbox (and spam)");
      console.log(data);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-lg mx-auto px-6 py-12">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Send Test Email</h1>
            <p className="text-sm text-muted-foreground">Send a test email via our email service without making a booking.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient email</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button onClick={sendTest} disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestEmail;
