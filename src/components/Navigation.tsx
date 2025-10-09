import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Award className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold">ElimuConnect</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/tutors" className="text-sm font-medium hover:text-primary transition-colors">
            Find Tutors
          </Link>
          <Link to="/#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            How It Works
          </Link>
          <Link to="/#about" className="text-sm font-medium hover:text-primary transition-colors">
            About Us
          </Link>
          <Link to="/student/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
            Student Dashboard
          </Link>
          <Link to="/tutor/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
            Tutor Dashboard
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
