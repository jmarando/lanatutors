import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, GraduationCap, DollarSign, BookMarked, ArrowUpRight, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AdminDashboardRedesigned = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [interviewRecords, setInterviewRecords] = useState<any[]>([]);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [consultationBookings, setConsultationBookings] = useState<any[]>([]);
  const [tutoringBookings, setTutoringBookings] = useState<any[]>([]);
  const [interviewFilter, setInterviewFilter] = useState<'all' | 'scheduled' | 'passed' | 'failed'>('all');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingApplications();
      fetchInterviewRecords();
      fetchPendingTutors();
      fetchPendingReviews();
      fetchConsultationBookings();
      fetchTutoringBookings();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchDashboardMetrics();
    setLoading(false);
  };

  const fetchDashboardMetrics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Fetch consultations
      const { data: consultations } = await supabase
        .from('consultation_bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      // Total counts
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalTutors } = await supabase
        .from('tutor_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Trends
      const groupByDay = (data: any[]) => {
        const grouped: any = {};
        data?.forEach(item => {
          const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          grouped[date] = (grouped[date] || 0) + 1;
        });
        return Object.entries(grouped).map(([date, count]) => ({ date, count }));
      };

      const consultationsTrend = groupByDay(consultations || []);
      const revenueTrend = payments?.reduce((acc: any, p) => {
        const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = acc.find((item: any) => item.date === date);
        if (existing) {
          existing.amount += Number(p.amount);
        } else {
          acc.push({ date, amount: Number(p.amount) });
        }
        return acc;
      }, []) || [];

      setDashboardMetrics({
        totalStudents,
        totalTutors,
        totalRevenue,
        newConsultations: consultations?.length || 0,
        newBookings: bookings?.length || 0,
        consultationsTrend,
        revenueTrend,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your tutoring platform</p>
      </div>

      {dashboardMetrics && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardMetrics.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Tutors</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardMetrics.totalTutors || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Verified tutors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">KES {dashboardMetrics.totalRevenue?.toLocaleString() || 0}</div>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Consultations</CardTitle>
                <BookMarked className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardMetrics.newConsultations || 0}</div>
                {dashboardMetrics.newConsultations > 0 && (
                  <p className="text-xs text-emerald-600 flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    {dashboardMetrics.newConsultations} booked
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consultations Trend</CardTitle>
                <CardDescription>Daily consultation bookings over the past 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardMetrics.consultationsTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription>Daily revenue in KES over the past 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardMetrics.revenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardRedesigned;
