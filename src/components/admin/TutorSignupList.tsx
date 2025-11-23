import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

interface TutorSignupData {
  created_at: string;
  full_name: string;
  phone_number: string;
  current_institution: string;
  subjects: string[];
}

export const TutorSignupList = () => {
  const [tutors, setTutors] = useState<TutorSignupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutorSignups();
  }, []);

  const fetchTutorSignups = async () => {
    try {
      const { data: tutorProfiles, error: profilesError } = await supabase
        .from("tutor_profiles")
        .select(`
          created_at,
          current_institution,
          subjects,
          user_id
        `)
        .order("created_at", { ascending: true });

      if (profilesError) throw profilesError;

      if (tutorProfiles) {
        // Fetch profile data for each tutor
        const enrichedData = await Promise.all(
          tutorProfiles.map(async (tutor) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone_number")
              .eq("id", tutor.user_id)
              .maybeSingle();

            return {
              created_at: tutor.created_at,
              full_name: profile?.full_name || "N/A",
              phone_number: profile?.phone_number || "N/A",
              current_institution: tutor.current_institution || "N/A",
              subjects: tutor.subjects || [],
            };
          })
        );

        setTutors(enrichedData);
      }
    } catch (error: any) {
      console.error("Error fetching tutor signups:", error);
      toast.error("Failed to load tutor signup data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading tutor signup data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chronological Tutor Signups ({tutors.length} total)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signup Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Current School</TableHead>
                <TableHead>Subjects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tutors.map((tutor, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {format(new Date(tutor.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{tutor.full_name}</TableCell>
                  <TableCell>{tutor.phone_number}</TableCell>
                  <TableCell>{tutor.current_institution}</TableCell>
                  <TableCell>{tutor.subjects.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
