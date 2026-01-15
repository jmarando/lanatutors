import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  BookMarked, 
  Star, 
  Sparkles, 
  UserCog, 
  ClipboardList,
  MessageSquare,
  Edit,
  UserPlus,
  CalendarClock,
  BarChart3,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    pendingApplications: number;
    interviewRecords: number;
    pendingTutors: number;
    pendingReviews: number;
    consultationBookings: number;
    tutoringBookings: number;
    unassignedIntensiveClasses: number;
  };
}

export function AdminSidebar({ activeTab, onTabChange, counts }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuGroups = [
    {
      label: "Overview",
      items: [
        { 
          id: "dashboard", 
          label: "Dashboard", 
          icon: LayoutDashboard 
        },
      ],
    },
    {
      label: "Tutor Management",
      items: [
        { 
          id: "applications", 
          label: "Applications", 
          icon: FileText, 
          badge: counts.pendingApplications,
          badgeVariant: "destructive" as const
        },
        { 
          id: "interviews", 
          label: "Interviews", 
          icon: CalendarCheck, 
          badge: counts.interviewRecords 
        },
        { 
          id: "profiles", 
          label: "Profile Approvals", 
          icon: UserPlus, 
          badge: counts.pendingTutors,
          badgeVariant: "secondary" as const
        },
        { 
          id: "edit-tutors", 
          label: "Manage Tutors", 
          icon: UserCog 
        },
        { 
          id: "tutor-signups", 
          label: "Tutor Signup", 
          icon: GraduationCap 
        },
      ],
    },
    {
      label: "Parents & Students",
      items: [
        { 
          id: "consultations", 
          label: "Consultations", 
          icon: MessageSquare, 
          badge: counts.consultationBookings,
          badgeVariant: "default" as const,
          badgeClass: "bg-teal-600"
        },
        { 
          id: "student-hub", 
          label: "Student Hub", 
          icon: Users 
        },
        { 
          id: "learning-plan-requests", 
          label: "Plan Requests", 
          icon: ClipboardList 
        },
      ],
    },
    {
      label: "Tutoring",
      items: [
        { 
          id: "class-management", 
          label: "Class Management", 
          icon: CalendarClock,
        },
        { 
          id: "bookings", 
          label: "All Sessions", 
          icon: BookMarked, 
          badge: counts.tutoringBookings,
          badgeVariant: "default" as const,
          badgeClass: "bg-indigo-600"
        },
        { 
          id: "learning-plans", 
          label: "Create Plans", 
          icon: Edit 
        },
        { 
          id: "sent-learning-plans", 
          label: "Sent Plans", 
          icon: Send 
        },
      ],
    },
    {
      label: "Programs",
      items: [
        { 
          id: "december-bootcamp", 
          label: "Bootcamp Admin", 
          icon: Sparkles, 
          badge: counts.unassignedIntensiveClasses,
          badgeVariant: "default" as const,
          badgeClass: "bg-orange-600"
        },
        { 
          id: "bootcamp-enrollments", 
          label: "Bootcamp Students", 
          icon: Sparkles 
        },
      ],
    },
    {
      label: "Content & Reviews",
      items: [
        { 
          id: "blog", 
          label: "Blog Posts", 
          icon: FileText 
        },
        { 
          id: "reviews", 
          label: "Review Moderation", 
          icon: Star, 
          badge: counts.pendingReviews 
        },
      ],
    },
    {
      label: "Analytics",
      items: [
        { 
          id: "reports", 
          label: "Reports", 
          icon: BarChart3 
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r bg-background">
      <SidebarHeader className="border-b px-4 py-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">L</span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-semibold text-sm">Lana Admin</p>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-2 bg-background">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      tooltip={item.label}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge 
                              variant={item.badgeVariant || "default"} 
                              className={`ml-auto rounded-full h-5 min-w-5 px-1.5 text-xs ${item.badgeClass || ""}`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="border-t px-4 py-3 bg-background">
        {!isCollapsed && (
          <p className="text-xs text-muted-foreground">
            © 2024 Lana Tutors
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
