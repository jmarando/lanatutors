import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Users, BookOpen, Award, Check } from "lucide-react";
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
        .order("session_count");

      if (error) throw error;
      setPackages(data || []);
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
        <Button variant="outline" onClick={() => window.location.href = '/expert-consultation'}>
          Talk to an Expert
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Available Packages</h3>
        <Button 
          variant="link" 
          onClick={() => window.location.href = '/expert-consultation'}
          className="text-sm"
        >
          Need a custom package? Talk to an expert →
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              } ${pkg.is_featured ? 'ring-2 ring-primary/20' : ''}`}
              onClick={() => onSelectPackage(pkg)}
            >
              {pkg.is_featured && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-primary">Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getPackageIcon(pkg.package_type)}
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  </div>
                  {selectedPackageId === pkg.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getPackageTypeLabel(pkg.package_type)}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                    Save {pkg.discount_percentage}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <CardDescription>{pkg.description}</CardDescription>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions:</span>
                    <span className="font-medium">{pkg.session_count}</span>
                  </div>
                  
                  {pkg.subjects && pkg.subjects.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subjects:</span>
                      <span className="font-medium">{pkg.subjects.join(", ")}</span>
                    </div>
                  )}
                  
                  {pkg.max_students > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Students:</span>
                      <span className="font-medium">{pkg.max_students}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid for:</span>
                    <span className="font-medium">{pkg.validity_days} days</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t">
                    <span className="text-muted-foreground">Per session:</span>
                    <span className="font-medium">KES {Math.round(pricePerSession).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground line-through">
                        KES {Math.round(originalPrice).toLocaleString()}
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        KES {Math.round(pkg.total_price).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Save KES {Math.round(savings).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant={selectedPackageId === pkg.id ? "default" : "outline"}
                >
                  {selectedPackageId === pkg.id ? "Selected" : "Select Package"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
