import type { ProgressState } from "@/lib/types";

/* ------------------------------------------------------------------
   Persistence boundary.

   Everything the UI knows about saving progress is this interface.
   Two implementations exist: localStorage (signed out — the seeded demo)
   and Supabase (signed in — your account). The provider picks one from
   the auth state; no component knows which is in use.
   ------------------------------------------------------------------ */

export interface ProgressRepository {
  readonly name: string;
  load(): Promise<ProgressState | null>;
  save(state: ProgressState): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEY = "android-academy:progress:v1";

export class LocalProgressRepository implements ProgressRepository {
  readonly name = "local";

  async load(): Promise<ProgressState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ProgressState;
    } catch {
      return null;
    }
  }

  async save(state: ProgressState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — progress simply is not durable here */
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing useful to do */
    }
  }
}

/** Reads whatever this browser has stored, without making it the active store. */
export async function readLocalProgress(): Promise<ProgressState | null> {
  return new LocalProgressRepository().load();
}
