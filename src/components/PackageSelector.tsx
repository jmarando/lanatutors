import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Users, BookOpen, Award, Check, Gift } from "lucide-react";
import { toast } from "sonner";

interface PackageOffer {
  id: string;
  name: string;
  description: string;
  session_count: number;
  total_price: number;
  discount_percentage: number;
  package_type: string;
  subjects: string[];
  max_students: number;
  validity_days: number;
  is_featured: boolean;
}

interface PackageSelectorProps {
  tutorId: string;
  onSelectPackage: (pkg: PackageOffer) => void;
  selectedPackageId?: string;
}

export const PackageSelector = ({ tutorId, onSelectPackage, selectedPackageId }: PackageSelectorProps) => {
  const [packages, setPackages] = useState<PackageOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, [tutorId]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("package_offers")
        .select("*")
        .eq("tutor_id", tutorId)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("session_count")
        .limit(10);

      if (error) throw error;
      // Filter to only show packages with 5+ sessions (excludes single and double sessions)
      const filteredPackages = (data || []).filter(pkg => pkg.session_count >= 5);
      setPackages(filteredPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const getPackageIcon = (type: string) => {
    switch (type) {
      case 'multi_subject':
        return <BookOpen className="w-5 h-5" />;
      case 'multi_child':
        return <Users className="w-5 h-5" />;
      case 'exam_prep':
        return <Award className="w-5 h-5" />;
      case 'holiday_revision':
        return <Sparkles className="w-5 h-5 text-primary animate-pulse" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getPackageTypeLabel = (type: string) => {
    switch (type) {
      case 'multi_subject':
        return 'Multi-Subject';
      case 'multi_child':
        return 'Family Package';
      case 'exam_prep':
        return 'Exam Prep';
      case 'holiday_revision':
        return 'Holiday Revision Special';
      case 'single_subject':
        return 'Single Subject';
      default:
        return 'Custom';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading packages...</div>;
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No packages available for this tutor yet.</p>
        <Button variant="outline" onClick={() => window.location.href = '/book-consultation'}>
          Talk to an Expert
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {packages.map((pkg) => {
          const pricePerSession = pkg.total_price / pkg.session_count;
          const originalPrice = pricePerSession / (1 - pkg.discount_percentage / 100) * pkg.session_count;
          const savings = originalPrice - pkg.total_price;

          return (
            <Card
              key={pkg.id}
              className={`relative cursor-pointer transition-all ${
                selectedPackageId === pkg.id
                  ? 'border-primary border-2 shadow-lg'
                  : 'hover:border-primary/50'
              } ${pkg.package_type === 'holiday_revision' ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-background' : pkg.is_featured ? 'ring-2 ring-primary/20' : ''}`}
              onClick={() => onSelectPackage(pkg)}
            >
              {pkg.package_type === 'holiday_revision' && (
                <div className="absolute -top-2 right-3">
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-xs">
                    <Gift className="w-3 h-3 mr-1" />
                    Holiday Special
                  </Badge>
                </div>
              )}
              {pkg.is_featured && pkg.package_type !== 'holiday_revision' && (
                <div className="absolute -top-2 right-3">
                  <Badge className="bg-primary text-xs">Popular</Badge>
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPackageIcon(pkg.package_type)}
                    <h4 className="font-bold text-base">{pkg.name}</h4>
                  </div>
                  {selectedPackageId === pkg.id && (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getPackageTypeLabel(pkg.package_type)}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Save {pkg.discount_percentage}%
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground mb-1">Sessions</div>
                    <div className="font-bold">{pkg.session_count}</div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground mb-1">Valid for</div>
                    <div className="font-bold">{pkg.validity_days} days</div>
                  </div>
                </div>

                {pkg.subjects && pkg.subjects.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">Subjects</div>
                    <div className="text-sm font-medium">{pkg.subjects.join(", ")}</div>
                  </div>
                )}

                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Per session:</div>
                      <div className="font-bold text-lg">
                        KES {Math.round(pricePerSession).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground line-through">
                        KES {Math.round(originalPrice).toLocaleString()}
                      </div>
                      <div className="font-bold text-xl text-primary">
                        KES {Math.round(pkg.total_price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
