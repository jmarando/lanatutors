import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // 1) Attach listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Check for forced password reset
      if (newSession?.user) {
        setTimeout(() => {
          checkPasswordReset(newSession.user.id);
        }, 0);
      }
    });

    // 2) Initialize current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitialized(true);
      
      // Check for forced password reset on init
      if (session?.user) {
        setTimeout(() => {
          checkPasswordReset(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPasswordReset = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_reset_password")
      .eq("id", userId)
      .single();

    if (profile?.must_reset_password && window.location.pathname !== "/force-password-change") {
      window.location.href = "/force-password-change";
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, initialized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
