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
import { Loader2, ShoppingCart, User, ArrowLeft, Trash2, Zap, CreditCard, Check, FileText, CreditCard as CardIcon } from "lucide-react";
import { StudentPicker } from "@/components/StudentPicker";
import { Student } from "@/hooks/useStudents";

interface CartItem {
  id: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
}

type PaymentOption = 'deposit' | 'full';

// Get price per subject based on curriculum - TEST MODE: CBC = 100 KES
const getPricePerSubject = (curriculum: string): number => {
  if (curriculum === "A-Level" || curriculum === "IB") return 6000;
  if (curriculum === "IGCSE") return 5000;
  if (curriculum === "CBC") return 100; // TEST PRICE
  return 4000; // 8-4-4
};

const getPricePerSession = (curriculum: string): number => {
  if (curriculum === "A-Level" || curriculum === "IB") return 600;
  if (curriculum === "IGCSE") return 500;
  if (curriculum === "CBC") return 10; // TEST PRICE
  return 400; // 8-4-4
};

const DecemberIntensiveEnrollment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bookingForSelf, setBookingForSelf] = useState(false);
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [programId, setProgramId] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('deposit');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      toast.error("Please sign in to continue enrollment");
      navigate(`/login?redirect=${encodeURIComponent('/december-intensive/enroll')}`);
      return;
    }
    
    loadCartFromStorage();
    fetchProgram();
    if (user.email) {
      setParentEmail(user.email);
    }
  }, [user, navigate]);

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

  // Calculate total amount based on curriculum-specific pricing
  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + getPricePerSubject(item.curriculum);
  }, 0);

  // Calculate deposit (30%) and balance (70%)
  const depositAmount = Math.round(totalAmount * 0.3);
  const balanceDue = totalAmount - depositAmount;
  const amountToPay = paymentOption === 'deposit' ? depositAmount : totalAmount;

  const validateForm = () => {
    // Student must be selected (either self or child)
    if (!bookingForSelf && !selectedStudent) {
      toast.error("Please select which child this enrollment is for");
      return false;
    }
    if (!parentPhone.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!parentEmail.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    return true;
  };

  const getStudentName = () => {
    if (bookingForSelf) {
      return user?.user_metadata?.full_name || "Student";
    }
    return selectedStudent?.full_name || "Student";
  };

  const handleProceedToPayment = async () => {
    if (!user?.id) {
      toast.error("Please sign in to continue");
      navigate(`/login?redirect=${encodeURIComponent('/december-intensive/enroll')}`);
      return;
    }
    
    if (!validateForm()) return;
    if (!programId) {
      toast.error("Program not found");
      return;
    }

    setLoading(true);

    try {
      const enrolledClassIds = cartItems.map((item) => item.id);
      const studentName = getStudentName();

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("intensive_enrollments")
        .insert({
          program_id: programId,
          student_id: user.id,
          enrolled_class_ids: enrolledClassIds,
          total_subjects: cartItems.length,
          total_amount: totalAmount,
          payment_status: paymentOption === 'deposit' ? 'deposit_paid' : 'pending',
          student_profile_id: selectedStudent?.id || null,
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Initiate Pesapal payment with the selected amount
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: amountToPay,
            phoneNumber: parentPhone,
            email: parentEmail,
            paymentType: "intensive_enrollment",
            referenceId: enrollment.id,
            description: `December Holiday Bootcamp - ${cartItems.length} subject(s) for ${studentName}${paymentOption === 'deposit' ? ' (30% Deposit)' : ''}`,
            studentNames: studentName,
            paymentOption: paymentOption,
            totalAmount: totalAmount,
            balanceDue: paymentOption === 'deposit' ? balanceDue : 0,
            appOrigin: window.location.origin,
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
        title="Checkout - December Holiday Bootcamp | Lana Tutors"
        description="Complete your enrollment in the December 2025 Holiday Bootcamp."
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
                  {cartItems.map((item) => {
                    const pricePerSubject = getPricePerSubject(item.curriculum);
                    const pricePerSession = getPricePerSession(item.curriculum);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.curriculum} • {item.gradeLevel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            KES {pricePerSession}/session × 10 sessions
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            KES {pricePerSubject.toLocaleString()}
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
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Student Details - Now using StudentPicker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Details
                </CardTitle>
                <CardDescription>
                  Select the student being enrolled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentPicker
                  onStudentSelect={(student, forSelf) => {
                    setSelectedStudent(student);
                    setBookingForSelf(forSelf);
                  }}
                  selectedStudentId={selectedStudent?.id}
                  bookingForSelf={bookingForSelf}
                />
                {(selectedStudent || bookingForSelf) && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Enrolling:</strong> {getStudentName()}
                      {selectedStudent && (
                        <span className="text-green-600 dark:text-green-400 ml-2">
                          ({selectedStudent.curriculum} {selectedStudent.grade_level})
                        </span>
                      )}
                    </p>
                  </div>
                )}
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
                    <span className="text-muted-foreground">Sessions per subject</span>
                    <span>10 × 75 min</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  CBC/8-4-4: KES 400/session • IGCSE: KES 500/session • A-Level/IB: KES 600/session
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary">KES {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Option Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Payment Option *</Label>
                  
                  {/* 30% Deposit Option */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      paymentOption === 'deposit' 
                        ? 'border-primary border-2 bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPaymentOption('deposit')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${paymentOption === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2 text-sm">
                              30% Deposit
                              {paymentOption === 'deposit' && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pay KES {depositAmount.toLocaleString()} now
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Balance due: KES {balanceDue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Full Payment Option */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      paymentOption === 'full' 
                        ? 'border-primary border-2 bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setPaymentOption('full')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${paymentOption === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2 text-sm">
                              Full Payment
                              {paymentOption === 'full' && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pay KES {totalAmount.toLocaleString()} now
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              No balance due
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pesapal Info */}
                <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                  <CardIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You&apos;ll be redirected to Pesapal, our secure payment partner, to complete your payment with M-Pesa, Card, or other payment methods.</span>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={loading || (!bookingForSelf && !selectedStudent) || !parentPhone.trim() || !parentEmail.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Proceed to Payment`
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/december-intensive/invoice?amount=${amountToPay}&total=${totalAmount}&deposit=${depositAmount}&balance=${paymentOption === 'deposit' ? balanceDue : 0}&subjects=${cartItems.length}&student=${encodeURIComponent(getStudentName())}&phone=${encodeURIComponent(parentPhone)}&email=${encodeURIComponent(parentEmail)}&option=${paymentOption}`)}
                  disabled={loading || (!bookingForSelf && !selectedStudent) || !parentPhone.trim() || !parentEmail.trim()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice & Pay
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Pay only 30% deposit now to secure your booking</p>
                  <p>• Balance due before the program starts</p>
                  <p>• Choose M-Pesa, Card, or other payment methods on the next page</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensiveEnrollment;
