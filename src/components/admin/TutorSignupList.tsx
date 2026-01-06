import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Search, Filter, Users, BookOpen, GraduationCap } from "lucide-react";

interface TutorSignupData {
  created_at: string;
  full_name: string;
  phone_number: string;
  current_institution: string;
  subjects: string[];
  hourly_rate: number | null;
  bio: string | null;
  education: any;
  teaching_levels: string[];
}

const COMMON_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", 
  "Kiswahili", "History", "Geography", "Business Studies", "Computer Science"
];

export const TutorSignupList = () => {
  const [tutors, setTutors] = useState<TutorSignupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

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
          user_id,
          hourly_rate,
          bio,
          education,
          teaching_levels
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (tutorProfiles) {
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
              hourly_rate: tutor.hourly_rate,
              bio: tutor.bio,
              education: tutor.education,
              teaching_levels: tutor.teaching_levels || [],
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

  // Get unique values for filters
  const uniqueSubjects = useMemo(() => {
    const allSubjects = tutors.flatMap(t => t.subjects);
    return [...new Set(allSubjects)].sort();
  }, [tutors]);

  const uniqueLevels = useMemo(() => {
    const allLevels = tutors.flatMap(t => t.teaching_levels);
    return [...new Set(allLevels)].sort();
  }, [tutors]);

  // Filter tutors
  const filteredTutors = useMemo(() => {
    return tutors.filter(tutor => {
      const matchesSearch = searchTerm === "" || 
        tutor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.current_institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSubject = subjectFilter === "all" || 
        tutor.subjects.some(s => s.toLowerCase().includes(subjectFilter.toLowerCase()));
      
      const matchesLevel = levelFilter === "all" || 
        tutor.teaching_levels.some(l => l.toLowerCase().includes(levelFilter.toLowerCase()));
      
      return matchesSearch && matchesSubject && matchesLevel;
    });
  }, [tutors, searchTerm, subjectFilter, levelFilter]);

  // Stats
  const stats = useMemo(() => {
    const subjectCounts: Record<string, number> = {};
    
    tutors.forEach(tutor => {
      tutor.subjects.forEach(subject => {
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      });
    });
    
    return { subjectCounts };
  }, [tutors]);

  // Download CSV
  const downloadCSV = () => {
    const headers = [
      "Signup Date", "Name", "Phone", "Institution", "Subjects", 
      "Teaching Levels", "Hourly Rate", "Bio"
    ];
    
    const rows = filteredTutors.map(tutor => [
      format(new Date(tutor.created_at), "yyyy-MM-dd"),
      tutor.full_name,
      tutor.phone_number,
      tutor.current_institution,
      tutor.subjects.join("; "),
      tutor.teaching_levels.join("; "),
      tutor.hourly_rate || "",
      (tutor.bio || "").replace(/,/g, " ").replace(/\n/g, " ")
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-signups-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filteredTutors.length} tutors`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSubjectFilter("all");
    setLevelFilter("all");
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
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{tutors.length}</p>
                <p className="text-xs text-muted-foreground">Total Tutors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {COMMON_SUBJECTS.slice(0, 3).map(subject => (
          <Card key={subject}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.subjectCounts[subject] || 0}</p>
                  <p className="text-xs text-muted-foreground">{subject}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button size="sm" onClick={downloadCSV}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV ({filteredTutors.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, school, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {uniqueSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {uniqueLevels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Showing {filteredTutors.length} of {tutors.length} tutors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <TableHead className="whitespace-nowrap">School</TableHead>
                  <TableHead className="whitespace-nowrap">Subjects</TableHead>
                  <TableHead className="whitespace-nowrap">Levels</TableHead>
                  <TableHead className="whitespace-nowrap">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTutors.map((tutor, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(tutor.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{tutor.full_name}</TableCell>
                    <TableCell>{tutor.phone_number}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{tutor.current_institution}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {tutor.subjects.slice(0, 3).map(subject => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {tutor.subjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tutor.subjects.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {tutor.teaching_levels.slice(0, 2).map(level => (
                          <Badge key={level} variant="secondary" className="text-xs">
                            {level}
                          </Badge>
                        ))}
                        {tutor.teaching_levels.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{tutor.teaching_levels.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tutor.hourly_rate ? `KES ${tutor.hourly_rate}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
