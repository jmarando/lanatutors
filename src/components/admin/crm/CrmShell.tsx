import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export type CrmSection = "today" | "leads" | "lessons" | "december" | "family" | "more";

interface CrmShellProps {
  title: string;
  subtitle?: string;
  /** No longer used: the admin dashboard's menu shows where you are. */
  active?: CrmSection;
  actions?: ReactNode;
  backTo?: string;
  children: ReactNode;
}

/**
 * A CRM screen's heading and body. The screens live inside the admin dashboard (its menu has CRM, Lessons and the December
 * desk), so this is only the title, an optional back link, the screen's buttons and its content.
 */
export function CrmShell({ title, subtitle, actions, backTo, children }: CrmShellProps) {
  const location = useLocation();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
      {/* Keep the current path in a data attribute so tests can assert the route. */}
      <span className="hidden" data-crm-route={location.pathname} />
    </div>
  );
}
