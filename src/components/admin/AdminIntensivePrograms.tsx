import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  tutor_id: string | null;
  meeting_link: string | null;
  tutor_name?: string;
}

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
}

export const AdminIntensivePrograms = () => {
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningTutor, setAssigningTutor] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("intensive_classes")
        .select("*")
        .eq("status", "active")
        .order("time_slot");

      if (classesError) throw classesError;

      // Fetch tutors
      const { data: tutorsData, error: tutorsError } = await supabase
        .from("tutor_profiles")
        .select("id, user_id")
        .eq("verified", true);

      if (tutorsError) throw tutorsError;

      // Fetch tutor names from profiles
      const tutorIds = tutorsData?.map((t) => t.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", tutorIds);

      const enrichedTutors = tutorsData?.map((tutor) => {
        const profile = profilesData?.find((p) => p.id === tutor.user_id);
        return {
          ...tutor,
          full_name: profile?.full_name || "Unknown",
        };
      }) || [];

      // Enrich classes with tutor names
      const enrichedClasses = classesData?.map((cls) => {
        const tutor = enrichedTutors.find((t) => t.id === cls.tutor_id);
        return {
          ...cls,
          tutor_name: tutor?.full_name,
        };
      }) || [];

      setClasses(enrichedClasses);
      setTutors(enrichedTutors);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTutor = async (classId: string, tutorId: string) => {
    setAssigningTutor(classId);
    try {
      const { error } = await supabase
        .from("intensive_classes")
        .update({ tutor_id: tutorId })
        .eq("id", classId);

      if (error) throw error;

      toast.success("Tutor assigned successfully");
      fetchData();
    } catch (error) {
      console.error("Error assigning tutor:", error);
      toast.error("Failed to assign tutor");
    } finally {
      setAssigningTutor(null);
    }
  };

  const handleGenerateMeetLink = async (classId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-meet-link", {
        body: { title: `December Intensive - Class ${classId.substring(0, 8)}` },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("intensive_classes")
        .update({ meeting_link: data.meetLink })
        .eq("id", classId);

      if (updateError) throw updateError;

      toast.success("Meeting link generated");
      fetchData();
    } catch (error) {
      console.error("Error generating meeting link:", error);
      toast.error("Failed to generate meeting link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedByTime = classes.reduce((acc, cls) => {
    if (!acc[cls.time_slot]) {
      acc[cls.time_slot] = [];
    }
    acc[cls.time_slot].push(cls);
    return acc;
  }, {} as Record<string, IntensiveClass[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>December Holiday Bootcamp Management</CardTitle>
          <CardDescription>Assign tutors and manage classes for the holiday bootcamp</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.entries(groupedByTime).map(([timeSlot, timeClasses]) => (
            <div key={timeSlot} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 bg-muted p-3 rounded">{timeSlot} EAT</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Curriculum</TableHead>
                    <TableHead>Grade Levels</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Assigned Tutor</TableHead>
                    <TableHead>Meeting Link</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.subject}</TableCell>
                      <TableCell>{cls.curriculum}</TableCell>
                      <TableCell>{cls.grade_levels.join(", ")}</TableCell>
                      <TableCell>
                        {cls.current_enrollment} / {cls.max_students}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={cls.tutor_id || ""}
                          onValueChange={(value) => handleAssignTutor(cls.id, value)}
                          disabled={assigningTutor === cls.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tutor">
                              {cls.tutor_name || "Select tutor"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {tutors.map((tutor) => (
                              <SelectItem key={tutor.id} value={tutor.id}>
                                {tutor.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {cls.meeting_link ? (
                          <a
                            href={cls.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            View Link
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not generated</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!cls.meeting_link && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateMeetLink(cls.id)}
                          >
                            Generate Link
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
