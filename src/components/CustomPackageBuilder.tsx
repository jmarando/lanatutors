import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, BookOpen, Calendar, CreditCard, X, Plus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { RecurringSlotSelector } from "./RecurringSlotSelector";

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

interface SubjectItem {
  subject: string;
  sessions: number;
}

interface SchedulePreference {
  mode: 'schedule_now' | 'use_flexibly';
  recurringSlotIds?: string[];
  notes?: string;
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
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectItem[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [currentSessions, setCurrentSessions] = useState<number>(5);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schedulePreference, setSchedulePreference] = useState<SchedulePreference>({
    mode: 'use_flexibly'
  });
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);

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

  const calculatePrice = () => {
    const totalSessions = selectedSubjects.reduce((sum, item) => sum + item.sessions, 0);
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
  const totalSessions = selectedSubjects.reduce((sum, item) => sum + item.sessions, 0);
  const depositAmount = Math.round(totalPrice * 0.3);
  const balanceDue = totalPrice - depositAmount;
  const discountPercentage = totalSessions >= 10 ? 15 : totalSessions >= 5 ? 10 : totalSessions >= 2 ? 5 : 0;

  const handleAddSubject = () => {
    if (!currentSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (currentSessions < 1) {
      toast.error("Please enter at least 1 session");
      return;
    }

    // Check if subject already added
    if (selectedSubjects.some(item => item.subject === currentSubject)) {
      toast.error("Subject already added. Remove it first to change sessions.");
      return;
    }

    setSelectedSubjects([...selectedSubjects, { subject: currentSubject, sessions: currentSessions }]);
    setCurrentSubject("");
    setCurrentSessions(5);
    toast.success(`Added ${currentSubject}`);
  };

  const handleRemoveSubject = (subject: string) => {
    setSelectedSubjects(selectedSubjects.filter(item => item.subject !== subject));
  };

  const handleUpdateSessions = (subject: string, newSessions: number) => {
    if (newSessions < 1) return;
    setSelectedSubjects(selectedSubjects.map(item => 
      item.subject === subject ? { ...item, sessions: newSessions } : item
    ));
  };

  const handleSlotsSelected = (slotIds: string[]) => {
    setSchedulePreference({
      ...schedulePreference,
      recurringSlotIds: slotIds
    });
  };

  const handleAddToCart = () => {
    if (selectedSubjects.length === 0) {
      toast.error("Please add at least one subject");
      return;
    }

    try {
      // Load existing cart
      const existingCart = localStorage.getItem(CART_STORAGE_KEY);
      const cart = existingCart ? JSON.parse(existingCart) : [];

      // Add all selected subjects to cart
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
    if (selectedSubjects.length === 0) {
      toast.error("Please add at least one subject");
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
          amount_paid: paymentOption === 'full' ? totalPrice : depositAmount,
          payment_status: 'pending',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'KES',
          metadata: {
            type: 'custom_package',
            subjects: selectedSubjects.map(s => ({ subject: s.subject, sessions: s.sessions })),
            discount_percentage: discountPercentage,
            created_via: 'custom_package_builder',
            schedule_preference: schedulePreference,
          } as any,
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create payment record
      const amountToPay = paymentOption === 'full' ? totalPrice : depositAmount;
      
      const { data: payment, error: paymentRecordError } = await supabase
        .from("payments")
        .insert({
          user_id: currentUser.id,
          amount: amountToPay,
          phone_number: currentUser.phone || "0000000000",
          payment_type: "package_purchase",
          reference_id: packagePurchase.id,
          status: 'pending',
          currency: 'KES',
        })
        .select()
        .single();

      if (paymentRecordError) throw paymentRecordError;

      // Redirect to invoice preview page instead of directly to Pesapal
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
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-2">How Custom Packages Work</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Add subjects:</strong> Select multiple subjects with individual session counts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Save automatically:</strong> Get bulk discounts for 2+ total sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Two ways to use:</strong> Pre-schedule recurring slots OR use session credits flexibly over 90 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span><strong>Block time before paying:</strong> Reserve your preferred days/times, then complete payment</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Subjects List */}
      {selectedSubjects.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Selected Subjects</h4>
              <Badge variant="secondary">{selectedSubjects.length} subject(s)</Badge>
            </div>
            <div className="space-y-2">
              {selectedSubjects.map((item) => (
                <div key={item.subject} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sessions} session{item.sessions !== 1 ? 's' : ''} × KES {hourlyRate.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateSessions(item.subject, item.sessions - 1)}
                    >
                      -
                    </Button>
                    <span className="font-medium w-8 text-center">{item.sessions}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateSessions(item.subject, item.sessions + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveSubject(item.subject)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Subject Section */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Subject to Add</Label>
            <div className="flex flex-wrap gap-2">
              {tutorSubjects
                .filter(subject => !selectedSubjects.some(item => item.subject === subject))
                .map((subject) => (
                  <Badge
                    key={subject}
                    variant={currentSubject === subject ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => setCurrentSubject(subject)}
                  >
                    {subject}
                    {currentSubject === subject && <CheckCircle2 className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
            </div>
            {selectedSubjects.length === tutorSubjects.length && (
              <p className="text-xs text-muted-foreground">All subjects added</p>
            )}
          </div>

          {currentSubject && (
            <>
              <div className="space-y-2">
                <Label>Number of Sessions</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentSessions(Math.max(1, currentSessions - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={currentSessions}
                    onChange={(e) => setCurrentSessions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center font-bold text-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentSessions(Math.min(50, currentSessions + 1))}
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSessions(count)}
                      className={currentSessions === count ? "border-primary" : ""}
                    >
                      {count} sessions
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddSubject}
                className="w-full"
                variant="secondary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {currentSubject}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing Summary - Only show if subjects selected */}
      {selectedSubjects.length > 0 && (
        <>
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

          {/* Schedule Preference */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-3 block">How would you like to use these sessions?</Label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSchedulePreference({ mode: 'schedule_now' });
                      setShowScheduleOptions(true);
                    }}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      schedulePreference.mode === 'schedule_now'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">Pre-Schedule Recurring Slots</div>
                        <p className="text-xs text-muted-foreground">
                          Reserve specific days/times now (e.g., every Monday & Wednesday 4pm). We'll block time on the tutor's calendar before you pay.
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSchedulePreference({ mode: 'use_flexibly' });
                      setShowScheduleOptions(false);
                    }}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      schedulePreference.mode === 'use_flexibly'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">Use Session Credits Flexibly</div>
                        <p className="text-xs text-muted-foreground">
                          Get {totalSessions} session credits to book anytime over the next 90 days. Book as needed based on your child's schedule.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Scheduling Options */}
              {showScheduleOptions && schedulePreference.mode === 'schedule_now' && (
                <div className="space-y-4 pt-3 border-t">
                  <RecurringSlotSelector
                    tutorUserId={availabilityTutorId}
                    onSlotsSelected={handleSlotsSelected}
                    selectedSlots={schedulePreference.recurringSlotIds || []}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="schedule-notes" className="text-xs font-medium">Additional Notes (Optional)</Label>
                    <Input
                      id="schedule-notes"
                      placeholder="e.g., 'Please confirm slots before blocking' or 'Prefer morning sessions'"
                      value={schedulePreference.notes || ''}
                      onChange={(e) => setSchedulePreference({
                        ...schedulePreference,
                        notes: e.target.value
                      })}
                      className="text-sm"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Next step:</strong> After payment, the selected slots will be automatically blocked on {tutorName}'s calendar for the duration of your package. You'll receive confirmation once slots are reserved.
                    </p>
                  </div>
                </div>
              )}
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
      {selectedSubjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
          
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
        </div>
      )}

      {selectedSubjects.length === 0 && (
        <div className="text-center py-4">
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
