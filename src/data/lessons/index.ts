/**
 * Every lesson, in one place. Day 1 is the only one written; as more
 * arrive they are added here, and the learning path's lesson counts
 * follow automatically rather than being claimed by hand.
 */
export { DAY_1, getLesson } from "./day1";
export { LESSONS as ALL_LESSONS } from "./day1";

import type { Lesson, LessonSection } from "@/lib/types";
import { LESSONS } from "./day1";

/**
 * Which lesson sent a learner to this question, if any.
 *
 * Derived from the content rather than from a query parameter or stored
 * state: an `implement` block names the question it links to, so the
 * relationship already exists in one direction and can simply be read in
 * the other. That means the way back is always correct — it survives a
 * refresh, a shared link, and arriving from anywhere else.
 */
export function lessonForQuestion(
  slug: string,
): { lesson: Lesson; section: LessonSection } | null {
  for (const lesson of LESSONS) {
    for (const section of lesson.sections) {
      const match = section.blocks.some(
        (b) => b.kind === "implement" && b.questionSlug === slug,
      );
      if (match) return { lesson, section };
    }
  }
  return null;
}
