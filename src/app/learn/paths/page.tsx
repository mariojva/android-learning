"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader, Card, ProgressBar, DifficultyPill, Badge } from "@/components/ui/primitives";
import { ANDROID_ENGINEER_PATH } from "@/data/path";
import { useProgress } from "@/lib/progress/context";
import { moduleProgress } from "@/lib/progress/selectors";
import { ALL_LESSONS } from "@/data/lessons";
import { lessonCompletion } from "@/lib/progress/lessons";
import { topicLabel } from "@/data/topics";
import type { Difficulty } from "@/lib/types";
import {
  IconLock,
  IconCheck,
  IconArrowRight,
  IconClock,
  IconBook,
  IconTarget,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export default function LearningPathPage() {
  const { progress } = useProgress();
  const path = ANDROID_ENGINEER_PATH;

  const modules = useMemo(
    () =>
      path.modules.map((module, i) => {
        const p = moduleProgress(progress, module.topics);
        // A module is lessons *and* exercises. The bar below only ever
        // counted exercises, so finishing an entire 120-minute lesson moved
        // nothing on this page — the one place you go to see how far through
        // the course you are.
        const lesson = ALL_LESSONS.find((l) => l.moduleId === module.id) ?? null;
        const lessonPercent = lesson
          ? lessonCompletion(progress, lesson).percent
          : null;
        return { module, p, lesson, lessonPercent, index: i };
      }),
    [path.modules, progress],
  );

  // A module unlocks when the one before it is at least half done. A module
  // with no exercises yet is not a gate — it has nothing to be half done of,
  // so it passes the walk through rather than stopping it.
  const unlockedUpTo = useMemo(() => {
    let last = 1;
    for (let i = 0; i < modules.length; i += 1) {
      const percent = modules[i].p.percent;
      if (percent === null || percent >= 50) last = i + 2;
      else break;
    }
    return Math.max(last, 2);
  }, [modules]);

  // Empty modules are excluded from the average for the same reason: counting
  // them as 0% would report the course as less complete the more placeholder
  // modules the curriculum has.
  const overall = useMemo(() => {
    const scored = modules.filter((m) => m.p.percent !== null);
    if (scored.length === 0) return 0;
    return Math.round(
      scored.reduce((sum, m) => sum + (m.p.percent ?? 0), 0) / scored.length,
    );
  }, [modules]);

  return (
    <div>
      <PageHeader
        kicker="Learning path"
        title={path.title}
        subtitle={path.summary}
        right={
          <Card className="px-5 py-4">
            <div className="mono-label mb-2 text-subtle">Overall</div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[22px] font-semibold text-accent">
                {overall}%
              </span>
              <ProgressBar value={overall} className="w-28" />
            </div>
          </Card>
        }
      />

      <ol className="space-y-3">
        {modules.map(({ module, p, lesson, lessonPercent, index }) => {
          // A module with a lesson written for it is never locked. The
          // lesson is the designed way in, and the unlock rule walks the
          // modules in curriculum order — which stopped matching reality
          // the moment a lesson was written out of order. Day 2 belongs to
          // m04, so under the old rule it sat behind an m01 exercise bar
          // with no button on the card at all, and the only links near it
          // went to the practice list.
          const hasLesson = lesson !== null;
          const locked = !hasLesson && index + 1 > unlockedUpTo && p.percent === 0;
          const complete = p.percent !== null && p.percent >= 100;

          return (
            <li key={module.id} className="relative pl-7 sm:pl-9">
              {/* Spine */}
              <span
                className={cn(
                  "absolute left-[9px] top-8 h-[calc(100%-8px)] w-px sm:left-[13px]",
                  complete ? "bg-done/40" : "bg-line",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "absolute left-0 top-6 flex h-[19px] w-[19px] items-center justify-center rounded-full ring-2 sm:left-1",
                  complete
                    ? "bg-done/15 text-done ring-done/30"
                    : (p.percent ?? 0) > 0
                      ? "bg-accent/15 text-accent ring-accent/30"
                      : "bg-surface-2 text-faint ring-line-strong",
                )}
                aria-hidden
              >
                {complete ? (
                  <IconCheck size={11} />
                ) : locked ? (
                  <IconLock size={10} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <ModuleCard
                index={module.index}
                title={module.title}
                summary={module.summary}
                difficulty={module.difficulty}
                lessons={module.lessonCount}
                exercises={module.exerciseCount}
                hours={module.estimatedHours}
                topics={module.topics.map(topicLabel)}
                percent={p.percent}
                solved={p.solved}
                total={p.total}
                outcomes={module.outcomes}
                locked={locked}
                lessonTitle={lesson ? `Day ${lesson.dayNumber} · ${lesson.title}` : null}
                lessonPercent={lessonPercent}
                href={
                  // Derived, not hardcoded: a module with a lesson opens the
                  // lesson, everything else opens its exercises. Pinning
                  // "m01" here meant every lesson written after Day 1 would
                  // be unreachable from the path with nothing to show for it.
                  lesson
                    ? `/lessons/${lesson.slug}`
                    : `/practice?topic=${module.topics[0]}`
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ModuleCard({
  index,
  title,
  summary,
  difficulty,
  lessons,
  exercises,
  hours,
  topics,
  percent,
  solved,
  total,
  outcomes,
  locked,
  href,
  lessonTitle,
  lessonPercent,
}: {
  index: number;
  title: string;
  summary: string;
  difficulty: Difficulty;
  lessons: number;
  exercises: number;
  hours: number;
  topics: string[];
  percent: number | null;
  solved: number;
  total: number;
  outcomes: string[];
  locked: boolean;
  href: string;
  lessonTitle: string | null;
  lessonPercent: number | null;
}) {
  // No exercises mapped to this module yet. Saying so is the honest render;
  // a 0% bar reads as "you have done none of it" when the truth is that
  // there is none of it to do.
  const empty = percent === null;
  return (
    <Card
      interactive={!locked}
      className={cn("p-5", locked && "opacity-55")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mono-label mb-2 text-faint">
            Module {String(index).padStart(2, "0")}
          </div>
          <h3 className="text-[16px] font-semibold tracking-tight text-fg">
            {title}
          </h3>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DifficultyPill difficulty={difficulty} />
          {locked ? (
            <Badge>
              <IconLock size={10} />
              Locked
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mono-meta mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <IconBook size={12} />
          {lessons === 0
            ? "No lesson yet"
            : `${lessons} lesson${lessons === 1 ? "" : "s"}`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconTarget size={12} />
          {exercises} exercises
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconClock size={12} />~{hours}h
        </span>
        <span className="text-faint">{topics.slice(0, 3).join(" · ")}</span>
      </div>

      {lessonTitle !== null && lessonPercent !== null ? (
        <div className="mt-4 rounded-lg border border-line bg-surface-2/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="mono-label truncate text-accent">{lessonTitle}</span>
            <span className="mono-meta shrink-0 text-subtle">
              {lessonPercent}%
            </span>
          </div>
          {/* Lessons and exercises are separate kinds of work and are shown
              separately. Blending them into one number would need a weighting
              nobody could defend — two honest figures beat one invented one. */}
          <ProgressBar value={lessonPercent} tone="accent" />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        {empty ? (
          <>
            <Badge tone="neutral">Exercises coming</Badge>
            <span className="mono-meta flex-1 text-faint">
              Nothing mapped to this module yet — it does not hold up the
              modules after it.
            </span>
          </>
        ) : (
          <>
            <ProgressBar value={percent ?? 0} className="flex-1" />
            <span className="mono-meta shrink-0 text-subtle">
              {solved}/{total}
            </span>
            {!locked ? (
              <Link
                href={href}
                className="mono-meta inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-fg-dim transition-colors hover:border-line-strong hover:text-accent"
              >
                {/* A module with a lesson opens the lesson; one without
                    opens its exercises. Labelling both "Start" made the
                    second look like the first had broken. */}
                {lessonPercent !== null
                  ? lessonPercent >= 100
                    ? "Review lesson"
                    : lessonPercent > 0
                      ? "Continue lesson"
                      : "Start lesson"
                  : (percent ?? 0) > 0
                    ? "Keep practising"
                    : "Practise"}
                <IconArrowRight size={12} />
              </Link>
            ) : null}
          </>
        )}
      </div>

      {outcomes.length > 0 && !locked ? (
        <details className="mt-4 border-t border-line pt-3">
          <summary className="mono-label cursor-pointer text-subtle">
            What you will be able to do
          </summary>
          <ul className="mt-3 space-y-2">
            {outcomes.map((o, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-muted">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {o}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
