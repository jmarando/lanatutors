import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, CheckCircle2 } from "lucide-react";

const DecemberIntensive = () => {
  const navigate = useNavigate();

  const schedule = [
    { time: "8:00 - 9:15 AM", subject: "Mathematics", icon: "📐" },
    { time: "9:30 - 10:45 AM", subject: "Physics", icon: "⚡" },
    { time: "11:00 AM - 12:15 PM", subject: "Chemistry", icon: "🧪" },
    { time: "12:15 - 1:00 PM", subject: "Lunch Break", icon: "🍽️" },
    { time: "1:00 - 2:15 PM", subject: "Biology", icon: "🔬" },
    { time: "2:30 - 3:45 PM", subject: "English", icon: "📚" },
    { time: "4:00 - 5:15 PM", subject: "Kiswahili / TOK", icon: "🗣️" },
  ];

  const features = [
    { icon: Calendar, title: "10 Lessons Per Subject", description: "Complete coverage across 2 weeks" },
    { icon: Clock, title: "75-Minute Sessions", description: "Extended learning time with 15-min breaks" },
    { icon: Users, title: "Small Class Sizes", description: "Maximum 20 students per class" },
    { icon: CheckCircle2, title: "Expert Tutors", description: "Qualified tutors for each subject" },
  ];

  return (
    <>
      <SEO
        title="December Intensive Program 2025 | LANA Tutors"
        description="Join our 2-week December Intensive Program. 10 lessons per subject across Mathematics, Sciences, English, and more. December 8-19, 2025."
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              December Intensive Program 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              December 8 - 19, 2025
            </p>
            <p className="text-lg mb-8">
              Comprehensive revision program with 10 lessons per subject across Mathematics, Physics, Chemistry, Biology, English, and Kiswahili/TOK.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/december-intensive/enroll")} className="text-lg">
                Enroll Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" })}>
                View Schedule
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily Schedule */}
          <div id="schedule" className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Daily Schedule</h2>
            <Card className="max-w-3xl mx-auto">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {schedule.map((slot, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        slot.subject === "Lunch Break"
                          ? "bg-muted/50"
                          : "bg-primary/5 hover:bg-primary/10 transition-colors"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{slot.icon}</span>
                        <div>
                          <p className="font-semibold">{slot.subject}</p>
                          <p className="text-sm text-muted-foreground">{slot.time} EAT</p>
                        </div>
                      </div>
                      {slot.subject !== "Lunch Break" && (
                        <span className="text-sm text-primary font-medium">75 min</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">KES 4,000 per subject</CardTitle>
                <CardDescription>Choose up to 6 subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>10 comprehensive lessons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>75 minutes per session</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Expert tutor guidance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Google Classroom access</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate("/december-intensive/enroll")}>
                  Enroll Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Supported Curricula */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">All Curricula Supported</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {["CBC", "8-4-4", "IGCSE", "A-Level", "IB"].map((curriculum) => (
                <Card key={curriculum} className="px-8 py-4">
                  <CardTitle className="text-lg">{curriculum}</CardTitle>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensive;