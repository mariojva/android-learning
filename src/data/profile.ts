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

/*
 * Two hours, in the shape the curriculum calls for. Retrieval comes first
 * deliberately: answering from memory before opening anything is the part
 * that moves a concept from recognised to held, and it is also the part
 * everyone skips when the plan does not name it.
 */
export const TODAY_SLOTS: DailyPlanSlot[] = [
  {
    label: "Retrieval",
    minutes: 15,
    topic: "Yesterday's concepts, no notes",
    accent: "kotlin",
    href: "/knowledge-graph",
  },
  {
    label: "Concept",
    minutes: 25,
    topic: "One idea, and why it exists",
    accent: "kotlin",
    href: "/lessons/day-1",
  },
  {
    label: "Implement",
    minutes: 35,
    topic: "Write it without copying",
    accent: "android",
    href: "/practice/dto-to-ui-model",
  },
  {
    label: "Code Reading",
    minutes: 15,
    topic: "Explain code you did not write",
    accent: "android",
    href: "/practice/topic/code-reading",
  },
  {
    label: "Interview / Reasoning",
    minutes: 30,
    topic: "Kotlin problems and follow-ups",
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
