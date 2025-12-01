import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, CheckCircle2, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  focus_topics: string | null;
}

const DecemberIntensive = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data: programData } = await supabase
        .from("intensive_programs")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!programData) return;

      const { data, error } = await supabase
        .from("intensive_classes")
        .select("*")
        .eq("program_id", programData.id)
        .eq("status", "active")
        .order("time_slot");

      if (!error && data) {
        setClasses(data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = ["8:00 - 9:15 AM", "9:30 - 10:45 AM", "11:00 AM - 12:15 PM", "1:00 - 2:15 PM", "2:30 - 3:45 PM", "4:00 - 5:15 PM"];
  
  const getSubjectIcon = (subject: string) => {
    const icons: Record<string, string> = {
      "Mathematics": "📐",
      "Physics": "⚡",
      "Chemistry": "🧪",
      "Biology": "🔬",
      "English": "📚",
      "Kiswahili": "🗣️",
    };
    return icons[subject] || "📖";
  };

  const filteredClasses = classes.filter(cls => {
    if (selectedCurriculum !== "all" && cls.curriculum !== selectedCurriculum) return false;
    if (selectedGrade !== "all" && !cls.grade_levels.includes(selectedGrade)) return false;
    return true;
  });

  const allCurricula = ["CBC", "8-4-4", "IGCSE", "A-Level", "IB"];
  const allGrades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];

  const features = [
    { icon: Calendar, title: "10 Lessons Per Subject", description: "Complete coverage across 2 weeks" },
    { icon: Clock, title: "75-Minute Sessions", description: "Extended learning time with 15-min breaks" },
    { icon: Users, title: "Small Class Sizes", description: "Maximum 10 students per class" },
    { icon: CheckCircle2, title: "Expert Tutors", description: "Qualified tutors for each subject" },
  ];

  return (
    <>
      <SEO
        title="December Intensive Program 2025 | LANA Tutors"
        description="Join our 2-week December Intensive Program. 10 lessons per subject across Mathematics, Sciences, English, and more. December 8-19, 2025."
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              December Intensive Program 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              December 8 - 19, 2025
            </p>
            <p className="text-lg mb-8">
              Comprehensive revision program with 10 lessons per subject across Mathematics, Physics, Chemistry, Biology, English, and Kiswahili/TOK.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/december-intensive/enroll")} className="text-lg">
                Enroll Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" })}>
                View Schedule
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily Schedule with Filters */}
          <div id="schedule" className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Daily Schedule by Stream</h2>
            
            {/* Filter Controls */}
            <Card className="max-w-5xl mx-auto mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Filter className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Filter Classes:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Curriculum</label>
                    <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Curricula" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Curricula</SelectItem>
                        {allCurricula.map(curr => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Grade Level</label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Grades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {allGrades.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Grid */}
            {loading ? (
              <Card className="max-w-5xl mx-auto">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Loading schedule...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-5xl mx-auto space-y-6">
                {timeSlots.map((timeSlot, idx) => {
                  const classesAtTime = filteredClasses.filter(cls => cls.time_slot === timeSlot);
                  
                  if (classesAtTime.length === 0 && selectedCurriculum === "all" && selectedGrade === "all") {
                    // Show lunch break placeholder
                    if (idx === 3) {
                      return (
                        <Card key={timeSlot} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">🍽️</span>
                              <div>
                                <p className="font-semibold">Lunch Break</p>
                                <p className="text-sm text-muted-foreground">12:15 - 1:00 PM EAT</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  }

                  if (classesAtTime.length === 0) return null;

                  return (
                    <Card key={timeSlot}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{timeSlot} EAT</CardTitle>
                          <span className="text-sm text-muted-foreground">75 minutes</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {classesAtTime.map(cls => (
                            <div key={cls.id} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                              <div className="flex items-start gap-3 mb-2">
                                <span className="text-2xl">{getSubjectIcon(cls.subject)}</span>
                                <div className="flex-1">
                                  <p className="font-semibold">{cls.subject}</p>
                                  <p className="text-sm text-muted-foreground">{cls.curriculum}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {cls.grade_levels.join(", ")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                <span className="text-xs text-muted-foreground">
                                  {cls.current_enrollment}/{cls.max_students} enrolled
                                </span>
                                {cls.current_enrollment >= cls.max_students && (
                                  <span className="text-xs text-destructive font-medium">Full</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">KES 4,000 per subject</CardTitle>
                <CardDescription>Choose up to 6 subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>10 comprehensive lessons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>75 minutes per session</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Expert tutor guidance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Google Classroom access</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => navigate("/december-intensive/enroll")}>
                  Enroll Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Supported Curricula */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">All Curricula Supported</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {["CBC", "8-4-4", "IGCSE", "A-Level", "IB"].map((curriculum) => (
                <Card key={curriculum} className="px-8 py-4">
                  <CardTitle className="text-lg">{curriculum}</CardTitle>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensive;