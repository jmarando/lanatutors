import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface TutorSignup {
  created_at: string;
  full_name: string;
  phone_number: string;
  current_school: string;
  subjects: string[];
  teaching_level: string;
  email: string;
  status: string;
}

const TutorSignupReport = () => {
  const [signups, setSignups] = useState<TutorSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("created_at, full_name, phone_number, current_school, subjects, teaching_level, email, status")
        .gte("created_at", "2024-11-21")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSignups(data || []);
    } catch (error) {
      console.error("Error fetching signups:", error);
      toast.error("Failed to load tutor signups");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const copyToClipboard = () => {
    const headers = "Signup Date\tName\tPhone Number\tCurrent School\tSubjects\tTeaching Levels\tEmail\tStatus\n";
    const rows = signups.map(signup => 
      `${formatDate(signup.created_at)}\t${signup.full_name}\t${signup.phone_number}\t${signup.current_school}\t${signup.subjects?.join(", ") || ""}\t${signup.teaching_level || ""}\t${signup.email}\t${signup.status}`
    ).join("\n");
    
    navigator.clipboard.writeText(headers + rows);
    toast.success("Table copied to clipboard! You can now paste it into Excel.");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tutor Signups Since November 21, 2024</CardTitle>
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Current School</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Teaching Levels</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signups.map((signup, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">{formatDate(signup.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{signup.full_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{signup.phone_number}</TableCell>
                    <TableCell>{signup.current_school}</TableCell>
                    <TableCell>{signup.subjects?.join(", ") || "-"}</TableCell>
                    <TableCell>{signup.teaching_level || "-"}</TableCell>
                    <TableCell>{signup.email}</TableCell>
                    <TableCell className="capitalize">{signup.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: "Rates Quoted" and "About Me" fields are not captured during initial signup. 
            These are added later when tutors complete their full profile after approval.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorSignupReport;
