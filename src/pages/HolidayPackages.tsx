import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";
import { HolidayPackageBanner } from "@/components/HolidayPackageBanner";
import { HolidayPackageCard } from "@/components/HolidayPackageCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Calendar, Gift, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface HolidayPackage {
  id: string;
  year: number;
  holiday_period: string;
  curriculum: string;
  candidate_levels: string[];
  starts_at: string;
  ends_at: string;
}

interface PackageOffer {
  id: string;
  name: string;
  description: string;
  session_count: number;
  total_price: number;
  discount_percentage: number;
  package_type: string;
  tutor_id: string;
  curriculum: string[];
}

export default function HolidayPackages() {
  const [holidayConfigs, setHolidayConfigs] = useState<HolidayPackage[]>([]);
  const [packageOffers, setPackageOffers] = useState<PackageOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch holiday package configurations
      const { data: holidays, error: holidayError } = await supabase
        .from("holiday_packages")
        .select("*")
        .eq("is_active", true)
        .eq("holiday_period", "december");

      if (holidayError) throw holidayError;

      // Fetch holiday revision package offers
      const { data: offers, error: offersError } = await supabase
        .from("package_offers")
        .select("*")
        .eq("package_type", "holiday_revision")
        .eq("is_active", true);

      if (offersError) throw offersError;

      setHolidayConfigs(holidays || []);
      setPackageOffers(offers || []);
    } catch (error) {
      console.error("Error fetching holiday packages:", error);
      toast.error("Failed to load holiday packages");
    } finally {
      setLoading(false);
    }
  };

  const curriculums = ["all", ...new Set(holidayConfigs.map(h => h.curriculum))];

  const filteredConfigs = selectedCurriculum === "all" 
    ? holidayConfigs 
    : holidayConfigs.filter(h => h.curriculum === selectedCurriculum);

  return (
    <>
      <SEO 
        title="December Holiday Revision Packages | Lana Tutors"
        description="Intensive exam revision packages for candidate years. Get ready for KCSE, IGCSE, A-Levels, and IB exams with expert tutors this December holiday."
        keywords="holiday revision, december packages, exam preparation, KCSE revision, IGCSE revision, A-Level revision, IB revision, candidate classes"
      />
      <Navigation />
      
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Gift className="w-4 h-4" />
              Limited Time Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              December Holiday Revision Packages
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Intensive exam preparation for candidate years across all curricula. 
              Save up to 25% on revision bundles with our expert tutors.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Valid Dec 1 - Jan 15, 2026
              </span>
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Candidate Years Only
              </span>
            </div>
          </div>

          {/* Benefits */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle>Why Choose Our Holiday Revision Packages?</CardTitle>
              <CardDescription>
                Designed specifically for students preparing for critical examinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Intensive Revision</h3>
                  <p className="text-sm text-muted-foreground">
                    Focused sessions covering all exam topics with past papers
                  </p>
                </div>
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Expert Tutors</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified teachers with proven track records in exam prep
                  </p>
                </div>
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Flexible Scheduling</h3>
                  <p className="text-sm text-muted-foreground">
                    Book sessions throughout December at your convenience
                  </p>
                </div>
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold">Big Savings</h3>
                  <p className="text-sm text-muted-foreground">
                    Save up to 25% compared to regular single-session rates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Curriculum Tabs */}
          <Tabs value={selectedCurriculum} onValueChange={setSelectedCurriculum} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
              {curriculums.map(curriculum => (
                <TabsTrigger key={curriculum} value={curriculum} className="capitalize">
                  {curriculum === "all" ? "All Curricula" : curriculum}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Package Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading packages...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No holiday packages available for this curriculum yet.
              </p>
              <Button onClick={() => window.location.href = '/book-consultation'}>
                Request Custom Package
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredConfigs.map(config => (
                <HolidayPackageCard
                  key={config.id}
                  curriculum={config.curriculum}
                  candidateLevels={config.candidate_levels}
                  sessionCount={12}
                  totalPrice={18000}
                  discount={25}
                  validUntil="Jan 15, 2026"
                />
              ))}
            </div>
          )}

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/30">
            <CardContent className="py-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Ready to Book Your Holiday Package?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Browse our verified tutors, view their holiday packages, and secure your spot for December revision.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" onClick={() => window.location.href = '/tutors'}>
                  Browse Tutors
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.location.href = '/book-consultation'}>
                  Talk to an Expert
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
