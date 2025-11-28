import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Plus, ShoppingCart, CreditCard, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

interface CartItem {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorRate: number;
  subject: string;
  sessions: number;
}

const CART_STORAGE_KEY = 'lana_multi_tutor_cart';

export const MultiTutorPackageBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');

  useEffect(() => {
    fetchCurrentUser();
    loadCartFromStorage();
    
    // Check if items were just added via navigation state
    const state = location.state as any;
    if (state?.fromCart && state?.itemsAdded) {
      setTimeout(() => {
        toast.success(`${state.itemsAdded} subject(s) added to your cart! Add more or proceed to checkout.`, {
          duration: 6000,
        });
        // Scroll to cart
        document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
      
      // Clear state after showing message
      window.history.replaceState({}, document.title);
    } else if (state?.addTutor) {
      toast.info(`Select a subject to add ${state.addTutor.tutorName} to your cart`);
    }
  }, []);

  useEffect(() => {
    saveCartToStorage();
  }, [cart]);

  const loadCartFromStorage = () => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsedCart = JSON.parse(saved);
        setCart(parsedCart);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      toast.error('Failed to load your cart. Please try again.');
    }
  };

  const saveCartToStorage = () => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

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
        phone: profile?.phone_number,
      });
    }
  };

  const calculateDiscount = (totalSessions: number) => {
    if (totalSessions >= 10) return 0.15;
    if (totalSessions >= 5) return 0.10;
    if (totalSessions >= 2) return 0.05;
    return 0;
  };

  const calculateTotals = () => {
    const totalSessions = cart.reduce((sum, item) => sum + item.sessions, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.tutorRate * item.sessions), 0);
    const discount = calculateDiscount(totalSessions);
    const discountPercentage = Math.round(discount * 100);
    const total = Math.round(subtotal * (1 - discount));
    const deposit = Math.round(total * 0.3);
    const balance = total - deposit;

    return { totalSessions, subtotal, discount, discountPercentage, total, deposit, balance };
  };

  const addToCart = (tutorId: string, tutorName: string, tutorRate: number, subject: string, sessions: number) => {
    const newItem: CartItem = {
      id: `${tutorId}-${subject}-${Date.now()}`,
      tutorId,
      tutorName,
      tutorRate,
      subject,
      sessions,
    };
    setCart([...cart, newItem]);
    toast.success(`Added ${subject} with ${tutorName} to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateSessions = (itemId: string, newSessions: number) => {
    if (newSessions < 1) return;
    setCart(cart.map(item => 
      item.id === itemId ? { ...item, sessions: newSessions } : item
    ));
  };

  const handleCheckout = async (generateInvoice: boolean) => {
    if (!currentUser) {
      toast.error("Please sign in to continue");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      
      // Group items by tutor
      const tutorGroups = cart.reduce((acc, item) => {
        if (!acc[item.tutorId]) {
          acc[item.tutorId] = [];
        }
        acc[item.tutorId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      const packageIds: string[] = [];

      // Create package purchase for each tutor
      for (const [tutorId, items] of Object.entries(tutorGroups)) {
        const tutorSessions = items.reduce((sum, item) => sum + item.sessions, 0);
        const tutorAmount = items.reduce((sum, item) => sum + (item.tutorRate * item.sessions), 0);
        const proportionalTotal = Math.round((tutorAmount / totals.subtotal) * totals.total);

        const { data: packagePurchase, error: purchaseError } = await supabase
          .from("package_purchases")
          .insert({
            student_id: currentUser.id,
            tutor_id: tutorId,
            package_offer_id: null,
            total_sessions: tutorSessions,
            sessions_remaining: tutorSessions,
            sessions_used: 0,
            total_amount: proportionalTotal,
            amount_paid: 0,
            payment_status: 'pending',
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'KES',
            metadata: {
              type: 'multi_tutor_package',
              subjects: items.map(i => ({ subject: i.subject, sessions: i.sessions })),
              discount_percentage: totals.discountPercentage,
              created_via: 'multi_tutor_package_builder',
              payment_option: paymentOption,
            },
          })
          .select()
          .single();

        if (purchaseError) throw purchaseError;
        if (packagePurchase) packageIds.push(packagePurchase.id);
      }

      // Clear cart
      setCart([]);
      localStorage.removeItem(CART_STORAGE_KEY);

      if (generateInvoice) {
        // Redirect to invoice preview with package IDs and payment option
        const params = new URLSearchParams({
          type: 'multi_package',
          packageIds: packageIds.join(','),
          paymentOption,
          totalAmount: totals.total.toString(),
          depositAmount: totals.deposit.toString(),
        });
        
        navigate(`/invoice-preview?${params.toString()}`);
      } else {
        // Direct payment via Pesapal
        const amountToPay = paymentOption === 'full' ? totals.total : totals.deposit;
        
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'initiate-pesapal-payment',
          {
            body: {
              amount: amountToPay,
              description: `Multi-Subject Package - ${totals.totalSessions} sessions`,
              referenceId: packageIds[0],
              paymentType: 'multi_package',
              phoneNumber: currentUser.phone || '',
            },
          }
        );

        if (paymentError) throw new Error('Failed to initiate payment');
        
        if (paymentData?.redirect_url) {
          window.open(paymentData.redirect_url, '_blank');
        }
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to process checkout. Please try again.");
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Build Multi-Subject Package</h1>
          <p className="text-muted-foreground mt-1">
            Create custom packages across multiple subjects and tutors
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart */}
        <div id="cart-section" className="lg:col-span-2 space-y-4 scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Browse tutors and click "Add to Multi-Subject Cart" to build your package
                  </p>
                  <Button onClick={() => navigate('/tutors')}>
                    Browse Tutors
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <div className="font-medium">{item.subject}</div>
                        <div className="text-sm text-muted-foreground">with {item.tutorName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          KES {item.tutorRate.toLocaleString()}/session
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSessions(item.id, item.sessions - 1)}
                        >
                          -
                        </Button>
                        <span className="font-medium w-8 text-center">{item.sessions}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSessions(item.id, item.sessions + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => navigate('/tutors')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add More Subjects
            </Button>
            {cart.length > 0 && (
              <Button 
                className="flex-1"
                onClick={() => document.getElementById('order-summary')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Review & Checkout
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card id="order-summary" className="sticky top-4 scroll-mt-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total sessions:</span>
                  <span className="font-medium">{totals.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">KES {totals.subtotal.toLocaleString()}</span>
                </div>
                {totals.discountPercentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Bulk discount ({totals.discountPercentage}%):</span>
                    <span className="font-medium">-KES {(totals.subtotal - totals.total).toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">KES {totals.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Payment Option</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('full')}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      paymentOption === 'full'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="text-sm font-medium">Full Payment</div>
                    <div className="text-xs text-muted-foreground">
                      Pay KES {totals.total.toLocaleString()} now
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('deposit')}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      paymentOption === 'deposit'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="text-sm font-medium">30% Deposit</div>
                    <div className="text-xs text-muted-foreground">
                      Pay KES {totals.deposit.toLocaleString()} now
                    </div>
                  </button>
                </div>
                {paymentOption === 'deposit' && (
                  <p className="text-xs text-amber-600">
                    Balance of KES {totals.balance.toLocaleString()} due before booking
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(false)}
                  disabled={loading || cart.length === 0}
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCheckout(true)}
                  disabled={loading || cart.length === 0}
                >
                  Generate Invoice and Pay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
