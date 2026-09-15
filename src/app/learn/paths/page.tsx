"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader, Card, ProgressBar, DifficultyPill, Badge } from "@/components/ui/primitives";
import { ANDROID_ENGINEER_PATH } from "@/data/path";
import { useProgress } from "@/lib/progress/context";
import { moduleProgress } from "@/lib/progress/selectors";
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
        return { module, p, index: i };
      }),
    [path.modules, progress],
  );

  // A module unlocks when the one before it is at least half done.
  const unlockedUpTo = useMemo(() => {
    let last = 1;
    for (let i = 0; i < modules.length; i += 1) {
      if (modules[i].p.percent >= 50) last = i + 2;
      else break;
    }
    return Math.max(last, 2);
  }, [modules]);

  const overall = Math.round(
    modules.reduce((sum, m) => sum + m.p.percent, 0) / Math.max(1, modules.length),
  );

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
        {modules.map(({ module, p, index }) => {
          const locked = index + 1 > unlockedUpTo && p.percent === 0;
          const complete = p.percent >= 100;

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
                    : p.percent > 0
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
                href={
                  module.id === "m01"
                    ? "/lessons/day-1"
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
}: {
  index: number;
  title: string;
  summary: string;
  difficulty: Difficulty;
  lessons: number;
  exercises: number;
  hours: number;
  topics: string[];
  percent: number;
  solved: number;
  total: number;
  outcomes: string[];
  locked: boolean;
  href: string;
}) {
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
          {lessons} lessons
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

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={percent} className="flex-1" />
        <span className="mono-meta shrink-0 text-subtle">
          {solved}/{total}
        </span>
        {!locked ? (
          <Link
            href={href}
            className="mono-meta inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-fg-dim transition-colors hover:border-line-strong hover:text-accent"
          >
            {percent > 0 ? "Continue" : "Start"}
            <IconArrowRight size={12} />
          </Link>
        ) : null}
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
