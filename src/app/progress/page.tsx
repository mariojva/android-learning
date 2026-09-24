"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader, Card, ProgressBar, Ring, Badge, DifficultyPill } from "@/components/ui/primitives";
import { ActivityHeatmap } from "@/components/dashboard/Heatmap";
import {
  currentStreak as activeStreak,
  longestStreak as longestActiveStreak,
  sessionsFromActivity,
} from "@/lib/progress/activity";
import { StatTile, StreakStrip } from "@/components/dashboard/panels";
import { useProgress } from "@/lib/progress/context";
import {
  accuracy,
  attemptedCount,
  courseCompletion,
  difficultyBreakdown,
  reviewQueue,
  solvedCount,
  topicMastery,
  trackBreakdown,
  weakAreas,
} from "@/lib/progress/selectors";
import {
  minutesThisWeek,
  totalMinutes,
} from "@/data/activity";
import { topicLabel } from "@/data/topics";
import { masteryStyles, formatMinutes, cn, masteryOrder } from "@/lib/utils";
import { QUESTION_COUNTS, ALL_QUESTIONS } from "@/data/questions";
import { IconTarget, IconClock, IconTrophy, IconQuiz, IconRefresh } from "@/components/icons";

export default function ProgressPage() {
  const { progress } = useProgress();

  const data = useMemo(() => {
    const mastery = topicMastery(progress);
    return {
      solved: solvedCount(progress),
      attempted: attemptedCount(progress),
      accuracy: accuracy(progress),
      completion: courseCompletion(progress),
      hours: totalMinutes(progress.sessions) / 60,
      week: minutesThisWeek(progress.sessions),
      // Same derived rule as the dashboard. These were two separate
      // calculations over two different inputs, so the pages disagreed.
      current: activeStreak(progress),
      longest: longestActiveStreak(progress),
      heatmap: sessionsFromActivity(progress),
      difficulty: difficultyBreakdown(progress),
      tracks: trackBreakdown(progress),
      mastery,
      weak: weakAreas(progress, 6),
      review: reviewQueue(progress),
      byLevel: masteryOrder.map((level) => ({
        level,
        count: mastery.filter((m) => m.level === level).length,
      })),
      recent: Object.values(progress.attempts)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
    };
  }, [progress]);

  return (
    <div className="space-y-9">
      <PageHeader
        kicker="Progress"
        title="Where You Stand"
        subtitle="Every figure here is derived from the same record of attempts, so nothing can flatter you by disagreeing with something else."
      />

      {/* ----------------------------- Tiles ----------------------------- */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Questions solved"
          value={String(data.solved)}
          sub={`${data.attempted} attempted`}
          icon={<IconTarget size={14} />}
          tone="accent"
        />
        <StatTile
          label="Accuracy"
          value={`${data.accuracy}%`}
          sub="solved per attempt"
          icon={<IconQuiz size={14} />}
        />
        <StatTile
          label="Hours studied"
          value={data.hours.toFixed(0)}
          sub={`${formatMinutes(data.week)} this week`}
          icon={<IconClock size={14} />}
        />
        <StatTile
          label="Course completion"
          value={`${data.completion}%`}
          sub={`of ${QUESTION_COUNTS.total} questions`}
          icon={<IconTrophy size={14} />}
        />
      </section>

      {/* --------------------------- Activity ---------------------------- */}
      <section>
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-fg">
              Study activity
            </h2>
            <StreakStrip
              current={data.current}
              longest={data.longest}
              weekMinutes={data.week}
            />
          </div>
          <ActivityHeatmap sessions={data.heatmap} />
        </Card>
      </section>

      {/* ---------------------------- Mastery ---------------------------- */}
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mono-label mb-4 text-subtle">Topic mastery</div>
          <ul className="space-y-3.5">
            {data.mastery.map((m, i) => (
              <li key={m.topic}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <Link
                    href={`/practice?topic=${m.topic}`}
                    className="text-[13px] text-fg-dim transition-colors hover:text-accent"
                  >
                    {topicLabel(m.topic)}
                  </Link>
                  <span className="flex items-baseline gap-3">
                    <span className={cn("mono-label", masteryStyles[m.level])}>
                      {m.level}
                    </span>
                    <span className="mono-meta w-11 text-right text-subtle">
                      {m.percent}%
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={m.percent}
                  height={4}
                  delay={i * 40}
                  tone={
                    m.percent >= 85
                      ? "done"
                      : m.percent >= 55
                        ? "accent"
                        : m.percent >= 25
                          ? "info"
                          : "medium"
                  }
                />
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mono-label mb-4 text-subtle">Mastery levels</div>
            <div className="flex items-center gap-5">
              <Ring
                value={data.completion}
                label={String(data.solved)}
                sublabel="solved"
              />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {data.byLevel.map((row) => (
                  <li key={row.level} className="flex items-baseline justify-between">
                    <span className={cn("text-[12.5px]", masteryStyles[row.level])}>
                      {row.level}
                    </span>
                    <span className="mono-meta text-subtle">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mono-label mb-4 text-subtle">Difficulty</div>
            <ul className="space-y-3">
              {data.difficulty.map((row) => (
                <li key={row.difficulty} className="flex items-center gap-3">
                  <DifficultyPill difficulty={row.difficulty} />
                  <ProgressBar
                    value={row.total ? (row.solved / row.total) * 100 : 0}
                    height={4}
                    className="flex-1"
                    tone={
                      row.difficulty === "Hard"
                        ? "hard"
                        : row.difficulty === "Medium"
                          ? "medium"
                          : "done"
                    }
                  />
                  <span className="mono-meta w-11 text-right text-subtle">
                    {row.solved}/{row.total}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* ------------------------ Tracks & review ------------------------ */}
      <section className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="mono-label mb-4 text-subtle">By category</div>
          <ul className="space-y-3">
            {data.tracks.map((row, i) => (
              <li key={row.track} className="flex items-center gap-3">
                <span className="w-[96px] shrink-0 truncate text-[12.5px] text-fg-dim">
                  {row.track}
                </span>
                <ProgressBar
                  value={row.total ? (row.solved / row.total) * 100 : 0}
                  height={4}
                  delay={i * 50}
                  className="flex-1"
                />
                <span className="mono-meta w-11 shrink-0 text-right text-subtle">
                  {row.solved}/{row.total}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="mono-label flex items-center gap-2 text-subtle">
              <IconRefresh size={12} />
              Review queue
            </div>
            <Badge tone="accent">
              {data.review.reduce((s, r) => s + r.dueCount, 0)} due
            </Badge>
          </div>
          <ul className="space-y-2">
            {data.review.map((item) => (
              <li key={item.topic}>
                <Link
                  href={`/practice?topic=${item.topic}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] text-fg-dim">
                      {item.label}
                    </span>
                    <span className="mono-meta block text-subtle">
                      {item.reason}
                    </span>
                  </span>
                  <span className="mono-meta shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-muted ring-1 ring-inset ring-line-strong">
                    {item.dueCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* ---------------------------- Recent ----------------------------- */}
      <section>
        <Card className="p-5">
          <div className="mono-label mb-4 text-subtle">Recent attempts</div>
          <ul className="divide-y divide-line">
            {data.recent.map((attempt) => {
              const question = ALL_QUESTIONS.find(
                (q) => q.slug === attempt.questionSlug,
              );
              if (!question) return null;
              return (
                <li key={attempt.questionSlug}>
                  <Link
                    href={`/practice/${question.slug}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:text-accent"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        attempt.solved ? "bg-done" : "bg-medium",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg-dim">
                      {question.title}
                    </span>
                    <span className="mono-meta shrink-0 text-subtle">
                      {attempt.attempts} attempt{attempt.attempts === 1 ? "" : "s"}
                    </span>
                    <span className="mono-meta hidden w-20 shrink-0 text-right text-faint sm:block">
                      {attempt.updatedAt}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </div>
  );
}
