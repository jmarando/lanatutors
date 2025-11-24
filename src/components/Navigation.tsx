import { Button } from "@/components/ui/button";
import { Menu, LogOut, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import lanaLogo from "@/assets/lana-logo-main.png";

const Navigation = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      checkAdminStatus(user.id);
    } else {
      setIsAdmin(false);
    }
  }, [user?.id]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    setIsAdmin(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  const navLinks = [
    { to: "/", label: "Home", singleLine: true },
    { to: "/tutors", label: "Find Tutors", singleLine: true },
    { to: "/holiday-packages", label: "Holiday Packages", singleLine: true },
    { to: "/for-students", label: "Student Hub", singleLine: true },
    { to: "/for-tutors", label: "Tutor Hub", singleLine: true },
    { to: "/about", label: "About Us", singleLine: true },
    { to: "/blog", label: "Blog", singleLine: true },
  ];

  return (
    <nav className="bg-background sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Lana Tutors Home">
            <img 
              src={lanaLogo} 
              alt="Lana Tutors - Your Trusted Tutoring Partner"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group relative text-sm font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  <span className="relative inline-block">
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="group relative text-sm font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  <span className="relative inline-block">
                    Admin
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground max-w-[140px] truncate">{user.email}</span>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="whitespace-nowrap">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="whitespace-nowrap">Sign In</Button>
                  </Link>
                  <Link to="/book-consultation">
                    <Button size="sm" className="whitespace-nowrap">Get Started</Button>
                  </Link>
                </>
              )}
              <a 
                href="https://wa.me/254725252542?text=Hello%20Lana%20Tutors!%20I%20would%20like%20to%20inquire%20about%20your%20tutoring%20services." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-md hover:bg-primary/5 whitespace-nowrap"
                aria-label="Chat on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden xl:inline">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors px-2 py-1 hover:bg-primary/5 rounded-md"
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="text-lg font-medium hover:text-primary transition-colors px-2 py-1 hover:bg-primary/5 rounded-md">
                    Admin Dashboard
                  </Link>
                )}
                <a href="https://wa.me/254725252542?text=Hello%20Lana%20Tutors!%20I%20would%20like%20to%20inquire%20about%20your%20tutoring%20services." target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-lg font-medium hover:text-primary transition-colors px-2 py-2 hover:bg-primary/5 rounded-md">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat on WhatsApp</span>
                </a>
                {user ? (
                  <>
                    <span className="text-sm text-muted-foreground px-2">{user.email}</span>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">Sign In</Button>
                    </Link>
                    <Link to="/book-consultation" onClick={() => setOpen(false)}>
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
