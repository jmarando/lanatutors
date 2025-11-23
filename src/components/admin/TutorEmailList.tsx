import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface TutorEmail {
  id: string;
  email: string;
  full_name: string;
  verified: boolean;
  created_at: string;
}

export const TutorEmailList = () => {
  const [tutors, setTutors] = useState<TutorEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTutorEmails();
  }, []);

  const fetchTutorEmails = async () => {
    try {
      const { data: tutorProfiles, error } = await supabase
        .from("tutor_profiles")
        .select(`
          id,
          email,
          verified,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tutorEmailsData = await Promise.all(
        (tutorProfiles || []).map(async (tutor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", tutor.user_id)
            .single();

          return {
            id: tutor.id,
            email: tutor.email || "N/A",
            full_name: profile?.full_name || "N/A",
            verified: tutor.verified || false,
            created_at: tutor.created_at || "",
          };
        })
      );

      setTutors(tutorEmailsData);
    } catch (error) {
      console.error("Error fetching tutor emails:", error);
      toast({
        title: "Error",
        description: "Failed to load tutor emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAllEmails = () => {
    const emailList = tutors.map(t => t.email).filter(e => e !== "N/A").join(", ");
    navigator.clipboard.writeText(emailList);
    toast({
      title: "Copied!",
      description: `${tutors.length} emails copied to clipboard`,
    });
  };

  if (loading) {
    return <div className="p-8">Loading tutor emails...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Registered Tutor Emails ({tutors.length})</CardTitle>
        <Button onClick={copyAllEmails} variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Copy All Emails
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Registered Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tutors.map((tutor) => (
              <TableRow key={tutor.id}>
                <TableCell>{tutor.full_name}</TableCell>
                <TableCell>{tutor.email}</TableCell>
                <TableCell>{tutor.verified ? "✓" : "✗"}</TableCell>
                <TableCell>
                  {new Date(tutor.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
