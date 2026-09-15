import type { StudySession } from "@/lib/types";
import { isoDate, seededRandom } from "@/lib/utils";

/**
 * Study history.
 *
 * Two shapes flow through here. The seeded demo history is dense — a row
 * for every one of 365 days, most of them zero. A real account is sparse —
 * only days you actually studied exist as rows. Every function below works
 * on either, because all of them key on the date rather than on the index.
 * That distinction is what stops a three-day-old account from rendering a
 * three-cell heatmap.
 */

const DAYS = 364;

/* ------------------------- Date arithmetic ------------------------- */

function parseISO(iso: string): Date {
  // Local midnight, so day boundaries match what the user sees.
  return new Date(`${iso}T00:00:00`);
}

function shiftDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function toMap(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.date, (map.get(s.date) ?? 0) + s.minutes);
  }
  return map;
}

/* --------------------------- Seeded demo --------------------------- */

function buildHistory(): number[] {
  const minutes: number[] = [];

  for (let i = 0; i <= DAYS; i += 1) {
    const rest = seededRandom(i * 7 + 3) < 0.26;
    if (rest) {
      minutes.push(0);
      continue;
    }
    const base = 35 + Math.round(seededRandom(i * 13 + 11) * 70);
    const ramp = Math.round((i / DAYS) * 35);
    minutes.push(Math.min(150, base + ramp));
  }

  // A deliberate 21-day run — the longest streak.
  minutes[199] = 0;
  for (let i = 200; i <= 220; i += 1) {
    if (minutes[i] === 0) minutes[i] = 45 + Math.round(seededRandom(i * 5) * 60);
  }
  minutes[221] = 0;

  // The current 12-day streak, ending today.
  minutes[DAYS - 12] = 0;
  for (let i = DAYS - 11; i <= DAYS; i += 1) {
    if (minutes[i] === 0) minutes[i] = 50 + Math.round(seededRandom(i * 9) * 55);
  }

  // This week totals 9h 42m, ending with today part-finished at 37 minutes.
  const thisWeek = [88, 102, 76, 120, 64, 95, 37];
  thisWeek.forEach((value, offset) => {
    minutes[DAYS - 6 + offset] = value;
  });

  // Guarantee no accidental run exceeds the intended longest streak.
  let runStart = -1;
  for (let i = 0; i <= DAYS + 1; i += 1) {
    const active = i <= DAYS && minutes[i] > 0;
    if (active && runStart === -1) runStart = i;
    if (!active && runStart !== -1) {
      const length = i - runStart;
      const isIntendedRun = runStart === 200 || runStart === DAYS - 11;
      if (length > 21 && !isIntendedRun) {
        minutes[runStart + Math.floor(length / 2)] = 0;
      }
      runStart = -1;
    }
  }

  return minutes;
}

const HISTORY = buildHistory();

/** The seeded demo history, relative to a supplied "today". */
export function buildSessions(today: Date): StudySession[] {
  return HISTORY.map((mins, i) => ({
    date: isoDate(shiftDays(today, -(DAYS - i))),
    minutes: mins,
  }));
}

/* ---------------------------- Selectors ---------------------------- */

/**
 * Expand a possibly-sparse list into a row per day for the last `days`,
 * oldest first. The heatmap needs a full grid whether the account is one
 * day old or a year old.
 */
export function densifySessions(
  sessions: StudySession[],
  days = 365,
  today = new Date(),
): StudySession[] {
  const map = toMap(sessions);
  const out: StudySession[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = isoDate(shiftDays(today, -i));
    out.push({ date, minutes: map.get(date) ?? 0 });
  }
  return out;
}

/**
 * Consecutive active days ending today — or ending yesterday if today has
 * not been studied yet. A streak should not appear broken at breakfast.
 */
export function currentStreak(
  sessions: StudySession[],
  today = new Date(),
): number {
  const map = toMap(sessions);
  const studiedToday = (map.get(isoDate(today)) ?? 0) > 0;

  let streak = 0;
  let cursor = studiedToday ? today : shiftDays(today, -1);

  // A year is a sane upper bound; nobody needs a longer walk than that.
  for (let i = 0; i < 366; i += 1) {
    if ((map.get(isoDate(cursor)) ?? 0) > 0) {
      streak += 1;
      cursor = shiftDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(sessions: StudySession[]): number {
  const active = sessions
    .filter((s) => s.minutes > 0)
    .map((s) => s.date)
    .sort();

  let best = 0;
  let run = 0;
  let previous: Date | null = null;

  for (const iso of active) {
    const day = parseISO(iso);
    if (
      previous &&
      isoDate(shiftDays(previous, 1)) === iso
    ) {
      run += 1;
    } else if (previous && isoDate(previous) === iso) {
      continue; // duplicate date — already counted
    } else {
      run = 1;
    }
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

export function minutesThisWeek(
  sessions: StudySession[],
  today = new Date(),
): number {
  const map = toMap(sessions);
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    total += map.get(isoDate(shiftDays(today, -i))) ?? 0;
  }
  return total;
}

export function minutesToday(
  sessions: StudySession[],
  today = new Date(),
): number {
  return toMap(sessions).get(isoDate(today)) ?? 0;
}

export function totalMinutes(sessions: StudySession[]): number {
  return sessions.reduce((sum, s) => sum + s.minutes, 0);
}

export function activeDayCount(sessions: StudySession[]): number {
  return sessions.filter((s) => s.minutes > 0).length;
}
