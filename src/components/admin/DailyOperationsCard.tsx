import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar,
  Clock,
  MessageCircle,
  Mail,
  ChevronRight,
  RefreshCw,
  Users
} from "lucide-react";
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from "date-fns";

interface ClassItem {
  id: string;
  subject: string;
  status: string;
  start_time: string;
  student_name: string;
  student_phone: string | null;
  tutor_name: string;
  tutor_phone: string | null;
}

export function DailyOperationsCard() {
  const [todayClasses, setTodayClasses] = useState<ClassItem[]>([]);
  const [tomorrowClasses, setTomorrowClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const tomorrow = addDays(now, 1);

      // Fetch today's classes
      const { data: todayData } = await supabase
        .from("bookings")
        .select(`
          id, subject, status, student_id, tutor_id,
          tutor_availability!inner(start_time)
        `)
        .gte("tutor_availability.start_time", startOfDay(now).toISOString())
        .lte("tutor_availability.start_time", endOfDay(now).toISOString())
        .in("status", ["confirmed", "pending"])
        .order("tutor_availability(start_time)", { ascending: true });

      // Fetch tomorrow's classes
      const { data: tomorrowData } = await supabase
        .from("bookings")
        .select(`
          id, subject, status, student_id, tutor_id,
          tutor_availability!inner(start_time)
        `)
        .gte("tutor_availability.start_time", startOfDay(tomorrow).toISOString())
        .lte("tutor_availability.start_time", endOfDay(tomorrow).toISOString())
        .in("status", ["confirmed", "pending"])
        .order("tutor_availability(start_time)", { ascending: true });

      // Enrich with names
      const enrichClasses = async (classes: any[]): Promise<ClassItem[]> => {
        return Promise.all(
          classes.map(async (booking) => {
            let studentName = "Unknown";
            let studentPhone = null;
            let tutorName = "Unknown";
            let tutorPhone = null;

            if (booking.student_id) {
              const { data: student } = await supabase
                .from("profiles")
                .select("full_name, phone_number")
                .eq("id", booking.student_id)
                .single();
              if (student) {
                studentName = student.full_name || "Unknown";
                studentPhone = student.phone_number;
              }
            }

            if (booking.tutor_id) {
              const { data: tutorProfile } = await supabase
                .from("tutor_profiles")
                .select("user_id, email")
                .eq("id", booking.tutor_id)
                .single();
              
              if (tutorProfile) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, phone_number")
                  .eq("id", tutorProfile.user_id)
                  .single();
                if (profile) {
                  tutorName = profile.full_name || "Unknown";
                  tutorPhone = profile.phone_number;
                }
              }
            }

            return {
              id: booking.id,
              subject: booking.subject,
              status: booking.status,
              start_time: booking.tutor_availability.start_time,
              student_name: studentName,
              student_phone: studentPhone,
              tutor_name: tutorName,
              tutor_phone: tutorPhone,
            };
          })
        );
      };

      setTodayClasses(await enrichClasses(todayData || []));
      setTomorrowClasses(await enrichClasses(tomorrowData || []));
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone: string, name: string, classItem: ClassItem) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') 
      ? '254' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('254') 
        ? cleanPhone 
        : '254' + cleanPhone;
    
    const time = format(new Date(classItem.start_time), "h:mm a");
    const message = encodeURIComponent(
      `Hi ${name},\n\nThis is a reminder about the ${classItem.subject} session at ${time} today.\n\n- Lana Tutors`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const ClassList = ({ classes, label }: { classes: ClassItem[], label: string }) => (
    <div className="space-y-3">
      {classes.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No classes {label.toLowerCase()}</p>
        </div>
      ) : (
        classes.map((classItem) => (
          <div
            key={classItem.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{classItem.subject}</p>
                  <Badge 
                    variant={classItem.status === "confirmed" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {classItem.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {classItem.student_name} with {classItem.tutor_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(classItem.start_time), "h:mm a")}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {classItem.student_phone && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openWhatsApp(classItem.student_phone!, classItem.student_name, classItem)}
                    title="WhatsApp Parent"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                {classItem.tutor_phone && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openWhatsApp(classItem.tutor_phone!, classItem.tutor_name, classItem)}
                    title="WhatsApp Tutor"
                  >
                    <Users className="h-4 w-4 text-blue-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Daily Operations</CardTitle>
        <Button size="icon" variant="ghost" onClick={fetchClasses}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="today" className="relative">
              Today
              {todayClasses.length > 0 && (
                <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-primary">
                  {todayClasses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="relative">
              Tomorrow
              {tomorrowClasses.length > 0 && (
                <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-orange-500">
                  {tomorrowClasses.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <ClassList classes={todayClasses} label="Today" />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="tomorrow" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <ClassList classes={tomorrowClasses} label="Tomorrow" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
