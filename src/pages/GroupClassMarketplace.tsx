import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

const GroupClassMarketplace = () => {
  const navigate = useNavigate();
  const [groupClasses, setGroupClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [curriculumFilter, setCurriculumFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");

  useEffect(() => {
    fetchGroupClasses();
  }, []);

  const fetchGroupClasses = async () => {
    const { data, error } = await supabase
      .from("group_classes")
      .select("*")
      .eq("status", "active")
      .order("day_of_week", { ascending: true });

    if (error) {
      console.error("Error fetching group classes:", error);
      toast.error("Failed to load group classes");
    } else {
      setGroupClasses(data || []);
    }
    setLoading(false);
  };

  const filteredClasses = groupClasses.filter((classItem) => {
    if (curriculumFilter !== "all" && classItem.curriculum !== curriculumFilter) return false;
    if (gradeFilter !== "all" && classItem.grade_level !== gradeFilter) return false;
    if (subjectFilter !== "all" && classItem.subject !== subjectFilter) return false;
    if (dayFilter !== "all" && classItem.day_of_week !== dayFilter) return false;
    return true;
  });

  const handleEnroll = (classId: string) => {
    navigate(`/group-classes/${classId}/enroll`);
  };

  const uniqueCurricula = Array.from(new Set(groupClasses.map((c) => c.curriculum)));
  const uniqueGrades = Array.from(new Set(groupClasses.map((c) => c.grade_level)));
  const uniqueSubjects = Array.from(new Set(groupClasses.map((c) => c.subject)));
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <>
      <SEO
        title="Group Classes | LANA Tutors"
        description="Join affordable group classes starting from KES 400/hour across multiple subjects and curricula"
      />
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Group Classes</h1>
            <p className="text-lg text-muted-foreground">
              Learn together with peers. Affordable rates starting from KES 400/hour.
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Curricula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curricula</SelectItem>
                {uniqueCurricula.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {uniqueGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {uniqueSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Cards */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No group classes match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{classItem.curriculum}</Badge>
                      <Badge variant="outline">{classItem.grade_level}</Badge>
                    </div>
                    <CardTitle className="text-xl">{classItem.subject}</CardTitle>
                    <CardDescription>{classItem.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{classItem.day_of_week}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{classItem.start_time} - {classItem.end_time} EAT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>Online via Google Meet</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-2xl font-bold text-primary">KES 400</div>
                          <div className="text-xs text-muted-foreground">per hour</div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleEnroll(classItem.id)}
                        className="w-full"
                      >
                        Join Class
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GroupClassMarketplace;
