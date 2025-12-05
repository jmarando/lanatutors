import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StudentWithParent {
  id: string;
  full_name: string;
  age: number | null;
  curriculum: string;
  grade_level: string;
  email: string | null;
  created_at: string;
  parent_id: string;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
}

export function StudentList() {
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Fetch students from the students table
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      // Enrich with parent info
      const enrichedStudents = await Promise.all(
        (studentsData || []).map(async (student) => {
          let parentName = null;
          let parentPhone = null;
          let parentEmail = null;

          if (student.parent_id) {
            const { data: parent } = await supabase
              .from("profiles")
              .select("full_name, phone_number")
              .eq("id", student.parent_id)
              .single();
            
            if (parent) {
              parentName = parent.full_name;
              parentPhone = parent.phone_number;
            }

            // Get parent email
            const { data: emailData } = await supabase.rpc('get_user_email', {
              _user_id: student.parent_id
            });
            parentEmail = emailData;
          }

          return {
            ...student,
            parent_name: parentName,
            parent_phone: parentPhone,
            parent_email: parentEmail,
          } as StudentWithParent;
        })
      );

      setStudents(enrichedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const copyAllEmails = () => {
    const emails = students
      .map(s => s.parent_email || s.email)
      .filter(Boolean)
      .join(", ");
    
    if (emails) {
      navigator.clipboard.writeText(emails);
      toast.success(`Copied ${students.filter(s => s.parent_email || s.email).length} emails`);
    } else {
      toast.error("No emails found");
    }
  };

  const copyAllPhones = () => {
    const phones = students
      .map(s => s.parent_phone)
      .filter(Boolean)
      .join(", ");
    
    if (phones) {
      navigator.clipboard.writeText(phones);
      toast.success(`Copied ${students.filter(s => s.parent_phone).length} phone numbers`);
    } else {
      toast.error("No phone numbers found");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading students...</p>
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground font-medium">No students registered yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Students will appear here when parents add them
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Registered Students ({students.length})</CardTitle>
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
              <TableHead>Student Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Curriculum</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div>
                    <p>{student.full_name}</p>
                    {student.age && (
                      <p className="text-xs text-muted-foreground">{student.age} years old</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {student.parent_name || "—"}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {(student.parent_email || student.email) && (
                      <a 
                        href={`mailto:${student.parent_email || student.email}`}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {student.parent_email || student.email}
                      </a>
                    )}
                    {student.parent_phone && (
                      <a 
                        href={`tel:${student.parent_phone}`}
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {student.parent_phone}
                      </a>
                    )}
                    {!student.parent_email && !student.email && !student.parent_phone && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {student.curriculum ? (
                    <Badge variant="outline">{student.curriculum}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {student.grade_level ? (
                    <Badge variant="secondary">{student.grade_level}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(student.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
