import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Award, 
  Video, 
  Calendar,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const TutorDashboard = () => {
  const upcomingSessions = [
    { 
      student: "Sarah M.", 
      subject: "Algebra II", 
      date: "Today",
      time: "3:00 PM", 
      duration: "1 hr",
      amount: 2200,
      status: "confirmed"
    },
    { 
      student: "John K.", 
      subject: "Physics", 
      date: "Tomorrow",
      time: "10:00 AM", 
      duration: "1 hr",
      amount: 2200,
      status: "confirmed"
    },
    { 
      student: "Mary W.", 
      subject: "Chemistry", 
      date: "Tomorrow",
      time: "2:00 PM", 
      duration: "1 hr",
      amount: 2200,
      status: "pending"
    }
  ];

  const earningsData = {
    thisWeek: 13200,
    thisMonth: 48400,
    total: 156800,
    sessions: 71
  };

  const recentReviews = [
    { student: "Sarah M.", rating: 5, comment: "Excellent teacher! Very patient and clear.", date: "2 days ago" },
    { student: "David L.", rating: 5, comment: "Best math tutor I've had. Highly recommend!", date: "1 week ago" },
    { student: "Grace N.", rating: 4, comment: "Good explanations, would book again.", date: "2 weeks ago" }
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
            <Button variant="ghost">My Profile</Button>
            <Button variant="ghost">Availability</Button>
            <Button variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, Ms. Hassan!</h1>
          <p className="text-muted-foreground">Here's your tutoring dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Week</p>
                  <p className="text-2xl font-bold text-primary">
                    KES {earningsData.thisWeek.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold text-accent">
                    KES {earningsData.thisMonth.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-accent/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-2xl font-bold">127</p>
                </div>
                <Users className="w-10 h-10 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">4.9</p>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <Star className="w-10 h-10 text-yellow-400/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingSessions.map((session, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">{session.student}</TableCell>
                        <TableCell>{session.subject}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{session.date}</div>
                            <div className="text-muted-foreground">{session.time}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          KES {session.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.status === "confirmed" ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.status === "confirmed" && session.date === "Today" && (
                            <Button size="sm">
                              <Video className="w-4 h-4 mr-2" />
                              Join
                            </Button>
                          )}
                          {session.status === "pending" && (
                            <Button size="sm" variant="outline">
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Earnings Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-accent" />
                  Earnings Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
                      <p className="text-3xl font-bold text-primary">
                        KES {earningsData.total.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        From {earningsData.sessions} sessions
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Average Per Session</p>
                      <p className="text-3xl font-bold text-accent">
                        KES {Math.round(earningsData.total / earningsData.sessions).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Across all subjects
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    View Detailed Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
                <Button variant="outline" className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  View Schedule
                </Button>
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  My Students
                </Button>
              </CardContent>
            </Card>

            {/* Recent Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReviews.map((review, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{review.student}</span>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">"{review.comment}"</p>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">View All Reviews</Button>
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <Card className="bg-gradient-to-br from-accent to-accent/90 text-accent-foreground border-0">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Excellent Performance!</h3>
                <p className="text-sm opacity-90 mb-4">
                  You're in the top 10% of tutors this month
                </p>
                <div className="text-4xl font-bold mb-2">🏆</div>
                <p className="text-xs opacity-75">Keep up the great work!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorDashboard;