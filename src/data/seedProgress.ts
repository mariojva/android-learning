import type { ProgressState, QuestionAttempt, TopicId } from "@/lib/types";
import { ALL_QUESTIONS } from "./questions";
import { buildSessions, currentStreak, longestStreak } from "./activity";
import { isoDate, seededRandom } from "@/lib/utils";

/**
 * A plausible twelve weeks of history, generated deterministically so the
 * dashboard is a populated product on first run rather than an empty shell.
 *
 * Every displayed figure — mastery, accuracy, difficulty split — is derived
 * from this one structure, so nothing can disagree with anything else.
 * Clearing progress in Settings wipes it and starts from zero.
 */

/** Roughly how far through each topic the seeded learner has got. */
const TOPIC_PROGRESS: Record<TopicId, number> = {
  kotlin: 0.62,
  collections: 0.76,
  oop: 0.5,
  generics: 0.3,
  coroutines: 0.22,
  flow: 0.18,
  lifecycle: 0.35,
  viewmodel: 0.3,
  compose: 0.47,
  architecture: 0.54,
  networking: 0.25,
  room: 0.14,
  testing: 0.05,
  performance: 0.2,
  dsa: 0.4,
  // Added with the 28-module curriculum. The seeded demo learner has not
  // touched these, and pretending otherwise would make the demo lie about
  // the one thing the dashboard is for.
  execution: 0,
  "data-modelling": 0,
  sql: 0,
  repositories: 0,
  offline: 0,
  di: 0,
  dagger: 0,
  gradle: 0,
  "ci-cd": 0,
  git: 0,
  observability: 0,
  codebase: 0,
  ownership: 0,
};

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (h * 31 + slug.charCodeAt(i)) % 100000;
  }
  return h;
}

export function buildSeedProgress(today = new Date()): ProgressState {
  const attempts: Record<string, QuestionAttempt> = {};

  for (const question of ALL_QUESTIONS) {
    const rate = Math.min(
      ...question.topics.map((t) => TOPIC_PROGRESS[t] ?? 0.2),
    );
    const roll = seededRandom(hashSlug(question.slug));

    if (roll < rate) {
      const attemptCount = 1 + Math.floor(seededRandom(hashSlug(question.slug) + 7) * 3);
      const daysBack = 1 + Math.floor(seededRandom(hashSlug(question.slug) + 13) * 70);
      const d = new Date(today);
      d.setDate(d.getDate() - daysBack);

      attempts[question.slug] = {
        questionSlug: question.slug,
        attempts: attemptCount,
        solved: true,
        lastCorrect: true,
        passedTests: question.tests?.length ?? undefined,
        totalTests: question.tests?.length ?? undefined,
        lastRuntimeMs: 40 + Math.round(seededRandom(hashSlug(question.slug) + 3) * 180),
        updatedAt: isoDate(d),
      };
    } else if (roll < rate + 0.08) {
      // Attempted, not solved — these are what "weak areas" is built from.
      const d = new Date(today);
      d.setDate(d.getDate() - (1 + Math.floor(seededRandom(hashSlug(question.slug) + 21) * 21)));
      attempts[question.slug] = {
        questionSlug: question.slug,
        attempts: 1 + Math.floor(seededRandom(hashSlug(question.slug) + 31) * 2),
        solved: false,
        lastCorrect: false,
        updatedAt: isoDate(d),
      };
    }
  }

  const sessions = buildSessions(today);

  return {
    attempts,
    bookmarks: [
      { ref: "debounced-search", kind: "question", createdAt: isoDate(today) },
      { ref: "duplicate-flow-collectors", kind: "question", createdAt: isoDate(today) },
      { ref: "design-offline-first-feed", kind: "question", createdAt: isoDate(today) },
      { ref: "day-1", kind: "lesson", createdAt: isoDate(today) },
    ],
    notes: {
      "debounced-search": {
        ref: "debounced-search",
        body:
          "flatMapLatest is the staleness guard — cancelling the previous inner flow is what makes out-of-order responses impossible rather than merely unlikely. Revisit when I add retry.",
        updatedAt: isoDate(today),
      },
      "stateflow-vs-sharedflow": {
        ref: "stateflow-vs-sharedflow",
        body:
          "State survives process death, Channel events do not. For anything with real-world consequences (payments, navigation) model it as consumed state.",
        updatedAt: isoDate(today),
      },
    },
    answers: {},
    conceptMastery: {},
    lessonProgress: {},
    sessions,
    streak: {
      current: currentStreak(sessions),
      longest: longestStreak(sessions),
      lastActiveDate: isoDate(today),
    },
  };
}

export const EMPTY_PROGRESS: ProgressState = {
  attempts: {},
  bookmarks: [],
  notes: {},
  answers: {},
  conceptMastery: {},
  lessonProgress: {},
  sessions: [],
  streak: { current: 0, longest: 0, lastActiveDate: "" },
};
