import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  Video, 
  Sparkles,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const StudentDashboard = () => {
  const { toast } = useToast();

  const upcomingClass = {
    subject: "Mathematics: Algebra II",
    tutor: "Sarah Wanjiru",
    date: "10/10/2025 at 09:32 AM",
    meetLink: "https://meet.google.com/abc-defg-hij",
    daysUntil: "in 1 day"
  };

  const pastClasses = [
    { 
      subject: "Classical Mechanics", 
      date: "12th Oct, 2023", 
      tutor: "Sarah Wanjiru", 
      hasRecording: true 
    },
    { 
      subject: "Stoichiometry", 
      date: "10th Oct, 2023", 
      tutor: "David Kamau", 
      hasRecording: true 
    },
    { 
      subject: "Fasihi Simulizi", 
      date: "8th Oct, 2023", 
      tutor: "Jane Muthoni", 
      hasRecording: true 
    }
  ];

  const learningProgress = [
    { subject: "Math", progress: 85 },
    { subject: "Physics", progress: 78 },
    { subject: "Chemistry", progress: 92 }
  ];

  const messages = [
    { 
      from: "David Kamau", 
      message: "Great work on the assignment! Just a few notes...", 
      unread: true 
    },
    { 
      from: "Sarah Wanjiru", 
      message: "Our session for tomorrow is confirmed. See you then!", 
      unread: false 
    },
    { 
      from: "Jane Muthoni", 
      message: "I've rescheduled our class to 5 PM. Please confirm.", 
      unread: true 
    }
  ];

  const handleJoinClass = () => {
    window.open(upcomingClass.meetLink, '_blank');
    toast({
      title: "Opening Google Meet",
      description: "Joining your class session...",
    });
  };

  const handleGenerateSummary = (subject: string) => {
    toast({
      title: "Generating AI Summary",
      description: `Creating summary for ${subject}...`,
    });
  };

  const handleWatchRecording = (subject: string) => {
    toast({
      title: "Opening Recording",
      description: `Loading ${subject} session recording...`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, Sarah!</h1>
          <p className="text-muted-foreground">Here's a summary of your learning journey.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Class - Teal Card */}
            <Card className="bg-[hsl(188,75%,40%)] border-0 text-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Upcoming Class</h2>
                    <p className="text-white/90">{upcomingClass.subject}</p>
                  </div>
                  <Badge className="bg-white text-[hsl(188,75%,40%)] hover:bg-white/90">
                    {upcomingClass.daysUntil}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-white/20 text-white">
                      {upcomingClass.tutor.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{upcomingClass.tutor}</p>
                    <p className="text-sm text-white/80">{upcomingClass.date}</p>
                  </div>
                </div>

                <Button 
                  onClick={handleJoinClass}
                  className="w-full bg-white text-[hsl(188,75%,40%)] hover:bg-white/90"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Class
                </Button>
              </CardContent>
            </Card>

            {/* Past Classes */}
            <Card>
              <CardHeader>
                <CardTitle>Past Classes</CardTitle>
                <p className="text-sm text-muted-foreground">Review your previous sessions and generate AI summaries.</p>
              </CardHeader>
              <CardContent>
                {/* Mobile View - Cards */}
                <div className="md:hidden space-y-4">
                  {pastClasses.map((classItem, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base mb-1">{classItem.subject}</h3>
                        <p className="text-sm text-muted-foreground">{classItem.tutor}</p>
                        <p className="text-sm text-muted-foreground">{classItem.date}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGenerateSummary(classItem.subject)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Summary
                        </Button>
                        {classItem.hasRecording && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleWatchRecording(classItem.subject)}
                          >
                            Recording
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium w-[30%]">Subject</th>
                        <th className="pb-3 font-medium w-[25%]">Tutor</th>
                        <th className="pb-3 font-medium w-[20%]">Date</th>
                        <th className="pb-3 font-medium text-right w-[25%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastClasses.map((classItem, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-4 font-medium break-words">{classItem.subject}</td>
                          <td className="py-4 text-muted-foreground break-words">{classItem.tutor}</td>
                          <td className="py-4 text-muted-foreground whitespace-nowrap">{classItem.date}</td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleGenerateSummary(classItem.subject)}
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                Summary
                              </Button>
                              {classItem.hasRecording && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleWatchRecording(classItem.subject)}
                                >
                                  Recording
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {learningProgress.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.subject}</span>
                      <span className="text-sm text-muted-foreground">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                      {msg.unread && (
                        <div className="w-2 h-2 rounded-full bg-[hsl(188,75%,40%)] mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1">{msg.from}</p>
                        <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;