import type { Difficulty, MasteryLevel, QuestionFormat } from "./types";

/** Tiny classnames joiner — no dependency needed for what we use. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function pluralise(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

export function clockLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const difficultyStyles: Record<
  Difficulty,
  { text: string; bg: string; ring: string; dot: string }
> = {
  Warmup: {
    text: "text-warmup",
    bg: "bg-warmup/10",
    ring: "ring-warmup/25",
    dot: "bg-warmup",
  },
  Easy: {
    text: "text-easy",
    bg: "bg-easy/10",
    ring: "ring-easy/25",
    dot: "bg-easy",
  },
  Medium: {
    text: "text-medium",
    bg: "bg-medium/10",
    ring: "ring-medium/25",
    dot: "bg-medium",
  },
  Hard: {
    text: "text-hard",
    bg: "bg-hard/10",
    ring: "ring-hard/25",
    dot: "bg-hard",
  },
};

export const formatLabels: Record<QuestionFormat, string> = {
  coding: "Coding",
  "code-reading": "Code Reading",
  debugging: "Debugging",
  quiz: "Quiz",
  "system-design": "System Design",
};

export const masteryOrder: MasteryLevel[] = [
  "Not Started",
  "Learning",
  "Practising",
  "Proficient",
  "Mastered",
];

export function masteryFromPercent(percent: number): MasteryLevel {
  if (percent <= 0) return "Not Started";
  if (percent < 25) return "Learning";
  if (percent < 55) return "Practising";
  if (percent < 85) return "Proficient";
  return "Mastered";
}

export const masteryStyles: Record<MasteryLevel, string> = {
  "Not Started": "text-subtle",
  Learning: "text-warmup",
  Practising: "text-info",
  Proficient: "text-accent",
  Mastered: "text-done",
};

/** Deterministic pseudo-random in [0,1) so seeded data never flickers. */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Loose comparison used by "predict the output" exercises. */
export function looseMatch(input: string, expected: string): boolean {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/["'`]/g, "")
      .replace(/[()]/g, "");
  return normalise(input) === normalise(expected);
}

/** Very small heuristic used to give written answers a self-check nudge. */
export function keywordCoverage(answer: string, keywords: string[]): string[] {
  const lower = answer.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}
