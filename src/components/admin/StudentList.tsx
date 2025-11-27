import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Student {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
  curriculum: string | null;
  grade_level: string | null;
}

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Get all user IDs with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (rolesError) throw rolesError;

      if (!studentRoles || studentRoles.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = studentRoles.map(role => role.user_id);

      // Get profiles for these students
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, created_at, curriculum, grade_level")
        .in("id", studentIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      setStudents(profiles || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const copyAllEmails = () => {
    const phoneNumbers = students
      .map(s => s.phone_number)
      .filter(Boolean)
      .join(", ");
    
    if (phoneNumbers) {
      navigator.clipboard.writeText(phoneNumbers);
      toast.success(`Copied ${students.filter(s => s.phone_number).length} phone numbers`);
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
            Students will appear here when they sign up
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Registered Students ({students.length})</CardTitle>
        <Button onClick={copyAllEmails} size="sm" variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copy All Phone Numbers
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Curriculum</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  {student.full_name || "—"}
                </TableCell>
                <TableCell>
                  {student.phone_number ? (
                    <a 
                      href={`tel:${student.phone_number}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {student.phone_number}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
