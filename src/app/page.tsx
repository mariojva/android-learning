"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, SectionHeader, LinkButton, Ring } from "@/components/ui/primitives";
import {
  ContinueCard,
  TodayPlan,
  StatTile,
  DifficultyPanel,
  CategoryPanel,
  ReviewPanel,
  WeakAreasPanel,
  StreakStrip,
} from "@/components/dashboard/panels";
import { ActivityHeatmap } from "@/components/dashboard/Heatmap";
import {
  CurrentFocus,
  ConceptsInProgress,
  OwnershipPanel,
  ConceptReviewPanel,
  ReadyToStartPanel,
  MasterySpread,
} from "@/components/dashboard/mastery";
import { useProgress } from "@/lib/progress/context";
import {
  accuracy,
  courseCompletion,
  difficultyBreakdown,
  masteredTopicCount,
  reviewQueue,
  solvedCount,
  topicMastery,
  trackBreakdown,
  weakAreas,
} from "@/lib/progress/selectors";
import {
  currentStreak,
  longestStreak,
  minutesThisWeek,
  minutesToday,
  totalMinutes,
} from "@/data/activity";
import { TODAY_SLOTS, USER } from "@/data/profile";
import { topicLabel as topicLabelOf } from "@/data/topics";
import { QUESTION_COUNTS, ALL_QUESTIONS } from "@/data/questions";
import { CONCEPTS } from "@/data/concepts";
import {
  conceptsInProgress,
  conceptsDueForReview,
  readyToStart,
  ownershipProgress,
  proficiencyOf,
  masteryFor,
} from "@/lib/progress/mastery";
import { ALL_LESSONS } from "@/data/lessons";
import { formatMinutes, greetingFor } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  IconArrowRight,
  IconTarget,
  IconClock,
  IconTrophy,
  IconQuiz,
  IconSpark,
  IconChart,
} from "@/components/icons";

export default function DashboardPage() {
  const { progress, mode, hydrated } = useProgress();
  const { profile, user } = useAuth();

  const name = profile?.displayName ?? user?.email?.split("@")[0] ?? USER.displayName;
  const freshAccount =
    mode === "account" && hydrated && Object.keys(progress.attempts).length === 0;

  const stats = useMemo(() => {
    const sessions = progress.sessions;
    // Across every lesson, not just Day 1 — pinning this to one lesson
    // meant the figure silently stopped counting the moment a second one
    // was written.
    const lessonBlocks = ALL_LESSONS.reduce(
      (n, l) => n + (progress.lessonProgress[l.id]?.completedBlocks.length ?? 0),
      0,
    );
    const totalBlocks = ALL_LESSONS.reduce(
      (n, l) => n + l.sections.reduce((m, s) => m + s.blocks.length, 0),
      0,
    );

    return {
      solved: solvedCount(progress),
      accuracy: accuracy(progress),
      completion: courseCompletion(progress),
      mastered: masteredTopicCount(progress),
      hours: totalMinutes(sessions) / 60,
      week: minutesThisWeek(sessions),
      today: minutesToday(sessions),
      current: currentStreak(sessions),
      longest: longestStreak(sessions),
      difficulty: difficultyBreakdown(progress),
      tracks: trackBreakdown(progress),
      review: reviewQueue(progress),
      weak: weakAreas(progress),
      mastery: topicMastery(progress).slice(0, 6),
      dayOnePercent:
        totalBlocks === 0 ? 0 : Math.round((lessonBlocks / totalBlocks) * 100),
    };
  }, [progress]);

  const mastery = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of CONCEPTS) {
      const p = proficiencyOf(masteryFor(progress, c.id));
      counts[p] = (counts[p] ?? 0) + 1;
    }
    const inProgress = conceptsInProgress(progress);
    return {
      counts,
      inProgress,
      focus: inProgress[0] ?? null,
      ready: readyToStart(progress, 4),
      due: conceptsDueForReview(progress),
      ownership: ownershipProgress(progress, ALL_QUESTIONS),
    };
  }, [progress]);

  return (
    <div className="space-y-9">
      {/* ---------------------------- Greeting --------------------------- */}
      <header className="animate-fade-up">
        <h1
          className="text-[26px] font-semibold leading-tight tracking-tight text-fg sm:text-[30px]"
          suppressHydrationWarning
        >
          {greetingFor()}, {name}.
        </h1>
        <p className="mt-2 text-[14.5px] text-muted">
          {freshAccount
            ? "Your account is empty, which is exactly right — everything below will be something you earned."
            : "Continue building your Android engineering mental model."}
        </p>
      </header>

      {/* ------------------------ Mastery ------------------------ */}
      {/*
        Deliberately the first thing on the page, and deliberately narrow:
        one concept in focus, a handful in progress, what is ready next.
        The full sixty-nine live in the knowledge graph — a dashboard that
        opens with the entire Android ecosystem teaches nobody anything.
      */}
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <CurrentFocus focus={mastery.focus} />
          <ConceptsInProgress items={mastery.inProgress.slice(1, 6)} />
        </div>
        <div className="space-y-5">
          <MasterySpread counts={mastery.counts} total={CONCEPTS.length} />
          <ConceptReviewPanel items={mastery.due} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <OwnershipPanel levels={mastery.ownership} />
        <ReadyToStartPanel items={mastery.ready} />
      </section>

      {/* -------------------- Continue + today's plan --------------------- */}
      <section className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <ContinueCard percent={stats.dayOnePercent} />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label="Total solved"
              value={String(stats.solved)}
              sub={`of ${QUESTION_COUNTS.total} questions`}
              icon={<IconTarget size={14} />}
              tone="accent"
            />
            <StatTile
              label="Accuracy"
              value={`${stats.accuracy}%`}
              sub="solved per attempt"
              icon={<IconQuiz size={14} />}
            />
            <StatTile
              label="Hours studied"
              value={stats.hours.toFixed(0)}
              sub="since joining"
              icon={<IconClock size={14} />}
            />
            <StatTile
              label="Topics mastered"
              value={String(stats.mastered)}
              sub="proficient or above"
              icon={<IconTrophy size={14} />}
            />
          </div>
        </div>

        <TodayPlan
          slots={TODAY_SLOTS}
          targetMinutes={USER.dailyTargetMinutes}
          completedMinutes={stats.today}
        />
      </section>

      {/* ---------------------------- Activity --------------------------- */}
      <section>
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mono-label mb-2 text-subtle">Activity</div>
              <h2 className="text-[15px] font-semibold tracking-tight text-fg">
                The last twelve months
              </h2>
            </div>
            <StreakStrip
              current={stats.current}
              longest={stats.longest}
              weekMinutes={stats.week}
            />
          </div>
          <ActivityHeatmap sessions={progress.sessions} />
        </Card>
      </section>

      {/* ------------------------- Breakdown grid ------------------------ */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DifficultyPanel rows={stats.difficulty} />
        <CategoryPanel rows={stats.tracks} />
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mono-label mb-4 text-subtle">Course completion</div>
            <div className="flex items-center gap-5">
              <Ring
                value={stats.completion}
                label={`${stats.completion}%`}
                sublabel="complete"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Row label="Questions" value={`${stats.solved} / ${QUESTION_COUNTS.total}`} />
                <Row label="Coding" value={String(QUESTION_COUNTS.coding)} />
                <Row label="Debugging" value={String(QUESTION_COUNTS.debugging)} />
                <Row label="System design" value={String(QUESTION_COUNTS.systemDesign)} />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* --------------------- Review + weak areas ----------------------- */}
      <section className="grid gap-5 md:grid-cols-2">
        <ReviewPanel items={stats.review} />
        <WeakAreasPanel items={stats.weak} />
      </section>

      {/* ---------------------------- Mastery ---------------------------- */}
      <section>
        <SectionHeader
          kicker="Topic mastery"
          title="Where you stand"
          action={
            <LinkButton href="/progress" tone="ghost" size="sm">
              Full breakdown
              <IconArrowRight size={14} />
            </LinkButton>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.mastery.map((topic) => (
            <Link key={topic.topic} href={`/practice?topic=${topic.topic}`}>
              <Card interactive className="p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] font-medium text-fg-dim">
                    {topicLabelOf(topic.topic)}
                  </span>
                  <span className="font-mono text-[15px] font-semibold text-accent">
                    {topic.percent}%
                  </span>
                </div>
                <div className="mono-label mt-2 text-subtle">{topic.level}</div>
                <div className="mt-3 h-[4px] w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${topic.percent}%`,
                      transition: "width 900ms var(--ease-out-soft)",
                    }}
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------- Next step --------------------------- */}
      <section>
        <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-accent">
              <IconSpark size={18} />
            </span>
            <div>
              <h3 className="text-[14.5px] font-semibold text-fg">
                Twelve weeks, two hours a day
              </h3>
              <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
                The study plan pairs the Kotlin you need with the Android idea it
                unlocks, and closes each week with the interview pattern that keeps
                the DSA muscle warm.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <LinkButton href="/study-plans" tone="secondary" size="sm">
              <IconChart size={14} />
              Study plan
            </LinkButton>
            <LinkButton href="/learn/paths" tone="primary" size="sm">
              Open path
              <IconArrowRight size={14} />
            </LinkButton>
          </div>
        </Card>
      </section>

      <p className="mono-meta pb-2 text-center text-faint">
        {formatMinutes(stats.week)} this week · {stats.current}-day streak ·{" "}
        {QUESTION_COUNTS.total} questions seeded
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12.5px] text-subtle">{label}</span>
      <span className="mono-meta text-fg-dim">{value}</span>
    </div>
  );
}
