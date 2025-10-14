import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Package, Zap } from "lucide-react";

interface PackageOffer {
  id: string;
  name: string;
  description: string;
  session_count: number;
  total_price: number;
  discount_percentage: number;
  validity_days: number;
}

interface PackagePurchase {
  id: string;
  sessions_remaining: number;
  expires_at: string;
}

interface PaymentOptionsCardProps {
  paymentOption: 'deposit' | 'full' | 'package';
  onPaymentOptionChange: (option: 'deposit' | 'full' | 'package') => void;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  packageOffers: PackageOffer[];
  existingPackages: PackagePurchase[];
  selectedPackage: PackageOffer | null;
  selectedExistingPackage: PackagePurchase | null;
  onPackageSelect: (pkg: PackageOffer | null) => void;
  onExistingPackageSelect: (pkg: PackagePurchase | null) => void;
  disabled?: boolean;
}

export const PaymentOptionsCard = ({
  paymentOption,
  onPaymentOptionChange,
  totalAmount,
  depositAmount,
  balanceDue,
  packageOffers,
  existingPackages,
  selectedPackage,
  selectedExistingPackage,
  onPackageSelect,
  onExistingPackageSelect,
  disabled = false
}: PaymentOptionsCardProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Payment Option *</Label>
      
      {/* Existing Package - Show First if Available */}
      {existingPackages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Use Your Active Package</p>
          {existingPackages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`cursor-pointer transition-all ${
                selectedExistingPackage?.id === pkg.id 
                  ? 'border-primary border-2 bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onExistingPackageSelect(pkg)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedExistingPackage?.id === pkg.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        Active Package
                        {selectedExistingPackage?.id === pkg.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pkg.sessions_remaining} sessions remaining
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(pkg.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                    FREE
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Single Session Options */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Single Session</p>
        
        {/* Pay Deposit Option */}
        <Card 
          className={`cursor-pointer transition-all ${
            paymentOption === 'deposit' 
              ? 'border-primary border-2 bg-primary/5' 
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onPaymentOptionChange('deposit')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${paymentOption === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Pay Deposit (30%)
                    {paymentOption === 'deposit' && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay KES {depositAmount.toFixed(0)} now, KES {balanceDue.toFixed(0)} before session
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Balance due before the session starts
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">KES {depositAmount.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Now</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pay Full Amount Option */}
        <Card 
          className={`cursor-pointer transition-all ${
            paymentOption === 'full' 
              ? 'border-primary border-2 bg-primary/5' 
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onPaymentOptionChange('full')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${paymentOption === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Pay Full Amount
                    {paymentOption === 'full' && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay the full amount now - no balance due
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Confirmed - No payment required later
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">KES {totalAmount.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Options */}
      {packageOffers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Save with Packages</p>
          {packageOffers.map((pkg) => {
            const regularPrice = totalAmount * pkg.session_count;
            const savings = regularPrice - pkg.total_price;
            
            return (
              <Card 
                key={pkg.id}
                className={`cursor-pointer transition-all ${
                  selectedPackage?.id === pkg.id && paymentOption === 'package'
                    ? 'border-primary border-2 bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!disabled) {
                    onPaymentOptionChange('package');
                    onPackageSelect(pkg);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage?.id === pkg.id && paymentOption === 'package' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {pkg.name}
                          {selectedPackage?.id === pkg.id && paymentOption === 'package' && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                            Save {pkg.discount_percentage}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pkg.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-muted-foreground">
                            {pkg.session_count} sessions
                          </span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Save KES {savings.toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">
                            Valid {pkg.validity_days} days
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">KES {pkg.total_price.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground line-through">KES {regularPrice.toFixed(0)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
