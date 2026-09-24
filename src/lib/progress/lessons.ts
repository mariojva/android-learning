import type { Lesson, ProgressState } from "@/lib/types";
import { ALL_LESSONS } from "@/data/lessons";
import { MODULE_MAP } from "@/data/path";

/**
 * How far through a lesson someone is.
 *
 * This lives here rather than inside LessonView because three surfaces need
 * the answer — the lesson page, the learning path and the home page's
 * Continue card — and three implementations of "how complete is this?" is
 * three chances to disagree with each other in front of the learner.
 */

/** Only these blocks are tasks. Prose is not something you can complete. */
const INTERACTIVE = new Set(["predict", "explain", "quiz", "implement"]);

/**
 * The completion id for a section that has nothing to answer. Namespaced
 * with a colon so it can never collide with a real block id.
 */
export function readMarker(sectionId: string): string {
  return `${sectionId}:read`;
}

/**
 * Recorded completions, plus the ones that can be derived.
 *
 * An `implement` block is complete when its linked question is solved —
 * read from the attempt rather than from a click, so it is right however
 * the learner got there.
 */
export function completedBlocksFor(
  progress: ProgressState,
  lesson: Lesson,
): Set<string> {
  const recorded = new Set(
    progress.lessonProgress[lesson.id]?.completedBlocks ?? [],
  );
  for (const section of lesson.sections) {
    for (const block of section.blocks) {
      if (block.kind !== "implement" || !block.questionSlug) continue;
      if (progress.attempts[block.questionSlug]?.solved) recorded.add(block.id);
    }
  }
  return recorded;
}

export interface SectionStat {
  id: string;
  total: number;
  done: number;
  duration: number;
  ratio: number;
  /** True when the section's single task is "I have read this". */
  readOnly: boolean;
}

export function sectionStatsFor(
  lesson: Lesson,
  completedBlocks: Set<string>,
): SectionStat[] {
  return lesson.sections.map((section) => {
    const tasks = section.blocks.filter((b) => INTERACTIVE.has(b.kind));
    const duration = section.endMinute - section.startMinute;

    // A section of pure exposition has nothing to answer, so it had no way
    // to ever complete — and because its ratio stayed at zero, its minutes
    // never counted either, quietly capping the whole lesson below 100%.
    // Such a section gets one task: saying you have read it.
    if (tasks.length === 0) {
      const done = completedBlocks.has(readMarker(section.id)) ? 1 : 0;
      return { id: section.id, total: 1, done, duration, ratio: done, readOnly: true };
    }

    const done = tasks.filter((b) => completedBlocks.has(b.id)).length;
    return {
      id: section.id,
      total: tasks.length,
      done,
      duration,
      ratio: done / tasks.length,
      readOnly: false,
    };
  });
}

export interface LessonCompletion {
  minutesDone: number;
  /**
   * The minutes the sections actually account for — not the lesson's
   * declared total. If the two ever drift apart, deriving from the declared
   * number silently caps the lesson below 100% with no section left to
   * complete.
   */
  minutesTotal: number;
  percent: number;
}

export function lessonCompletion(
  progress: ProgressState,
  lesson: Lesson,
): LessonCompletion {
  const stats = sectionStatsFor(lesson, completedBlocksFor(progress, lesson));
  const minutesDone = Math.round(
    stats.reduce((sum, s) => sum + s.ratio * s.duration, 0),
  );
  const minutesTotal = stats.reduce((sum, s) => sum + s.duration, 0);
  return {
    minutesDone,
    minutesTotal,
    percent: minutesTotal === 0 ? 0 : Math.round((minutesDone / minutesTotal) * 100),
  };
}

/**
 * The lesson to offer next: the first one not yet finished, or the last
 * one when everything is done. Never a hardcoded lesson — pinning the
 * Continue card to Day 1 meant it kept offering a finished lesson forever
 * once a second one existed.
 */
export function nextLesson(
  progress: ProgressState,
): { lesson: Lesson; percent: number } | null {
  if (ALL_LESSONS.length === 0) return null;
  for (const lesson of ALL_LESSONS) {
    const { percent } = lessonCompletion(progress, lesson);
    if (percent < 100) return { lesson, percent };
  }
  const last = ALL_LESSONS[ALL_LESSONS.length - 1];
  return { lesson: last, percent: 100 };
}

/** The lesson that follows this one in the registry, if one is written. */
export function lessonAfter(lesson: Lesson): Lesson | null {
  const i = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
  if (i === -1 || i + 1 >= ALL_LESSONS.length) return null;
  return ALL_LESSONS[i + 1];
}

/**
 * Where this lesson sits in its module: "Lesson 2 of 3".
 *
 * Global "Day N" numbering hid the fact that a module needs several lessons —
 * finishing Day 1 looked like finishing Kotlin Foundations, when it covered
 * half of it. The position is derived from the registry and the denominator
 * from the module's concept count, so neither can drift.
 */
export function lessonPosition(lesson: Lesson): {
  index: number;
  planned: number;
} {
  const inModule = ALL_LESSONS.filter((l) => l.moduleId === lesson.moduleId);
  const index = inModule.findIndex((l) => l.id === lesson.id) + 1;
  const planned = Math.max(
    inModule.length,
    MODULE_MAP.get(lesson.moduleId)?.plannedLessons ?? inModule.length,
  );
  return { index, planned };
}

/** "Module 02 · Lesson 1 of 2" — the one place this string is built. */
export function lessonLabel(lesson: Lesson): string {
  const { index, planned } = lessonPosition(lesson);
  const moduleIndex = MODULE_MAP.get(lesson.moduleId)?.index ?? 0;
  return `Module ${String(moduleIndex).padStart(2, "0")} · Lesson ${index} of ${planned}`;
}

/** Short form for tight spaces: "M02 · L1/2". */
export function lessonLabelShort(lesson: Lesson): string {
  const { index, planned } = lessonPosition(lesson);
  const moduleIndex = MODULE_MAP.get(lesson.moduleId)?.index ?? 0;
  return `M${String(moduleIndex).padStart(2, "0")} · L${index}/${planned}`;
}
