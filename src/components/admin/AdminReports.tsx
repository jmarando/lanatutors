import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  CalendarDays, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  BookOpen, 
  DollarSign, 
  CreditCard,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

interface WeeklyMetrics {
  leadsGenerated: number;
  consultationsConducted: number;
  conversions: number;
  lessonsDelivered: number;
  totalRevenue: number;
  lanaCommission: number;
  tutorPayments: number;
  paymentsDueToTutors: { tutorName: string; amount: number; dueBy: string }[];
  issues: { type: string; description: string; status: string }[];
  weekStart: Date;
  weekEnd: Date;
}

interface MonthlyMetrics {
  leads: number;
  consultations: number;
  conversions: number;
  lessons: number;
  totalRevenue: number;
  totalPayments: number;
  lanaCommission: number;
  tutorPayments: number;
  expenses: {
    marketing: number;
    payroll: number;
    commission: number;
    consultantFees: number;
  };
  incomeStatement: {
    grossRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
  month: string;
  year: number;
}

const COMMISSION_RATE = 0.20; // 20% commission to Lana

export function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("weekly");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    await Promise.all([fetchWeeklyReport(), fetchMonthlyReport()]);
    setLoading(false);
  };

  const fetchWeeklyReport = async () => {
    try {
      // Get previous week's date range (Monday to Sunday)
      const now = new Date();
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      // Fetch leads (consultation bookings created)
      const { count: leadsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      // Fetch consultations conducted (completed status)
      const { count: consultationsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .gte("consultation_date", lastWeekStart.toISOString().split('T')[0])
        .lte("consultation_date", lastWeekEnd.toISOString().split('T')[0])
        .eq("status", "completed");

      // Fetch conversions
      const { count: conversionsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .eq("converted_to_customer", true)
        .gte("converted_at", lastWeekStart.toISOString())
        .lte("converted_at", lastWeekEnd.toISOString());

      // Fetch lessons delivered (completed bookings)
      const { data: completedBookings } = await supabase
        .from("bookings")
        .select(`
          id, amount, tutor_id,
          tutor_availability!inner(start_time, end_time)
        `)
        .eq("status", "completed")
        .gte("tutor_availability.start_time", lastWeekStart.toISOString())
        .lte("tutor_availability.start_time", lastWeekEnd.toISOString());

      const lessonsCount = completedBookings?.length || 0;
      const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
      const lanaCommission = totalRevenue * COMMISSION_RATE;
      const tutorPayments = totalRevenue - lanaCommission;

      // Fetch tutor payment details grouped by tutor
      const tutorPaymentMap = new Map<string, number>();
      completedBookings?.forEach(booking => {
        const current = tutorPaymentMap.get(booking.tutor_id) || 0;
        tutorPaymentMap.set(booking.tutor_id, current + ((booking.amount || 0) * (1 - COMMISSION_RATE)));
      });

      // Get tutor names
      const tutorIds = Array.from(tutorPaymentMap.keys());
      const paymentsDue: { tutorName: string; amount: number; dueBy: string }[] = [];

      if (tutorIds.length > 0) {
        const { data: tutorProfiles } = await supabase
          .from("tutor_profiles")
          .select("id, user_id")
          .in("id", tutorIds);

        if (tutorProfiles) {
          const userIds = tutorProfiles.map(t => t.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          tutorProfiles.forEach(tutor => {
            const profile = profiles?.find(p => p.id === tutor.user_id);
            const amount = tutorPaymentMap.get(tutor.id) || 0;
            if (amount > 0) {
              paymentsDue.push({
                tutorName: profile?.full_name || "Unknown Tutor",
                amount,
                dueBy: format(endOfWeek(now, { weekStartsOn: 1 }), "EEEE, MMM d")
              });
            }
          });
        }
      }

      setWeeklyMetrics({
        leadsGenerated: leadsCount || 0,
        consultationsConducted: consultationsCount || 0,
        conversions: conversionsCount || 0,
        lessonsDelivered: lessonsCount,
        totalRevenue,
        lanaCommission,
        tutorPayments,
        paymentsDueToTutors: paymentsDue.sort((a, b) => b.amount - a.amount),
        issues: [], // Could be populated from a separate issues table
        weekStart: lastWeekStart,
        weekEnd: lastWeekEnd,
      });
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      toast.error("Failed to load weekly report");
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      // Get previous month's date range
      const now = new Date();
      const lastMonth = subMonths(now, 1);
      const monthStart = startOfMonth(lastMonth);
      const monthEnd = endOfMonth(lastMonth);

      // Fetch all metrics for the month
      const { count: leadsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const { count: consultationsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .gte("consultation_date", monthStart.toISOString().split('T')[0])
        .lte("consultation_date", monthEnd.toISOString().split('T')[0])
        .eq("status", "completed");

      const { count: conversionsCount } = await supabase
        .from("consultation_bookings")
        .select("*", { count: "exact", head: true })
        .eq("converted_to_customer", true)
        .gte("converted_at", monthStart.toISOString())
        .lte("converted_at", monthEnd.toISOString());

      // Fetch completed lessons
      const { data: completedBookings } = await supabase
        .from("bookings")
        .select(`
          id, amount,
          tutor_availability!inner(start_time)
        `)
        .eq("status", "completed")
        .gte("tutor_availability.start_time", monthStart.toISOString())
        .lte("tutor_availability.start_time", monthEnd.toISOString());

      const lessons = completedBookings?.length || 0;
      const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const lanaCommission = totalRevenue * COMMISSION_RATE;
      const tutorPayments = totalRevenue - lanaCommission;

      // Placeholder expenses (these would come from an expenses table in production)
      const expenses = {
        marketing: 0,
        payroll: 0,
        commission: lanaCommission,
        consultantFees: 0,
      };

      const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
      const netIncome = totalRevenue - totalExpenses;

      setMonthlyMetrics({
        leads: leadsCount || 0,
        consultations: consultationsCount || 0,
        conversions: conversionsCount || 0,
        lessons,
        totalRevenue,
        totalPayments,
        lanaCommission,
        tutorPayments,
        expenses,
        incomeStatement: {
          grossRevenue: totalRevenue,
          totalExpenses,
          netIncome,
        },
        month: format(lastMonth, "MMMM"),
        year: lastMonth.getFullYear(),
      });
    } catch (error) {
      console.error("Error fetching monthly report:", error);
      toast.error("Failed to load monthly report");
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground">Weekly and monthly business performance</p>
        </div>
        <Button onClick={fetchReports} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Report
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
        </TabsList>

        {/* Weekly Report */}
        <TabsContent value="weekly" className="space-y-6">
          {weeklyMetrics && (
            <>
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Weekly Report</CardTitle>
                      <CardDescription>
                        {format(weeklyMetrics.weekStart, "MMM d")} - {format(weeklyMetrics.weekEnd, "MMM d, yyyy")}
                        <span className="ml-2 text-xs text-muted-foreground">(Previous Week)</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Leads Generated</p>
                        <p className="text-3xl font-bold">{weeklyMetrics.leadsGenerated}</p>
                      </div>
                      <Users className="h-10 w-10 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Consultations</p>
                        <p className="text-3xl font-bold">{weeklyMetrics.consultationsConducted}</p>
                      </div>
                      <MessageSquare className="h-10 w-10 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                        <p className="text-3xl font-bold text-green-600">{weeklyMetrics.conversions}</p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Lessons Delivered</p>
                        <p className="text-3xl font-bold">{weeklyMetrics.lessonsDelivered}</p>
                      </div>
                      <BookOpen className="h-10 w-10 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Split */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Generated
                  </CardTitle>
                  <CardDescription>Split as commission to Lana and payment to Tutors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(weeklyMetrics.totalRevenue)}</p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Lana Commission (20%)</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(weeklyMetrics.lanaCommission)}</p>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Tutor Payments (80%)</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(weeklyMetrics.tutorPayments)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payments Due to Tutors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payments Due to Tutors
                  </CardTitle>
                  <CardDescription>
                    Record by Monday, invoices due by Wednesday for prior week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {weeklyMetrics.paymentsDueToTutors.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No payments due this week</p>
                  ) : (
                    <div className="space-y-3">
                      {weeklyMetrics.paymentsDueToTutors.map((payment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{payment.tutorName}</p>
                            <p className="text-sm text-muted-foreground">Due by: {payment.dueBy}</p>
                          </div>
                          <Badge variant="outline" className="text-lg font-semibold">
                            {formatCurrency(payment.amount)}
                          </Badge>
                        </div>
                      ))}
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Total Due</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(weeklyMetrics.tutorPayments)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Issues Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Issues & Recommendations
                  </CardTitle>
                  <CardDescription>
                    Issues arising (students, tutors, system) & status updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-4">
                    No reported issues this week
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-6">
          {monthlyMetrics && (
            <>
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Monthly Report</CardTitle>
                      <CardDescription>
                        {monthlyMetrics.month} {monthlyMetrics.year}
                        <span className="ml-2 text-xs text-muted-foreground">(Previous Month)</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Consolidated Numbers */}
              <Card>
                <CardHeader>
                  <CardTitle>Consolidated Numbers</CardTitle>
                  <CardDescription>Key performance metrics for the month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{monthlyMetrics.leads}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <MessageSquare className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">{monthlyMetrics.consultations}</p>
                      <p className="text-xs text-muted-foreground">Consultations</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{monthlyMetrics.conversions}</p>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <BookOpen className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-2xl font-bold">{monthlyMetrics.lessons}</p>
                      <p className="text-xs text-muted-foreground">Lessons</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{formatCurrency(monthlyMetrics.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <CreditCard className="h-6 w-6 mx-auto mb-2 text-teal-500" />
                      <p className="text-2xl font-bold">{formatCurrency(monthlyMetrics.totalPayments)}</p>
                      <p className="text-xs text-muted-foreground">Payments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Split for Month */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue Split</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Total Revenue</span>
                      <span className="font-semibold">{formatCurrency(monthlyMetrics.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <span className="text-sm">Lana Commission (20%)</span>
                      <span className="font-semibold text-primary">{formatCurrency(monthlyMetrics.lanaCommission)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <span className="text-sm">Tutor Payments (80%)</span>
                      <span className="font-semibold text-green-600">{formatCurrency(monthlyMetrics.tutorPayments)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expenses Report</CardTitle>
                    <CardDescription>Marketing, payroll & commission</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Marketing</span>
                      <span className="font-semibold">{formatCurrency(monthlyMetrics.expenses.marketing)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Payroll</span>
                      <span className="font-semibold">{formatCurrency(monthlyMetrics.expenses.payroll)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Commission Paid</span>
                      <span className="font-semibold">{formatCurrency(monthlyMetrics.expenses.commission)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Consultant Fees</span>
                      <span className="font-semibold">{formatCurrency(monthlyMetrics.expenses.consultantFees)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Income Statement */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Income Statement
                  </CardTitle>
                  <CardDescription>
                    Financial summary for {monthlyMetrics.month} {monthlyMetrics.year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                      <span className="font-medium">Gross Revenue</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(monthlyMetrics.incomeStatement.grossRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                      <span className="font-medium">Total Expenses</span>
                      <span className="text-xl font-bold text-red-600">
                        -{formatCurrency(monthlyMetrics.incomeStatement.totalExpenses)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-4 bg-primary/20 rounded-lg">
                      <span className="text-lg font-semibold">Net Income</span>
                      <span className={`text-2xl font-bold ${monthlyMetrics.incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(monthlyMetrics.incomeStatement.netIncome)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center text-sm">
                    Monthly reports are generated for the first week of each new month, covering the previous month's data.
                    <br />
                    <span className="italic">To be enhanced with additional expense tracking and consultant timesheets.</span>
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
