import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Video, Calendar, TrendingUp, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function StudentOverviewTab() {
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("Student");
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [classroomCount, setClassroomCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }

        // Fetch upcoming bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false });

        setUpcomingBookings(bookings || []);

        // Count classrooms
        const { data: classroomBookings } = await supabase
          .from('bookings')
          .select('classroom_id')
          .eq('student_id', user.id)
          .not('classroom_id', 'is', null);

        setClassroomCount(classroomBookings?.length || 0);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const learningProgress = [
    { subject: "Math", progress: 85, color: "bg-blue-500" },
    { subject: "Physics", progress: 78, color: "bg-purple-500" },
    { subject: "Chemistry", progress: 92, color: "bg-green-500" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground">Here's a summary of your learning journey.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Classes</p>
                <p className="text-3xl font-bold">{upcomingBookings.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Classrooms</p>
                <p className="text-3xl font-bold">{classroomCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
                <p className="text-3xl font-bold">85%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No upcoming classes scheduled</p>
              <Link to="/tutors">
                <Button>Find a Tutor</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.slice(0, 3).map((booking) => {
                const createdAt = new Date(booking.created_at);
                
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{booking.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        {createdAt.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} at {createdAt.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {booking.meeting_link && (
                      <Button
                        size="sm"
                        onClick={() => window.open(booking.meeting_link, '_blank')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
