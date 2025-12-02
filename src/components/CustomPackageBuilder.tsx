import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, CreditCard, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { RecurringScheduleBuilder } from "./RecurringScheduleBuilder";

interface CustomPackageBuilderProps {
  tutorId: string; // tutor_profiles.id for package ownership
  availabilityTutorId: string; // auth user id for availability slots
  tutorName: string;
  tutorEmail: string;
  tutorSubjects: string[];
  hourlyRate: number;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

const CART_STORAGE_KEY = 'lana_multi_tutor_cart';

interface RecurringScheduleItem {
  id: string;
  subject: string;
  dayOfWeek: number;
  timeSlot: string;
  weeks: number;
  availabilitySlotId: string;
}

export const CustomPackageBuilder = ({
  tutorId,
  availabilityTutorId,
  tutorName,
  tutorEmail,
  tutorSubjects,
  hourlyRate,
  onClose,
  onPurchaseSuccess,
}: CustomPackageBuilderProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recurringSchedule, setRecurringSchedule] = useState<RecurringScheduleItem[]>([]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setCurrentUser({
        id: user.id,
        email: user.email,
        name: profile?.full_name || "Student",
      });
    }
  };

  // Calculate totals from recurring schedule
  const totalSessions = recurringSchedule.reduce((sum, item) => sum + item.weeks, 0);
  
  const calculatePrice = () => {
    const basePrice = hourlyRate * totalSessions;
    
    // Apply discount for bulk purchases
    let discount = 0;
    if (totalSessions >= 10) {
      discount = 0.15; // 15% off for 10+ sessions
    } else if (totalSessions >= 5) {
      discount = 0.10; // 10% off for 5-9 sessions
    } else if (totalSessions >= 2) {
      discount = 0.05; // 5% off for 2-4 sessions
    }
    
    return Math.round(basePrice * (1 - discount));
  };

  const totalPrice = calculatePrice();
  const depositAmount = Math.round(totalPrice * 0.3);
  const balanceDue = totalPrice - depositAmount;
  const discountPercentage = totalSessions >= 10 ? 15 : totalSessions >= 5 ? 10 : totalSessions >= 2 ? 5 : 0;

  // Get unique subjects from schedule
  const selectedSubjects = Array.from(new Set(recurringSchedule.map(item => item.subject)))
    .map(subject => ({
      subject,
      sessions: recurringSchedule
        .filter(item => item.subject === subject)
        .reduce((sum, item) => sum + item.weeks, 0)
    }));

  const handleScheduleComplete = (schedule: RecurringScheduleItem[]) => {
    setRecurringSchedule(schedule);
  };

  const handleAddToCart = () => {
    if (recurringSchedule.length === 0) {
      toast.error("Please build your schedule first");
      return;
    }

    try {
      // Load existing cart
      const existingCart = localStorage.getItem(CART_STORAGE_KEY);
      const cart = existingCart ? JSON.parse(existingCart) : [];

      // Add all subjects from schedule to cart
      selectedSubjects.forEach(item => {
        const newItem = {
          id: `${tutorId}-${item.subject}-${Date.now()}`,
          tutorId,
          tutorName,
          tutorRate: hourlyRate,
          subject: item.subject,
          sessions: item.sessions,
        };
        cart.push(newItem);
      });

      // Save to localStorage
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      
      // Verify save was successful
      const verifyCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!verifyCart) {
        throw new Error("Failed to save cart to storage");
      }

      toast.success(`Added ${selectedSubjects.length} subject(s) to cart`);
      
      // Close modal first
      onClose();
      
      // Navigate to cart with a small delay to ensure modal closes
      setTimeout(() => {
        navigate('/multi-tutor-package', { 
          state: { fromCart: true, itemsAdded: selectedSubjects.length }
        });
      }, 100);
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add to cart. Please try again.");
    }
  };

  const handlePurchase = async () => {
    if (recurringSchedule.length === 0) {
      toast.error("Please build your schedule first");
      return;
    }

    if (!currentUser) {
      toast.error("Please sign in to continue");
      return;
    }

    setLoading(true);

    try {
      // Create package purchase for all selected subjects
      const { data: packagePurchase, error: purchaseError } = await supabase
        .from("package_purchases")
        .insert([{
          student_id: currentUser.id,
          tutor_id: tutorId,
          package_offer_id: null,
          total_sessions: totalSessions,
          sessions_remaining: totalSessions,
          sessions_used: 0,
          total_amount: totalPrice,
          amount_paid: 0,
          payment_status: 'pending',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'KES',
          metadata: {
            type: 'custom_package',
            paymentOption: paymentOption,
            tutorName: tutorName,
            subjects: selectedSubjects.map(s => ({ subject: s.subject, sessions: s.sessions })),
            discount_percentage: discountPercentage,
            created_via: 'custom_package_builder',
            schedule_preference: {
              mode: 'schedule_now',
              recurringSchedule: recurringSchedule
            },
          } as any,
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Redirect to invoice preview page (same flow as other payments)
      window.location.href = `/invoice-preview?type=package&packageId=${packagePurchase.id}`;
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Failed to create package. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-2">Build Your Schedule</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Pick subjects:</strong> Add recurring time slots for each subject you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Set schedule:</strong> Choose day, time, and number of weeks for each subject</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Auto discounts:</strong> Get bulk discounts for 2+ total sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Pay at the end:</strong> Review your complete schedule and total price before payment</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Schedule Builder */}
      <RecurringScheduleBuilder
        tutorUserId={availabilityTutorId}
        subjects={tutorSubjects}
        onScheduleComplete={handleScheduleComplete}
      />

      {/* Pricing Summary - Only show if schedule built */}
      {recurringSchedule.length > 0 && (
        <>
          {/* Current Schedule Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Your Schedule</h4>
                <Badge variant="secondary">{recurringSchedule.length} time slot(s)</Badge>
              </div>
              <div className="space-y-2">
                {selectedSubjects.map((item) => (
                  <div key={item.subject} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.sessions} session{item.sessions !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      KES {(hourlyRate * item.sessions).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate per session:</span>
                <span className="font-medium">KES {hourlyRate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total sessions:</span>
                <span className="font-medium">{totalSessions}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bulk discount:</span>
                  <span className="font-medium text-green-600">-{discountPercentage}%</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Total Price:</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">
                    KES {totalPrice.toLocaleString()}
                  </p>
                  {discountPercentage > 0 && (
                    <p className="text-xs text-muted-foreground line-through">
                      KES {(hourlyRate * totalSessions).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Option */}
          <div className="space-y-3">
            <Label>Payment Option</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentOption('full')}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  paymentOption === 'full'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="text-sm font-medium">Full Payment</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pay KES {totalPrice.toLocaleString()} now
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentOption('deposit')}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  paymentOption === 'deposit'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="text-sm font-medium">30% Deposit</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pay KES {depositAmount.toLocaleString()} now
                </div>
              </button>
            </div>
            {paymentOption === 'deposit' && (
              <p className="text-xs text-amber-600">
                Balance of KES {balanceDue.toLocaleString()} due before booking sessions
              </p>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      {recurringSchedule.length > 0 && (
        <div className="space-y-4">
          {/* Pesapal Info Card */}
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💳 You'll be redirected to Pesapal, our secure payment partner, to complete your payment with M-Pesa, Card, or other payment methods.
              </p>
            </CardContent>
          </Card>

          {/* Payment Buttons */}
          <Button
            onClick={handlePurchase}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handlePurchase}
            className="w-full"
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Generate Invoice & Pay
          </Button>

          {/* Payment Info Bullets */}
          <ul className="text-sm text-muted-foreground space-y-1 px-2">
            <li>• Pay only {paymentOption === 'deposit' ? '30%' : '1%'} deposit now to secure your booking</li>
            <li>• Balance due before the session starts</li>
            <li>• Choose M-Pesa, Card, or other payment methods on the next page</li>
          </ul>
          
          <Separator className="my-2" />
          
          <Button
            type="button"
            variant="outline"
            onClick={handleAddToCart}
            className="w-full border-secondary/30 hover:bg-secondary/10"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add All to Multi-Subject Cart
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Combine with other tutors for more bulk discounts
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      )}

      {recurringSchedule.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            Build your schedule above to see pricing and payment options
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
