import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Users, Mail, Phone, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EnrollmentWithDetails {
  id: string;
  student_id: string;
  student_profile_id: string | null;
  total_subjects: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  enrolled_class_ids: string[];
  program: {
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  student_profile: {
    full_name: string;
    curriculum: string;
    grade_level: string;
  } | null;
  parent_profile: {
    full_name: string | null;
    phone_number: string | null;
  } | null;
  parent_email: string | null;
  classes: {
    subject: string;
    curriculum: string;
    grade_levels: string[];
  }[];
}

export function BootcampEnrollments() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      // Fetch enrollments with program details
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("intensive_enrollments")
        .select(`
          id,
          student_id,
          student_profile_id,
          total_subjects,
          total_amount,
          payment_status,
          created_at,
          enrolled_class_ids,
          intensive_programs (
            name,
            start_date,
            end_date
          )
        `)
        .order("created_at", { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      // Fetch additional details for each enrollment
      const enrichedEnrollments = await Promise.all(
        (enrollmentsData || []).map(async (enrollment) => {
          // Fetch student profile
          let studentProfile = null;
          if (enrollment.student_profile_id) {
            const { data: student } = await supabase
              .from("students")
              .select("full_name, curriculum, grade_level")
              .eq("id", enrollment.student_profile_id)
              .single();
            studentProfile = student;
          }

          // Fetch parent profile and email
          let parentProfile = null;
          let parentEmail = null;
          if (enrollment.student_id) {
            const { data: parent } = await supabase
              .from("profiles")
              .select("full_name, phone_number")
              .eq("id", enrollment.student_id)
              .single();
            parentProfile = parent;

            // Get email from auth
            const { data: userData } = await supabase.rpc('get_user_email', { 
              _user_id: enrollment.student_id 
            });
            parentEmail = userData;
          }

          // Fetch enrolled classes details
          let classes: { subject: string; curriculum: string; grade_levels: string[] }[] = [];
          if (enrollment.enrolled_class_ids && enrollment.enrolled_class_ids.length > 0) {
            const { data: classesData } = await supabase
              .from("intensive_classes")
              .select("subject, curriculum, grade_levels")
              .in("id", enrollment.enrolled_class_ids);
            classes = classesData || [];
          }

          return {
            ...enrollment,
            program: enrollment.intensive_programs,
            student_profile: studentProfile,
            parent_profile: parentProfile,
            parent_email: parentEmail,
            classes,
          } as EnrollmentWithDetails;
        })
      );

      setEnrollments(enrichedEnrollments);
    } catch (error: any) {
      console.error("Error fetching bootcamp enrollments:", error);
      toast.error("Failed to load bootcamp enrollments");
    } finally {
      setLoading(false);
    }
  };

  const copyAllEmails = () => {
    const emails = enrollments
      .map(e => e.parent_email)
      .filter(Boolean)
      .join(", ");
    
    if (emails) {
      navigator.clipboard.writeText(emails);
      toast.success(`Copied ${enrollments.filter(e => e.parent_email).length} emails`);
    } else {
      toast.error("No emails found");
    }
  };

  const copyAllPhones = () => {
    const phones = enrollments
      .map(e => e.parent_profile?.phone_number)
      .filter(Boolean)
      .join(", ");
    
    if (phones) {
      navigator.clipboard.writeText(phones);
      toast.success(`Copied ${enrollments.filter(e => e.parent_profile?.phone_number).length} phone numbers`);
    } else {
      toast.error("No phone numbers found");
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading bootcamp enrollments...</p>
        </CardContent>
      </Card>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground font-medium">No bootcamp enrollments yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Enrollments will appear here when students sign up for the December Bootcamp
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          December Bootcamp Enrollments ({enrollments.length})
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={copyAllEmails} size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Copy Emails
          </Button>
          <Button onClick={copyAllPhones} size="sm" variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Copy Phones
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {enrollment.student_profile?.full_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.student_profile?.curriculum} - {enrollment.student_profile?.grade_level}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {enrollment.parent_profile?.full_name || "—"}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {enrollment.parent_email && (
                      <a 
                        href={`mailto:${enrollment.parent_email}`}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {enrollment.parent_email}
                      </a>
                    )}
                    {enrollment.parent_profile?.phone_number && (
                      <a 
                        href={`tel:${enrollment.parent_profile.phone_number}`}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {enrollment.parent_profile.phone_number}
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {enrollment.classes.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {c.subject}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {enrollment.total_subjects} subject{enrollment.total_subjects !== 1 ? 's' : ''}
                  </p>
                </TableCell>
                <TableCell className="font-medium">
                  KES {enrollment.total_amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  {getPaymentBadge(enrollment.payment_status)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(enrollment.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
