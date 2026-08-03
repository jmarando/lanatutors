import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "student" | "tutor" | "admin";

interface RequireRoleProps {
  roles: AppRole[];
  children: React.ReactNode;
}

/**
 * Route guard. Verifies the signed-in user holds one of the allowed roles by
 * asking the database (has_role security-definer function), so the check is not
 * based on any client-held claim. Data itself remains protected by RLS.
 */
const RequireRole = ({ roles, children }: RequireRoleProps) => {
  const { user, initialized } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!user) {
        if (active) setAllowed(false);
        return;
      }

      const results = await Promise.all(
        roles.map((role) =>
          supabase.rpc("has_role", { _user_id: user.id, _role: role })
        )
      );

      if (active) {
        setAllowed(results.some((r) => r.data === true));
      }
    };

    if (initialized) {
      setAllowed(null);
      check();
    }

    return () => {
      active = false;
    };
  }, [user, initialized, roles.join(",")]);

  if (!initialized || (user && allowed === null)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
