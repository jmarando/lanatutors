import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

export function GroupClassTutorAssignment() {
  const [groupClasses, setGroupClasses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch group classes with current assignments
    const { data: classes, error: classError } = await supabase
      .from("group_classes")
      .select(`
        *,
        group_class_tutor_assignments(
          id,
          tutor_id,
          is_primary,
          tutor_profiles(
            id,
            user_id
          )
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (classError) {
      console.error("Error fetching classes:", classError);
      toast.error("Failed to load group classes");
    }

    // Fetch verified tutors
    const { data: tutorData, error: tutorError } = await supabase
      .from("tutor_profiles")
      .select("id, user_id, subjects")
      .eq("verified", true);

    if (tutorError) {
      console.error("Error fetching tutors:", tutorError);
      toast.error("Failed to load tutors");
    }

    // Enrich tutors with names from profiles
    if (tutorData) {
      const enrichedTutors = await Promise.all(
        tutorData.map(async (tutor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", tutor.user_id)
            .single();
          
          return {
            ...tutor,
            name: profile?.full_name || "Unknown"
          };
        })
      );
      setTutors(enrichedTutors);
    }

    // Enrich classes with tutor names
    if (classes) {
      const enrichedClasses = await Promise.all(
        classes.map(async (classItem) => {
          const primaryAssignment = classItem.group_class_tutor_assignments?.find(
            (a: any) => a.is_primary
          );
          
          if (primaryAssignment?.tutor_profiles?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", primaryAssignment.tutor_profiles.user_id)
              .single();
            
            return {
              ...classItem,
              tutor_name: profile?.full_name || "TBA",
              assignment_id: primaryAssignment.id
            };
          }
          
          return { ...classItem, tutor_name: "Not Assigned" };
        })
      );
      setGroupClasses(enrichedClasses);
    }

    setLoading(false);
  };

  const assignTutor = async (classId: string, tutorId: string, existingAssignmentId?: string) => {
    setAssigning(classId);
    
    try {
      // If there's an existing assignment, update it
      if (existingAssignmentId) {
        const { error: updateError } = await supabase
          .from("group_class_tutor_assignments")
          .update({ tutor_id: tutorId })
          .eq("id", existingAssignmentId);
        
        if (updateError) throw updateError;
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from("group_class_tutor_assignments")
          .insert({
            group_class_id: classId,
            tutor_id: tutorId,
            is_primary: true,
            status: "active"
          });
        
        if (insertError) throw insertError;
      }

      toast.success("Tutor assigned successfully");
      await fetchData();
    } catch (error) {
      console.error("Error assigning tutor:", error);
      toast.error("Failed to assign tutor");
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Class Tutor Assignments</CardTitle>
        <CardDescription>
          Assign tutors to group classes. Each class should have one primary tutor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Day & Time</TableHead>
              <TableHead>Current Tutor</TableHead>
              <TableHead>Assign Tutor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupClasses.map((classItem) => (
              <TableRow key={classItem.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{classItem.curriculum}</div>
                    <div className="text-sm text-muted-foreground">{classItem.grade_level}</div>
                  </div>
                </TableCell>
                <TableCell>{classItem.subject}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{classItem.day_of_week}</div>
                    <div className="text-muted-foreground">
                      {classItem.start_time} - {classItem.end_time}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {classItem.tutor_name === "Not Assigned" ? (
                    <Badge variant="outline">Unassigned</Badge>
                  ) : (
                    <Badge variant="secondary">{classItem.tutor_name}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      disabled={assigning === classItem.id}
                      onValueChange={(value) => 
                        assignTutor(classItem.id, value, classItem.assignment_id)
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select tutor" />
                      </SelectTrigger>
                      <SelectContent>
                        {tutors.map((tutor) => (
                          <SelectItem key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assigning === classItem.id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
