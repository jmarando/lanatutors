import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import AboutUs from "./pages/AboutUs";
import TutorSearch from "./pages/TutorSearch";
import TutorProfile from "./pages/TutorProfile";
import Login from "./pages/Login";
import StudentSignup from "./pages/StudentSignup";
import TutorSignup from "./pages/TutorSignup";
import StudentDashboard from "./pages/StudentDashboard";
import TutorDashboard from "./pages/TutorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SeedTutors from "./pages/SeedTutors";
import BookConsultation from "./pages/BookConsultation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/tutors" element={<TutorSearch />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student-signup" element={<StudentSignup />} />
            <Route path="/tutor-signup" element={<TutorSignup />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/tutor/dashboard" element={<TutorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/seed-tutors" element={<SeedTutors />} />
            <Route path="/book-consultation" element={<BookConsultation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
