"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  describeAuthError,
} from "@/lib/supabase/client";
import { absoluteUrl } from "@/lib/basePath";

export interface AccountProfile {
  id: string;
  displayName: string;
  handle: string | null;
  role: string | null;
  goal: string | null;
  dailyTargetMinutes: number;
}

interface AuthContextValue {
  /** Null until the initial session check completes. */
  user: User | null;
  session: Session | null;
  profile: AccountProfile | null;
  /** True until the first session check resolves — do not redirect before this. */
  loading: boolean;
  /** False when NEXT_PUBLIC_SUPABASE_* are absent; the app stays local-only. */
  configured: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(
    email: string,
    password: string,
  ): Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<AccountProfile>): Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [configured]);

  const user = session?.user ?? null;

  /* The profile row is created by a trigger on sign-up. We read it here,
     and self-heal by inserting one if an older account predates the
     trigger. */
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, handle, role, goal, daily_target_minutes")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setProfile({
          id: data.id as string,
          displayName: (data.display_name as string) ?? fallbackName(user.email),
          handle: (data.handle as string | null) ?? null,
          role: (data.role as string | null) ?? null,
          goal: (data.goal as string | null) ?? null,
          dailyTargetMinutes: (data.daily_target_minutes as number) ?? 120,
        });
        return;
      }

      const seeded = {
        id: user.id,
        display_name: fallbackName(user.email),
        daily_target_minutes: 120,
      };
      await supabase.from("profiles").upsert(seeded);
      if (cancelled) return;
      setProfile({
        id: user.id,
        displayName: seeded.display_name,
        handle: null,
        role: null,
        goal: null,
        dailyTargetMinutes: 120,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: describeAuthError(error.message) } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase is not configured." };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Must include the base path: on a GitHub project page the app is
        // mounted at /<repo>/, and origin alone would land on a 404.
        emailRedirectTo:
          typeof window !== "undefined" ? absoluteUrl("/auth/") : undefined,
      },
    });

    if (error) return { error: describeAuthError(error.message) };

    // With email confirmation on, Supabase returns a user but no session.
    const needsConfirmation = Boolean(data.user) && !data.session;
    return { needsConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<AccountProfile>) => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) return { error: "Not signed in." };

      const row: Record<string, unknown> = { id: user.id };
      if (patch.displayName !== undefined) row.display_name = patch.displayName;
      if (patch.handle !== undefined) row.handle = patch.handle;
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.goal !== undefined) row.goal = patch.goal;
      if (patch.dailyTargetMinutes !== undefined) {
        row.daily_target_minutes = patch.dailyTargetMinutes;
      }

      const { error } = await supabase.from("profiles").upsert(row);
      if (error) return { error: error.message };

      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
      return {};
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      configured,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [user, session, profile, loading, configured, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

function fallbackName(email: string | undefined): string {
  if (!email) return "Engineer";
  const local = email.split("@")[0] ?? "Engineer";
  return local.charAt(0).toUpperCase() + local.slice(1);
}
