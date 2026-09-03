import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  // Tracks the identity we last committed to state so that background token
  // refreshes (which fire on every tab focus) do not create new object
  // identities and cascade re-renders / refetches across the whole app.
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const apply = (newSession: Session | null) => {
      const nextId = newSession?.user?.id ?? null;
      // Only commit new objects when the signed-in user actually changes.
      // Background token refreshes fire on every tab focus; re-committing them
      // would change object identity and cascade refetches app-wide.
      if (nextId !== lastUserIdRef.current) {
        lastUserIdRef.current = nextId;
        setUser(newSession?.user ?? null);
        setSession(newSession);
      }
    };

    // 1) Attach listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      apply(newSession);
    });

    // 2) Initialize current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      apply(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(
    () => ({ user, session, initialized, signOut }),
    [user, session, initialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
