"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { Lesson, LessonBlock } from "@/lib/types";
import { LessonBlockView } from "./blocks";
import { Card, Button, ProgressBar, Badge } from "@/components/ui/primitives";
import {
  IconCheck,
  IconClock,
  IconBookmark,
  IconRefresh,
  IconArrowRight,
  IconChevronLeft,
  IconSpark,
} from "@/components/icons";
import { cn, clockLabel, formatMinutes } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";
import { useTimeOnTask } from "@/lib/progress/useTimeOnTask";
import { CONCEPT_MAP } from "@/data/concepts";
import {
  completedBlocksFor,
  sectionStatsFor,
  readMarker,
  lessonAfter,
  lessonLabel,
  lessonLabelShort,
} from "@/lib/progress/lessons";

/**
 * The closest `code` block at or above this one in the same section.
 *
 * A question about a snippet is nearly always a separate block from the
 * snippet, so the AI grader was judging answers about code it had never
 * seen — which is why it could tell a learner they were off track without
 * being able to say that they had misread line two.
 */
function nearestCode(blocks: LessonBlock[], index: number): string | undefined {
  for (let i = index; i >= 0; i -= 1) {
    const b = blocks[i];
    if (b.kind === "code" && b.code?.code) return b.code.code;
  }
  return undefined;
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { progress, completeLessonBlock, resetLesson, toggleBookmark } =
    useProgress();

  // Time is measured while the lesson is open rather than self-reported.
  useTimeOnTask();

  /**
   * Recorded completions, plus the ones that can be derived.
   *
   * An `implement` block used to mark itself done when its link was
   * clicked, which meant opening the editor counted as finishing the
   * challenge — and, if the click's save was lost, finishing it counted
   * as nothing. Reading it from the question's own attempt settles both
   * directions: the block is done when the question is solved, whenever
   * and however that happened.
   */
  const completedBlocks = useMemo(
    () => completedBlocksFor(progress, lesson),
    [progress, lesson],
  );

  const next = lessonAfter(lesson);

  const bookmarked = progress.bookmarks.some((b) => b.ref === lesson.slug);

  const sectionStats = useMemo(
    () => sectionStatsFor(lesson, completedBlocks),
    [lesson, completedBlocks],
  );

  const minutesDone = Math.round(
    sectionStats.reduce((sum, s) => sum + s.ratio * s.duration, 0),
  );
  // The denominator is the minutes the sections actually account for, not the
  // lesson's declared total. If the two ever drift apart — a section edited,
  // a total left stale — deriving from the declared number silently caps the
  // lesson below 100% with no section left to complete, which is precisely
  // the failure this progress bar is supposed to make visible.
  const minutesTotal = sectionStats.reduce((sum, s) => sum + s.duration, 0);
  const percent =
    minutesTotal === 0 ? 0 : Math.round((minutesDone / minutesTotal) * 100);

  const [activeSection, setActiveSection] = useState(lesson.sections[0]?.id ?? "");

  // Highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );

    lesson.sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [lesson.sections]);

  const handleComplete = useCallback(
    (blockId: string) => {
      completeLessonBlock(lesson.id, blockId);
    },
    [completeLessonBlock, lesson.id],
  );

  return (
    <div className="space-y-6">
      {/* ------------------------ Sticky header ------------------------ */}
      <div className="sticky top-14 z-10 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-9 lg:px-9">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="mono-meta flex items-center justify-between text-subtle">
              <span className="truncate">
                <span className="text-accent">{lessonLabelShort(lesson)}</span>
                <span className="mx-2 text-faint">·</span>
                <span className="text-fg-dim">{lesson.title}</span>
              </span>
              <span className="ml-4 shrink-0 font-mono text-fg">
                {minutesDone}{" "}
                <span className="text-subtle">/ {minutesTotal} minutes</span>
              </span>
            </div>
            <ProgressBar value={percent} height={4} className="mt-2" />
          </div>
        </div>
      </div>

      {/* --------------------------- Header --------------------------- */}
      <header>
        <Link
          href="/learn/paths"
          className="mono-meta inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-fg-dim"
        >
          <IconChevronLeft size={13} />
          Android Engineer Path
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mono-label mb-2.5 text-accent">{lessonLabel(lesson)}</div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg sm:text-[30px]">
              {lesson.title}
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
              <span className="text-fg-dim">Today&rsquo;s goal: </span>
              {lesson.goal}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              tone="secondary"
              size="sm"
              onClick={() => toggleBookmark(lesson.slug, "lesson")}
            >
              <IconBookmark
                size={13}
                fill={bookmarked ? "currentColor" : "none"}
                className={bookmarked ? "text-accent" : undefined}
              />
              {bookmarked ? "Saved" : "Save"}
            </Button>
            <Button tone="ghost" size="sm" onClick={() => resetLesson(lesson.id)}>
              <IconRefresh size={13} />
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {/* Ids in the data, names on screen — one vocabulary, rendered. */}
          {lesson.concepts.map((c) => (
            <Link
              key={c}
              href={`/knowledge-graph#${c}`}
              className="mono-meta rounded-md border border-line bg-surface px-2 py-1 text-muted transition-colors hover:border-line-strong hover:text-accent"
            >
              {CONCEPT_MAP.get(c)?.name ?? c}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[196px_minmax(0,1fr)]">
        {/* -------------------------- Timeline ------------------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-36">
            <div className="mono-label mb-3 text-subtle">Timeline</div>
            <ol className="space-y-0.5">
              {lesson.sections.map((section, i) => {
                const stat = sectionStats[i];
                const active = activeSection === section.id;
                const done = stat.total > 0 && stat.done === stat.total;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cn(
                        "group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                        active ? "bg-surface-2" : "hover:bg-surface/70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors",
                          done
                            ? "bg-done/15 text-done ring-done/30"
                            : active
                              ? "bg-accent/15 text-accent ring-accent/30"
                              : "bg-surface-2 text-faint ring-line-strong",
                        )}
                      >
                        {done ? (
                          <IconCheck size={9} />
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-current" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-[12.5px]",
                            active ? "text-fg" : "text-muted",
                          )}
                        >
                          {section.title}
                        </span>
                        <span className="mono-label block text-faint">
                          {clockLabel(section.startMinute)}–
                          {clockLabel(section.endMinute)}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>

          </div>
        </aside>

        {/* -------------------------- Sections ------------------------- */}
        <div className="min-w-0 space-y-14">
          {lesson.sections.map((section, si) => {
            const stat = sectionStats[si];
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-40 space-y-6"
              >
                <div className="border-b border-line pb-4">
                  <div className="mono-label mb-2.5 flex flex-wrap items-center gap-3 text-subtle">
                    <span className="text-accent">
                      {clockLabel(section.startMinute)}–{clockLabel(section.endMinute)}
                    </span>
                    <span className="text-faint">
                      {section.endMinute - section.startMinute} min
                    </span>
                    {stat.total > 0 ? (
                      <span className="text-faint">
                        {stat.done}/{stat.total} tasks
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-[19px] font-semibold tracking-tight text-fg">
                    {section.title}
                  </h2>
                  <p className="mt-1 text-[13.5px] text-muted">{section.kicker}</p>
                </div>

                <div className="space-y-6">
                  {section.blocks.map((block, bi) => (
                    <div key={block.id} className="animate-fade-up">
                      <LessonBlockView
                        block={block}
                        // The code the question is about usually sits in an
                        // earlier block, so the grader never saw it and could
                        // not tell a learner they had misread the snippet.
                        codeContext={nearestCode(section.blocks, bi)}
                        lessonId={lesson.id}
                        completed={completedBlocks.has(block.id)}
                        onComplete={() => handleComplete(block.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Nothing to answer here, so completion has to be claimed
                    rather than earned. Explicit beats auto-marking on scroll:
                    the learner says they have read it. */}
                {stat.readOnly ? (
                  <div className="border-t border-line pt-4">
                    {stat.done ? (
                      <Badge tone="done">
                        <IconCheck size={10} />
                        Marked as read
                      </Badge>
                    ) : (
                      <Button
                        tone="secondary"
                        size="sm"
                        onClick={() => handleComplete(readMarker(section.id))}
                      >
                        <IconCheck size={13} />
                        Mark this section as read
                      </Button>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}

          {/* --------------------------- Finish -------------------------- */}
          <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-accent">
                <IconSpark size={18} />
              </span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-fg">
                  {percent >= 100 ? `${lesson.title} complete` : `${formatMinutes(minutesDone)} of ${formatMinutes(minutesTotal)} done`}
                </h3>
                <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
                  {/* This used to be a fixed sentence about sealed
                      hierarchies and "today's collections work" — Day 1's
                      content, shown at the end of every lesson. Now it names
                      whatever actually comes next, or says so when nothing
                      does. */}
                  {percent >= 100
                    ? next
                      ? `Next: ${lessonLabel(next)} — ${next.title}. In the meantime, the review queue will bring today's work back before you have forgotten it.`
                      : "That is the last lesson written so far. The review queue will bring today's work back before you have forgotten it, and Practice has the full exercise bank in the meantime."
                    : "Finish the remaining tasks, or come back tomorrow — the plan assumes two focused hours, not two heroic ones."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {percent >= 100 ? <Badge tone="done">
                <IconCheck size={10} />
                Complete
              </Badge> : null}
              <Link
                href="/practice"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-2 px-3.5 text-[13px] text-fg-dim ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-3 hover:text-fg"
              >
                Practice more
                <IconArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
