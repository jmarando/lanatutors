import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  Video, 
  Calendar,
  Clock,
  MessageSquare,
  BookOpen,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const upcomingClass = {
    subject: "Algebra II",
    tutor: "Ms. Aisha Hassan",
    date: "Tomorrow",
    time: "3:00 PM",
    meetLink: "https://meet.google.com/abc-defg-hij"
  };

  const pastClasses = [
    { subject: "Mechanics", date: "12th Oct", tutor: "Mr. Peter Mutua", hasRecording: true },
    { subject: "Algebra I", date: "10th Oct", tutor: "Ms. Aisha Hassan", hasRecording: true },
    { subject: "Organic Chemistry", date: "8th Oct", tutor: "Ms. Grace Wanjiru", hasRecording: false }
  ];

  const learningProgress = [
    { subject: "Mathematics", progress: 85, color: "bg-primary" },
    { subject: "Physics", progress: 78, color: "bg-accent" },
    { subject: "Chemistry", progress: 92, color: "bg-green-500" }
  ];

  const messages = [
    { from: "Mr. Kamau", subject: "Assignment feedback", time: "2 hours ago", unread: true },
    { from: "Ms. Hassan", subject: "Next session prep", time: "Yesterday", unread: false },
    { from: "Support", subject: "Welcome to ElimuConnect", time: "2 days ago", unread: false }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">ElimuConnect</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/tutors">
              <Button variant="ghost">Find Tutors</Button>
            </Link>
            <Button variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, Sarah!</h1>
          <p className="text-muted-foreground">Here's a summary of your learning journey</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Class */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Upcoming Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{upcomingClass.subject}</h3>
                    <p className="text-muted-foreground">with {upcomingClass.tutor}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span>{upcomingClass.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>{upcomingClass.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1">
                      <Video className="w-4 h-4 mr-2" />
                      Join Class
                    </Button>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {learningProgress.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{item.subject}</span>
                      <span className="text-sm text-muted-foreground">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Past Classes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  Past Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastClasses.map((classItem, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary transition-colors">
                      <div>
                        <p className="font-semibold">{classItem.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {classItem.date} • {classItem.tutor}
                        </p>
                      </div>
                      {classItem.hasRecording && (
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4 mr-2" />
                          Watch Recording
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Classes</span>
                  <span className="text-2xl font-bold text-primary">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hours Learned</span>
                  <span className="text-2xl font-bold text-accent">36</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Tutors</span>
                  <span className="text-2xl font-bold">3</span>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {messages.map((message, idx) => (
                    <div key={idx} className={`p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${message.unread ? 'bg-secondary border-accent' : ''}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm">{message.from}</p>
                        {message.unread && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{message.subject}</p>
                      <p className="text-xs text-muted-foreground">{message.time}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">View All Messages</Button>
              </CardContent>
            </Card>

            {/* Find More Tutors CTA */}
            <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-0">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Need Help in Another Subject?</h3>
                <p className="text-sm opacity-90 mb-4">Browse our verified tutors</p>
                <Link to="/tutors">
                  <Button variant="secondary" className="w-full">
                    Find Tutors
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;