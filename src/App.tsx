import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navigation from "./components/Navigation";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const ForStudents = lazy(() => import("./pages/ForStudents"));
const ForTutors = lazy(() => import("./pages/ForTutors"));
const TutorSearch = lazy(() => import("./pages/TutorSearch"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const Login = lazy(() => import("./pages/Login"));
const StudentSignup = lazy(() => import("./pages/StudentSignup"));
const TutorSignup = lazy(() => import("./pages/TutorSignup"));
const BecomeATutor = lazy(() => import("./pages/BecomeATutor"));
const StudentDashboard = lazy(() => import("./pages/NewStudentDashboard"));
const TutorDashboard = lazy(() => import("./pages/TutorDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SeedTutors = lazy(() => import("./pages/SeedTutors"));
const BookConsultation = lazy(() => import("./pages/BookConsultation"));
const ExpertConsultation = lazy(() => import("./pages/ExpertConsultation"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TestEmail = lazy(() => import("./pages/TestEmail"));
const BookingConfirmed = lazy(() => import("./pages/BookingConfirmed"));
const CreateCalvinProfile = lazy(() => import("./pages/CreateCalvinProfile"));
const TutorProfileSetup = lazy(() => import("./pages/TutorProfileSetup"));
const ConsultationConfirmed = lazy(() => import("./pages/ConsultationConfirmed"));
const LearningAssessment = lazy(() => import("./pages/LearningAssessment"));
const AssessmentResults = lazy(() => import("./pages/AssessmentResults"));
const SetupCentralCalendar = lazy(() => import("./pages/SetupCentralCalendar"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
              <Route path="/for-students" element={<ForStudents />} />
              <Route path="/for-tutors" element={<ForTutors />} />
              <Route path="/tutors" element={<TutorSearch />} />
              <Route path="/tutors/:id" element={<TutorProfile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/student-signup" element={<StudentSignup />} />
              <Route path="/tutor-signup" element={<TutorSignup />} />
              <Route path="/become-a-tutor" element={<BecomeATutor />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/tutor-profile-setup" element={<TutorProfileSetup />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/seed-tutors" element={<SeedTutors />} />
              <Route path="/book-consultation" element={<BookConsultation />} />
              <Route path="/expert-consultation" element={<ExpertConsultation />} />
              <Route path="/test-email" element={<TestEmail />} />
              <Route path="/booking-confirmed" element={<BookingConfirmed />} />
              <Route path="/create-calvin-profile" element={<CreateCalvinProfile />} />
              <Route path="/consultation-confirmed" element={<ConsultationConfirmed />} />
              <Route path="/learning-assessment" element={<LearningAssessment />} />
              <Route path="/assessment-results" element={<AssessmentResults />} />
              <Route path="/setup-central-calendar" element={<SetupCentralCalendar />} />
              <Route path="/payment-callback" element={<PaymentCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
