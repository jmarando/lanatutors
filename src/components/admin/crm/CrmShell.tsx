import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, CalendarDays, GraduationCap, MoreHorizontal, ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDeskActive } from "@/utils/decemberDesk";
import { nairobiDate } from "./crmMeta";

export type CrmSection = "today" | "leads" | "lessons" | "december" | "family" | "more";

interface NavItem {
  key: CrmSection;
  label: string;
  to: string;
  icon: LucideIcon;
}

const BASE_NAV: NavItem[] = [
  { key: "today", label: "Today", to: "/admin", icon: Home },
  { key: "leads", label: "Leads", to: "/admin/leads", icon: Users },
  { key: "lessons", label: "Lessons", to: "/admin/lessons", icon: CalendarDays },
];
// Shown until the holiday classes are over (DECEMBER_DESK_UNTIL).
const DECEMBER_NAV: NavItem = { key: "december", label: "December", to: "/admin/december", icon: GraduationCap };
const MORE_NAV: NavItem = { key: "more", label: "More", to: "/admin/more", icon: MoreHorizontal };

interface CrmShellProps {
  title: string;
  subtitle?: string;
  active: CrmSection;
  actions?: ReactNode;
  backTo?: string;
  children: ReactNode;
}

/**
 * The CRM layout. A top bar on every width, a left rail from md up, and a bottom
 * bar on phones where the coordinators work.
 */
export function CrmShell({ title, subtitle, active, actions, backTo, children }: CrmShellProps) {
  const location = useLocation();
  const nav = isDeskActive(nairobiDate()) ? [...BASE_NAV, DECEMBER_NAV, MORE_NAV] : [...BASE_NAV, MORE_NAV];

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-background">
        <div className="flex h-14 items-center px-5 border-b">
          <Link to="/admin" className="font-semibold tracking-tight text-foreground">
            Lana CRM
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key || (active === "family" && item.key === "leads");
            return (
              <Link
                key={item.key}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
          Every lead needs a next step, a date and a person.
        </p>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            {backTo && (
              <Link
                to={backTo}
                className="-ml-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className={cn("grid", nav.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive =
              active === item.key || (active === "family" && item.key === "leads");
            return (
              <Link
                key={item.key}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Keep the current path in a data attribute so tests can assert the route. */}
      <span className="hidden" data-crm-route={location.pathname} />
    </div>
  );
}
