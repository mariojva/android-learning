import {
  MASTERY_STAGES,
  OWNERSHIP_LEVELS,
  type Concept,
  type ConceptMastery,
  type ConceptProficiency,
  type MasteryStage,
  type OwnershipLevel,
  type ProgressState,
  type Question,
} from "@/lib/types";
import { CONCEPTS, CONCEPT_MAP } from "@/data/concepts";
import { ALL_QUESTIONS } from "@/data/questions";

/* ------------------------------------------------------------------
   Mastery, derived.

   Everything here is computed from `ProgressState`. Nothing in this file
   is stored, which is the same rule the rest of the progress layer
   follows: two copies of one fact disagree the moment one is updated
   alone.

   The point of the five stages is that they are not a percentage. A
   learner who has watched a lesson about StateFlow and a learner who can
   say why it is not SharedFlow are not 20% and 100% of the same thing —
   they can do different things, and the app should say which.
   ------------------------------------------------------------------ */

export const EMPTY_MASTERY: Omit<ConceptMastery, "conceptId"> = {
  recognise: false,
  explain: false,
  predict: false,
  implement: false,
  reason: false,
};

/**
 * Stages earned by work actually completed.
 *
 * This is the link that makes the whole model self-driving: a question
 * carries the stage it demands and the concepts it practises, so solving
 * it *is* the evidence. Nobody has to self-report, and nothing is earned
 * by opening a page.
 *
 * Stages are a ladder, so the deepest one earned fills the ones beneath
 * it. Someone who can implement a mapper can recognise and explain one;
 * pretending otherwise would draw a meter with holes in it.
 */
export function earnedStages(
  state: ProgressState,
  questions: Question[] = ALL_QUESTIONS,
): Record<string, number> {
  const deepest: Record<string, number> = {};

  for (const q of questions) {
    if (!q.stage || !q.concepts?.length) continue;
    if (!state.attempts[q.slug]?.solved) continue;

    const rung = MASTERY_STAGES.indexOf(q.stage);
    for (const conceptId of q.concepts) {
      deepest[conceptId] = Math.max(deepest[conceptId] ?? -1, rung);
    }
  }
  return deepest;
}

/**
 * What is stored, plus what has been earned. The stored record is the one
 * that carries review scheduling; the earned stages are recomputed every
 * time, so re-tagging a question corrects history instead of leaving a
 * stale claim behind.
 */
export function masteryFor(
  state: ProgressState,
  conceptId: string,
  earned?: Record<string, number>,
): ConceptMastery {
  const stored = state.conceptMastery[conceptId] ?? {
    conceptId,
    ...EMPTY_MASTERY,
  };

  const rung = (earned ?? earnedStages(state))[conceptId];
  if (rung === undefined) return stored;

  const merged: ConceptMastery = { ...stored };
  MASTERY_STAGES.forEach((stage, i) => {
    if (i <= rung) merged[stage] = true;
  });
  return merged;
}

export function stagesCleared(mastery: ConceptMastery): MasteryStage[] {
  return MASTERY_STAGES.filter((stage) => mastery[stage]);
}

/**
 * Note that `Mastered` is not simply "all five cleared". Clearing the last
 * stage the first time earns Proficient; Mastered additionally requires
 * having come back to it later and still been right. That is the whole
 * claim the word makes, and it cannot be made on the day you learned it.
 */
export function proficiencyOf(mastery: ConceptMastery): ConceptProficiency {
  const cleared = stagesCleared(mastery).length;
  if (cleared === 0) return "Not Started";
  if (cleared >= 5) return mastery.lastReviewedAt ? "Mastered" : "Proficient";
  if (cleared >= 4) return "Proficient";
  if (cleared >= 2) return "Practising";
  return "Learning";
}

export interface ConceptProgress {
  concept: Concept;
  mastery: ConceptMastery;
  proficiency: ConceptProficiency;
  cleared: MasteryStage[];
  /** The stage to aim at next, or null when every stage is cleared. */
  nextStage: MasteryStage | null;
  /** Prerequisite concepts not yet at Practising or better. */
  blockedBy: Concept[];
}

export function conceptProgress(
  state: ProgressState,
  concept: Concept,
  earned?: Record<string, number>,
): ConceptProgress {
  const map = earned ?? earnedStages(state);
  const mastery = masteryFor(state, concept.id, map);
  const cleared = stagesCleared(mastery);
  const nextStage = MASTERY_STAGES.find((s) => !mastery[s]) ?? null;

  // "Blocked" is deliberately generous: a prerequisite at Practising is
  // enough to move on. Requiring Proficient everywhere would gate the
  // whole curriculum behind its first module, which teaches nobody.
  const blockedBy = (concept.prerequisites ?? [])
    .map((id) => CONCEPT_MAP.get(id))
    .filter((c): c is Concept => Boolean(c))
    .filter((c) => {
      const p = proficiencyOf(masteryFor(state, c.id, map));
      return p === "Not Started" || p === "Learning";
    });

  return { concept, mastery, proficiency: proficiencyOf(mastery), cleared, nextStage, blockedBy };
}

export function allConceptProgress(state: ProgressState): ConceptProgress[] {
  const earned = earnedStages(state);   // once, not per concept
  return CONCEPTS.map((c) => conceptProgress(state, c, earned));
}

/**
 * In progress, and ordered so the first one is something the learner can
 * actually advance. A concept with every stage cleared but no review yet
 * is still "in progress", but it makes a poor headline for a card that
 * then has to say "next milestone: none".
 */
export function conceptsInProgress(
  state: ProgressState,
  limit = 6,
): ConceptProgress[] {
  return allConceptProgress(state)
    .filter((p) => p.proficiency !== "Not Started" && p.proficiency !== "Mastered")
    .sort((a, b) => {
      const advanceable = Number(Boolean(b.nextStage)) - Number(Boolean(a.nextStage));
      if (advanceable !== 0) return advanceable;
      return b.cleared.length - a.cleared.length;
    })
    .slice(0, limit);
}

/**
 * What the learner could sensibly start next: untouched concepts whose
 * prerequisites are far enough along. Ordered by module so the suggestion
 * follows the curriculum rather than jumping about.
 */
export function readyToStart(
  state: ProgressState,
  limit = 5,
): ConceptProgress[] {
  return allConceptProgress(state)
    .filter((p) => p.proficiency === "Not Started" && p.blockedBy.length === 0)
    .slice(0, limit);
}

/* --------------------------- Spaced review -------------------------- */

/** Widening gaps: a concept you keep getting right should ask less often. */
const REVIEW_DAYS = [1, 3, 7, 16, 35];

export function reviewIntervalDays(clearedCount: number): number {
  return REVIEW_DAYS[Math.min(clearedCount, REVIEW_DAYS.length - 1)];
}

export function conceptsDueForReview(
  state: ProgressState,
  now = new Date(),
): ConceptProgress[] {
  const today = now.toISOString().slice(0, 10);
  return allConceptProgress(state)
    .filter((p) => p.mastery.nextReviewAt && p.mastery.nextReviewAt <= today)
    .sort((a, b) =>
      (a.mastery.nextReviewAt ?? "").localeCompare(b.mastery.nextReviewAt ?? ""),
    );
}

/* ------------------------ Engineering ownership --------------------- */

export interface OwnershipProgress {
  level: OwnershipLevel;
  solved: number;
  total: number;
  /** Null when nothing is tagged at this level yet — not zero. */
  percent: number | null;
}

/**
 * Derived from work actually completed at each level. `percent` is null
 * rather than 0 when no exercise carries that tag yet, because "you have
 * done none of the four" and "there are none" are different facts and a
 * bar at 0% tells the learner the wrong one.
 */
export function ownershipProgress(
  state: ProgressState,
  questions: Question[],
): OwnershipProgress[] {
  return OWNERSHIP_LEVELS.map((level) => {
    const atLevel = questions.filter((q) => q.ownership === level);
    const solved = atLevel.filter(
      (q) => state.attempts[q.slug]?.solved,
    ).length;
    return {
      level,
      solved,
      total: atLevel.length,
      percent: atLevel.length === 0 ? null : (solved / atLevel.length) * 100,
    };
  });
}

/** The highest level with any completed work — the headline claim. */
export function currentOwnershipLevel(
  progress: OwnershipProgress[],
): OwnershipLevel | null {
  const reached = progress.filter((p) => p.solved > 0);
  return reached.length ? reached[reached.length - 1].level : null;
}

/* ----------------------------- Labels ------------------------------- */

export const STAGE_LABELS: Record<MasteryStage, string> = {
  recognise: "Recognise",
  explain: "Explain",
  predict: "Predict",
  implement: "Implement",
  reason: "Reason",
};

export const STAGE_BLURBS: Record<MasteryStage, string> = {
  recognise: "I have seen this before.",
  explain: "I can explain what it does in my own words.",
  predict: "I can read code using it and predict the behaviour.",
  implement: "I can use it correctly without copying a solution.",
  reason: "I can compare alternatives and defend the trade-offs.",
};

export const OWNERSHIP_LABELS: Record<OwnershipLevel, string> = {
  follow: "Follow",
  implement: "Implement",
  design: "Design",
  own: "Own",
  improve: "Improve",
};

export const OWNERSHIP_BLURBS: Record<OwnershipLevel, string> = {
  follow: "I can make a change when someone tells me exactly where and how.",
  implement: "I can independently implement a clearly specified feature.",
  design: "I can decide how a feature should be structured.",
  own: "I can take a scoped requirement from idea to production.",
  improve: "I can find weaknesses in existing systems and fix them safely.",
};
