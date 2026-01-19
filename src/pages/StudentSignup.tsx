import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/utils/analytics";

import { validateAndNormalizePhone } from "@/utils/phoneValidation";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Please enter a valid email address" });

const StudentSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<'parent' | 'student' | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: "",
    age: "",
    curriculum: "",
    gradeLevel: "",
    // Child info (for parents)
    childName: "",
    childAge: "",
    childCurriculum: "",
    childGradeLevel: "",
  });

  const curriculums = getCurriculums();
  
  // For students, use their curriculum/level. For parents, use child's
  const activeCurriculum = accountType === 'parent' ? formData.childCurriculum : formData.curriculum;
  const activeGradeLevel = accountType === 'parent' ? formData.childGradeLevel : formData.gradeLevel;
  
  const availableLevels = activeCurriculum ? getLevelsForCurriculum(activeCurriculum) : [];
  const childLevels = formData.childCurriculum ? getLevelsForCurriculum(formData.childCurriculum) : [];
  const availableSubjects = activeCurriculum && activeGradeLevel
    ? getSubjectsForCurriculumLevel(activeCurriculum, activeGradeLevel)
    : [];

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountType) {
      toast({
        title: "Please select account type",
        description: "Choose whether you're signing up as a student or parent",
        variant: "destructive"
      });
      return;
    }

    // Validate email
    const emailValidation = emailSchema.safeParse(formData.email);
    if (!emailValidation.success) {
      toast({
        title: "Invalid email",
        description: emailValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    // Validate password
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive"
      });
      return;
    }

    // Validate phone if provided
    let normalizedPhone = null;
    if (formData.phoneNumber) {
      const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);
      if (!phoneValidation.isValid) {
        toast({
          title: "Invalid phone number",
          description: phoneValidation.error,
          variant: "destructive"
        });
        return;
      }
      normalizedPhone = phoneValidation.normalized;
    }

    // Validate child info for parents
    if (accountType === 'parent') {
      if (!formData.childName || !formData.childCurriculum || !formData.childGradeLevel) {
        toast({
          title: "Missing child information",
          description: "Please fill in your child's details",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate student info for students
    if (accountType === 'student') {
      if (!formData.curriculum || !formData.gradeLevel) {
        toast({
          title: "Missing information",
          description: "Please select your curriculum and grade level",
          variant: "destructive"
        });
        return;
      }
    }

    // Track signup started
    analytics.signupStarted('email');

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: formData.fullName }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user data returned");

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          phone_number: normalizedPhone,
          age: accountType === 'student' && formData.age ? parseInt(formData.age) : null,
          curriculum: accountType === 'student' ? formData.curriculum : null,
          grade_level: accountType === 'student' ? formData.gradeLevel : null,
          subjects_struggling: accountType === 'student' ? selectedSubjects : null,
          account_type: accountType,
        });

      if (profileError) throw profileError;

      // Assign student role
      const { error: roleError } = await supabase.rpc("assign_user_role", {
        _user_id: authData.user.id,
        _role: "student"
      });

      if (roleError) throw roleError;

      // If parent, create first child profile
      if (accountType === 'parent') {
        await supabase.from("students").insert({
          parent_id: authData.user.id,
          full_name: formData.childName,
          age: formData.childAge ? parseInt(formData.childAge) : null,
          curriculum: formData.childCurriculum,
          grade_level: formData.childGradeLevel,
          subjects_of_interest: selectedSubjects,
        });
      }

      // Send welcome email (fire and forget - don't block signup)
      supabase.functions.invoke('send-welcome-email', {
        body: {
          email: formData.email,
          name: formData.fullName,
          accountType: accountType,
          childName: accountType === 'parent' ? formData.childName : undefined,
          userId: authData.user.id, // Pass userId for communication logging
        }
      }).then(({ error }) => {
        if (error) console.error('Welcome email error:', error);
      });

      // Track successful signup
      analytics.signupCompleted('email');

      toast({
        title: "Welcome to Lana!",
        description: accountType === 'parent' 
          ? "Your account has been created. You can now book sessions for your child."
          : "Your account has been created successfully"
      });

      // Redirect to original destination or dashboard
      navigate(redirectTo || "/student/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Start Your Learning Journey</CardTitle>
            <CardDescription>
              {accountType === 'parent' 
                ? "Create your parent account to book tutoring for your child"
                : "Tell us about yourself so we can connect you with the perfect tutor"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type Selection */}
              {!accountType && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">I am signing up as...</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card 
                      className="cursor-pointer transition-all hover:border-primary"
                      onClick={() => setAccountType('student')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-semibold">A Student</h4>
                        <p className="text-sm text-muted-foreground mt-1">I'm booking tutoring for myself</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer transition-all hover:border-primary"
                      onClick={() => setAccountType('parent')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-semibold">A Parent</h4>
                        <p className="text-sm text-muted-foreground mt-1">I'm booking tutoring for my child</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {accountType && (
                <>
                  {/* Account Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {accountType === 'parent' ? 'Your Information' : 'Basic Information'}
                      </h3>
                      <Button variant="ghost" size="sm" type="button" onClick={() => setAccountType(null)}>
                        Change
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      {accountType === 'student' && (
                        <div className="space-y-2">
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            type="number"
                            min="5"
                            max="100"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          placeholder="+254712345678"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        />
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            minLength={6}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student's Academic Info (for students) */}
                  {accountType === 'student' && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Academic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Curriculum *</Label>
                          <Select
                            value={formData.curriculum}
                            onValueChange={(value) => {
                              setFormData({ ...formData, curriculum: value, gradeLevel: "" });
                              setSelectedSubjects([]);
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
                            <SelectContent>
                              {curriculums.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.curriculum && (
                          <div className="space-y-2">
                            <Label>Grade/Level *</Label>
                            <Select
                              value={formData.gradeLevel}
                              onValueChange={(value) => {
                                setFormData({ ...formData, gradeLevel: value });
                                setSelectedSubjects([]);
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {availableLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Child Info (for parents) */}
                  {accountType === 'parent' && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Your Child's Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="childName">Child's Name *</Label>
                          <Input
                            id="childName"
                            value={formData.childName}
                            onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                            placeholder="e.g., Sarah"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="childAge">Child's Age</Label>
                          <Input
                            id="childAge"
                            type="number"
                            min="5"
                            max="25"
                            value={formData.childAge}
                            onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Child's Curriculum *</Label>
                          <Select
                            value={formData.childCurriculum}
                            onValueChange={(value) => {
                              setFormData({ ...formData, childCurriculum: value, childGradeLevel: "" });
                              setSelectedSubjects([]);
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
                            <SelectContent>
                              {curriculums.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.childCurriculum && (
                          <div className="space-y-2">
                            <Label>Child's Grade/Level *</Label>
                            <Select
                              value={formData.childGradeLevel}
                              onValueChange={(value) => {
                                setFormData({ ...formData, childGradeLevel: value });
                                setSelectedSubjects([]);
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {childLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subjects Selection */}
                  {availableSubjects.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">
                        {accountType === 'parent' ? "What subjects does your child need help with?" : "What subjects do you need help with?"}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {availableSubjects.map((subject) => (
                          <div key={subject} className="flex items-center space-x-2">
                            <Checkbox
                              id={subject}
                              checked={selectedSubjects.includes(subject)}
                              onCheckedChange={() => handleSubjectToggle(subject)}
                            />
                            <Label htmlFor={subject} className="cursor-pointer">{subject}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Creating your account..." : "Create Account & Book a Class"}
                  </Button>
                </>
              )}

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentSignup;
