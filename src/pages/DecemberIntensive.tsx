import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { Calendar, Clock, Users, CheckCircle2, Plus, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { IntensiveClassCard } from "@/components/IntensiveClassCard";
import { IntensiveCartSimple } from "@/components/IntensiveCartSimple";
import { useToast } from "@/hooks/use-toast";
interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  focus_topics: string | null;
  tutor_id: string | null;
  tutor_name: string | null;
  tutor_avatar: string | null;
  tutor_slug: string | null;
  session_topics: Record<string, string> | null;
}
const DecemberIntensive = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("CBC");
  const [selectedGrade, setSelectedGrade] = useState<string>("Grade 7");

  // Cart state - single student flow
  const [selectedClasses, setSelectedClasses] = useState<Array<{
    id: string;
    subject: string;
    curriculum: string;
    gradeLevel: string;
  }>>([]);
  useEffect(() => {
    fetchClasses();
    loadCartFromStorage();
  }, []);
  useEffect(() => {
    saveCartToStorage();
  }, [selectedClasses]);

  // Auto-select first grade when curriculum changes
  useEffect(() => {
    const grades = gradesByCurriculum[selectedCurriculum];
    if (grades && grades.length > 0) {
      setSelectedGrade(grades[0]);
    }
  }, [selectedCurriculum]);
  const loadCartFromStorage = () => {
    const saved = localStorage.getItem('december_intensive_cart');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSelectedClasses(data.selectedClasses || []);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  };
  const saveCartToStorage = () => {
    localStorage.setItem('december_intensive_cart', JSON.stringify({
      selectedClasses
    }));
  };
  const fetchClasses = async () => {
    try {
      const {
        data: programData
      } = await supabase.from("intensive_programs").select("id").eq("is_active", true).single();
      if (!programData) return;
      const {
        data: classesData,
        error
      } = await supabase.from("intensive_classes").select("*").eq("program_id", programData.id).eq("status", "active").order("time_slot");
      if (error || !classesData) {
        setLoading(false);
        return;
      }

      // Get unique tutor_ids
      const tutorIds = [...new Set(classesData.map(c => c.tutor_id).filter(Boolean))] as string[];
      const tutorInfo: Record<string, {
        name: string;
        avatar: string | null;
        slug: string | null;
      }> = {};
      if (tutorIds.length > 0) {
        const {
          data: tutorProfiles
        } = await supabase.from('tutor_profiles').select('id, user_id, profile_slug').in('id', tutorIds);
        if (tutorProfiles) {
          const userIds = tutorProfiles.map(tp => tp.user_id);
          const {
            data: profiles
          } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
          if (profiles) {
            tutorProfiles.forEach(tp => {
              const profile = profiles.find(p => p.id === tp.user_id);
              if (profile) {
                tutorInfo[tp.id] = {
                  name: profile.full_name || 'Unknown Tutor',
                  avatar: profile.avatar_url,
                  slug: tp.profile_slug
                };
              }
            });
          }
        }
      }
      const enrichedClasses: IntensiveClass[] = classesData.map(cls => ({
        id: cls.id,
        subject: cls.subject,
        curriculum: cls.curriculum,
        grade_levels: cls.grade_levels,
        time_slot: cls.time_slot,
        current_enrollment: cls.current_enrollment,
        max_students: cls.max_students,
        focus_topics: cls.focus_topics,
        tutor_id: cls.tutor_id,
        tutor_name: cls.tutor_id ? tutorInfo[cls.tutor_id]?.name || null : null,
        tutor_avatar: cls.tutor_id ? tutorInfo[cls.tutor_id]?.avatar || null : null,
        tutor_slug: cls.tutor_id ? tutorInfo[cls.tutor_id]?.slug || null : null,
        session_topics: cls.session_topics as Record<string, string> | null
      }));
      setClasses(enrichedClasses);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleAddToCart = (classId: string, subject: string, curriculum: string, gradeLevel: string) => {
    const existingIndex = selectedClasses.findIndex(c => c.id === classId);
    if (existingIndex >= 0) {
      // Remove from cart
      setSelectedClasses(selectedClasses.filter(c => c.id !== classId));
    } else {
      // Add to cart
      setSelectedClasses([...selectedClasses, {
        id: classId,
        subject,
        curriculum,
        gradeLevel
      }]);
    }
  };
  const handleRemoveClass = (classId: string) => {
    setSelectedClasses(selectedClasses.filter(c => c.id !== classId));
  };
  const timeSlots = ["8:00 - 9:15 AM", "9:30 - 10:45 AM", "11:00 AM - 12:15 PM", "1:00 - 2:15 PM", "2:30 - 3:45 PM", "4:00 - 5:15 PM"];
  const getSubjectIcon = (subject: string) => {
    const icons: Record<string, string> = {
      "Mathematics": "📐",
      "Pure Mathematics": "📐",
      "Statistics": "📊",
      "Mechanics": "⚙️",
      "Core Mathematics": "📐",
      "Extended Mathematics": "📐",
      "Physics": "⚡",
      "Chemistry": "🧪",
      "Biology": "🔬",
      "Integrated Science": "🔬",
      "English": "📚",
      "Kiswahili": "🗣️",
      "TOK": "💭"
    };
    return icons[subject] || "📖";
  };
  const gradesByCurriculum: Record<string, string[]> = {
    "CBC": ["Grade 7", "Grade 8", "Grade 9"],
    "8-4-4": ["Form 3", "Form 4"],
    "IGCSE": ["Year 10", "Year 11"],
    "A-Level": ["Year 12", "Year 13"],
    "IB": ["Year 12", "Year 13"]
  };
  const filteredClasses = classes.filter(cls => {
    if (cls.curriculum !== selectedCurriculum) return false;
    if (selectedGrade && !cls.grade_levels.includes(selectedGrade)) return false;
    return true;
  });
  const features = [{
    icon: Calendar,
    title: "10 Lessons Per Subject",
    description: "Complete coverage across 2 weeks"
  }, {
    icon: Clock,
    title: "75-Minute Sessions",
    description: "Extended lessons for deeper learning"
  }, {
    icon: Users,
    title: "Small Class Sizes",
    description: "Maximum 15 students per class"
  }, {
    icon: CheckCircle2,
    title: "Expert Tutors",
    description: "Qualified tutors for each subject"
  }];
  const startDate = new Date(2025, 11, 9);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const allDates = weekdays.flatMap((day, i) => [{
    day,
    date: format(addDays(startDate, i), "MMM d")
  }, {
    day,
    date: format(addDays(startDate, i + 7), "MMM d")
  }]);
  return <>
      <SEO title="December Holiday Bootcamp 2025 | Lana Tutors" description="Join our 2-week December Holiday Bootcamp. 10 lessons per subject across Mathematics, Sciences, English, and more. December 8-19, 2025." />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-32">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-primary">
              December Holiday Bootcamp 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              December 8 - 19, 2025
            </p>
          </div>

          {/* How It Works */}
          <Card className="max-w-4xl mx-auto mb-12 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl text-center">How to Enroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Select Classes</h3>
                  <p className="text-sm text-muted-foreground">Browse subjects and add up to 6 to your cart</p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Add Student Details</h3>
                  <p className="text-sm text-muted-foreground">Enter your child's information during checkout</p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Checkout & Pay</h3>
                  <p className="text-sm text-muted-foreground">Review your cart and complete payment via Pesapal</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-center">
                  <strong>What happens next:</strong> After payment, you&apos;ll receive confirmation emails with Google Meet links and Google Classroom access for each enrolled subject. Classes begin December 8th!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Student Selector - Removed from top */}

          {/* Curriculum Tabs */}
          <div id="schedule" className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Select Your Classes</h2>
            <p className="text-center text-muted-foreground mb-8">
              Choose your curriculum, then add subjects to your cart
            </p>

            <Tabs value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
              <TabsList className="grid grid-cols-5 w-full mb-6">
                <TabsTrigger value="CBC">CBC</TabsTrigger>
                <TabsTrigger value="8-4-4">8-4-4</TabsTrigger>
                <TabsTrigger value="IGCSE">IGCSE</TabsTrigger>
                <TabsTrigger value="A-Level">A-Level</TabsTrigger>
                <TabsTrigger value="IB">IB</TabsTrigger>
              </TabsList>

              {/* Grade level chips */}
              {selectedCurriculum && <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedCurriculum === "CBC" || selectedCurriculum === "8-4-4" ? "Select the grade your child will be in next year (2026). E.g., if in Grade 6 in 2025, select Grade 7:" : "Select your child's current grade level:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gradesByCurriculum[selectedCurriculum]?.map(grade => <Badge key={grade} variant={selectedGrade === grade ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedGrade(grade)}>
                        {grade}
                      </Badge>)}
                  </div>
                </div>}

              {/* Class Cards */}
              {loading ? <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Loading schedule...</p>
                  </CardContent>
                </Card> : <>
                  {/* Grade-Specific Schedule */}
                  {selectedGrade && <>
                      <Card className="mb-8 bg-primary/5 border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {selectedGrade} Daily Schedule
                          </CardTitle>
                          <CardDescription>Classes run Monday to Friday, December 8-19, 2025</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {timeSlots.map(slot => {
                        const classAtTime = filteredClasses.find(cls => cls.time_slot === slot && cls.grade_levels.includes(selectedGrade));
                        if (!classAtTime) return null;

                        // Parse focus_topics to extract week 1 and week 2
                        const topics = classAtTime.focus_topics || '';
                        const week1Match = topics.match(/Week 1:([^|]+)/);
                        const week2Match = topics.match(/Week 2:([^|]+)/);
                        const week1Topics = week1Match ? week1Match[1].trim() : 'Topics to be announced';
                        const week2Topics = week2Match ? week2Match[1].trim() : 'Topics to be announced';
                        const isInCart = selectedClasses.some(c => c.id === classAtTime.id);
                        return <div key={slot} className="p-4 rounded-lg border bg-card">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-semibold mb-1">{slot} EAT</div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">{getSubjectIcon(classAtTime.subject)}</span>
                                        <span className="font-medium">{classAtTime.subject}</span>
                                        <span className="text-sm text-muted-foreground">•</span>
                                        <span className="font-semibold text-primary">
                                          KES {selectedCurriculum === "A-Level" || selectedCurriculum === "IB" ? "600" : selectedCurriculum === "IGCSE" ? "500" : "400"}/session
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        10 sessions × KES {selectedCurriculum === "A-Level" || selectedCurriculum === "IB" ? "600 = KES 6,000" : selectedCurriculum === "IGCSE" ? "500 = KES 5,000" : "400 = KES 4,000"} • 75 min each
                                      </p>
                                      {classAtTime.tutor_name && classAtTime.tutor_slug && <div className="text-sm text-muted-foreground mt-1">
                                          with{" "}
                                          <Link to={`/tutors/${classAtTime.tutor_slug}`} className="text-primary hover:underline">
                                            {classAtTime.tutor_name}
                                          </Link>
                                        </div>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" variant={isInCart ? "secondary" : "default"} onClick={() => handleAddToCart(classAtTime.id, classAtTime.subject, classAtTime.curriculum, selectedGrade)} className="ml-2">
                                        {isInCart ? <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Added
                                          </> : <>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add
                                          </>}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t text-sm">
                                    <div>
                                      <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Week 1 (Dec 8-12)</div>
                                      <div className="text-muted-foreground">{week1Topics}</div>
                                    </div>
                                    <div>
                                      <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Week 2 (Dec 15-19)</div>
                                      <div className="text-muted-foreground">{week2Topics}</div>
                                    </div>
                                  </div>
                                </div>;
                      })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Week-by-Week Topics Summary */}
                      <Card className="mb-8">
                        <CardHeader>
                          <CardTitle>{selectedGrade} Topics Overview</CardTitle>
                          <CardDescription>Subject coverage across the 2-week program</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-3 font-semibold">Subject</th>
                                  <th className="text-left p-3 font-semibold">Week 1 (Dec 8-12)</th>
                                  <th className="text-left p-3 font-semibold">Week 2 (Dec 15-19)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredClasses.map(cls => {
                            const topics = cls.focus_topics || '';
                            const week1Match = topics.match(/Week 1:([^|]+)/);
                            const week2Match = topics.match(/Week 2:([^|]+)/);
                            const week1Topics = week1Match ? week1Match[1].trim() : 'Topics to be announced';
                            const week2Topics = week2Match ? week2Match[1].trim() : 'Topics to be announced';
                            return <tr key={cls.id} className="border-b last:border-0">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{getSubjectIcon(cls.subject)}</span>
                                          <span className="font-medium">{cls.subject}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-sm text-muted-foreground">{week1Topics}</td>
                                      <td className="p-3 text-sm text-muted-foreground">{week2Topics}</td>
                                    </tr>;
                          })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </>}

                  {/* Classes by Time Slot and Grade */}
                  {timeSlots.map(timeSlot => {
                const classesAtTime = filteredClasses.filter(cls => cls.time_slot === timeSlot);
                if (classesAtTime.length === 0) return null;

                // Group by subject AND grade level
                const subjectGradeGroups: Record<string, IntensiveClass[]> = {};
                classesAtTime.forEach(cls => {
                  const gradeLevel = cls.grade_levels[0] || "";
                  const key = `${cls.subject}-${gradeLevel}`;
                  if (!subjectGradeGroups[key]) {
                    subjectGradeGroups[key] = [];
                  }
                  subjectGradeGroups[key].push(cls);
                });
                return <div key={timeSlot} className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-semibold">{timeSlot} EAT</h3>
                          <Badge variant="outline">75 min</Badge>
                          <span className="text-sm text-muted-foreground ml-2">Mon - Fri</span>
                        </div>

                        <div className="grid gap-4">
                          {Object.entries(subjectGradeGroups).map(([key, classes]) => {
                      const firstClass = classes[0];
                      const gradeLevel = firstClass.grade_levels[0] || "";
                      const isInCart = selectedClasses.some(c => c.id === firstClass.id);
                      return <IntensiveClassCard key={key} subject={`${firstClass.subject} - ${gradeLevel}`} icon={getSubjectIcon(firstClass.subject)} classes={classes} isInCart={isInCart} onAddToCart={() => handleAddToCart(firstClass.id, firstClass.subject, firstClass.curriculum, gradeLevel)} weekDates={allDates} />;
                    })}
                        </div>
                      </div>;
              })}
                </>}
            </Tabs>
          </div>

          {/* Features Grid - Moved Lower */}
          <div className="max-w-6xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Program Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => <Card key={index}>
                  <CardHeader>
                    <feature.icon className="h-10 w-10 text-primary mb-2" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>)}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Cart */}
      <IntensiveCartSimple selectedClasses={selectedClasses} onRemoveClass={handleRemoveClass} />
    </>;
};
export default DecemberIntensive;