import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { School, SchoolMember } from "@/hooks/useSchool";
import kirawaLogo from "@/assets/kirawa-logo.png";
import { LogOut, Home, Megaphone, BookOpen, GraduationCap, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SchoolLayoutProps {
  school: School;
  member: SchoolMember;
  children: React.ReactNode;
  activeTab?: string;
}

const SchoolLayout: React.FC<SchoolLayoutProps> = ({ school, member, children, activeTab }) => {
  const navigate = useNavigate();
  const { slug } = useParams();

  const navItems = member.role === "admin" ? [
    { id: "overview", label: "Overview", icon: Home },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "events", label: "Events", icon: Calendar },
  ] : member.role === "teacher" ? [
    { id: "homework", label: "Homework", icon: BookOpen },
    { id: "results", label: "Results", icon: GraduationCap },
    { id: "students", label: "Students", icon: Users },
  ] : [
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "homework", label: "Homework", icon: BookOpen },
    { id: "reports", label: "Report Cards", icon: GraduationCap },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/school/${slug}`);
  };

  return (
    <div className="min-h-screen" style={{ "--school-primary": school.primary_color, "--school-secondary": school.secondary_color } as React.CSSProperties}>
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={kirawaLogo} alt={school.name} className="h-12 w-12 object-contain" />
            <div>
              <h1 className="font-bold text-lg" style={{ color: school.primary_color }}>{school.name}</h1>
              <p className="text-xs text-muted-foreground capitalize">{member.role} Portal — {member.full_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                const event = new CustomEvent("school-tab-change", { detail: item.id });
                window.dispatchEvent(event);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === item.id
                  ? "border-current text-[var(--school-primary)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === item.id ? { color: school.primary_color, borderColor: school.primary_color } : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default SchoolLayout;
