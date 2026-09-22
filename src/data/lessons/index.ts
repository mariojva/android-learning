/**
 * The lesson registry — one file per lesson, one list here.
 *
 * Every consumer reads this module rather than a lesson file directly.
 * That matters more than it looks: the route that renders lessons uses
 * `generateStaticParams`, so a lesson missing from this list is a lesson
 * with no page built for it, and the failure is a 404 rather than an
 * error anyone would notice at build time.
 */
import type { Lesson, LessonSection } from "@/lib/types";
import { DAY_1 } from "./day1";
import { DAY_2 } from "./day2";

export { DAY_1 } from "./day1";
export { DAY_2 } from "./day2";

export const ALL_LESSONS: Lesson[] = [DAY_1, DAY_2];

export function getLesson(slug: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.slug === slug);
}

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
  for (const lesson of ALL_LESSONS) {
    for (const section of lesson.sections) {
      const match = section.blocks.some(
        (b) => b.kind === "implement" && b.questionSlug === slug,
      );
      if (match) return { lesson, section };
    }
  }
  return null;
}
