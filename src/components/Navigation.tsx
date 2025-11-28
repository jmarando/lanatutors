import { Button } from "@/components/ui/button";
import { Menu, LogOut, Globe, ChevronDown, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import lanaLogo from "@/assets/lana-header-logo-2025.png";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Currency } from "@/utils/currencyUtils";
import { useToast } from "@/hooks/use-toast";

const Navigation = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('KES');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      checkAdminStatus(user.id);
      fetchUserCurrency(user.id);
    } else {
      setIsAdmin(false);
    }
  }, [user?.id]);

  const fetchUserCurrency = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('id', userId)
      .single();
    
    if (data?.preferred_currency) {
      setSelectedCurrency(data.preferred_currency as Currency);
    }
  };

  const handleCurrencyChange = async (currency: Currency) => {
    setSelectedCurrency(currency);
    
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: currency })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating currency:', error);
        toast({
          title: "Error",
          description: "Failed to update currency preference",
          variant: "destructive",
        });
      } else {
        // Refresh the page to apply currency changes
        window.location.reload();
      }
    }
  };

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

  const getNavLinks = () => [
    { to: "/tutors", label: "Find Tutors", singleLine: true },
    { to: "/holiday-packages", label: "Revision Packages", singleLine: true },
    { to: user ? "/student/dashboard" : "/for-students", label: "Student Hub", singleLine: true },
    { to: "/for-tutors", label: "Tutor Hub", singleLine: true },
    { to: "/about", label: "About Us", singleLine: true },
    { to: "/blog", label: "Blog", singleLine: true },
  ];

  const navLinks = getNavLinks();

  return (
    <nav className="bg-background sticky top-0 z-50 border-0">
      <div className="max-w-7xl mx-auto px-6 py-1 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center flex-shrink-0" aria-label="Lana Tutors Home">
          <div className="overflow-hidden" style={{ clipPath: 'inset(0 0 0 2px)' }}>
            <img 
              src={lanaLogo} 
              alt="Lana Tutors - Your Trusted Tutoring Partner"
              className="block h-12 sm:h-14 md:h-16 w-auto object-contain border-0 outline-none"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          <div className="flex items-center gap-4 xl:gap-6 whitespace-nowrap">
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
          <div className="flex items-center gap-3 whitespace-nowrap">
            {user ? (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover-scale max-w-[150px]">
                      <span className="truncate text-sm">{user.email}</span>
                      <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-3 z-[100]" align="end">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Currency</label>
                        <CurrencySelector
                          value={selectedCurrency}
                          onChange={handleCurrencyChange}
                          className="w-full"
                        />
                      </div>
                      <div className="pt-2 border-t space-y-2">
                        <Link to="/student/dashboard" onClick={() => setOpen(false)}>
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            Dashboard
                          </Button>
                        </Link>
                        <Link to="/profile-settings" onClick={() => setOpen(false)}>
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            <User className="w-4 h-4 mr-2" />
                            Profile Settings
                          </Button>
                        </Link>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
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
              {user && (
                <div className="pb-4 border-b space-y-3">
                  <div className="text-xs text-muted-foreground px-2">{user.email}</div>
                  <Link to="/student/dashboard" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/profile-settings" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Button>
                  </Link>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block px-2">Currency</label>
                    <CurrencySelector
                      value={selectedCurrency}
                      onChange={handleCurrencyChange}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
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
              {user ? (
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
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
