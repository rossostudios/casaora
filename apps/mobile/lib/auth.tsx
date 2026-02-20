import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  configError: string | null;
  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const missingConfigError =
  "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) in .env.local.";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  return getSupabaseClient();
}

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = useMemo(resolveClient, []);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsLoading(false);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      }
    );

    if (AppState.currentState === "active") {
      supabase.auth.startAutoRefresh();
    }

    return () => {
      mounted = false;
      supabase.auth.stopAutoRefresh();
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    session,
    isLoading,
    configError: supabase ? null : missingConfigError,
    signInWithPassword: async ({ email, password }) => {
      if (!supabase) return missingConfigError;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error?.message ?? null;
    },
    signOut: async () => {
      if (!supabase) return missingConfigError;
      const { error } = await supabase.auth.signOut();
      return error?.message ?? null;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
