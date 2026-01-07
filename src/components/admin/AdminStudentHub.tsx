import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Mail, 
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
import { ManualBookingDialog } from "./ManualBookingDialog";

interface StudentWithParent {
  id: string;
  full_name: string;
  age: number | null;
  curriculum: string | null;
  grade_level: string | null;
  email: string | null;
  created_at: string;
  parent_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  subjects_of_interest: string[] | null;
  source: 'child' | 'direct'; // child = added by parent, direct = signed up themselves
  phone_number: string | null;
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
  const [showAddDialog, setShowAddDialog] = useState(false);
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

      const [childrenCount, directStudentsCount, newChildren, newDirect, packages, bookings] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true })
          .eq("account_type", "student"),
        supabase.from("students").select("*", { count: "exact", head: true })
          .gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true })
          .eq("account_type", "student")
          .gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("package_purchases").select("*", { count: "exact", head: true })
          .gt("sessions_remaining", 0),
        supabase.from("bookings").select("*, tutor_availability!inner(start_time)", { count: "exact", head: true })
          .gte("tutor_availability.start_time", new Date().toISOString())
          .in("status", ["confirmed", "pending"]),
      ]);

      setStats({
        totalStudents: (childrenCount.count || 0) + (directStudentsCount.count || 0),
        newThisWeek: (newChildren.count || 0) + (newDirect.count || 0),
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
      // Fetch children from students table (added by parents)
      const { data: childrenData, error: childrenError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (childrenError) throw childrenError;

      // Fetch direct student signups from profiles table
      const { data: directStudentsData, error: directError } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_type", "student")
        .order("created_at", { ascending: false });

      if (directError) throw directError;

      // Enrich children with parent info
      const enrichedChildren = await Promise.all(
        (childrenData || []).map(async (student) => {
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
            id: student.id,
            full_name: student.full_name,
            age: student.age,
            curriculum: student.curriculum,
            grade_level: student.grade_level,
            email: student.email,
            created_at: student.created_at,
            parent_id: student.parent_id,
            parent_name: parentName,
            parent_phone: parentPhone,
            parent_email: parentEmail,
            subjects_of_interest: student.subjects_of_interest,
            source: 'child' as const,
            phone_number: null,
          };
        })
      );

      // Enrich direct students with their own email
      const enrichedDirect = await Promise.all(
        (directStudentsData || []).map(async (profile) => {
          const { data: emailData } = await supabase.rpc('get_user_email', {
            _user_id: profile.id
          });

          return {
            id: profile.id,
            full_name: profile.full_name || "Unknown",
            age: profile.age,
            curriculum: profile.curriculum,
            grade_level: profile.grade_level,
            email: emailData,
            created_at: profile.created_at,
            parent_id: null,
            parent_name: null,
            parent_phone: null,
            parent_email: null,
            subjects_of_interest: profile.subjects_struggling,
            source: 'direct' as const,
            phone_number: profile.phone_number,
          };
        })
      );

      // Combine and sort by created_at
      const allStudents = [...enrichedChildren, ...enrichedDirect].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setStudents(allStudents);
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
      student.parent_phone?.includes(searchQuery) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone_number?.includes(searchQuery);
    
    const matchesCurriculum = curriculumFilter === "all" || !student.curriculum || student.curriculum === curriculumFilter;
    const matchesGrade = gradeFilter === "all" || !student.grade_level || student.grade_level === gradeFilter;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Student Hub</h2>
          <p className="text-muted-foreground">Manage parents and students</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student / Parent
          </Button>
          <Button onClick={fetchStudents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
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
                <Users className="h-5 w-5 text-blue-500" />
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

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
      </p>

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
                  <TableHead>Type</TableHead>
                  <TableHead>Parent / Contact</TableHead>
                  <TableHead>Curriculum</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const contactPhone = student.source === 'direct' ? student.phone_number : student.parent_phone;
                  const contactEmail = student.source === 'direct' ? student.email : student.parent_email;
                  const contactName = student.source === 'direct' ? student.full_name : (student.parent_name || "Parent");
                  
                  return (
                    <TableRow 
                      key={`${student.source}-${student.id}`} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => student.source === 'child' ? setSelectedParentId(student.parent_id) : setSelectedParentId(student.id)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p>{student.full_name}</p>
                          {student.age && (
                            <p className="text-xs text-muted-foreground">{student.age} years old</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.source === 'direct' ? 'default' : 'outline'} className="text-xs">
                          {student.source === 'direct' ? 'Direct Signup' : 'Child'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {student.source === 'child' && student.parent_name && (
                            <p className="text-sm font-medium">{student.parent_name}</p>
                          )}
                          {contactEmail && (
                            <p className="text-sm truncate max-w-[180px]">{contactEmail}</p>
                          )}
                          {contactPhone && (
                            <p className="text-sm text-muted-foreground">{contactPhone}</p>
                          )}
                          {!contactEmail && !contactPhone && "—"}
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
                          {contactPhone && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openWhatsApp(contactPhone, contactName)}
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {contactEmail && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={`mailto:${contactEmail}`}>
                                <Mail className="h-4 w-4 text-blue-600" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => student.source === 'child' ? setSelectedParentId(student.parent_id) : setSelectedParentId(student.id)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Add Student/Parent Dialog */}
      <ManualBookingDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => {
          fetchStudents();
          fetchStats();
        }}
      />
    </div>
  );
}
