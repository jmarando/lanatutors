import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Mail, UserCheck, Calendar, DollarSign, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

const TutorOnboardingGuide = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: "Submit Your Application",
      icon: Mail,
      description: "Start your journey by completing our tutor application form",
      details: [
        "Fill in your personal details (name, email, phone number)",
        "Share your teaching experience and qualifications",
        "Upload your CV (PDF format, max 5MB)",
        "Specify subjects you can teach and curriculum expertise",
        "Agree to our terms and conditions"
      ],
      action: "Apply Now",
      route: "/become-a-tutor",
      estimatedTime: "10-15 minutes"
    },
    {
      title: "Application Review",
      icon: UserCheck,
      description: "Our team carefully reviews your application",
      details: [
        "Receive instant acknowledgment email upon submission",
        "Our team reviews your qualifications and experience",
        "You may be invited for a virtual interview",
        "Interview focuses on teaching approach and subject knowledge",
        "Receive approval or feedback within 3-5 business days"
      ],
      estimatedTime: "3-5 business days"
    },
    {
      title: "Complete Your Profile",
      icon: BookOpen,
      description: "Set up your professional tutor profile in 4 easy steps",
      details: [
        "Step 1: Personal Information - Add your bio, experience, and education",
        "Step 2: Teaching Details - Select curricula, levels, and subjects you teach",
        "Step 3: Pricing - Set your hourly rates and create package offers",
        "Step 4: Preferences - Choose teaching modes (online/in-person), upload profile photo"
      ],
      action: "Setup Profile",
      route: "/tutor-profile-setup",
      estimatedTime: "20-30 minutes"
    },
    {
      title: "Set Your Availability",
      icon: Calendar,
      description: "Manage when you're available for teaching sessions",
      details: [
        "Generate weekly availability slots (8 AM - 8 PM)",
        "Block specific times when you're unavailable",
        "Color-coded calendar: Green (available), Red (blocked), Blue (booked)",
        "Set up to 4 weeks of availability in advance",
        "Update anytime as your schedule changes"
      ],
      action: "Manage Availability",
      route: "/tutor/availability",
      estimatedTime: "10 minutes"
    },
    {
      title: "Go Live & Start Teaching",
      icon: Settings,
      description: "Your profile is now live and ready to receive bookings",
      details: [
        "Your profile appears in tutor search results",
        "Parents and students can view your profile and book sessions",
        "Receive booking notifications via email",
        "Access your dashboard to manage bookings and students",
        "Track your earnings and teaching hours",
        "Build your reputation with student reviews"
      ],
      action: "View Dashboard",
      route: "/tutor/dashboard",
      estimatedTime: "Ongoing"
    }
  ];

  const faqs = [
    {
      question: "How long does the approval process take?",
      answer: "Typically 3-5 business days from application submission. You'll receive email updates at each stage."
    },
    {
      question: "What qualifications do I need?",
      answer: "We look for tutors with strong academic backgrounds, teaching experience, and passion for education. Relevant degrees, certifications, or teaching credentials are preferred."
    },
    {
      question: "How do I set my rates?",
      answer: "During profile setup, you'll set your hourly rates. You can also create package offers with discounts for multiple sessions."
    },
    {
      question: "Can I teach both online and in-person?",
      answer: "Yes! You can select your preferred teaching modes during profile setup. Many tutors offer both options."
    },
    {
      question: "What happens after I get my first booking?",
      answer: "You'll receive an email notification with student details and session information. The meeting link (for online sessions) is automatically generated."
    },
    {
      question: "Can I update my profile after it's live?",
      answer: "Absolutely! You can update your profile, availability, and rates anytime from your tutor dashboard."
    },
    {
      question: "How do earnings work?",
      answer: "You earn 70% of the session fee, with LANA Tutors keeping 30% to maintain the platform. Earnings are paid out monthly within the first 5 business days of each month."
    },
    {
      question: "How do I manage my availability?",
      answer: "Use the 'Generate 4 Weeks Availability' feature to create hourly slots from 8 AM - 8 PM EAT. You can then block specific times or entire days. Green = available, Yellow = blocked, Blue = booked."
    },
    {
      question: "Can I connect my Google Calendar?",
      answer: "Yes! Connect your Google Calendar to automatically sync bookings, receive notifications, and avoid double-booking. Look for the connection option on your dashboard."
    }
  ];

  return (
    <>
      <SEO 
        title="Tutor Onboarding Guide - LANA Tutors"
        description="Complete guide to becoming a LANA tutor. Learn about our application process, profile setup, and how to start teaching students."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Tutor Onboarding Guide
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your complete roadmap to becoming a successful LANA tutor. Follow these steps to join our community of exceptional educators.
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="space-y-8 mb-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex gap-6">
                    {/* Step Number & Icon */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                          <p className="text-muted-foreground">{step.description}</p>
                          <span className="inline-block mt-2 text-sm bg-muted px-3 py-1 rounded-full">
                            ⏱️ {step.estimatedTime}
                          </span>
                        </div>
                      </div>

                      {/* Details List */}
                      <ul className="space-y-2 mb-4">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Action Button */}
                      {step.action && step.route && (
                        <Button 
                          onClick={() => navigate(step.route)}
                          className="mt-2"
                        >
                          {step.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* FAQs Section */}
          <Card className="p-8 bg-muted/30">
            <h2 className="text-3xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {faqs.map((faq, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-semibold text-lg">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA Section */}
          <div className="mt-12 text-center">
            <Card className="p-8 bg-gradient-to-r from-primary/10 to-primary/5">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join our community of exceptional tutors and make a difference in students' lives. 
                The application process is quick and straightforward.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/become-a-tutor")}>
                  Start Your Application
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Already Applied? Login
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorOnboardingGuide;
