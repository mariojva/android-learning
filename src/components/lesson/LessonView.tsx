"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
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

/**
 * The completion id for a section that has nothing to answer. Namespaced
 * with a colon so it can never collide with a real block id.
 */
function readMarker(sectionId: string): string {
  return `${sectionId}:read`;
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { progress, completeLessonBlock, resetLesson, toggleBookmark, addStudyMinutes } =
    useProgress();

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
  const completedBlocks = useMemo(() => {
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
  }, [progress.lessonProgress, progress.attempts, lesson]);

  const bookmarked = progress.bookmarks.some((b) => b.ref === lesson.slug);

  /** Interactive blocks are what "progress" means — prose is not a task. */
  const interactiveKinds = new Set(["predict", "explain", "quiz", "implement"]);

  const sectionStats = useMemo(
    () =>
      lesson.sections.map((section) => {
        const tasks = section.blocks.filter((b) => interactiveKinds.has(b.kind));
        // A section of pure exposition has nothing to answer, so it had no
        // way to ever complete — and because its ratio stayed at zero, its
        // minutes never counted either, quietly capping the whole lesson
        // below 100%. Such a section gets one task: saying you have read it.
        if (tasks.length === 0) {
          const done = completedBlocks.has(readMarker(section.id)) ? 1 : 0;
          return {
            id: section.id,
            total: 1,
            done,
            duration: section.endMinute - section.startMinute,
            ratio: done,
            readOnly: true,
          };
        }
        const done = tasks.filter((b) => completedBlocks.has(b.id)).length;
        return {
          id: section.id,
          total: tasks.length,
          done,
          duration: section.endMinute - section.startMinute,
          ratio: done / tasks.length,
          readOnly: false,
        };
      }),
    [lesson.sections, completedBlocks],
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
                <span className="text-accent">Day {lesson.dayNumber}</span>
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
            <div className="mono-label mb-2.5 text-accent">{lesson.subtitle}</div>
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
          {lesson.concepts.map((c) => (
            <span
              key={c}
              className="mono-meta rounded-md border border-line bg-surface px-2 py-1 text-muted"
            >
              {c}
            </span>
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

            <div className="mt-5 border-t border-line pt-4">
              <Button
                tone="ghost"
                size="sm"
                className="w-full"
                onClick={() => addStudyMinutes(15)}
              >
                <IconClock size={13} />
                Log 15 minutes
              </Button>
            </div>
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
                  {section.blocks.map((block) => (
                    <div key={block.id} className="animate-fade-up">
                      <LessonBlockView
                        block={block}
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
                  {percent >= 100 ? `Day ${lesson.dayNumber} complete` : `${formatMinutes(minutesDone)} of ${formatMinutes(minutesTotal)} done`}
                </h3>
                <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
                  {percent >= 100
                    ? "Tomorrow: sealed hierarchies in depth, and the first ViewModel. In the meantime, the review queue will bring today's collections work back in about three weeks."
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
