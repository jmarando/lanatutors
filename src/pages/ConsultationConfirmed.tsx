import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, Mail, Video, BookOpen, Lightbulb, ClipboardList, ArrowRight, Sparkles } from "lucide-react";

const ConsultationConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const parentName = searchParams.get("parentName") || "Parent";
  const studentName = searchParams.get("studentName") || "Student";
  const consultationDate = searchParams.get("date") || "";
  const consultationTime = searchParams.get("time") || "";
  const email = searchParams.get("email") || "";

  useEffect(() => {
    if (!consultationDate || !consultationTime) {
      navigate("/book-consultation");
    }
  }, [consultationDate, consultationTime, navigate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Consultation Confirmed! ✅</h1>
            <p className="text-muted-foreground text-lg">
              Hi {parentName}, your free consultation for {studentName} has been successfully scheduled
            </p>
          </div>


          {/* Consultation Details Card */}
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Consultation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDate(consultationDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{consultationTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">30 minutes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmation Sent To</p>
                    <p className="font-semibold text-sm">{email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect Card */}
          <Card className="mb-6 border-accent">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-accent">
                <Lightbulb className="w-5 h-5" />
                What to Expect During Your Consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                    <Video className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Meet Your Expert</p>
                    <p className="text-sm text-muted-foreground">
                      You'll chat with a Lana curriculum specialist who understands your child's learning system
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                    <BookOpen className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Discuss Learning Needs</p>
                    <p className="text-sm text-muted-foreground">
                      Share {studentName}'s academic goals, challenges, and subjects where they need support
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                    <Lightbulb className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Personalized Recommendations</p>
                    <p className="text-sm text-muted-foreground">
                      Get expert advice on the best tutoring approach, subject combinations, and tutor matches
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                    <ClipboardList className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Ask Questions</p>
                    <p className="text-sm text-muted-foreground">
                      Learn about our tutoring methods, pricing packages, and how Lana can help {studentName} excel
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Next Steps</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a customized learning plan and immediate support to get started
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Preparation Card */}
          <Card className="mb-6">
            <CardHeader className="bg-muted">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Prepare for Your Session
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                To make the most of your consultation, please have ready:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>List of subjects {studentName} needs help with</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Current academic challenges or concerns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Your child's learning goals and aspirations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Any questions about our tutoring services</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Reminders Card */}
          <Card className="mb-6 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <p className="font-semibold mb-2">Reminders</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    We'll send you email and WhatsApp reminders:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 1 day before your consultation</li>
                    <li>• 1 hour before your consultation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Check your email for the meeting link and full details
            </p>
            <Button size="lg" onClick={() => navigate("/")}>
              Return to Home
            </Button>
            <p className="text-sm text-muted-foreground pt-4">
              Need to reschedule?{" "}
              <a href="mailto:info@lanatutors.africa" className="text-accent hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationConfirmed;
