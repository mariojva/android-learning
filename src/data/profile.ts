import type { DailyPlan, DailyPlanSlot, UserProfile } from "@/lib/types";

export const USER: UserProfile = {
  id: "local-user",
  displayName: "Mario",
  handle: "mario",
  role: "Android Engineer",
  goal: "Senior Android — Kotlin depth, architecture, interview readiness",
  dailyTargetMinutes: 120,
  joinedAt: "2026-06-02",
};

export const TODAY_SLOTS: DailyPlanSlot[] = [
  {
    label: "Kotlin",
    minutes: 45,
    topic: "Collections & transformations",
    accent: "kotlin",
    href: "/lessons/day-1",
  },
  {
    label: "Android",
    minutes: 45,
    topic: "UI state & data flow",
    accent: "android",
    href: "/practice/dto-to-ui-model",
  },
  {
    label: "Interview Prep",
    minutes: 30,
    topic: "Hashing — arrays & sets",
    accent: "interview",
    href: "/practice/contains-duplicate",
  },
];

export function todayPlan(completedMinutes: number): DailyPlan {
  return {
    date: new Date().toISOString().slice(0, 10),
    targetMinutes: USER.dailyTargetMinutes,
    completedMinutes,
    slots: TODAY_SLOTS,
  };
}

/** Where "Continue learning" points, and what it says. */
export const CONTINUE = {
  moduleTitle: "Kotlin Foundations",
  moduleId: "m01",
  dayLabel: "Day 1 — Collections & Transformations",
  href: "/lessons/day-1",
  progressPercent: 0,
  minutes: 120,
};
