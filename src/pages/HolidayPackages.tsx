import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { HolidayPackageBanner } from "@/components/HolidayPackageBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Calendar, Gift, CheckCircle, BookOpen, Clock, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface HolidayPackage {
  id: string;
  year: number;
  holiday_period: string;
  curriculum: string;
  candidate_levels: string[];
  starts_at: string;
  ends_at: string;
}

interface SubjectPackage {
  subject: string;
  defaultSessions: number;
}

interface SelectedSubject {
  subject: string;
  sessions: number;
}

interface CurriculumPackageConfig {
  curriculum: string;
  candidateLevels: string[];
  subjects: SubjectPackage[];
  sessionsPerSubject: number;
  pricePerSession: number;
  discount: number;
  features: string[];
}

export default function HolidayPackages() {
  const navigate = useNavigate();
  const [holidayConfigs, setHolidayConfigs] = useState<HolidayPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("IGCSE");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: holidays, error: holidayError } = await supabase
        .from("holiday_packages")
        .select("*")
        .eq("is_active", true)
        .eq("holiday_period", "december");

      if (holidayError) throw holidayError;
      setHolidayConfigs(holidays || []);
      
      // Set default curriculum and level
      if (holidays && holidays.length > 0) {
        setSelectedCurriculum(holidays[0].curriculum);
        setSelectedLevel(holidays[0].candidate_levels[0]);
      }
    } catch (error) {
      console.error("Error fetching holiday packages:", error);
      toast.error("Failed to load holiday packages");
    } finally {
      setLoading(false);
    }
  };

  // Package configurations for each curriculum
  const packageConfigs: Record<string, CurriculumPackageConfig> = {
    "IGCSE": {
      curriculum: "IGCSE",
      candidateLevels: ["Year 10", "Year 11", "Year 12 (A-Level)", "Year 13 (A-Level)"],
      subjects: [
        { subject: "Mathematics", defaultSessions: 10 },
        { subject: "Physics", defaultSessions: 10 },
        { subject: "Chemistry", defaultSessions: 10 },
        { subject: "Biology", defaultSessions: 10 },
        { subject: "English Language", defaultSessions: 10 },
        { subject: "Business Studies", defaultSessions: 10 },
      ],
      sessionsPerSubject: 10,
      pricePerSession: 1500,
      discount: 20,
      features: [
        "IGCSE & A-Level exam preparation including Checkpoint and Mock exams",
        "Intensive past paper practice and exam technique",
        "Topic-by-topic revision with personalized feedback",
        "Progress tracking throughout the holiday period",
      ],
    },
    "CBC": {
      curriculum: "CBC",
      candidateLevels: ["Grade 6", "Grade 9"],
      subjects: [
        { subject: "Mathematics", defaultSessions: 10 },
        { subject: "English", defaultSessions: 10 },
        { subject: "Science & Technology", defaultSessions: 10 },
        { subject: "Social Studies", defaultSessions: 10 },
      ],
      sessionsPerSubject: 10,
      pricePerSession: 1200,
      discount: 15,
      features: [
        "JSCAE exam preparation for Grade 9",
        "KPSEA preparation for Grade 6",
        "Competency-based learning approach",
        "Interactive sessions with regular assessments",
      ],
    },
    "8-4-4": {
      curriculum: "8-4-4",
      candidateLevels: ["Form 3", "Form 4 (KCSE)"],
      subjects: [
        { subject: "Mathematics", defaultSessions: 10 },
        { subject: "English", defaultSessions: 10 },
        { subject: "Kiswahili", defaultSessions: 10 },
        { subject: "Physics", defaultSessions: 10 },
        { subject: "Chemistry", defaultSessions: 10 },
        { subject: "Biology", defaultSessions: 10 },
        { subject: "History", defaultSessions: 10 },
        { subject: "Geography", defaultSessions: 10 },
      ],
      sessionsPerSubject: 10,
      pricePerSession: 1300,
      discount: 25,
      features: [
        "KCSE exam preparation with intensive mock exams",
        "Past paper practice and exam strategies",
        "Focus on high-yield topics and common mistakes",
        "Comprehensive coverage of all exam topics",
      ],
    },
  };

  const currentConfig = packageConfigs[selectedCurriculum];
  
  const handleSubjectToggle = (subjectName: string, defaultSessions: number) => {
    setSelectedSubjects(prev => {
      const exists = prev.find(s => s.subject === subjectName);
      if (exists) {
        return prev.filter(s => s.subject !== subjectName);
      } else {
        return [...prev, { subject: subjectName, sessions: defaultSessions }];
      }
    });
  };

  const handleSessionChange = (subjectName: string, sessions: number) => {
    setSelectedSubjects(prev => 
      prev.map(s => s.subject === subjectName ? { ...s, sessions } : s)
    );
  };

  const calculateTotal = () => {
    if (!currentConfig) return 0;
    const subtotal = selectedSubjects.reduce((total, selected) => {
      return total + (selected.sessions * currentConfig.pricePerSession);
    }, 0);
    const discount = subtotal * (currentConfig.discount / 100);
    return subtotal - discount;
  };

  const handlePurchase = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    if (!selectedLevel) {
      toast.error("Please select a candidate level");
      return;
    }

    setPurchasing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to purchase a package");
        navigate('/login');
        return;
      }

      const totalAmount = calculateTotal();

      const { data, error } = await supabase.functions.invoke('purchase-holiday-package', {
        body: {
          packageDetails: {
            curriculum: selectedCurriculum,
            candidateLevel: selectedLevel,
            subjects: selectedSubjects,
            totalAmount,
          },
        },
      });

      if (error) throw error;

      if (data?.payment?.redirect_url) {
        // Redirect to PesaPal payment page
        window.location.href = data.payment.redirect_url;
      } else {
        toast.success("Package purchase initiated");
      }
    } catch (error) {
      console.error("Error purchasing package:", error);
      toast.error("Failed to purchase package. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="December Holiday Revision Packages | Lana Tutors"
        description="Intensive exam revision packages for candidate years. Get ready for KCSE, IGCSE, and CBC exams with expert tutors this December holiday."
        keywords="holiday revision, december packages, exam preparation, KCSE revision, IGCSE revision, CBC revision, candidate classes"
      />
      
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Gift className="w-4 h-4" />
              Limited Time Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              December Holiday Revision Packages
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Intensive exam preparation for candidate years across all curricula. 
              Save up to 25% on revision bundles with our expert tutors.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Valid Dec 1 - Jan 31, 2026
              </span>
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Candidate Years Only
              </span>
            </div>
          </div>

          {/* Benefits */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle>Why Choose Our Holiday Revision Packages?</CardTitle>
              <CardDescription>
                Designed specifically for students preparing for critical examinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Intensive Revision</h3>
                  <p className="text-sm text-muted-foreground">
                    Focused sessions covering all exam topics with past papers
                  </p>
                </div>
                <div className="space-y-2">
                  <Target className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Expert Tutors</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified teachers with proven track records in exam prep
                  </p>
                </div>
                <div className="space-y-2">
                  <Clock className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Flexible Scheduling</h3>
                  <p className="text-sm text-muted-foreground">
                    Book sessions throughout December at your convenience
                  </p>
                </div>
                <div className="space-y-2">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Big Savings</h3>
                  <p className="text-sm text-muted-foreground">
                    Save up to 25% compared to regular single-session rates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Curriculum Tabs */}
          <Tabs value={selectedCurriculum} onValueChange={setSelectedCurriculum} className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="IGCSE">IGCSE</TabsTrigger>
              <TabsTrigger value="CBC">CBC</TabsTrigger>
              <TabsTrigger value="8-4-4">8-4-4</TabsTrigger>
            </TabsList>

            {Object.keys(packageConfigs).map((curriculum) => (
              <TabsContent key={curriculum} value={curriculum} className="space-y-6">
                {currentConfig && (
                  <>
                    {/* Level Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Select Your Level</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          {currentConfig.candidateLevels.map((level) => (
                            <Button
                              key={level}
                              variant={selectedLevel === level ? "default" : "outline"}
                              onClick={() => setSelectedLevel(level)}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Subject Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Choose Your Subjects</CardTitle>
                        <CardDescription>
                          Select the subjects you want to focus on during the holiday revision
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {currentConfig.subjects.map((subject) => {
                            const isSelected = selectedSubjects.some(s => s.subject === subject.subject);
                            const selectedSubject = selectedSubjects.find(s => s.subject === subject.subject);
                            
                            return (
                              <div
                                key={subject.subject}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={subject.subject}
                                    checked={isSelected}
                                    onCheckedChange={() => handleSubjectToggle(subject.subject, subject.defaultSessions)}
                                  />
                                  <label
                                    htmlFor={subject.subject}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {subject.subject}
                                  </label>
                                </div>
                                <div className="flex items-center gap-4">
                                  {isSelected && (
                                    <Select
                                      value={selectedSubject?.sessions.toString() || subject.defaultSessions.toString()}
                                      onValueChange={(value) => handleSessionChange(subject.subject, parseInt(value))}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Sessions" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="5">5 sessions</SelectItem>
                                        <SelectItem value="8">8 sessions</SelectItem>
                                        <SelectItem value="10">10 sessions</SelectItem>
                                        <SelectItem value="12">12 sessions</SelectItem>
                                        <SelectItem value="15">15 sessions</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <div className="text-right min-w-[100px]">
                                    {isSelected ? (
                                      <>
                                        <div className="text-sm font-medium">
                                          {selectedSubject?.sessions || subject.defaultSessions} Sessions
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          KES {((selectedSubject?.sessions || subject.defaultSessions) * currentConfig.pricePerSession).toLocaleString()}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">
                                        From KES {(5 * currentConfig.pricePerSession).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Package Features */}
                    <Card>
                      <CardHeader>
                        <CardTitle>What's Included</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="grid md:grid-cols-2 gap-3">
                          {currentConfig.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-sm">Sessions valid through January 2026</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-sm">Online sessions from anywhere</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Purchase Summary */}
                    {selectedSubjects.length > 0 && (
                      <Card className="border-primary">
                        <CardHeader>
                          <CardTitle>Package Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Curriculum:</span>
                              <span className="font-medium">{currentConfig.curriculum}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Level:</span>
                              <span className="font-medium">{selectedLevel}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subjects:</span>
                              <span className="font-medium">{selectedSubjects.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Sessions:</span>
                              <span className="font-medium">
                                {selectedSubjects.reduce((total, selected) => total + selected.sessions, 0)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span>KES {(calculateTotal() / (1 - currentConfig.discount / 100)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-primary">
                              <span>Discount ({currentConfig.discount}%):</span>
                              <span>
                                - KES {((calculateTotal() / (1 - currentConfig.discount / 100)) * (currentConfig.discount / 100)).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                              <span>Total:</span>
                              <span>KES {calculateTotal().toLocaleString()}</span>
                            </div>
                          </div>

                          <Button 
                            onClick={handlePurchase} 
                            className="w-full" 
                            size="lg"
                            disabled={purchasing || !selectedLevel}
                          >
                            {purchasing ? "Processing..." : "Proceed to Payment"}
                          </Button>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            Secure payment via PesaPal. You'll be matched with expert tutors after payment.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </>
  );
}
