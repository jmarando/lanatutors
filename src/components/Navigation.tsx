import { Button } from "@/components/ui/button";
import { Menu, LogOut, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import lanaLogo from "@/assets/lana-header-logo-2025.png";

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
    { to: "/tutors", label: "Find Tutors", singleLine: true },
    { to: "/holiday-packages", label: "Holiday Revision Packages", singleLine: true },
    { to: "/for-students", label: "Student Hub", singleLine: true },
    { to: "/for-tutors", label: "Tutor Hub", singleLine: true },
    { to: "/about", label: "About Us", singleLine: true },
    { to: "/blog", label: "Blog", singleLine: true },
  ];

  return (
    <nav className="bg-background sticky top-0 z-50 border-0">
      <div className="max-w-7xl mx-auto px-6 py-1 flex items-center justify-center gap-8">
        <Link to="/" className="flex items-center flex-shrink-0" aria-label="Lana Tutors Home">
          <div className="overflow-hidden">
            <img 
              src={lanaLogo} 
              alt="Lana Tutors - Your Trusted Tutoring Partner"
              className="block h-12 sm:h-14 md:h-16 w-auto object-contain border-0 outline-none -ml-[2px]"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-6 whitespace-nowrap">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap"
              >
                <span className="relative inline-block">
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </span>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap">
                <span className="relative inline-block">
                  Admin
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4 whitespace-nowrap">
            <a href="https://wa.me/254725252542?text=Hello%20Lana%20Tutors!%20I%20would%20like%20to%20inquire%20about%20your%20tutoring%20services." target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-primary/5 whitespace-nowrap">
              <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>Chat on WhatsApp</span>
            </a>
            {user ? (
              <>
                <span className="text-sm text-muted-foreground max-w-[150px] truncate">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="hover-scale whitespace-nowrap">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="hover-scale whitespace-nowrap">Sign In</Button>
                </Link>
                <Link to="/book-consultation">
                  <Button size="sm" className="hover-scale whitespace-nowrap">Get Started</Button>
                </Link>
              </>
            )}
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
    </nav>
  );
};

export default Navigation;
