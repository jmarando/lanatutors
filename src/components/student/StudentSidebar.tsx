import { Home, BookOpen, GraduationCap, TrendingUp, MessageSquare, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "My Classes", path: "classes", icon: Calendar },
  { title: "Classrooms", path: "classrooms", icon: GraduationCap },
  { title: "Progress", path: "progress", icon: TrendingUp },
  { title: "Messages", path: "messages", icon: MessageSquare },
];

export function StudentSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.hash.replace("#", "") || "overview";

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "opacity-0" : ""}>
            Student Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={`#${item.path}`}
                        className={`hover:bg-muted/50 ${
                          isActive ? "bg-muted text-primary font-medium" : ""
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
