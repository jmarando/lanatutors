import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Users, Sparkles, Phone, Calendar, MessageSquare, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MultiTutorPackage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="Custom Learning Packages | Lana Tutors"
        description="Get a personalized learning package designed by our education experts. Multiple subjects, multiple tutors, one tailored plan."
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-brand-accent/5 to-background py-16 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-block mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Personalized Learning
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Custom Learning Packages
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Want a tailored learning plan across multiple subjects or tutors? Our education experts will design the perfect package for your child's unique needs.
          </p>
          <Button size="lg" onClick={() => navigate('/book-consultation')}>
            <Phone className="w-4 h-4 mr-2" />
            Book Free Consultation
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 px-4 bg-background">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Book a Free Call</h3>
              <p className="text-muted-foreground">
                Schedule a 15-minute consultation with our learning expert to discuss your child's needs and goals.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">We Design Your Plan</h3>
              <p className="text-muted-foreground">
                Our team creates a personalized learning plan with the right tutors, subjects, and session schedule.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Learning</h3>
              <p className="text-muted-foreground">
                Review and approve your plan, complete payment, and begin your child's personalized learning journey.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Custom Packages?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Expert-Matched Tutors</h3>
                <p className="text-muted-foreground">
                  We match your child with the best tutors for their specific curriculum, level, and learning style.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
                <p className="text-muted-foreground">
                  Get a schedule that works for your family, with sessions spread across multiple subjects and days.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ongoing Support</h3>
                <p className="text-muted-foreground">
                  Our team monitors progress and adjusts the plan as needed to ensure your child succeeds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="py-16 px-4 bg-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What's Included</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Personalized tutor matching",
              "Multiple subjects in one package",
              "Bulk session discounts up to 15%",
              "Flexible 90-day validity",
              "30% deposit payment option",
              "Progress tracking & reports",
              "Direct tutor communication",
              "Easy rescheduling"
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 bg-gradient-to-br from-primary/5 via-brand-accent/5 to-background">
        <div className="container max-w-4xl mx-auto text-center">
          <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Book a free 15-minute consultation and let our team design the perfect learning package for your child.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/book-consultation')}>
              <Phone className="w-4 h-4 mr-2" />
              Book Free Consultation
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/tutors')}>
              Browse Tutors
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiTutorPackage;