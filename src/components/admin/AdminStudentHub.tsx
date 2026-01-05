import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Phone, 
  Mail, 
  Copy, 
  Users, 
  Search, 
  MessageCircle, 
  ChevronRight,
  RefreshCw,
  Filter,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminParentDetail } from "./AdminParentDetail";

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
  subjects_of_interest: string[] | null;
}

interface SummaryStats {
  totalStudents: number;
  newThisWeek: number;
  activePackages: number;
  upcomingClasses: number;
}

export function AdminStudentHub() {
  const [students, setStudents] = useState<StudentWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [stats, setStats] = useState<SummaryStats>({
    totalStudents: 0,
    newThisWeek: 0,
    activePackages: 0,
    upcomingClasses: 0,
  });

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [studentsCount, newStudents, packages, bookings] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("students").select("*", { count: "exact", head: true })
          .gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("package_purchases").select("*", { count: "exact", head: true })
          .gt("sessions_remaining", 0),
        supabase.from("bookings").select("*, tutor_availability!inner(start_time)", { count: "exact", head: true })
          .gte("tutor_availability.start_time", new Date().toISOString())
          .in("status", ["confirmed", "pending"]),
      ]);

      setStats({
        totalStudents: studentsCount.count || 0,
        newThisWeek: newStudents.count || 0,
        activePackages: packages.count || 0,
        upcomingClasses: bookings.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

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

  const filteredStudents = students.filter((student) => {
    const matchesSearch = !searchQuery || 
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parent_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parent_phone?.includes(searchQuery);
    
    const matchesCurriculum = curriculumFilter === "all" || student.curriculum === curriculumFilter;
    const matchesGrade = gradeFilter === "all" || student.grade_level === gradeFilter;

    return matchesSearch && matchesCurriculum && matchesGrade;
  });

  const uniqueCurriculums = [...new Set(students.map(s => s.curriculum).filter(Boolean))];
  const uniqueGrades = [...new Set(students.map(s => s.grade_level).filter(Boolean))];

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') 
      ? '254' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('254') 
        ? cleanPhone 
        : '254' + cleanPhone;
    
    const message = encodeURIComponent(`Hi ${name},\n\nThis is Lana Tutors. `);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const copyAllEmails = () => {
    const emails = filteredStudents
      .map(s => s.parent_email || s.email)
      .filter(Boolean)
      .join(", ");
    
    if (emails) {
      navigator.clipboard.writeText(emails);
      toast.success(`Copied ${filteredStudents.filter(s => s.parent_email || s.email).length} emails`);
    } else {
      toast.error("No emails found");
    }
  };

  const copyAllPhones = () => {
    const phones = filteredStudents
      .map(s => s.parent_phone)
      .filter(Boolean)
      .join(", ");
    
    if (phones) {
      navigator.clipboard.writeText(phones);
      toast.success(`Copied ${filteredStudents.filter(s => s.parent_phone).length} phone numbers`);
    } else {
      toast.error("No phone numbers found");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Student Hub</h2>
          <p className="text-muted-foreground">Manage parents and students</p>
        </div>
        <Button onClick={fetchStudents} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.newThisWeek}</p>
                <p className="text-xs text-muted-foreground">New This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Copy className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activePackages}</p>
                <p className="text-xs text-muted-foreground">Active Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <MessageCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingClasses}</p>
                <p className="text-xs text-muted-foreground">Upcoming Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Curricula</SelectItem>
                  {uniqueCurriculums.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {uniqueGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
        </p>
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
      </div>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No students found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Curriculum</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow 
                    key={student.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedParentId(student.parent_id)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <p>{student.full_name}</p>
                        {student.age && (
                          <p className="text-xs text-muted-foreground">{student.age} years old</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{student.parent_name || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {student.parent_email && (
                          <p className="text-sm truncate max-w-[180px]">{student.parent_email}</p>
                        )}
                        {student.parent_phone && (
                          <p className="text-sm text-muted-foreground">{student.parent_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.curriculum ? (
                        <Badge variant="outline">{student.curriculum}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {student.grade_level ? (
                        <Badge variant="secondary">{student.grade_level}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(student.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {student.parent_phone && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openWhatsApp(student.parent_phone!, student.parent_name || "Parent")}
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {student.parent_email && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={`mailto:${student.parent_email}`}>
                              <Mail className="h-4 w-4 text-blue-600" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setSelectedParentId(student.parent_id)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Parent Detail Drawer */}
      <AdminParentDetail
        parentId={selectedParentId}
        onClose={() => setSelectedParentId(null)}
      />
    </div>
  );
}
