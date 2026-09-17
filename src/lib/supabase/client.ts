import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------
   Supabase access point.

   Every page in this application is client-rendered, so there is nothing
   for a server-side session to do. That lets us use the plain browser
   client with localStorage-backed sessions — no cookie plumbing, no
   middleware, no SSR/client session divergence to debug.

   The anon key is public by design. What protects your rows is the
   row-level security in supabase/schema.sql, where every policy is
   `auth.uid() = user_id`.
   ------------------------------------------------------------------ */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null;
}

let client: SupabaseClient | null = null;

/**
 * Returns null when credentials are absent or when called during server
 * rendering. Callers must handle null — that is the signed-out,
 * local-storage-only mode the app runs in by default.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client) return client;

  const config = readSupabaseConfig();
  if (!config) return null;

  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Picks up the tokens Supabase appends after an email confirmation
      // or recovery link.
      detectSessionInUrl: true,
      storageKey: "android-academy-auth",
    },
  });

  return client;
}

/** Human-readable text for the auth errors that actually happen. */
export function describeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email address first — check your inbox for the link.";
  }
  if (m.includes("user already registered")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (m.includes("password should be at least")) {
    return "Password is too short — Supabase requires at least six characters.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (m.includes("new password should be different")) {
    return "That is already your password. Choose a different one.";
  }
  if (m.includes("auth session missing") || m.includes("session_not_found")) {
    return "This link has expired or has already been used. Request a new one.";
  }
  if (m.includes("token has expired") || m.includes("otp_expired")) {
    return "This reset link has expired. Request a new one.";
  }
  if (m.includes("same_password")) {
    return "That is already your password. Choose a different one.";
  }
  return message;
}
