import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, BookOpen, Calendar, CreditCard, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomPackageBuilderProps {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  tutorSubjects: string[];
  hourlyRate: number;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export const CustomPackageBuilder = ({
  tutorId,
  tutorName,
  tutorEmail,
  tutorSubjects,
  hourlyRate,
  onClose,
  onPurchaseSuccess,
}: CustomPackageBuilderProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [sessionsCount, setSessionsCount] = useState<number>(5);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    const basePrice = hourlyRate * sessionsCount;
    
    // Apply discount for bulk purchases
    let discount = 0;
    if (sessionsCount >= 10) {
      discount = 0.15; // 15% off for 10+ sessions
    } else if (sessionsCount >= 5) {
      discount = 0.10; // 10% off for 5-9 sessions
    } else if (sessionsCount >= 2) {
      discount = 0.05; // 5% off for 2-4 sessions
    }
    
    return Math.round(basePrice * (1 - discount));
  };

  const totalPrice = calculatePrice();
  const depositAmount = Math.round(totalPrice * 0.3);
  const balanceDue = totalPrice - depositAmount;
  const discountPercentage = sessionsCount >= 10 ? 15 : sessionsCount >= 5 ? 10 : sessionsCount >= 2 ? 5 : 0;

  const handlePurchase = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (!currentUser) {
      toast.error("Please sign in to continue");
      return;
    }

    if (sessionsCount < 1) {
      toast.error("Please select at least 1 session");
      return;
    }

    setLoading(true);

    try {
      // Create custom package purchase
      const { data: packagePurchase, error: purchaseError } = await supabase
        .from("package_purchases")
        .insert({
          student_id: currentUser.id,
          tutor_id: tutorId,
          package_offer_id: null, // NULL for custom packages
          total_sessions: sessionsCount,
          sessions_remaining: sessionsCount,
          sessions_used: 0,
          total_amount: totalPrice,
          amount_paid: paymentOption === 'full' ? totalPrice : depositAmount,
          payment_status: 'pending',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
          currency: 'KES',
          metadata: {
            type: 'custom_package',
            subject: selectedSubject,
            discount_percentage: discountPercentage,
            created_via: 'custom_package_builder',
          },
        })
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

      // Initiate payment via PesaPal
      const { data: pesapalData, error: pesapalError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: amountToPay,
            currency: "KES",
            description: `Custom Package: ${sessionsCount} sessions of ${selectedSubject} with ${tutorName}`,
            callback_url: `${window.location.origin}/payment/callback`,
            notification_id: currentUser.email,
            billing_address: {
              email_address: currentUser.email,
              phone_number: currentUser.phone || "0000000000",
              country_code: "KE",
              first_name: currentUser.name.split(" ")[0] || "Student",
              last_name: currentUser.name.split(" ").slice(1).join(" ") || "",
            },
            paymentId: payment.id,
          },
        }
      );

      if (pesapalError) throw pesapalError;

      if (pesapalData?.redirect_url) {
        // Redirect to PesaPal payment page
        window.location.href = pesapalData.redirect_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
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
              <h4 className="font-semibold text-sm mb-1">Build Your Custom Package</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>Choose your subject and number of sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>Get automatic discounts for 2+ sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>Use sessions flexibly over 90 days</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Selection */}
      <div className="space-y-2">
        <Label>Select Subject *</Label>
        <div className="flex flex-wrap gap-2">
          {tutorSubjects.map((subject) => (
            <Badge
              key={subject}
              variant={selectedSubject === subject ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20"
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
              {selectedSubject === subject && <CheckCircle2 className="w-3 h-3 ml-1" />}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sessions Count */}
      <div className="space-y-2">
        <Label htmlFor="sessions">Number of Sessions *</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSessionsCount(Math.max(1, sessionsCount - 1))}
          >
            -
          </Button>
          <Input
            id="sessions"
            type="number"
            min="1"
            max="50"
            value={sessionsCount}
            onChange={(e) => setSessionsCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="text-center font-bold text-lg"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSessionsCount(Math.min(50, sessionsCount + 1))}
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
              onClick={() => setSessionsCount(count)}
              className={sessionsCount === count ? "border-primary" : ""}
            >
              {count} sessions
            </Button>
          ))}
        </div>
      </div>

      {/* Pricing Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rate per session:</span>
            <span className="font-medium">KES {hourlyRate.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sessions:</span>
            <span className="font-medium">{sessionsCount}</span>
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
                  KES {(hourlyRate * sessionsCount).toLocaleString()}
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

      {/* Actions */}
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
          disabled={loading || !selectedSubject}
        >
          {loading ? (
            "Processing..."
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
