import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  User, 
  BookOpen, 
  Package, 
  CreditCard,
  Clock,
  Calendar,
  GraduationCap,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CommunicationTimeline } from "./CommunicationTimeline";
import { QuickContactDialog } from "./QuickContactDialog";

interface AdminParentDetailProps {
  parentId: string | null;
  onClose: () => void;
}

interface ParentData {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  created_at: string;
  timezone: string | null;
  preferred_currency: string | null;
}

interface StudentData {
  id: string;
  full_name: string;
  age: number | null;
  curriculum: string;
  grade_level: string;
  subjects_of_interest: string[] | null;
}

interface BookingData {
  id: string;
  subject: string;
  status: string;
  amount: number;
  start_time: string;
  tutor_name: string;
}

interface PackageData {
  id: string;
  total_sessions: number;
  sessions_remaining: number;
  payment_status: string;
  created_at: string;
  tutor_name: string;
}

export function AdminParentDetail({ parentId, onClose }: AdminParentDetailProps) {
  const [parent, setParent] = useState<ParentData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactDialog, setContactDialog] = useState<'email' | 'whatsapp' | null>(null);

  useEffect(() => {
    if (parentId) {
      fetchParentData(parentId);
    }
  }, [parentId]);

  const fetchParentData = async (id: string) => {
    setLoading(true);
    try {
      // Fetch parent profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;

      // Get email
      const { data: emailData } = await supabase.rpc('get_user_email', {
        _user_id: id
      });

      setParent({
        ...profileData,
        email: emailData,
      });

      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .eq("parent_id", id);

      setStudents(studentsData || []);

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          id, subject, status, amount,
          tutor_availability!inner(start_time),
          tutor_id
        `)
        .eq("student_id", id)
        .order("tutor_availability(start_time)", { ascending: false })
        .limit(20);

      // Enrich with tutor names
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking: any) => {
          let tutorName = "Unknown";
          if (booking.tutor_id) {
            const { data: tutorProfile } = await supabase
              .from("tutor_profiles")
              .select("user_id")
              .eq("id", booking.tutor_id)
              .single();
            
            if (tutorProfile) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", tutorProfile.user_id)
                .single();
              tutorName = profile?.full_name || "Unknown";
            }
          }
          return {
            id: booking.id,
            subject: booking.subject,
            status: booking.status,
            amount: booking.amount,
            start_time: booking.tutor_availability.start_time,
            tutor_name: tutorName,
          };
        })
      );

      setBookings(enrichedBookings);

      // Fetch packages
      const { data: packagesData } = await supabase
        .from("package_purchases")
        .select("*, tutor_id")
        .eq("student_id", id)
        .order("created_at", { ascending: false });

      const enrichedPackages = await Promise.all(
        (packagesData || []).map(async (pkg: any) => {
          let tutorName = "Unknown";
          if (pkg.tutor_id) {
            const { data: tutorProfile } = await supabase
              .from("tutor_profiles")
              .select("user_id")
              .eq("id", pkg.tutor_id)
              .single();
            
            if (tutorProfile) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", tutorProfile.user_id)
                .single();
              tutorName = profile?.full_name || "Unknown";
            }
          }
          return {
            id: pkg.id,
            total_sessions: pkg.total_sessions,
            sessions_remaining: pkg.sessions_remaining,
            payment_status: pkg.payment_status,
            created_at: pkg.created_at,
            tutor_name: tutorName,
          };
        })
      );

      setPackages(enrichedPackages);
    } catch (error: any) {
      console.error("Error fetching parent data:", error);
      toast.error("Failed to load parent details");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (!parent?.phone_number) return;
    const cleanPhone = parent.phone_number.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') 
      ? '254' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('254') 
        ? cleanPhone 
        : '254' + cleanPhone;
    
    const message = encodeURIComponent(`Hi ${parent.full_name},\n\nThis is Lana Tutors. `);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    setContactDialog('whatsapp');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  if (!parentId) return null;

  return (
    <>
      <Sheet open={!!parentId} onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle>Parent Details</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : parent ? (
            <ScrollArea className="flex-1 -mx-6 px-6">
              {/* Parent Header */}
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {parent.full_name?.charAt(0) || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{parent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Member since {format(new Date(parent.created_at), "MMM yyyy")}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {parent.phone_number && (
                      <Button size="sm" variant="outline" onClick={openWhatsApp}>
                        <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                        WhatsApp
                      </Button>
                    )}
                    {parent.email && (
                      <Button size="sm" variant="outline" onClick={() => setContactDialog('email')}>
                        <Mail className="h-4 w-4 mr-1 text-blue-600" />
                        Email
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-2">
                  {parent.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{parent.email}</span>
                    </div>
                  )}
                  {parent.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{parent.phone_number}</span>
                    </div>
                  )}
                  {parent.timezone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{parent.timezone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="students" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="students">
                    <User className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Students</span>
                  </TabsTrigger>
                  <TabsTrigger value="classes">
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Classes</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages">
                    <Package className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Packages</span>
                  </TabsTrigger>
                  <TabsTrigger value="comms">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Comms</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="mt-4 space-y-3">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students added yet
                    </p>
                  ) : (
                    students.map((student) => (
                      <Card key={student.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{student.full_name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{student.curriculum}</Badge>
                                <Badge variant="secondary">{student.grade_level}</Badge>
                              </div>
                              {student.subjects_of_interest && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Interests: {student.subjects_of_interest.join(", ")}
                                </p>
                              )}
                            </div>
                            {student.age && (
                              <span className="text-sm text-muted-foreground">
                                {student.age} yrs
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="classes" className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No classes booked yet
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{booking.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                with {booking.tutor_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(booking.start_time), "EEE, MMM d 'at' h:mm a")}
                              </p>
                            </div>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="packages" className="mt-4 space-y-3">
                  {packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No packages purchased yet
                    </p>
                  ) : (
                    packages.map((pkg) => (
                      <Card key={pkg.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {pkg.total_sessions} sessions with {pkg.tutor_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {pkg.sessions_remaining} remaining
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Purchased {format(new Date(pkg.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <Badge variant={pkg.payment_status === "completed" ? "default" : "secondary"}>
                              {pkg.payment_status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="comms" className="mt-4">
                  <CommunicationTimeline parentId={parentId} />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Parent not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <QuickContactDialog
        type={contactDialog}
        onClose={() => setContactDialog(null)}
        recipient={{
          id: parentId || "",
          name: parent?.full_name || "",
          email: parent?.email || "",
          phone: parent?.phone_number || "",
        }}
      />
    </>
  );
}
