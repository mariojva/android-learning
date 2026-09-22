import type { Question, QuestionFormat, QuestionTrack, TopicId } from "@/lib/types";
import { KOTLIN_QUESTIONS } from "./kotlin";
import { KOTLIN_ADVANCED_QUESTIONS } from "./kotlinAdvanced";
import { CONCURRENCY_QUESTIONS } from "./concurrency";
import { COMPOSE_QUESTIONS } from "./compose";
import { ANDROID_QUESTIONS } from "./android";
import { ARCHITECTURE_QUESTIONS } from "./architecture";
import { CODE_REVIEW_QUESTIONS } from "./codeReview";
import { SENIOR_QUESTIONS } from "./senior";
import { SYSTEM_DESIGN_EXTRA_QUESTIONS } from "./systemDesignExtra";
import { SYSTEM_DESIGN_QUESTIONS } from "./systemDesign";
import { DSA_QUESTIONS } from "./dsa";
import { DI_QUESTIONS } from "./di";
import { BUILD_QUESTIONS } from "./build";
import { FEATURE_QUESTIONS } from "./features";

export const ALL_QUESTIONS: Question[] = [
  ...KOTLIN_QUESTIONS,
  ...KOTLIN_ADVANCED_QUESTIONS,
  ...CONCURRENCY_QUESTIONS,
  ...COMPOSE_QUESTIONS,
  ...ANDROID_QUESTIONS,
  ...ARCHITECTURE_QUESTIONS,
  ...CODE_REVIEW_QUESTIONS,
  ...SENIOR_QUESTIONS,
  ...SYSTEM_DESIGN_QUESTIONS,
  ...SYSTEM_DESIGN_EXTRA_QUESTIONS,
  ...DI_QUESTIONS,
  ...BUILD_QUESTIONS,
  ...FEATURE_QUESTIONS,
  ...DSA_QUESTIONS,
];

export const QUESTIONS_BY_SLUG = new Map(ALL_QUESTIONS.map((q) => [q.slug, q]));

export function getQuestion(slug: string): Question | undefined {
  return QUESTIONS_BY_SLUG.get(slug);
}

export function questionsByFormat(format: QuestionFormat): Question[] {
  return ALL_QUESTIONS.filter((q) => q.format === format);
}

export function questionsByTrack(track: QuestionTrack): Question[] {
  return ALL_QUESTIONS.filter((q) => q.track === track);
}

export function questionsByTopic(topic: TopicId): Question[] {
  return ALL_QUESTIONS.filter((q) => q.topics.includes(topic));
}

/** Interview problems grouped by their pattern (relatedConcepts[0]). */
export function dsaByPattern(): { pattern: string; questions: Question[] }[] {
  const groups = new Map<string, Question[]>();
  for (const q of DSA_QUESTIONS) {
    const pattern = q.relatedConcepts?.[0] ?? "Other";
    const list = groups.get(pattern) ?? [];
    list.push(q);
    groups.set(pattern, list);
  }
  return [...groups.entries()]
    .map(([pattern, questions]) => ({ pattern, questions }))
    .sort((a, b) => a.pattern.localeCompare(b.pattern));
}

export const QUESTION_COUNTS = {
  total: ALL_QUESTIONS.length,
  coding: questionsByFormat("coding").length,
  codeReading: questionsByFormat("code-reading").length,
  codeReview: questionsByFormat("code-review").length,
  debugging: questionsByFormat("debugging").length,
  quiz: questionsByFormat("quiz").length,
  systemDesign: questionsByFormat("system-design").length,
  feature: questionsByFormat("feature").length,
};

export {
  KOTLIN_QUESTIONS,
  KOTLIN_ADVANCED_QUESTIONS,
  CONCURRENCY_QUESTIONS,
  COMPOSE_QUESTIONS,
  ANDROID_QUESTIONS,
  ARCHITECTURE_QUESTIONS,
  CODE_REVIEW_QUESTIONS,
  SENIOR_QUESTIONS,
  SYSTEM_DESIGN_QUESTIONS,
  SYSTEM_DESIGN_EXTRA_QUESTIONS,
  DSA_QUESTIONS,
};
