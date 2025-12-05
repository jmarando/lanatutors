import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Users, Calendar, TrendingUp, Shield } from "lucide-react";
import { GeneralLearningPlanRequest } from "@/components/GeneralLearningPlanRequest";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

const RequestLearningPlan = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const handleGetStarted = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.getElementById('request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (showForm) {
    return (
      <>
        <SEO
          title="Request a Learning Plan | Lana Tutors"
          description="Get a personalized learning plan designed by expert tutors for your child's academic success"
        />
        <div className="min-h-screen bg-background py-12">
          <div className="max-w-3xl mx-auto px-6" id="request-form">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-3">Request Your Custom Learning Plan</h1>
              <p className="text-muted-foreground">
                Complete the form below and our team will create a personalized plan for you
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <GeneralLearningPlanRequest
                  onClose={() => setShowForm(false)}
                  onSubmitSuccess={() => {
                    setShowForm(false);
                    navigate('/student/dashboard');
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Request a Learning Plan | Lana Tutors"
        description="Get a personalized learning plan designed by expert tutors for your child's academic success"
      />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Personalized Learning Plans</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Get a Custom Learning Plan
                <br />
                <span className="text-primary">Designed for Your Child</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8">
                Share your child's needs and goals. Our expert team will match you with the perfect tutor(s) 
                and create a personalized learning plan tailored to help them succeed.
              </p>

              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                {isAuthenticated ? 'Get Started' : 'Sign In to Get Started'}
              </button>

              <p className="text-sm text-muted-foreground mt-4">
                You'll receive your personalized plan via email within 24 hours
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground">Simple steps to get your customized learning plan</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Share Your Needs</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your child's curriculum, grade level, subjects, challenges, and learning goals
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">We Create Your Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team reviews your requirements and matches you with expert tutor(s), then designs a custom plan
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Review & Start</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive your plan via email, review the subjects, schedule, and pricing - then accept and begin learning
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What's Included Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What's Included in Your Plan</h2>
              <p className="text-muted-foreground">Comprehensive support for your child's learning journey</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg h-fit">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Expert Tutor Matching</h3>
                    <p className="text-sm text-muted-foreground">
                      We match your child with qualified tutors who specialize in their curriculum and subjects
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg h-fit">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Structured Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      A week-by-week plan showing recommended sessions per subject and optimal learning duration
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg h-fit">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Goal-Focused Strategy</h3>
                    <p className="text-sm text-muted-foreground">
                      Each plan addresses your child's specific challenges and targets their academic goals
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg h-fit">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Flexible & Transparent</h3>
                    <p className="text-sm text-muted-foreground">
                      Clear pricing breakdown per subject, with no commitment until you review and accept the plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Parents Choose Custom Learning Plans</h2>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Personalized to Your Child's Needs</h4>
                    <p className="text-sm text-muted-foreground">
                      Every plan is uniquely crafted based on your child's curriculum, grade level, strengths, and areas for improvement
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Expert Guidance from Day One</h4>
                    <p className="text-sm text-muted-foreground">
                      Our team reviews hundreds of tutor profiles to find the perfect match for your child's learning style and academic goals
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Save Time on Research</h4>
                    <p className="text-sm text-muted-foreground">
                      Skip the hassle of browsing dozens of tutor profiles - we do the matching work and deliver a ready-to-go plan
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Multi-Subject Coordination</h4>
                    <p className="text-sm text-muted-foreground">
                      Need tutoring in multiple subjects? We coordinate everything and can even match you with multiple tutors if needed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">No Pressure to Commit</h4>
                    <p className="text-sm text-muted-foreground">
                      Review the complete plan, pricing, and tutor details before deciding - there's no obligation until you accept
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-12">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Request your free custom learning plan today. No commitment required.
              </p>
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                {isAuthenticated ? 'Request My Learning Plan' : 'Sign In to Request Plan'}
              </button>
              <p className="text-sm text-muted-foreground mt-4">
                Response time: Within 24 hours • 100% Free consultation
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default RequestLearningPlan;
