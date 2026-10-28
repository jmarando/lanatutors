import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserBootstrap } from "@/utils/ensureUserBootstrap";

const safePath = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

/**
 * Public landing route for social sign-in (full-page redirect flow).
 * The OAuth broker returns tokens in the URL, so we exchange them for a
 * Supabase session here before sending the user on to their destination.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const pick = (key: string) => hash.get(key) || query.get(key);

      const oauthError = pick("error_description") || pick("error");
      const access_token = pick("access_token");
      const refresh_token = pick("refresh_token");

      if (oauthError) {
        setError(oauthError);
        return;
      }

      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        // Strip tokens from the URL
        window.history.replaceState({}, "", "/auth/callback");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      await ensureUserBootstrap(user);

      const intended = safePath(localStorage.getItem("lana_post_auth_redirect"));
      localStorage.removeItem("lana_post_auth_redirect");
      if (intended) {
        navigate(intended, { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("must_reset_password")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.must_reset_password) {
        navigate("/force-password-change", { replace: true });
        return;
      }

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (roleRows || []).map((r) => r.role as string);

      if (roles.includes("admin")) navigate("/admin", { replace: true });
      else if (roles.includes("tutor")) navigate("/tutor/dashboard", { replace: true });
      else navigate("/student/dashboard", { replace: true });
    };

    run().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {error ? (
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Sign-in failed</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <a href="/login" className="text-primary hover:underline text-sm">
            Back to log in
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Finishing sign-in...
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
