import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TestEmail = () => {
  const [loading, setLoading] = useState(false);
  const [loadingApproval, setLoadingApproval] = useState(false);

  const sendSubmissionConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-tutor-submission-confirmation", {
        body: { 
          tutorName: "Sample Tutor",
          email: "lanatutorskenya@gmail.com",
          profileSlug: "sample-tutor-123"
        },
      });
      
      if (error) throw error;
      toast.success("Submission confirmation email sent to lanatutorskenya@gmail.com");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send submission confirmation email");
    } finally {
      setLoading(false);
    }
  };

  const sendApprovalEmail = async () => {
    setLoadingApproval(true);
    try {
      const { error } = await supabase.functions.invoke("send-tutor-approval-email", {
        body: { 
          fullName: "Sample Tutor",
          email: "lanatutorskenya@gmail.com",
          tempPassword: "SamplePass123!"
        },
      });
      
      if (error) throw error;
      toast.success("Approval email sent to lanatutorskenya@gmail.com");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send approval email");
    } finally {
      setLoadingApproval(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tutor Email Templates</h1>
            <p className="text-muted-foreground">Send sample tutor emails to lanatutorskenya@gmail.com</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Submission Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This email is sent immediately when a tutor completes their profile setup.
                It confirms submission and provides their profile URL.
              </p>
              <Button onClick={sendSubmissionConfirmation} disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send Submission Confirmation Sample"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Approval Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This email is sent when an admin approves a tutor's profile.
                It includes their login credentials and welcome information.
              </p>
              <Button onClick={sendApprovalEmail} disabled={loadingApproval} className="w-full">
                {loadingApproval ? "Sending..." : "Send Approval Email Sample"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestEmail;
