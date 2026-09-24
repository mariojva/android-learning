import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Bookmark,
  Note,
  ProgressState,
  ConceptMastery,
  QuestionAttempt,
  SavedAnswer,
  StudySession,
} from "@/lib/types";
import type { ProgressRepository } from "./repository";
import { EMPTY_PROGRESS } from "@/data/seedProgress";
import { currentStreak, longestStreak } from "@/data/activity";
import { isoDate } from "@/lib/utils";

/* ------------------------------------------------------------------
   Supabase-backed persistence.

   The interface is whole-state (load / save / clear) because that is what
   keeps the UI simple. The implementation is not: it keeps the last
   persisted snapshot and writes only what changed, so a keystroke in a
   notes field does not re-upload a hundred attempt rows.
   ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

export class SupabaseProgressRepository implements ProgressRepository {
  readonly name = "supabase";

  /** The last state we know the database holds, used to compute diffs. */
  private lastSaved: ProgressState | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  /* ------------------------------ load ----------------------------- */

  async load(): Promise<ProgressState | null> {
    const uid = this.userId;

    const [attempts, bookmarks, notes, answers, mastery, lessons, sessions] =
      await Promise.all([
      this.supabase
        .from("question_attempts")
        .select(
          "question_slug, attempts, solved, last_correct, passed_tests, total_tests, last_runtime_ms, code, updated_at",
        )
        .eq("user_id", uid),
      this.supabase.from("bookmarks").select("ref, kind, created_at").eq("user_id", uid),
      this.supabase.from("notes").select("ref, body, updated_at").eq("user_id", uid),
      this.supabase
        .from("answers")
        .select("ref, body, verdict, feedback, updated_at")
        .eq("user_id", uid),
      this.supabase
        .from("concept_mastery")
        .select(
          "concept_id, recognise, explain, predict, implement, reason, last_reviewed_at, next_review_at",
        )
        .eq("user_id", uid),
      this.supabase
        .from("lesson_progress")
        .select("lesson_id, completed_blocks, completed_at, updated_at")
        .eq("user_id", uid),
      this.supabase
        .from("study_sessions")
        .select("day, minutes")
        .eq("user_id", uid)
        .order("day", { ascending: true }),
    ]);

    const firstError =
      attempts.error ?? bookmarks.error ?? notes.error ?? lessons.error ?? sessions.error;
    if (firstError) {
      // Surfacing this beats silently falling back to an empty account and
      // letting the next save overwrite real rows with nothing.
      throw new Error(`Could not load progress: ${firstError.message}`);
    }

    const state: ProgressState = {
      attempts: {},
      bookmarks: [],
      notes: {},
      answers: {},
      conceptMastery: {},
      lessonProgress: {},
      sessions: [],
      streak: { current: 0, longest: 0, lastActiveDate: "" },
    };

    for (const row of (attempts.data ?? []) as Row[]) {
      const slug = row.question_slug as string;
      state.attempts[slug] = {
        questionSlug: slug,
        attempts: (row.attempts as number) ?? 1,
        solved: Boolean(row.solved),
        lastCorrect: (row.last_correct as boolean | null) ?? undefined,
        passedTests: (row.passed_tests as number | null) ?? undefined,
        totalTests: (row.total_tests as number | null) ?? undefined,
        lastRuntimeMs: (row.last_runtime_ms as number | null) ?? undefined,
        code: (row.code as string | null) ?? undefined,
        updatedAt: toISODate(row.updated_at),
      };
    }

    state.bookmarks = ((bookmarks.data ?? []) as Row[]).map((row) => ({
      ref: row.ref as string,
      kind: row.kind as Bookmark["kind"],
      createdAt: toISODate(row.created_at),
    }));

    for (const row of (notes.data ?? []) as Row[]) {
      const ref = row.ref as string;
      state.notes[ref] = {
        ref,
        body: (row.body as string) ?? "",
        updatedAt: toISODate(row.updated_at),
      };
    }

    // Deliberately not fatal. `answers` arrived after the original schema, so
    // a project that has not run the migration yet is missing the table --
    // and losing every attempt, note and streak over a feature the account
    // has never used would be a terrible trade. Saved answers simply stay
    // empty until the table exists.
    if (answers.error) {
      console.warn(
        `Saved answers unavailable (${answers.error.message}). ` +
          "Run supabase/migrations/001_answers.sql to enable them.",
      );
    }

    for (const row of (answers.data ?? []) as Row[]) {
      const ref = row.ref as string;
      state.answers[ref] = {
        ref,
        body: (row.body as string) ?? "",
        verdict: (row.verdict as SavedAnswer["verdict"] | null) ?? undefined,
        feedback: (row.feedback as string | null) ?? undefined,
        updatedAt: toISODate(row.updated_at),
      };
    }

    if (mastery.error) {
      console.warn(
        `Concept mastery unavailable (${mastery.error.message}). ` +
          "Run supabase/migrations/002_concept_mastery.sql to enable it.",
      );
    }

    for (const row of (mastery.data ?? []) as Row[]) {
      const id = row.concept_id as string;
      state.conceptMastery[id] = {
        conceptId: id,
        recognise: Boolean(row.recognise),
        explain: Boolean(row.explain),
        predict: Boolean(row.predict),
        implement: Boolean(row.implement),
        reason: Boolean(row.reason),
        lastReviewedAt: (row.last_reviewed_at as string | null) ?? undefined,
        nextReviewAt: (row.next_review_at as string | null) ?? undefined,
      };
    }

    for (const row of (lessons.data ?? []) as Row[]) {
      state.lessonProgress[row.lesson_id as string] = {
        completedBlocks: ((row.completed_blocks as string[] | null) ?? []).slice(),
        completedAt: (row.completed_at as string | null) ?? undefined,
        lastActiveAt: row.updated_at ? toISODate(row.updated_at) : undefined,
      };
    }

    state.sessions = ((sessions.data ?? []) as Row[]).map((row) => ({
      date: toISODate(row.day),
      minutes: (row.minutes as number) ?? 0,
    }));

    state.streak = {
      current: currentStreak(state.sessions),
      longest: longestStreak(state.sessions),
      lastActiveDate: state.sessions.at(-1)?.date ?? "",
    };

    this.lastSaved = clone(state);
    return state;
  }

  /* ------------------------------ save ----------------------------- */

  async save(state: ProgressState): Promise<void> {
    const uid = this.userId;
    const previous = this.lastSaved;
    // The Supabase query builder is PromiseLike, not Promise (its .then()
    // return type doesn't carry .catch/.finally/Symbol.toStringTag), so the
    // array has to be typed to match what .then() actually returns.
    // Promise.all() is happy to await PromiseLike values either way.
    const writes: PromiseLike<unknown>[] = [];

    /* --- attempts --- */
    const attemptRows: Row[] = [];
    for (const [slug, attempt] of Object.entries(state.attempts)) {
      if (!previous || !sameAttempt(previous.attempts[slug], attempt)) {
        attemptRows.push(attemptToRow(uid, attempt));
      }
    }
    if (attemptRows.length > 0) {
      writes.push(
        this.supabase
          .from("question_attempts")
          .upsert(attemptRows, { onConflict: "user_id,question_slug" })
          .then(throwOnError("question_attempts")),
      );
    }
    const removedAttempts = previous
      ? Object.keys(previous.attempts).filter((slug) => !state.attempts[slug])
      : [];
    if (removedAttempts.length > 0) {
      writes.push(
        this.supabase
          .from("question_attempts")
          .delete()
          .eq("user_id", uid)
          .in("question_slug", removedAttempts)
          .then(throwOnError("question_attempts delete")),
      );
    }

    /* --- bookmarks --- */
    const previousRefs = new Set((previous?.bookmarks ?? []).map((b) => b.ref));
    const currentRefs = new Set(state.bookmarks.map((b) => b.ref));
    const addedBookmarks = state.bookmarks.filter((b) => !previousRefs.has(b.ref));
    const removedBookmarks = [...previousRefs].filter((ref) => !currentRefs.has(ref));

    if (addedBookmarks.length > 0) {
      writes.push(
        this.supabase
          .from("bookmarks")
          .upsert(
            addedBookmarks.map((b) => ({
              user_id: uid,
              ref: b.ref,
              kind: b.kind,
              created_at: new Date(b.createdAt).toISOString(),
            })),
            { onConflict: "user_id,ref" },
          )
          .then(throwOnError("bookmarks")),
      );
    }
    if (removedBookmarks.length > 0) {
      writes.push(
        this.supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", uid)
          .in("ref", removedBookmarks)
          .then(throwOnError("bookmarks delete")),
      );
    }

    /* --- notes --- */
    const noteRows: Row[] = [];
    for (const [ref, note] of Object.entries(state.notes)) {
      const before = previous?.notes[ref];
      if (!before || before.body !== note.body) {
        noteRows.push({
          user_id: uid,
          ref,
          body: note.body,
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (noteRows.length > 0) {
      writes.push(
        this.supabase
          .from("notes")
          .upsert(noteRows, { onConflict: "user_id,ref" })
          .then(throwOnError("notes")),
      );
    }
    const removedNotes = previous
      ? Object.keys(previous.notes).filter((ref) => !state.notes[ref])
      : [];
    if (removedNotes.length > 0) {
      writes.push(
        this.supabase
          .from("notes")
          .delete()
          .eq("user_id", uid)
          .in("ref", removedNotes)
          .then(throwOnError("notes delete")),
      );
    }

    /* --- answers --- */
    const answerRows: Row[] = [];
    for (const [ref, answer] of Object.entries(state.answers)) {
      const before = previous?.answers[ref];
      if (
        !before ||
        before.body !== answer.body ||
        before.verdict !== answer.verdict ||
        before.feedback !== answer.feedback
      ) {
        answerRows.push({
          user_id: uid,
          ref,
          body: answer.body,
          verdict: answer.verdict ?? null,
          feedback: answer.feedback ?? null,
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (answerRows.length > 0) {
      writes.push(
        this.supabase
          .from("answers")
          .upsert(answerRows, { onConflict: "user_id,ref" })
          .then(throwOnError("answers")),
      );
    }
    const removedAnswers = previous
      ? Object.keys(previous.answers).filter((ref) => !state.answers[ref])
      : [];
    if (removedAnswers.length > 0) {
      writes.push(
        this.supabase
          .from("answers")
          .delete()
          .eq("user_id", uid)
          .in("ref", removedAnswers)
          .then(throwOnError("answers delete")),
      );
    }

    /* --- concept mastery --- */
    const masteryRows: Row[] = [];
    for (const [id, m] of Object.entries(state.conceptMastery)) {
      const before = previous?.conceptMastery[id];
      if (!before || !sameMastery(before, m)) {
        masteryRows.push({
          user_id: uid,
          concept_id: id,
          recognise: m.recognise,
          explain: m.explain,
          predict: m.predict,
          implement: m.implement,
          reason: m.reason,
          last_reviewed_at: m.lastReviewedAt ?? null,
          next_review_at: m.nextReviewAt ?? null,
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (masteryRows.length > 0) {
      writes.push(
        this.supabase
          .from("concept_mastery")
          .upsert(masteryRows, { onConflict: "user_id,concept_id" })
          .then(throwOnError("concept_mastery")),
      );
    }

    /* --- lesson progress --- */
    const lessonRows: Row[] = [];
    for (const [lessonId, entry] of Object.entries(state.lessonProgress)) {
      const before = previous?.lessonProgress[lessonId];
      if (
        !before ||
        before.completedBlocks.join("|") !== entry.completedBlocks.join("|")
      ) {
        lessonRows.push({
          user_id: uid,
          lesson_id: lessonId,
          completed_blocks: entry.completedBlocks,
          completed_at: entry.completedAt ?? null,
          // Carries the last-worked date back on the next load, so lesson
          // work still counts toward the streak on another device.
          updated_at: entry.lastActiveAt
            ? new Date(entry.lastActiveAt).toISOString()
            : new Date().toISOString(),
        });
      }
    }
    if (lessonRows.length > 0) {
      writes.push(
        this.supabase
          .from("lesson_progress")
          .upsert(lessonRows, { onConflict: "user_id,lesson_id" })
          .then(throwOnError("lesson_progress")),
      );
    }

    /* --- study sessions: only days with time on them --- */
    const previousMinutes = new Map(
      (previous?.sessions ?? []).map((s) => [s.date, s.minutes]),
    );
    const sessionRows: Row[] = [];
    const zeroedDays: string[] = [];

    for (const session of state.sessions) {
      const before = previousMinutes.get(session.date);
      if (before === session.minutes) continue;
      if (session.minutes > 0) {
        sessionRows.push({
          user_id: uid,
          day: session.date,
          minutes: session.minutes,
        });
      } else if (before !== undefined && before > 0) {
        zeroedDays.push(session.date);
      }
    }

    if (sessionRows.length > 0) {
      writes.push(
        this.supabase
          .from("study_sessions")
          .upsert(sessionRows, { onConflict: "user_id,day" })
          .then(throwOnError("study_sessions")),
      );
    }
    if (zeroedDays.length > 0) {
      writes.push(
        this.supabase
          .from("study_sessions")
          .delete()
          .eq("user_id", uid)
          .in("day", zeroedDays)
          .then(throwOnError("study_sessions delete")),
      );
    }

    /* --- streak: derived, stored so the dashboard need not read a year --- */
    const streak = {
      current: currentStreak(state.sessions),
      longest: longestStreak(state.sessions),
      lastActiveDate:
        [...state.sessions].reverse().find((s) => s.minutes > 0)?.date ?? "",
    };
    const previousStreak = previous?.streak;
    if (
      !previousStreak ||
      previousStreak.current !== streak.current ||
      previousStreak.longest !== streak.longest ||
      previousStreak.lastActiveDate !== streak.lastActiveDate
    ) {
      writes.push(
        this.supabase
          .from("streaks")
          .upsert(
            {
              user_id: uid,
              current_streak: streak.current,
              longest_streak: streak.longest,
              last_active_date: streak.lastActiveDate || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          )
          .then(throwOnError("streaks")),
      );
    }

    if (writes.length === 0) return;

    await Promise.all(writes);
    this.lastSaved = clone({ ...state, streak });
  }

  /* ----------------------------- clear ----------------------------- */

  async clear(): Promise<void> {
    const uid = this.userId;
    const tables = [
      "question_attempts",
      "bookmarks",
      "notes",
      "answers",
      "concept_mastery",
      "lesson_progress",
      "study_sessions",
      "streaks",
    ];
    await Promise.all(
      tables.map((table) =>
        this.supabase.from(table).delete().eq("user_id", uid).then(throwOnError(table)),
      ),
    );
    this.lastSaved = clone(EMPTY_PROGRESS);
  }
}

/* ----------------------------- helpers ----------------------------- */

function attemptToRow(userId: string, attempt: QuestionAttempt): Row {
  return {
    user_id: userId,
    question_slug: attempt.questionSlug,
    attempts: attempt.attempts,
    solved: attempt.solved,
    last_correct: attempt.lastCorrect ?? null,
    passed_tests: attempt.passedTests ?? null,
    total_tests: attempt.totalTests ?? null,
    last_runtime_ms: attempt.lastRuntimeMs ?? null,
    code: attempt.code ?? null,
    updated_at: new Date().toISOString(),
  };
}

function sameAttempt(
  a: QuestionAttempt | undefined,
  b: QuestionAttempt,
): boolean {
  if (!a) return false;
  return (
    a.attempts === b.attempts &&
    a.solved === b.solved &&
    a.lastCorrect === b.lastCorrect &&
    a.passedTests === b.passedTests &&
    a.totalTests === b.totalTests &&
    a.code === b.code
  );
}

function sameMastery(a: ConceptMastery, b: ConceptMastery): boolean {
  return (
    a.recognise === b.recognise &&
    a.explain === b.explain &&
    a.predict === b.predict &&
    a.implement === b.implement &&
    a.reason === b.reason &&
    a.lastReviewedAt === b.lastReviewedAt &&
    a.nextReviewAt === b.nextReviewAt
  );
}

/** Supabase returns dates as ISO timestamps or `YYYY-MM-DD`; we want the day. */
function toISODate(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return isoDate(new Date());
  return value.slice(0, 10);
}

function throwOnError(label: string) {
  return (result: { error: { message: string } | null }) => {
    if (result.error) {
      throw new Error(`${label}: ${result.error.message}`);
    }
    return result;
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Exported for the sign-in migration path in the progress context. */
export type { StudySession, Note, Bookmark };
