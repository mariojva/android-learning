import type { ProgressState, Question } from "@/lib/types";
import { CONCEPTS, CONCEPT_MAP } from "@/data/concepts";
import { ALL_QUESTIONS } from "@/data/questions";
import {
  allConceptProgress,
  reviewIntervalDays,
  type ConceptProgress,
} from "./mastery";
import { isoDate } from "@/lib/utils";

/* ------------------------------------------------------------------
   Spaced review.

   The scheduling machinery has existed since the mastery model was
   built — widening intervals, a next_review_at column, an index on it,
   a queue selector, a badge in the sidebar. What never existed was
   anything that called it, so nextReviewAt was never written and the
   queue was permanently empty. The dashboard has been saying "nothing
   due" since the day it was added, truthfully and uselessly.

   The fix is not to start writing schedules from today. It is to
   derive the schedule from work that already happened: a concept was
   last exercised when you last solved a question that proves it, and
   it is due that many days later. Everything already solved therefore
   enters the queue immediately, which is the difference between a
   review system you start using now and one that becomes useful in a
   fortnight.

   A completed review IS an event and cannot be derived, so that one
   fact is stored — and when present it wins, because it is more
   recent information than the attempt it supersedes.
   ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(iso: string, days: number): string {
  return isoDate(new Date(new Date(iso).getTime() + days * DAY_MS));
}

export interface DueConcept {
  progress: ConceptProgress;
  /** The date this became (or becomes) due. */
  dueOn: string;
  /** Days overdue today; 0 means due exactly now. */
  overdueDays: number;
  /** Questions that prove this concept, most-recently-solved last. */
  candidates: Question[];
}

/**
 * When a concept was last genuinely exercised — whichever is later, the
 * last question solved that proves it, or the last time it was reviewed.
 */
function lastExercised(
  state: ProgressState,
  conceptId: string,
): string | null {
  let latest: string | null =
    state.conceptMastery[conceptId]?.lastReviewedAt ?? null;

  for (const q of ALL_QUESTIONS) {
    if (!q.concepts?.includes(conceptId)) continue;
    const attempt = state.attempts[q.slug];
    if (!attempt?.solved) continue;
    const at = attempt.updatedAt.slice(0, 10);
    if (!latest || at > latest) latest = at;
  }
  return latest;
}

/**
 * The whole schedule, derived. A concept with no cleared stages and no
 * solved question has never been met and is not scheduled at all —
 * spaced repetition is for holding onto things you have learned, not
 * for introducing them.
 */
export function reviewSchedule(
  state: ProgressState,
  now = new Date(),
): DueConcept[] {
  const today = isoDate(now);
  const all = allConceptProgress(state);
  const out: DueConcept[] = [];

  for (const progress of all) {
    if (progress.cleared.length === 0) continue;

    const stored = progress.mastery.nextReviewAt;
    let dueOn: string;

    if (stored) {
      // A real review happened; its schedule is better information.
      dueOn = stored;
    } else {
      const last = lastExercised(state, progress.concept.id);
      if (!last) continue;
      // Strength starts from how much of the concept is already proven, so
      // something you can already reason about does not come back tomorrow
      // just because the system has not asked you about it before.
      const strength = Math.max(0, progress.cleared.length - 1);
      dueOn = addDays(last, reviewIntervalDays(strength));
    }

    if (dueOn > today) continue;

    out.push({
      progress,
      dueOn,
      overdueDays: Math.round(
        (new Date(today).getTime() - new Date(dueOn).getTime()) / DAY_MS,
      ),
      candidates: questionsFor(state, progress.concept.id),
    });
  }

  // Most overdue first: the thing closest to being forgotten.
  return out.sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Questions that prove a concept, ordered so the *least recently seen*
 * comes first.
 *
 * This is the part that makes a review different from a flashcard. Seeing
 * the same question again tests whether you remember that question; seeing
 * the concept in a form you have not met tests whether you hold the idea.
 * Unsolved questions come first, then the ones solved longest ago.
 */
export function questionsFor(
  state: ProgressState,
  conceptId: string,
): Question[] {
  return ALL_QUESTIONS.filter((q) => q.concepts?.includes(conceptId)).sort(
    (a, b) => {
      const aAt = state.attempts[a.slug]?.updatedAt ?? "";
      const bAt = state.attempts[b.slug]?.updatedAt ?? "";
      return aAt.localeCompare(bAt);
    },
  );
}

/**
 * The question to ask for this concept right now: the least recently seen
 * one, preferring a format different from the last one asked, so a session
 * moves between predicting, reading and debugging rather than drilling one
 * shape.
 */
export function pickQuestion(
  due: DueConcept,
  lastFormat?: string,
): Question | null {
  if (due.candidates.length === 0) return null;
  const different = due.candidates.find((q) => q.format !== lastFormat);
  return different ?? due.candidates[0];
}

/** Concepts due today, with a question chosen for each. */
export interface ReviewItem {
  conceptId: string;
  conceptName: string;
  question: Question;
  overdueDays: number;
}

export function buildSession(
  state: ProgressState,
  limit = 10,
  now = new Date(),
): ReviewItem[] {
  const due = reviewSchedule(state, now);
  const items: ReviewItem[] = [];
  let lastFormat: string | undefined;

  for (const d of due) {
    if (items.length >= limit) break;
    const question = pickQuestion(d, lastFormat);
    if (!question) continue;
    lastFormat = question.format;
    items.push({
      conceptId: d.progress.concept.id,
      conceptName: d.progress.concept.name,
      question,
      overdueDays: d.overdueDays,
    });
  }
  return items;
}

/** How many concepts are due, for badges and headlines. */
export function dueCount(state: ProgressState, now = new Date()): number {
  return reviewSchedule(state, now).length;
}

/** Concepts scheduled but not yet due, soonest first — "what's coming". */
export function upcoming(
  state: ProgressState,
  limit = 5,
  now = new Date(),
): { conceptId: string; name: string; dueOn: string }[] {
  const today = isoDate(now);
  const rows: { conceptId: string; name: string; dueOn: string }[] = [];

  for (const progress of allConceptProgress(state)) {
    if (progress.cleared.length === 0) continue;
    const stored = progress.mastery.nextReviewAt;
    let dueOn: string;
    if (stored) {
      dueOn = stored;
    } else {
      const last = lastExercised(state, progress.concept.id);
      if (!last) continue;
      dueOn = addDays(last, reviewIntervalDays(Math.max(0, progress.cleared.length - 1)));
    }
    if (dueOn <= today) continue;
    rows.push({
      conceptId: progress.concept.id,
      name: CONCEPT_MAP.get(progress.concept.id)?.name ?? progress.concept.id,
      dueOn,
    });
  }
  return rows.sort((a, b) => a.dueOn.localeCompare(b.dueOn)).slice(0, limit);
}

/** Every concept, for the "nothing due" empty state to be informative. */
export const TOTAL_CONCEPTS = CONCEPTS.length;
