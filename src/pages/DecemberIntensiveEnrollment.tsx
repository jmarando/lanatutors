import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/currencyUtils";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  focus_topics: string | null;
  current_enrollment: number;
  max_students: number;
}

const DecemberIntensiveEnrollment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [curriculum, setCurriculum] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [availableClasses, setAvailableClasses] = useState<IntensiveClass[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);

  const curricula = ["CBC", "8-4-4", "IGCSE", "A-Level", "IB"];
  const gradeLevels: Record<string, string[]> = {
    "CBC": ["Grade 7", "Grade 8", "Grade 9"],
    "8-4-4": ["Form 3", "Form 4"],
    "IGCSE": ["Year 9", "Year 10", "Year 11"],
    "A-Level": ["AS Level", "A2 Level"],
    "IB": ["IB Year 1", "IB Year 2"],
  };

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to enroll");
      navigate("/login");
      return;
    }
    fetchProgram();
  }, [user, navigate]);

  useEffect(() => {
    if (curriculum && gradeLevel) {
      fetchAvailableClasses();
    }
  }, [curriculum, gradeLevel]);

  const fetchProgram = async () => {
    const { data, error } = await supabase
      .from("intensive_programs")
      .select("id")
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching program:", error);
      toast.error("Unable to load program details");
      return;
    }

    setProgramId(data.id);
  };

  const fetchAvailableClasses = async () => {
    if (!programId) return;

    const { data, error } = await supabase
      .from("intensive_classes")
      .select("*")
      .eq("program_id", programId)
      .eq("curriculum", curriculum)
      .eq("status", "active")
      .lt("current_enrollment", "max_students");

    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }

    // Filter classes that include the selected grade level
    const filteredClasses = (data || []).filter((cls) =>
      cls.grade_levels.includes(gradeLevel)
    );

    setAvailableClasses(filteredClasses);
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) => {
      if (prev.includes(classId)) {
        return prev.filter((id) => id !== classId);
      } else {
        if (prev.length >= 6) {
          toast.error("Maximum 6 subjects allowed");
          return prev;
        }
        return [...prev, classId];
      }
    });
  };

  const totalAmount = selectedClasses.length * 4000;

  const handleProceedToPayment = async () => {
    if (!user || !programId) return;

    if (selectedClasses.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    setLoading(true);

    try {
      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("intensive_enrollments")
        .insert({
          program_id: programId,
          student_id: user.id,
          enrolled_class_ids: selectedClasses,
          total_subjects: selectedClasses.length,
          total_amount: totalAmount,
          payment_status: "pending",
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Get user profile for phone number
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, full_name")
        .eq("id", user.id)
        .single();

      // Initiate Pesapal payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: totalAmount,
            phoneNumber: profile?.phone_number || "",
            paymentType: "intensive_enrollment",
            referenceId: enrollment.id,
            description: `December Intensive - ${selectedClasses.length} subjects`,
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentData?.redirect_url) {
        window.location.href = paymentData.redirect_url;
      }
    } catch (error) {
      console.error("Error processing enrollment:", error);
      toast.error("Failed to process enrollment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const groupedClasses = availableClasses.reduce((acc, cls) => {
    if (!acc[cls.subject]) {
      acc[cls.subject] = [];
    }
    acc[cls.subject].push(cls);
    return acc;
  }, {} as Record<string, IntensiveClass[]>);

  return (
    <>
      <SEO
        title="Enroll in December Intensive | LANA Tutors"
        description="Enroll in the December 2025 Intensive Program. Choose your subjects and secure your spot."
      />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Enroll in December Intensive</h1>

        {/* Step 1: Select Curriculum */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Select Your Curriculum</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={curriculum} onValueChange={setCurriculum}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your curriculum" />
              </SelectTrigger>
              <SelectContent>
                {curricula.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Select Grade Level */}
        {curriculum && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 2: Select Your Grade Level</CardTitle>
              <CardDescription>
                {curriculum === "CBC" || curriculum === "8-4-4"
                  ? "Select the grade you'll be in during 2025"
                  : "Select your current grade level"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels[curriculum]?.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Subjects */}
        {curriculum && gradeLevel && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 3: Select Your Subjects (Max 6)</CardTitle>
              <CardDescription>
                Each subject includes 10 lessons (75 minutes each) across the 2-week program
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedClasses).length === 0 ? (
                <p className="text-muted-foreground">No classes available for your selection</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedClasses).map(([subject, classes]) => {
                    const classItem = classes[0]; // We only expect one class per subject
                    return (
                      <div
                        key={classItem.id}
                        className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={classItem.id}
                          checked={selectedClasses.includes(classItem.id)}
                          onCheckedChange={() => handleClassToggle(classItem.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={classItem.id} className="text-base font-semibold cursor-pointer">
                            {subject}
                          </Label>
                          <p className="text-sm text-muted-foreground">{classItem.time_slot} EAT</p>
                          {classItem.focus_topics && (
                            <p className="text-sm text-muted-foreground mt-1">{classItem.focus_topics}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {classItem.current_enrollment} / {classItem.max_students} enrolled
                          </p>
                        </div>
                        <span className="text-lg font-bold text-primary">KES 4,000</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary and Payment */}
        {selectedClasses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-lg">Selected Subjects:</span>
                <span className="text-lg font-semibold">{selectedClasses.length}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-lg">Price per Subject:</span>
                <span className="text-lg font-semibold">{formatCurrency(4000, "KES")}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span className="text-primary">{formatCurrency(totalAmount, "KES")}</span>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleProceedToPayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default DecemberIntensiveEnrollment;