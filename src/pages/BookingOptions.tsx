import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Package, FileText, Calendar, GraduationCap } from "lucide-react";
import { SEO } from "@/components/SEO";

const BookingOptions = () => {
  const bookingOptions = [
    {
      icon: User,
      title: "Individual Tutor Sessions",
      description: "Book personalized 1-on-1 sessions with verified tutors",
      price: "From KES 1,000/hr",
      features: [
        "Choose your preferred tutor",
        "Flexible scheduling",
        "Online or in-person",
        "Single or recurring sessions"
      ],
      link: "/tutors",
      badge: "Most Popular",
      badgeVariant: "default" as const
    },
    {
      icon: User,
      title: "Individual Tutor Sessions",
      description: "Book personalized 1-on-1 sessions with verified tutors",
      price: "From KES 1,000/hr",
      features: [
        "Choose your preferred tutor",
        "Flexible scheduling",
        "Online or in-person",
        "Single or recurring sessions"
      ],
      link: "/tutors",
      badge: "Most Popular",
      badgeVariant: "default" as const
    },
    {
      icon: Package,
      title: "Custom Package Builder",
      description: "Create multi-session bundles with one or more tutors",
      price: "Bulk discounts available",
      features: [
        "Mix multiple subjects",
        "Combine different tutors",
        "Flexible session allocation",
        "Save up to 15%"
      ],
      link: "/multi-tutor-package",
      badge: "Best Value",
      badgeVariant: "secondary" as const
    },
    {
      icon: FileText,
      title: "Request Learning Plan",
      description: "Get a personalized learning plan from our experts",
      price: "Free consultation",
      features: [
        "Expert needs assessment",
        "Customized curriculum",
        "Subject-specific recommendations",
        "Flexible payment options"
      ],
      link: "/request-learning-plan",
      badge: null,
      badgeVariant: null
    }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="Book a Class - Choose Your Learning Path"
        description="Explore all our tutoring options: December Intensive Program, individual tutors, custom packages, and personalized learning plans. Find the perfect fit for your learning needs."
      />
      
      {/* Hero Section */}
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Multiple Booking Options Available
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your Learning Path
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
            From intensive group programs to personalized 1-on-1 sessions, we have the perfect option for every student's needs and learning style.
          </p>
        </div>
      </section>

      {/* Booking Options Grid */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {bookingOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                  {option.badge && (
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        option.badgeVariant === 'secondary'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        {option.badge}
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{option.title}</CardTitle>
                    <CardDescription className="text-base">
                      {option.description}
                    </CardDescription>
                    <div className="pt-2">
                      <span className="text-lg font-bold text-primary">{option.price}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <GraduationCap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to={option.link}>
                      <Button className="w-full h-12 text-base hover-scale">
                        Explore This Option
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Need Help Choosing?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Not sure which option is right for you? Book a free consultation with our education experts who will help you find the perfect learning solution.
          </p>
          <Link to="/book-consultation">
            <Button size="lg" className="h-14 px-8 text-lg">
              Book Free Consultation
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BookingOptions;
