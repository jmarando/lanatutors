import { Button } from "@/components/ui/button";
import { Menu, LogOut, Globe, ChevronDown, User, Users, Package, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import lanaLogo from "@/assets/lana-header-logo-2025.png";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Currency } from "@/utils/currencyUtils";
import { useToast } from "@/hooks/use-toast";
const Navigation = () => {
  const [open, setOpen] = useState(false);
  const {
    user,
    signOut
  } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('KES');
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user?.id) {
      checkAdminStatus(user.id);
      fetchUserCurrency(user.id);
    } else {
      setIsAdmin(false);
    }
  }, [user?.id]);
  const fetchUserCurrency = async (userId: string) => {
    const {
      data
    } = await supabase.from('profiles').select('preferred_currency').eq('id', userId).single();
    if (data?.preferred_currency) {
      setSelectedCurrency(data.preferred_currency as Currency);
    }
  };
  const handleCurrencyChange = async (currency: Currency) => {
    setSelectedCurrency(currency);
    if (user) {
      const {
        error
      } = await supabase.from('profiles').update({
        preferred_currency: currency
      }).eq('id', user.id);
      if (error) {
        console.error('Error updating currency:', error);
        toast({
          title: "Error",
          description: "Failed to update currency preference",
          variant: "destructive"
        });
      } else {
        // Refresh the page to apply currency changes
        window.location.reload();
      }
    }
  };
  const checkAdminStatus = async (userId: string) => {
    const {
      data
    } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').single();
    setIsAdmin(!!data);
  };
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };
  const getNavLinks = () => [{
    to: "/",
    label: "Home",
    singleLine: true
  }, {
    to: user ? "/student/dashboard" : "/for-students",
    label: "Student Hub",
    singleLine: true
  }, {
    to: "/for-tutors",
    label: "Tutor Hub",
    singleLine: true
  }, {
    to: "/about",
    label: "About Us",
    singleLine: true
  }, {
    to: "/blog",
    label: "Blog",
    singleLine: true
  }];
  const navLinks = getNavLinks();
  return <nav className="bg-background sticky top-0 z-50 border-0">
      <div className="max-w-7xl mx-auto px-6 py-1 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center flex-shrink-0" aria-label="Lana Tutors Home">
          <div className="overflow-hidden" style={{
          clipPath: 'inset(0 0 0 2px)'
        }}>
            <img src={lanaLogo} alt="Lana Tutors - Your Trusted Tutoring Partner" className="block h-12 sm:h-14 md:h-16 w-auto border-0 outline-none object-fill" />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          <div className="flex items-center gap-4 xl:gap-6 whitespace-nowrap">
            {/* Home Link */}
            <Link to="/" className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap">
              <span className="relative inline-block">
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
            
            {/* Book a Class Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap flex items-center gap-1">
                  <span className="relative inline-block">
                    Book a Class
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/tutors" className="flex items-start gap-3 p-3 cursor-pointer">
                    <User className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">Book a Tutor</div>
                      <div className="text-xs text-muted-foreground">1-on-1 sessions</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/multi-tutor-package" className="flex items-start gap-3 p-3 cursor-pointer">
                    <Package className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">Custom Package</div>
                      <div className="text-xs text-muted-foreground">Multi-session bundles</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/request-learning-plan" className="flex items-start gap-3 p-3 cursor-pointer">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">Learning Plan</div>
                      <div className="text-xs text-muted-foreground">Get expert advice</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Other Nav Links */}
            {navLinks.slice(1).map(link => <Link key={link.to} to={link.to} className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap">
                <span className="relative inline-block">
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </span>
              </Link>)}
            
            {isAdmin && <Link to="/admin" className="group relative text-sm font-medium hover:text-primary transition-all duration-300 whitespace-nowrap">
                <span className="relative inline-block">
                  Admin
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </span>
              </Link>}
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {user ? <>
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
                        <CurrencySelector value={selectedCurrency} onChange={handleCurrencyChange} className="w-full" />
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
              </> : <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="hover-scale whitespace-nowrap">Sign In</Button>
                </Link>
                <Link to="/book-consultation">
                  <Button size="sm" className="hover-scale whitespace-nowrap">Get Started</Button>
                </Link>
              </>}
          </div>
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6 mt-8 pb-20">
              {user && <div className="pb-4 border-b space-y-3">
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
                    <CurrencySelector value={selectedCurrency} onChange={handleCurrencyChange} className="w-full" />
                  </div>
                </div>}
              
              {/* Home Link */}
              <Link to="/" onClick={() => setOpen(false)} className="text-lg font-medium hover:text-primary transition-colors px-2 py-1 hover:bg-primary/5 rounded-md">
                Home
              </Link>
              
              {/* Book a Class Mobile Section */}
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 px-2">Book a Class</div>
                <Link to="/tutors" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2 hover:bg-primary/5 rounded-md">
                  <User className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Individual Tutor</div>
                    <div className="text-xs text-muted-foreground">1-on-1 sessions</div>
                  </div>
                </Link>
                <Link to="/multi-tutor-package" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2 hover:bg-primary/5 rounded-md">
                  <Package className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Custom Package</div>
                    <div className="text-xs text-muted-foreground">Multi-session bundles</div>
                  </div>
                </Link>
                <Link to="/request-learning-plan" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2 hover:bg-primary/5 rounded-md">
                  <FileText className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Learning Plan</div>
                    <div className="text-xs text-muted-foreground">Get expert advice</div>
                  </div>
                </Link>
              </div>
              
              {/* Other Nav Links */}
              {navLinks.slice(1).map(link => <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="text-lg font-medium hover:text-primary transition-colors px-2 py-1 hover:bg-primary/5 rounded-md">
                  {link.label}
                </Link>)}
              
              {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="text-lg font-medium hover:text-primary transition-colors px-2 py-1 hover:bg-primary/5 rounded-md">
                  Admin Dashboard
                </Link>}
              {user ? <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button> : <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/book-consultation" onClick={() => setOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </>}
              </div>
            </div>
            {/* Scroll indicator gradient */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </SheetContent>
        </Sheet>
      </div>
    </nav>;
};
export default Navigation;