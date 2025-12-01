import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ShoppingCart, User, ArrowLeft, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/currencyUtils";

interface CartItem {
  id: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
  quantity: number;
}

interface StudentInfo {
  name: string;
  age: string;
}

const DecemberIntensiveEnrollment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo[]>([]);
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [programId, setProgramId] = useState<string | null>(null);

  useEffect(() => {
    loadCartFromStorage();
    fetchProgram();
    if (user?.email) {
      setParentEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    // Initialize student info based on total students in cart
    const totalStudents = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalStudents > 0 && studentInfo.length !== totalStudents) {
      setStudentInfo(Array(totalStudents).fill(null).map(() => ({ name: "", age: "" })));
    }
  }, [cartItems]);

  const loadCartFromStorage = () => {
    const saved = localStorage.getItem("december_intensive_cart");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.selectedClasses && data.selectedClasses.length > 0) {
          setCartItems(data.selectedClasses);
        } else {
          toast.error("Your cart is empty");
          navigate("/december-intensive");
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        navigate("/december-intensive");
      }
    } else {
      toast.error("Your cart is empty");
      navigate("/december-intensive");
    }
  };

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

  const removeFromCart = (classId: string) => {
    const updated = cartItems.filter((item) => item.id !== classId);
    setCartItems(updated);
    localStorage.setItem("december_intensive_cart", JSON.stringify({ selectedClasses: updated }));
    if (updated.length === 0) {
      navigate("/december-intensive");
    }
  };

  const totalStudents = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = totalStudents * 4000;

  const handleStudentInfoChange = (index: number, field: keyof StudentInfo, value: string) => {
    const updated = [...studentInfo];
    updated[index] = { ...updated[index], [field]: value };
    setStudentInfo(updated);
  };

  const validateForm = () => {
    if (!parentPhone) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!parentEmail) {
      toast.error("Please enter your email address");
      return false;
    }
    for (let i = 0; i < studentInfo.length; i++) {
      if (!studentInfo[i]?.name) {
        toast.error(`Please enter name for Student ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;
    if (!programId) {
      toast.error("Program not found");
      return;
    }

    setLoading(true);

    try {
      const enrolledClassIds = cartItems.map((item) => item.id);
      const userId = user?.id || null;

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("intensive_enrollments")
        .insert({
          program_id: programId,
          student_id: userId || "00000000-0000-0000-0000-000000000000", // placeholder for guest
          enrolled_class_ids: enrolledClassIds,
          total_subjects: cartItems.length,
          total_amount: totalAmount,
          payment_status: "pending",
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Initiate Pesapal payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: totalAmount,
            phoneNumber: parentPhone,
            email: parentEmail,
            paymentType: "intensive_enrollment",
            referenceId: enrollment.id,
            description: `December Intensive - ${cartItems.length} subjects for ${totalStudents} student(s)`,
            studentNames: studentInfo.map((s) => s.name).join(", "),
          },
        }
      );

      if (paymentError) throw paymentError;

      // Clear cart on successful payment initiation
      localStorage.removeItem("december_intensive_cart");

      if (paymentData?.redirect_url) {
        window.location.href = paymentData.redirect_url;
      } else {
        toast.success("Enrollment created! Payment link will be sent to your email.");
        navigate("/student/dashboard");
      }
    } catch (error) {
      console.error("Error processing enrollment:", error);
      toast.error("Failed to process enrollment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading cart...</p>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Checkout - December Intensive | LANA Tutors"
        description="Complete your enrollment in the December 2025 Intensive Program."
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/december-intensive")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Program
        </Button>

        <h1 className="text-3xl font-bold mb-8">Complete Your Enrollment</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Cart Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Selected Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.curriculum} • {item.gradeLevel} • {item.quantity} student{item.quantity > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          KES {(item.quantity * 4000).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Details
                </CardTitle>
                <CardDescription>
                  Enter details for each student being enrolled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {studentInfo.map((student, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-semibold">Student {index + 1}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`student-name-${index}`}>Full Name *</Label>
                        <Input
                          id={`student-name-${index}`}
                          placeholder="Enter student name"
                          value={student?.name || ""}
                          onChange={(e) => handleStudentInfoChange(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`student-age-${index}`}>Age (Optional)</Label>
                        <Input
                          id={`student-age-${index}`}
                          placeholder="e.g., 14"
                          value={student?.age || ""}
                          onChange={(e) => handleStudentInfoChange(index, "age", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Parent Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Parent/Guardian Contact</CardTitle>
                <CardDescription>
                  We will send confirmation and class details to this contact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent-phone">Phone Number *</Label>
                    <Input
                      id="parent-phone"
                      placeholder="e.g., 0712345678"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent-email">Email Address *</Label>
                    <Input
                      id="parent-email"
                      type="email"
                      placeholder="your@email.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - 1 column */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subjects</span>
                    <span>{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Students</span>
                    <span>{totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per subject</span>
                    <span>KES 4,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions per subject</span>
                    <span>10 × 75 min</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">KES {totalAmount.toLocaleString()}</span>
                  </div>
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
                    "Pay Now"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment via M-Pesa, Card, or Bank Transfer
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensiveEnrollment;
