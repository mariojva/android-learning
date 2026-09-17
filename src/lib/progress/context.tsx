"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnswerVerdict, ProgressState, SavedAnswer } from "@/lib/types";
import { buildSeedProgress, EMPTY_PROGRESS } from "@/data/seedProgress";
import {
  LocalProgressRepository,
  readLocalProgress,
  type ProgressRepository,
} from "./repository";
import { SupabaseProgressRepository } from "./supabaseRepository";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isoDate } from "@/lib/utils";

interface RecordAttemptInput {
  solved?: boolean;
  correct?: boolean;
  passedTests?: number;
  totalTests?: number;
  runtimeMs?: number;
  code?: string;
}

export type ProgressMode = "local" | "account";
export type SyncState = "idle" | "saving" | "saved" | "error";

/** A partial update -- only the fields a given call site actually knows. */
export interface SaveAnswerInput {
  body?: string;
  verdict?: AnswerVerdict;
  feedback?: string;
}

interface ProgressContextValue {
  progress: ProgressState;
  /** Where progress is being kept right now. */
  mode: ProgressMode;
  /** False until the active store has been read. */
  hydrated: boolean;
  syncState: SyncState;
  syncError: string | null;
  /** True when this browser holds local progress that could be imported. */
  hasLocalProgress: boolean;

  recordAttempt(slug: string, input: RecordAttemptInput): void;
  toggleBookmark(ref: string, kind: "question" | "lesson"): void;
  setNote(ref: string, body: string): void;
  /** Store (or update) what the learner wrote for a free-text prompt. */
  saveAnswer(ref: string, patch: SaveAnswerInput): void;
  completeLessonBlock(lessonId: string, blockId: string): void;
  resetLesson(lessonId: string): void;
  addStudyMinutes(minutes: number): void;
  resetAll(): void;
  /** Replace the current store with the generated demo history. */
  loadDemoHistory(): void;
  /** Merge whatever this browser holds locally into the signed-in account. */
  importLocalProgress(): Promise<{ imported: number } | { error: string }>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, configured } = useAuth();

  // Signed out with no Supabase configured, the demo history is the point.
  // Anywhere an account might exist, start empty so real numbers are never
  // preceded by fictional ones.
  const [progress, setProgress] = useState<ProgressState>(() =>
    configured ? EMPTY_PROGRESS : buildSeedProgress(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasLocalProgress, setHasLocalProgress] = useState(false);

  const repository = useRef<ProgressRepository | null>(null);
  /** Guards against a save from the previous store landing in the new one. */
  const storeToken = useRef(0);

  const mode: ProgressMode = user ? "account" : "local";

  /* ------------------- pick a store and read it ------------------- */
  useEffect(() => {
    if (authLoading) return;

    const token = ++storeToken.current;
    setHydrated(false);
    setSyncError(null);

    (async () => {
      const supabase = getSupabaseClient();

      if (user && supabase) {
        const repo = new SupabaseProgressRepository(supabase, user.id);
        repository.current = repo;
        try {
          const remote = await repo.load();
          if (storeToken.current !== token) return;
          setProgress(remote ?? EMPTY_PROGRESS);
        } catch (error) {
          if (storeToken.current !== token) return;
          setSyncError(error instanceof Error ? error.message : "Could not load progress.");
          setSyncState("error");
          setProgress(EMPTY_PROGRESS);
        }
      } else {
        const repo = new LocalProgressRepository();
        repository.current = repo;
        const stored = await repo.load();
        if (storeToken.current !== token) return;
        setProgress(stored ? normalise(stored) : buildSeedProgress());
      }

      if (storeToken.current === token) setHydrated(true);
    })();
  }, [user, authLoading]);

  /* ----- note whether local data exists, for the import affordance ----- */
  useEffect(() => {
    if (!user) {
      setHasLocalProgress(false);
      return;
    }
    void readLocalProgress().then((local) => {
      setHasLocalProgress(
        Boolean(local && Object.keys(local.attempts ?? {}).length > 0),
      );
    });
  }, [user]);

  /* --------------------------- persist ---------------------------- */
  useEffect(() => {
    if (!hydrated) return;
    const repo = repository.current;
    if (!repo) return;

    const token = storeToken.current;
    const handle = setTimeout(() => {
      setSyncState("saving");
      repo
        .save(progress)
        .then(() => {
          if (storeToken.current !== token) return;
          setSyncState("saved");
          setSyncError(null);
        })
        .catch((error: unknown) => {
          if (storeToken.current !== token) return;
          setSyncState("error");
          setSyncError(
            error instanceof Error ? error.message : "Could not save progress.",
          );
        });
    }, 500);

    return () => clearTimeout(handle);
  }, [progress, hydrated]);

  /* --------------------------- actions ---------------------------- */

  const recordAttempt = useCallback((slug: string, input: RecordAttemptInput) => {
    setProgress((prev) => {
      const existing = prev.attempts[slug];
      return {
        ...prev,
        attempts: {
          ...prev.attempts,
          [slug]: {
            questionSlug: slug,
            attempts: (existing?.attempts ?? 0) + 1,
            solved: input.solved ?? existing?.solved ?? false,
            lastCorrect: input.correct ?? input.solved ?? existing?.lastCorrect,
            passedTests: input.passedTests ?? existing?.passedTests,
            totalTests: input.totalTests ?? existing?.totalTests,
            lastRuntimeMs: input.runtimeMs ?? existing?.lastRuntimeMs,
            code: input.code ?? existing?.code,
            updatedAt: isoDate(new Date()),
          },
        },
      };
    });
  }, []);

  const toggleBookmark = useCallback(
    (ref: string, kind: "question" | "lesson") => {
      setProgress((prev) => {
        const exists = prev.bookmarks.some((b) => b.ref === ref);
        return {
          ...prev,
          bookmarks: exists
            ? prev.bookmarks.filter((b) => b.ref !== ref)
            : [...prev.bookmarks, { ref, kind, createdAt: isoDate(new Date()) }],
        };
      });
    },
    [],
  );

  const setNote = useCallback((ref: string, body: string) => {
    setProgress((prev) => {
      const notes = { ...prev.notes };
      if (body.trim().length === 0) {
        delete notes[ref];
      } else {
        notes[ref] = { ref, body, updatedAt: isoDate(new Date()) };
      }
      return { ...prev, notes };
    });
  }, []);

  /**
   * Merges rather than replaces: the body is written when the learner
   * commits, and a verdict lands later when they ask to be graded. One
   * call site should not wipe the other's field.
   */
  const saveAnswer = useCallback((ref: string, patch: SaveAnswerInput) => {
    setProgress((prev) => {
      const before = prev.answers[ref];
      const next: SavedAnswer = {
        ref,
        body: patch.body ?? before?.body ?? "",
        verdict: patch.verdict ?? before?.verdict,
        feedback: patch.feedback ?? before?.feedback,
        updatedAt: isoDate(new Date()),
      };
      if (
        before &&
        before.body === next.body &&
        before.verdict === next.verdict &&
        before.feedback === next.feedback
      ) {
        return prev;
      }
      return { ...prev, answers: { ...prev.answers, [ref]: next } };
    });
  }, []);

  const completeLessonBlock = useCallback((lessonId: string, blockId: string) => {
    setProgress((prev) => {
      const entry = prev.lessonProgress[lessonId] ?? { completedBlocks: [] };
      if (entry.completedBlocks.includes(blockId)) return prev;
      return {
        ...prev,
        lessonProgress: {
          ...prev.lessonProgress,
          [lessonId]: {
            ...entry,
            completedBlocks: [...entry.completedBlocks, blockId],
          },
        },
      };
    });
  }, []);

  const resetLesson = useCallback((lessonId: string) => {
    setProgress((prev) => ({
      ...prev,
      lessonProgress: { ...prev.lessonProgress, [lessonId]: { completedBlocks: [] } },
    }));
  }, []);

  const addStudyMinutes = useCallback((minutes: number) => {
    if (minutes <= 0) return;
    setProgress((prev) => {
      const today = isoDate(new Date());
      const sessions = [...prev.sessions];
      const index = sessions.findIndex((s) => s.date === today);
      if (index >= 0) {
        sessions[index] = {
          ...sessions[index],
          minutes: sessions[index].minutes + minutes,
        };
      } else {
        sessions.push({ date: today, minutes });
      }
      return { ...prev, sessions };
    });
  }, []);

  const resetAll = useCallback(() => {
    setProgress(EMPTY_PROGRESS);
    void repository.current?.clear();
  }, []);

  const loadDemoHistory = useCallback(() => {
    setProgress(buildSeedProgress());
  }, []);

  const importLocalProgress = useCallback(async () => {
    const local = await readLocalProgress();
    if (!local) return { error: "This browser has no local progress to import." };

    let imported = 0;
    setProgress((prev) => {
      const attempts = { ...prev.attempts };
      for (const [slug, attempt] of Object.entries(local.attempts ?? {})) {
        const existing = attempts[slug];
        // The account wins on conflict — it is the record of what you did
        // while signed in.
        if (!existing) {
          attempts[slug] = attempt;
          imported += 1;
        }
      }

      const bookmarkRefs = new Set(prev.bookmarks.map((b) => b.ref));
      const bookmarks = [
        ...prev.bookmarks,
        ...(local.bookmarks ?? []).filter((b) => !bookmarkRefs.has(b.ref)),
      ];

      const notes = { ...prev.notes };
      for (const [ref, note] of Object.entries(local.notes ?? {})) {
        if (!notes[ref]) notes[ref] = note;
      }

      // Same rule as notes: the account wins, so importing never overwrites
      // an answer you wrote while signed in with an older local one.
      const answers = { ...prev.answers };
      for (const [ref, answer] of Object.entries(local.answers ?? {})) {
        if (!answers[ref]) answers[ref] = answer;
      }

      const lessonProgress = { ...prev.lessonProgress };
      for (const [id, entry] of Object.entries(local.lessonProgress ?? {})) {
        const existing = lessonProgress[id];
        lessonProgress[id] = existing
          ? {
              ...existing,
              completedBlocks: [
                ...new Set([...existing.completedBlocks, ...entry.completedBlocks]),
              ],
            }
          : entry;
      }

      const byDate = new Map(prev.sessions.map((s) => [s.date, s.minutes]));
      for (const session of local.sessions ?? []) {
        if (session.minutes <= 0) continue;
        byDate.set(session.date, Math.max(byDate.get(session.date) ?? 0, session.minutes));
      }
      const sessions = [...byDate.entries()]
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        ...prev,
        attempts,
        bookmarks,
        notes,
        answers,
        lessonProgress,
        sessions,
      };
    });

    return { imported };
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      mode,
      hydrated,
      syncState,
      syncError,
      hasLocalProgress,
      recordAttempt,
      toggleBookmark,
      setNote,
      saveAnswer,
      completeLessonBlock,
      resetLesson,
      addStudyMinutes,
      resetAll,
      loadDemoHistory,
      importLocalProgress,
    }),
    [
      progress,
      mode,
      hydrated,
      syncState,
      syncError,
      hasLocalProgress,
      recordAttempt,
      toggleBookmark,
      setNote,
      saveAnswer,
      completeLessonBlock,
      resetLesson,
      addStudyMinutes,
      resetAll,
      loadDemoHistory,
      importLocalProgress,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return context;
}

/** Tolerate partial or older stored shapes without throwing. */
function normalise(stored: Partial<ProgressState>): ProgressState {
  return {
    attempts: stored.attempts ?? {},
    bookmarks: stored.bookmarks ?? [],
    notes: stored.notes ?? {},
    answers: stored.answers ?? {},
    lessonProgress: stored.lessonProgress ?? {},
    sessions: stored.sessions ?? [],
    streak: stored.streak ?? { current: 0, longest: 0, lastActiveDate: "" },
  };
}
