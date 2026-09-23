"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, ProgressBar, Badge, LinkButton, DifficultyPill } from "@/components/ui/primitives";
import {
  IconArrowRight,
  IconFlame,
  IconClock,
  IconTrophy,
  IconTarget,
  IconCheck,
  IconRefresh,
  IconAlert,
  IconSpark,
} from "@/components/icons";
import { cn, formatMinutes, difficultyStyles } from "@/lib/utils";
import type { DailyPlanSlot, Difficulty, ReviewItem, TopicMastery, QuestionTrack } from "@/lib/types";
import type { Lesson } from "@/lib/types";
import { topicLabel } from "@/data/topics";

/* ------------------------------ Stat tile -------------------------- */

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="mono-label text-subtle">{label}</span>
        {icon ? <span className="text-faint">{icon}</span> : null}
      </div>
      <div
        className={cn(
          "animate-tick mt-3 font-mono text-[24px] font-semibold leading-none tracking-tight",
          tone === "accent" ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
      {sub ? <div className="mono-meta mt-2 text-subtle">{sub}</div> : null}
    </Card>
  );
}

/* --------------------------- Continue card ------------------------- */

/**
 * The next lesson to sit down with — never a fixed one. This card used to
 * read from a hardcoded CONTINUE constant pinned to Day 1, so once a second
 * lesson existed it went on offering the finished one.
 */
export function ContinueCard({
  lesson,
  percent,
}: {
  lesson: Lesson | null;
  percent: number;
}) {
  if (!lesson) return null;
  const done = percent >= 100;
  return (
    <Card className="relative overflow-hidden border-line-strong">
      <div className="grid-noise pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="mono-label mb-3 flex items-center gap-2 text-accent">
            <IconSpark size={12} />
            Continue learning
          </div>
          <h2 className="text-[19px] font-semibold tracking-tight text-fg">
            {lesson.title}
          </h2>
          <p className="mt-1 text-[13.5px] text-muted">
            Day {lesson.dayNumber} · {lesson.goal}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <ProgressBar value={percent} className="max-w-[220px]" />
            <span className="mono-meta shrink-0 text-subtle">{percent}%</span>
          </div>
        </div>

        <LinkButton
          href={`/lessons/${lesson.slug}`}
          tone="primary"
          className="shrink-0"
        >
          {done ? "Review" : percent > 0 ? "Continue" : `Start Day ${lesson.dayNumber}`}
          <IconArrowRight size={15} />
        </LinkButton>
      </div>
    </Card>
  );
}

/* ---------------------------- Today's plan ------------------------- */

const SLOT_TONES: Record<DailyPlanSlot["accent"], string> = {
  kotlin: "bg-accent",
  android: "bg-info",
  interview: "bg-violet",
};

export function TodayPlan({
  slots,
  targetMinutes,
  completedMinutes,
}: {
  slots: DailyPlanSlot[];
  targetMinutes: number;
  completedMinutes: number;
}) {
  const pct = Math.min(100, Math.round((completedMinutes / targetMinutes) * 100));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="mono-label mb-2 text-subtle">Today&rsquo;s plan</div>
          <div className="font-mono text-[15px] text-fg">
            {formatMinutes(completedMinutes)}{" "}
            <span className="text-subtle">/ {formatMinutes(targetMinutes)}</span>
          </div>
        </div>
        <span
          className={cn(
            "mono-meta rounded-md px-2 py-[3px] ring-1 ring-inset",
            pct >= 100
              ? "bg-done/10 text-done ring-done/25"
              : "bg-surface-2 text-muted ring-line-strong",
          )}
        >
          {pct}%
        </span>
      </div>

      {/* Segmented target bar — one segment per planned block. */}
      <div className="mb-5 flex h-[6px] w-full gap-1 overflow-hidden rounded-full">
        {slots.map((slot) => {
          const slotShare = slot.minutes / targetMinutes;
          const before = slots
            .slice(0, slots.indexOf(slot))
            .reduce((sum, s) => sum + s.minutes, 0);
          const filled = Math.max(
            0,
            Math.min(1, (completedMinutes - before) / slot.minutes),
          );
          return (
            <div
              key={slot.label}
              className="relative h-full overflow-hidden rounded-full bg-surface-3"
              style={{ flexGrow: slotShare }}
            >
              <div
                className={cn("h-full rounded-full", SLOT_TONES[slot.accent])}
                style={{
                  width: `${filled * 100}%`,
                  transition: "width 900ms var(--ease-out-soft)",
                }}
              />
            </div>
          );
        })}
      </div>

      <ul className="space-y-1">
        {slots.map((slot) => (
          <li key={slot.label}>
            <Link
              href={slot.href}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
            >
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SLOT_TONES[slot.accent])}
              />
              <span className="mono-meta w-11 shrink-0 text-subtle">
                {slot.minutes}m
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-fg-dim">
                  {slot.label}
                </span>
                <span className="block truncate text-[12px] text-subtle">
                  {slot.topic}
                </span>
              </span>
              <IconArrowRight
                size={14}
                className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -------------------------- Difficulty split ----------------------- */

export function DifficultyPanel({
  rows,
}: {
  rows: { difficulty: Difficulty; solved: number; total: number }[];
}) {
  return (
    <Card className="p-5">
      <div className="mono-label mb-4 text-subtle">Question difficulty</div>
      <ul className="space-y-3.5">
        {rows.map((row, i) => {
          const pct = row.total === 0 ? 0 : (row.solved / row.total) * 100;
          const tone = row.difficulty.toLowerCase();
          return (
            <li key={row.difficulty}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <DifficultyPill difficulty={row.difficulty} />
                <span className="mono-meta text-subtle">
                  <span className={difficultyStyles[row.difficulty].text}>
                    {row.solved}
                  </span>{" "}
                  / {row.total}
                </span>
              </div>
              <ProgressBar
                value={pct}
                height={4}
                delay={i * 80}
                tone={
                  tone === "warmup"
                    ? "info"
                    : tone === "easy"
                      ? "done"
                      : tone === "medium"
                        ? "medium"
                        : "hard"
                }
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* --------------------------- Category split ------------------------ */

export function CategoryPanel({
  rows,
}: {
  rows: { track: QuestionTrack; solved: number; total: number }[];
}) {
  return (
    <Card className="p-5">
      <div className="mono-label mb-4 text-subtle">Question category</div>
      <ul className="space-y-3">
        {rows.map((row, i) => {
          const pct = row.total === 0 ? 0 : (row.solved / row.total) * 100;
          return (
            <li key={row.track} className="flex items-center gap-3">
              <span className="w-[92px] shrink-0 truncate text-[12.5px] text-fg-dim">
                {row.track}
              </span>
              <ProgressBar value={pct} height={4} delay={i * 60} className="flex-1" />
              <span className="mono-meta w-[46px] shrink-0 text-right text-subtle">
                {row.solved}/{row.total}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------------------------- Review queue ------------------------- */

export function ReviewPanel({ items }: { items: ReviewItem[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="mono-label flex items-center gap-2 text-subtle">
          <IconRefresh size={12} />
          Ready for review
        </div>
        <Badge tone="accent">{items.reduce((s, i) => s + i.dueCount, 0)} due</Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-subtle">
          Nothing due. Concepts return here once they have had time to fade.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((item) => (
            <li key={item.topic}>
              <Link
                href={`/practice?topic=${item.topic}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-fg-dim">
                    {item.label}
                  </span>
                  <span className="mono-meta block truncate text-subtle">
                    {item.reason}
                  </span>
                </span>
                <span className="mono-meta shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-muted ring-1 ring-inset ring-line-strong">
                  {item.dueCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-subtle">
        Concepts are brought back deliberately. Something learned in week 4 will
        reappear in a week 7 debugging exercise.
      </p>
    </Card>
  );
}

/* ----------------------------- Weak areas -------------------------- */

export function WeakAreasPanel({ items }: { items: TopicMastery[] }) {
  return (
    <Card className="p-5">
      <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
        <IconAlert size={12} />
        My weak areas
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-subtle">
          No failed attempts on record. Try something harder.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={item.topic} className="flex items-center gap-3">
              <Link
                href={`/practice?topic=${item.topic}`}
                className="w-[104px] shrink-0 truncate text-[12.5px] text-fg-dim hover:text-accent"
              >
                {topicLabel(item.topic)}
              </Link>
              <ProgressBar
                value={item.percent}
                height={4}
                tone={item.percent < 40 ? "hard" : "medium"}
                delay={i * 60}
                className="flex-1"
              />
              <span className="mono-meta w-[52px] shrink-0 text-right text-subtle">
                {item.percent}% ok
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------ Streak row ------------------------- */

export function StreakStrip({
  current,
  longest,
  weekMinutes,
}: {
  current: number;
  longest: number;
  weekMinutes: number;
}) {
  const cells: { icon: ReactNode; label: string; value: string }[] = [
    {
      icon: <IconFlame size={14} className="text-medium" />,
      label: "Current streak",
      value: `${current} days`,
    },
    {
      icon: <IconTrophy size={14} className="text-accent" />,
      label: "Longest streak",
      value: `${longest} days`,
    },
    {
      icon: <IconClock size={14} className="text-info" />,
      label: "This week",
      value: formatMinutes(weekMinutes),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
      {cells.map((cell) => (
        <div key={cell.label} className="flex items-center gap-2.5">
          {cell.icon}
          <span className="mono-meta text-subtle">{cell.label}</span>
          <span className="font-mono text-[13px] font-semibold text-fg">
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export { IconCheck, IconTarget };
