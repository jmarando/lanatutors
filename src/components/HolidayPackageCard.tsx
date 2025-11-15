import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Gift, GraduationCap, Star, Sparkles } from "lucide-react";

interface HolidayPackageCardProps {
  curriculum: string;
  candidateLevels: string[];
  sessionCount: number;
  totalPrice: number;
  discount: number;
  validUntil: string;
}

export const HolidayPackageCard = ({
  curriculum,
  candidateLevels,
  sessionCount,
  totalPrice,
  discount,
  validUntil
}: HolidayPackageCardProps) => {
  const pricePerSession = totalPrice / sessionCount;
  const originalPrice = totalPrice / (1 - discount / 100);
  const savings = originalPrice - totalPrice;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Holiday Badge */}
      <div className="absolute top-4 right-4">
        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <Gift className="w-3 h-3 mr-1" />
          December Special
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">
              December Revision Package
            </CardTitle>
            <CardDescription className="text-sm">
              {curriculum} • {candidateLevels.join(", ")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Highlights */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {sessionCount} Sessions
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Valid until {validUntil}
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              KES {totalPrice.toLocaleString()}
            </span>
            {discount > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                KES {originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          
          {discount > 0 && (
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Save {discount}% (KES {savings.toLocaleString()})
              </Badge>
              <span className="text-xs text-muted-foreground">
                KES {pricePerSession.toLocaleString()}/session
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-1.5 pt-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Intensive exam-focused revision</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Past papers & practice questions</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Flexible scheduling throughout December</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>Progress tracking & feedback</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
