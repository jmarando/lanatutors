import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useMemo, type ReactNode } from "react";
import Navigation from "./components/Navigation";
import { SiteFooter } from "./components/SiteFooter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import RequireRole from "./components/RequireRole";

// Deferred: floating chat widget is not needed for first paint
const WhatsAppChatButton = lazy(() => import("./components/WhatsAppChatButton"));

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const BookingOptions = lazy(() => import("./pages/BookingOptions"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ForStudents = lazy(() => import("./pages/ForStudents"));
const ForTutors = lazy(() => import("./pages/ForTutors"));
const TutorSearch = lazy(() => import("./pages/TutorSearch"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentSignup = lazy(() => import("./pages/StudentSignup"));
const TutorSignup = lazy(() => import("./pages/TutorSignup"));
const BecomeATutor = lazy(() => import("./pages/BecomeATutor"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const UnifiedStudentDashboard = lazy(() => import("./pages/UnifiedStudentDashboard"));
const TutorDashboard = lazy(() => import("./pages/TutorDashboard"));
const AdminDashboardRedesigned = lazy(() => import("./pages/AdminDashboard-Redesigned"));
const BookConsultation = lazy(() => import("./pages/BookConsultation"));

const AdminHolidayPackages = lazy(() => import("./pages/AdminHolidayPackages"));
const MultiTutorPackage = lazy(() => import("./pages/MultiTutorPackage"));
const PayBalance = lazy(() => import("./pages/PayBalance"));
const InvoicePreview = lazy(() => import("./pages/InvoicePreview"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const LearningPlanView = lazy(() => import("./pages/LearningPlanView"));
const RequestLearningPlan = lazy(() => import("./pages/RequestLearningPlan"));
const GroupClassMarketplace = lazy(() => import("./pages/GroupClassMarketplace"));
const GroupClassEnrollment = lazy(() => import("./pages/GroupClassEnrollment"));

const NotFound = lazy(() => import("./pages/NotFound"));
const BookingConfirmed = lazy(() => import("./pages/BookingConfirmed"));
const PackageConfirmed = lazy(() => import("./pages/PackageConfirmed"));
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
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const TutorsInKenya = lazy(() => import("./pages/TutorsInKenya"));
const SubjectLanding = lazy(() => import("./pages/SubjectLanding"));
const CurriculumMathLanding = lazy(() => import("./pages/CurriculumMathLanding"));
const Diaspora = lazy(() => import("./pages/Diaspora"));
const CityLanding = lazy(() => import("./pages/CityLanding"));
const DecemberClasses = lazy(() => import("./pages/DecemberClasses"));

// School module
const SchoolLogin = lazy(() => import("./pages/school/SchoolLogin"));
const SchoolAdminDashboard = lazy(() => import("./pages/school/SchoolAdminDashboard"));
const SchoolTeacherDashboard = lazy(() => import("./pages/school/SchoolTeacherDashboard"));
const SchoolParentDashboard = lazy(() => import("./pages/school/SchoolParentDashboard"));

// Old links to a family page open that family in the CRM's panel.
const FamilyRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/admin/crm/${id}` : "/admin/crm"} replace />;
};

export const AppContent = () => {
  const location = useLocation();
  const isSchoolRoute = location.pathname.startsWith("/school/");
  // The admin (the CRM included) has no use for the public chat button, which would sit over the CRM panel on a phone.
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  // The public footer links every marketing page (src/data/siteLinks.ts). Dashboards, the admin and the printable
  // guide are working screens and have no use for it.
  const showFooter =
    !isSchoolRoute &&
    !isAdminRoute &&
    !location.pathname.startsWith("/student/") &&
    !location.pathname.startsWith("/tutor/") &&
    location.pathname !== "/tutor-guide-printable";
  return (
    <>
      {!isSchoolRoute && <Navigation />}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book-class" element={<BookingOptions />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/for-students" element={<ForStudents />} />
          <Route path="/for-tutors" element={<ForTutors />} />
          <Route path="/tutors" element={<TutorSearch />} />
          <Route path="/tutors/:id" element={<TutorProfile />} />
          <Route path="/tutor-profile/:id" element={<TutorProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/tutor-signup" element={<TutorSignup />} />
          <Route path="/become-a-tutor" element={<BecomeATutor />} />
          <Route path="/student/dashboard" element={<RequireRole roles={["student", "admin"]}><UnifiedStudentDashboard /></RequireRole>} />
          <Route path="/student/dashboard-old" element={<RequireRole roles={["student", "admin"]}><StudentDashboard /></RequireRole>} />
          <Route path="/tutor/dashboard" element={<RequireRole roles={["tutor", "admin"]}><TutorDashboard /></RequireRole>} />
          <Route path="/tutor/availability" element={<RequireRole roles={["tutor", "admin"]}><TutorAvailability /></RequireRole>} />
          <Route path="/tutor-profile-setup" element={<TutorProfileSetup />} />
          <Route path="/tutor-profile-edit" element={<TutorProfileEdit />} />
          <Route path="/tutor-profile-submitted" element={<TutorProfileSubmitted />} />
          <Route path="/tutor-onboarding-guide" element={<TutorOnboardingGuide />} />
          <Route path="/tutor-guide-printable" element={<TutorGuidePrintable />} />
          {/* The admin dashboard; the CRM, Lessons and the December desk are its tabs with addresses of their own. */}
          <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboardRedesigned /></RequireRole>} />
          <Route path="/admin/crm" element={<RequireRole roles={["admin"]}><AdminDashboardRedesigned /></RequireRole>} />
          <Route path="/admin/crm/:familyId" element={<RequireRole roles={["admin"]}><AdminDashboardRedesigned /></RequireRole>} />
          <Route path="/admin/lessons" element={<RequireRole roles={["admin"]}><AdminDashboardRedesigned /></RequireRole>} />
          <Route path="/admin/december" element={<RequireRole roles={["admin"]}><AdminDashboardRedesigned /></RequireRole>} />
          <Route path="/admin/families/:id" element={<FamilyRedirect />} />
          <Route path="/admin/leads" element={<Navigate to="/admin/crm" replace />} />
          <Route path="/admin/more" element={<Navigate to="/admin" replace />} />
          <Route path="/book-consultation" element={<BookConsultation />} />
          <Route path="/booking-confirmed" element={<BookingConfirmed />} />
          <Route path="/package-confirmed" element={<PackageConfirmed />} />
          <Route path="/consultation-confirmed" element={<ConsultationConfirmed />} />
          <Route path="/setup-central-calendar" element={<SetupCentralCalendar />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route path="/admin/holiday-packages" element={<RequireRole roles={["admin"]}><AdminHolidayPackages /></RequireRole>} />
          <Route path="/multi-tutor-package" element={<MultiTutorPackage />} />
          <Route path="/pay-balance" element={<PayBalance />} />
          <Route path="/invoice-preview" element={<InvoicePreview />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/tutors-in-kenya" element={<TutorsInKenya />} />
          <Route path="/tutors-in-nairobi" element={<CityLanding />} />
          <Route path="/tutors-in-mombasa" element={<CityLanding />} />
          <Route path="/tutors-in-kisumu" element={<CityLanding />} />
          <Route path="/december-classes" element={<DecemberClasses />} />
          <Route path="/subjects/:subject" element={<SubjectLanding />} />
          <Route path="/kcse-mathematics-tutors" element={<CurriculumMathLanding slugOverride="kcse-mathematics-tutors" />} />
          <Route path="/igcse-mathematics-tutors" element={<CurriculumMathLanding slugOverride="igcse-mathematics-tutors" />} />
          <Route path="/ib-mathematics-tutors" element={<CurriculumMathLanding slugOverride="ib-mathematics-tutors" />} />
          <Route path="/cbc-mathematics-tutors" element={<CurriculumMathLanding slugOverride="cbc-mathematics-tutors" />} />
          <Route path="/diaspora" element={<Diaspora />} />
          <Route path="/tutors-for-african-students-abroad" element={<Diaspora />} />
          <Route path="/kenyan-tutors-uk" element={<Diaspora />} />
          <Route path="/kenyan-tutors-usa" element={<Diaspora />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/learning-plan/:planId" element={<LearningPlanView />} />
          <Route path="/request-learning-plan" element={<RequestLearningPlan />} />
          <Route path="/group-classes" element={<GroupClassMarketplace />} />
          <Route path="/group-classes/:classId/enroll" element={<GroupClassEnrollment />} />
          <Route path="/school/:slug" element={<SchoolLogin />} />
          <Route path="/school/:slug/admin" element={<SchoolAdminDashboard />} />
          <Route path="/school/:slug/teacher" element={<SchoolTeacherDashboard />} />
          <Route path="/school/:slug/parent" element={<SchoolParentDashboard />} />
          {/* Visitors arrive at this encoded "book-consultation" address; send them to the booking page. */}
          <Route path="/Ym9vay1jb2" element={<Navigate to="/book-consultation" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {showFooter && <SiteFooter />}
      {!isSchoolRoute && !isAdminRoute && (
        <Suspense fallback={null}>
          <WhatsAppChatButton />
        </Suspense>
      )}
    </>
  );
};

// Everything above the router. The build-time prerender (src/entry-prerender.tsx) wraps the same
// providers around a StaticRouter, so keep providers here rather than in App.
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
      },
    },
  }), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AppProviders>
);

export default App;
