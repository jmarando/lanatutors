import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Share2, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const TutorProfileSubmitted = () => {
  const navigate = useNavigate();
  const [profileUrl, setProfileUrl] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTutorInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/tutor-profile-setup");
          return;
        }

        // Get tutor profile with slug
        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("id, profile_slug")
          .eq("user_id", user.id)
          .single();

        if (!tutorProfile) {
          navigate("/tutor-profile-setup");
          return;
        }

        // Get profile name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const name = profile?.full_name || user.user_metadata?.full_name || "there";
        setTutorName(name);

        // Build the shareable URL using slug or fallback to ID
        const baseUrl = window.location.origin;
        const identifier = tutorProfile.profile_slug || tutorProfile.id;
        const url = `${baseUrl}/${identifier}`;
        setProfileUrl(url);
      } catch (error) {
        console.error("Error fetching tutor info:", error);
      } finally {
        setLoading(false);
      }
    };

    getTutorInfo();
  }, [navigate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success("Profile URL copied to clipboard!");
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tutorName}'s Tutor Profile - Lana Tutors`,
          text: `Check out my tutor profile on Lana Tutors!`,
          url: profileUrl,
        });
      } catch (error) {
        // User cancelled share or share not supported
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <SEO 
        title="Profile Submitted Successfully - Lana Tutors"
        description="Your tutor profile has been submitted for review"
      />
      
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Profile Submitted Successfully!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-lg">
              Thank you, <span className="font-semibold">{tutorName}</span>!
            </p>
            <p className="text-muted-foreground">
              Your tutor profile has been submitted for review. Our team will verify your credentials and approve your profile within 24-48 hours.
            </p>
            <p className="text-muted-foreground">
              You'll receive an email notification once your profile is approved and live on the platform.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">Your Shareable Profile URL</h3>
                <p className="text-sm text-muted-foreground">
                  Once approved, your profile will be available at this URL. You can share this link with students directly!
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border rounded-lg px-4 py-3 text-sm break-all">
                    {profileUrl}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={copyToClipboard}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={shareProfile}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold mb-2">What happens next?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Our team reviews your profile and credentials</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>You receive approval notification via email</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Your profile goes live and students can find and book you</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Share your unique URL with students for direct bookings</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Go to Home
            </Button>
            <Button 
              onClick={() => navigate("/tutor/dashboard")}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorProfileSubmitted;
