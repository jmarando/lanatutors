import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navigation from "./components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ForStudents = lazy(() => import("./pages/ForStudents"));
const ForTutors = lazy(() => import("./pages/ForTutors"));
const TutorSearch = lazy(() => import("./pages/TutorSearch"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentSignup = lazy(() => import("./pages/StudentSignup"));
const TutorSignup = lazy(() => import("./pages/TutorSignup"));
const BecomeATutor = lazy(() => import("./pages/BecomeATutor"));
const StudentDashboard = lazy(() => import("./pages/NewStudentDashboard"));
const TutorDashboard = lazy(() => import("./pages/TutorDashboard"));
const AdminDashboardRedesigned = lazy(() => import("./pages/AdminDashboard-Redesigned"));
const BookConsultation = lazy(() => import("./pages/BookConsultation"));
const HolidayPackages = lazy(() => import("./pages/HolidayPackages"));
const AdminHolidayPackages = lazy(() => import("./pages/AdminHolidayPackages"));
const MultiTutorPackage = lazy(() => import("./pages/MultiTutorPackage"));
const PayBalance = lazy(() => import("./pages/PayBalance"));

const NotFound = lazy(() => import("./pages/NotFound"));
const TestEmail = lazy(() => import("./pages/TestEmail"));
const BookingConfirmed = lazy(() => import("./pages/BookingConfirmed"));
const TutorProfileSetup = lazy(() => import("./pages/TutorProfileSetup"));
const TutorProfileEdit = lazy(() => import("./pages/TutorProfileEdit"));
const TutorProfileSubmitted = lazy(() => import("./pages/TutorProfileSubmitted"));
const ConsultationConfirmed = lazy(() => import("./pages/ConsultationConfirmed"));
const SetupCentralCalendar = lazy(() => import("./pages/SetupCentralCalendar"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const TutorAvailability = lazy(() => import("./pages/TutorAvailability"));
const TutorOnboardingGuide = lazy(() => import("./pages/TutorOnboardingGuide"));
const TutorGuidePrintable = lazy(() => import("./pages/TutorGuidePrintable"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navigation />
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/for-students" element={<ForStudents />} />
                <Route path="/for-tutors" element={<ForTutors />} />
                <Route path="/tutors" element={<TutorSearch />} />
                <Route path="/tutors/:id" element={<TutorProfile />} />
                <Route path="/tutor-profile/:id" element={<TutorProfile />} /> {/* Legacy route for backward compatibility */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/student-signup" element={<StudentSignup />} />
                <Route path="/tutor-signup" element={<TutorSignup />} />
                <Route path="/become-a-tutor" element={<BecomeATutor />} />
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/tutor/dashboard" element={<TutorDashboard />} />
                <Route path="/tutor/availability" element={<TutorAvailability />} />
            <Route path="/tutor-profile-setup" element={<TutorProfileSetup />} />
            <Route path="/tutor-profile-edit" element={<TutorProfileEdit />} />
                <Route path="/tutor-profile-submitted" element={<TutorProfileSubmitted />} />
                <Route path="/tutor-onboarding-guide" element={<TutorOnboardingGuide />} />
                <Route path="/tutor-guide-printable" element={<TutorGuidePrintable />} />
                <Route path="/admin" element={<AdminDashboardRedesigned />} />
                <Route path="/book-consultation" element={<BookConsultation />} />
                <Route path="/test-email" element={<TestEmail />} />
                <Route path="/booking-confirmed" element={<BookingConfirmed />} />
                <Route path="/consultation-confirmed" element={<ConsultationConfirmed />} />
                <Route path="/setup-central-calendar" element={<SetupCentralCalendar />} />
                <Route path="/payment-callback" element={<PaymentCallback />} />
                <Route path="/holiday-packages" element={<HolidayPackages />} />
                <Route path="/admin/holiday-packages" element={<AdminHolidayPackages />} />
                <Route path="/multi-tutor-package" element={<MultiTutorPackage />} />
                <Route path="/pay-balance" element={<PayBalance />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
