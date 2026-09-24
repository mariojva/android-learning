import type { ProgressState, StudySession } from "@/lib/types";
import { isoDate } from "@/lib/utils";

/* ------------------------------------------------------------------
   What counts as a day worked.

   The streak used to read one thing only: `progress.sessions`, which is
   written by `addStudyMinutes` — and the single caller of that was a
   "Log 15 minutes" button tucked into the lesson sidebar. So three days
   of real work showed a streak of zero, because nobody thinks to press a
   button to tell an app what it just watched them do.

   The rule now, as Mario set it:

     a day counts if an hour or more was logged that day,
     OR if anything was completed that day.

   And crucially it is *derived*. Every completion already carries a
   timestamp — attempts, saved answers, and now lesson blocks — so the
   history is reconstructed from work that actually happened rather than
   from a button being pressed. Days already worked light up retroactively.
   ------------------------------------------------------------------ */

/** An hour of logged time is a day on its own, even with nothing finished. */
export const HOUR_MINUTES = 60;

export interface ActiveDay {
  date: string;
  /** Minutes explicitly logged or measured on that day. */
  minutes: number;
  /** Things finished that day: questions solved, answers saved, blocks done. */
  completions: number;
  /** Why this day counted — shown in the UI so the rule is never a mystery. */
  reason: "hour-logged" | "completed-work" | "both";
}

function bump(
  map: Map<string, { minutes: number; completions: number }>,
  date: string,
  field: "minutes" | "completions",
  by: number,
) {
  if (!date) return;
  const day = date.slice(0, 10);
  const row = map.get(day) ?? { minutes: 0, completions: 0 };
  row[field] += by;
  map.set(day, row);
}

/**
 * Every day with evidence of work on it, oldest first.
 *
 * Counts, per day: questions attempted, answers written, lessons worked on,
 * and minutes logged. A day qualifies on either limb of the rule.
 */
export function activeDays(state: ProgressState): ActiveDay[] {
  const map = new Map<string, { minutes: number; completions: number }>();

  for (const session of state.sessions) {
    bump(map, session.date, "minutes", session.minutes);
  }

  // An attempt is work whether or not it was solved — getting something
  // wrong and coming back tomorrow is the study habit, not a failure to
  // record.
  for (const attempt of Object.values(state.attempts)) {
    bump(map, attempt.updatedAt, "completions", 1);
  }

  for (const answer of Object.values(state.answers ?? {})) {
    bump(map, answer.updatedAt, "completions", 1);
  }

  for (const entry of Object.values(state.lessonProgress)) {
    const day = entry.lastActiveAt ?? entry.completedAt;
    if (day) bump(map, day, "completions", 1);
  }

  const out: ActiveDay[] = [];
  for (const [date, row] of map) {
    const hour = row.minutes >= HOUR_MINUTES;
    const finished = row.completions > 0;
    if (!hour && !finished) continue;
    out.push({
      date,
      minutes: row.minutes,
      completions: row.completions,
      reason: hour && finished ? "both" : hour ? "hour-logged" : "completed-work",
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** The active days as a set, for the calendar walks below. */
function activeSet(state: ProgressState): Set<string> {
  return new Set(activeDays(state).map((d) => d.date));
}

function shift(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Days in an unbroken run ending today — or yesterday, so that a streak is
 * not reported as broken at one minute past midnight before you have had a
 * chance to work.
 */
export function currentStreak(state: ProgressState, today = new Date()): number {
  const active = activeSet(state);
  const workedToday = active.has(isoDate(today));

  let streak = 0;
  let cursor = workedToday ? today : shift(today, -1);

  for (let i = 0; i < 366; i += 1) {
    if (!active.has(isoDate(cursor))) break;
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

export function longestStreak(state: ProgressState): number {
  const days = activeDays(state).map((d) => d.date);
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const previous = isoDate(shift(new Date(days[i]), -1));
    run = previous === days[i - 1] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * The heatmap wants a session-shaped row per active day. A day that counted
 * on completions alone still needs a non-zero value, or it renders as a gap
 * on the very calendar meant to show it happened.
 */
export function sessionsFromActivity(state: ProgressState): StudySession[] {
  return activeDays(state).map((d) => ({
    date: d.date,
    minutes: d.minutes > 0 ? d.minutes : estimateMinutes(d.completions),
  }));
}

/**
 * A rough stand-in for time on a day that logged none, so the heatmap has
 * something to shade. Deliberately conservative and clearly an estimate —
 * it is never added to a total presented as measured time.
 */
function estimateMinutes(completions: number): number {
  return Math.min(120, Math.max(10, completions * 8));
}

export function minutesLogged(state: ProgressState): number {
  return state.sessions.reduce((n, s) => n + s.minutes, 0);
}

export function activeDayCount(state: ProgressState): number {
  return activeDays(state).length;
}
