import { MultiTutorPackageBuilder } from "@/components/MultiTutorPackageBuilder";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Users, Sparkles, TrendingDown, Calendar, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MultiTutorPackage = () => {
  const navigate = useNavigate();

  const scrollToBuilder = () => {
    document.getElementById('package-builder')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEO
        title="Build Multi-Subject Package | LANA Tutors"
        description="Create custom learning packages across multiple subjects and tutors"
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-brand-accent/5 to-background py-16 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-block mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Most Flexible Option
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Build Your Perfect Learning Package
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Mix and match subjects across multiple expert tutors. Create a custom package tailored to your exact needs and save with automatic bulk discounts.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={scrollToBuilder}>
              Start Building Your Package
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/tutors')}>
              Browse Tutors First
            </Button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 px-4 bg-background">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Custom Packages?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multiple Tutors, One Package</h3>
                <p className="text-muted-foreground">
                  Work with different expert tutors for different subjects. Get specialized help exactly where you need it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingDown className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Automatic Bulk Savings</h3>
                <p className="text-muted-foreground">
                  Save 5% on 2+ sessions, 10% on 5+ sessions, or 15% on 10+ sessions. Discounts applied automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">90-Day Flexibility</h3>
                <p className="text-muted-foreground">
                  Use your sessions anytime within 90 days. Perfect for exam prep, holiday revision, or steady progress.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 px-4 bg-muted/30">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse & Select</h3>
              <p className="text-muted-foreground">
                Explore our tutor profiles, review their expertise, and add subjects from different tutors to your cart.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize Sessions</h3>
              <p className="text-muted-foreground">
                Choose how many sessions you need for each subject. Adjust quantities until your package is perfect.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Pay & Schedule</h3>
              <p className="text-muted-foreground">
                Complete payment (full or 30% deposit) and schedule your sessions directly with each tutor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 px-4 bg-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What's Included</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Mix subjects across multiple tutors",
              "Automatic bulk discounts up to 15%",
              "90-day validity on all sessions",
              "Flexible scheduling with each tutor",
              "30% deposit option available",
              "Direct access to expert tutors"
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Package Builder */}
      <div id="package-builder" className="scroll-mt-16">
        <MultiTutorPackageBuilder />
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 bg-gradient-to-br from-primary/5 via-brand-accent/5 to-background">
        <div className="container max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Browse our expert tutors, add the subjects you need, and build your perfect learning package today.
          </p>
          <Button size="lg" onClick={() => navigate('/tutors')}>
            <Users className="w-4 h-4 mr-2" />
            Browse All Tutors
          </Button>
        </div>
      </div>
    </>
  );
};

export default MultiTutorPackage;
