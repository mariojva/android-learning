import type {
  Difficulty,
  ProgressState,
  Question,
  QuestionStatus,
  QuestionTrack,
  ReviewItem,
  TopicId,
  TopicMastery,
} from "@/lib/types";
import { ALL_QUESTIONS } from "@/data/questions";
import { TOPICS, topicLabel } from "@/data/topics";
import { masteryFromPercent } from "@/lib/utils";

/* Everything the dashboard, progress page and browser display is derived
   here, from one ProgressState — so no two figures can disagree. */

export function statusOf(
  progress: ProgressState,
  question: Question,
): QuestionStatus {
  const attempt = progress.attempts[question.slug];
  if (attempt?.solved) return "completed";
  if (attempt) return "in-progress";
  return "not-started";
}

export function isBookmarked(progress: ProgressState, ref: string): boolean {
  return progress.bookmarks.some((b) => b.ref === ref);
}

export function solvedCount(progress: ProgressState): number {
  return Object.values(progress.attempts).filter((a) => a.solved).length;
}

export function attemptedCount(progress: ProgressState): number {
  return Object.keys(progress.attempts).length;
}

export function accuracy(progress: ProgressState): number {
  const graded = Object.values(progress.attempts);
  if (graded.length === 0) return 0;
  const totalAttempts = graded.reduce((sum, a) => sum + Math.max(1, a.attempts), 0);
  const solved = graded.filter((a) => a.solved).length;
  return Math.round((solved / totalAttempts) * 100);
}

export function difficultyBreakdown(
  progress: ProgressState,
): { difficulty: Difficulty; solved: number; total: number }[] {
  const order: Difficulty[] = ["Warmup", "Easy", "Medium", "Hard"];
  return order.map((difficulty) => {
    const inBand = ALL_QUESTIONS.filter((q) => q.difficulty === difficulty);
    return {
      difficulty,
      total: inBand.length,
      solved: inBand.filter((q) => progress.attempts[q.slug]?.solved).length,
    };
  });
}

export function trackBreakdown(
  progress: ProgressState,
): { track: QuestionTrack; solved: number; total: number }[] {
  const tracks: QuestionTrack[] = [
    "Kotlin",
    "Android",
    "Compose",
    "Architecture",
    "Interview",
    "System Design",
  ];
  return tracks.map((track) => {
    const inTrack = ALL_QUESTIONS.filter((q) => q.track === track);
    return {
      track,
      total: inTrack.length,
      solved: inTrack.filter((q) => progress.attempts[q.slug]?.solved).length,
    };
  });
}

export function topicMastery(progress: ProgressState): TopicMastery[] {
  return TOPICS.map((topic) => {
    const inTopic = ALL_QUESTIONS.filter((q) => q.topics.includes(topic.id));
    const solved = inTopic.filter((q) => progress.attempts[q.slug]?.solved).length;
    const percent =
      inTopic.length === 0 ? 0 : Math.round((solved / inTopic.length) * 100);
    return {
      topic: topic.id,
      percent,
      level: masteryFromPercent(percent),
      solved,
      total: inTopic.length,
    };
  }).sort((a, b) => b.percent - a.percent);
}

/** Topics with the worst ratio of solved to attempted. */
export function weakAreas(progress: ProgressState, limit = 5): TopicMastery[] {
  const scored = TOPICS.map((topic) => {
    const inTopic = ALL_QUESTIONS.filter((q) => q.topics.includes(topic.id));
    const attempted = inTopic.filter((q) => progress.attempts[q.slug]);
    const failed = attempted.filter((q) => !progress.attempts[q.slug]?.solved);
    const solved = attempted.length - failed.length;
    const percent =
      attempted.length === 0
        ? 0
        : Math.round((solved / attempted.length) * 100);
    return {
      topic: topic.id,
      percent,
      level: masteryFromPercent(percent),
      solved,
      total: attempted.length,
      failed: failed.length,
    };
  })
    .filter((t) => t.total > 0 && t.failed > 0)
    .sort((a, b) => a.percent - b.percent || b.failed - a.failed);

  return scored.slice(0, limit).map(({ topic, percent, level, solved, total }) => ({
    topic,
    percent,
    level,
    solved,
    total,
  }));
}

/**
 * Spaced repetition. A concept comes back when it was learned a while ago
 * and has not been exercised since, or when an attempt failed.
 */
export function reviewQueue(progress: ProgressState, today = new Date()): ReviewItem[] {
  const items: ReviewItem[] = [];

  for (const topic of TOPICS) {
    const inTopic = ALL_QUESTIONS.filter((q) => q.topics.includes(topic.id));
    const due: string[] = [];
    let failedCount = 0;
    let staleCount = 0;

    for (const question of inTopic) {
      const attempt = progress.attempts[question.slug];
      if (!attempt) continue;

      if (!attempt.solved) {
        due.push(question.slug);
        failedCount += 1;
        continue;
      }

      const daysSince = daysBetween(attempt.updatedAt, today);
      // Intervals grow with the number of attempts it took to get it right.
      const interval = attempt.attempts <= 1 ? 21 : attempt.attempts === 2 ? 14 : 7;
      if (daysSince >= interval) {
        due.push(question.slug);
        staleCount += 1;
      }
    }

    if (due.length > 0) {
      items.push({
        topic: topic.id,
        label: topicLabel(topic.id),
        dueCount: due.length,
        reason:
          failedCount > 0 && staleCount > 0
            ? `${failedCount} unsolved · ${staleCount} due for review`
            : failedCount > 0
              ? `${failedCount} unsolved`
              : `last practised over ${shortestInterval(progress, due)} days ago`,
        slugs: due.slice(0, 12),
      });
    }
  }

  return items.sort((a, b) => b.dueCount - a.dueCount).slice(0, 6);
}

function shortestInterval(progress: ProgressState, slugs: string[]): number {
  const values = slugs
    .map((s) => progress.attempts[s])
    .filter(Boolean)
    .map((a) => (a!.attempts <= 1 ? 21 : a!.attempts === 2 ? 14 : 7));
  return values.length ? Math.min(...values) : 14;
}

function daysBetween(iso: string, today: Date): number {
  const then = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(then.getTime())) return 0;
  const ms = today.getTime() - then.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * `percent` is null when the module has no exercises yet, rather than 0.
 * Those are different states and conflating them is a real bug: a module
 * with nothing in it renders as 0% done forever, and — because the path
 * unlocks each module off the previous one's percentage — silently gates
 * every module behind it on a bar that can never move. Callers must handle
 * null explicitly, which is the point.
 */
export function moduleProgress(
  progress: ProgressState,
  topics: TopicId[],
): { percent: number | null; solved: number; total: number } {
  const inModule = ALL_QUESTIONS.filter((q) =>
    q.topics.some((t) => topics.includes(t)),
  );
  const solved = inModule.filter((q) => progress.attempts[q.slug]?.solved).length;
  return {
    solved,
    total: inModule.length,
    percent:
      inModule.length === 0 ? null : Math.round((solved / inModule.length) * 100),
  };
}

export function courseCompletion(progress: ProgressState): number {
  if (ALL_QUESTIONS.length === 0) return 0;
  return Math.round((solvedCount(progress) / ALL_QUESTIONS.length) * 100);
}

export function masteredTopicCount(progress: ProgressState): number {
  return topicMastery(progress).filter(
    (t) => t.level === "Proficient" || t.level === "Mastered",
  ).length;
}
