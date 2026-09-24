"use client";

import Link from "next/link";
import type { Question } from "@/lib/types";
import { DifficultyPill, Badge, Button, Card } from "@/components/ui/primitives";
import { CodingWorkspace } from "./CodingWorkspace";
import { CodeReadingWorkspace } from "./CodeReadingWorkspace";
import { CodeReviewWorkspace } from "./CodeReviewWorkspace";
import { DebuggingWorkspace } from "./DebuggingWorkspace";
import { QuizWorkspace } from "./QuizWorkspace";
import { SystemDesignWorkspace } from "./SystemDesignWorkspace";
import {
  IconChevronLeft,
  IconBookmark,
  IconClock,
  IconCheck,
} from "@/components/icons";
import { formatCount, formatLabels } from "@/lib/utils";
import { topicLabel } from "@/data/topics";
import { useProgress } from "@/lib/progress/context";
import { useTimeOnTask } from "@/lib/progress/useTimeOnTask";
import { isBookmarked, statusOf } from "@/lib/progress/selectors";
import { lessonForQuestion } from "@/data/lessons";

export function QuestionView({ question }: { question: Question }) {
  const { progress, toggleBookmark } = useProgress();

  // Time spent on an exercise is study time too.
  useTimeOnTask();

  const bookmarked = isBookmarked(progress, question.slug);
  const status = statusOf(progress, question);

  // If a lesson sent you here, offer the way back. Derived from the
  // content, so it is right however you arrived — including on a refresh
  // or a shared link, which a query parameter would not survive.
  const origin = lessonForQuestion(question.slug);
  const solved = Boolean(progress.attempts[question.slug]?.solved);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/practice"
            className="mono-meta inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-fg-dim"
          >
            <IconChevronLeft size={13} />
            All questions
          </Link>

          {origin ? (
            <Link
              href={`/lessons/${origin.lesson.slug}#${origin.section.id}`}
              className="mono-meta inline-flex items-center gap-1.5 text-accent transition-colors hover:text-accent-soft"
            >
              <IconChevronLeft size={13} />
              Back to {origin.lesson.title} · {origin.section.title}
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-fg sm:text-[27px]">
              {question.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
              {question.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {status === "completed" ? (
              <Badge tone="done">
                <IconCheck size={10} />
                Completed
              </Badge>
            ) : null}
            <Button
              tone="secondary"
              size="sm"
              onClick={() => toggleBookmark(question.slug, "question")}
              aria-pressed={bookmarked}
            >
              <IconBookmark
                size={13}
                fill={bookmarked ? "currentColor" : "none"}
                className={bookmarked ? "text-accent" : undefined}
              />
              {bookmarked ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        <div className="mono-meta mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-subtle">
          <DifficultyPill difficulty={question.difficulty} />
          <span className="text-fg-dim">{formatLabels[question.format]}</span>
          <span className="text-faint">·</span>
          <span>{question.track}</span>
          <span className="text-faint">·</span>
          <span>{question.topics.map(topicLabel).join(" · ")}</span>
          <span className="ml-auto flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={12} />~{question.estimatedMinutes} min
            </span>
            {question.completedCount ? (
              <span className="hidden sm:inline">
                {formatCount(question.completedCount)} completed
              </span>
            ) : null}
            {question.companyTags?.length ? (
              <span className="hidden text-faint md:inline">
                {question.companyTags.join(" · ")}
              </span>
            ) : null}
          </span>
        </div>
      </header>

      <Workspace question={question} />

      {/* The moment the way back is actually wanted: you have just solved
          it and the lesson is still half-finished behind you. Linking to
          the section anchor returns you to the spot, not the top. */}
      {origin ? (
        <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={solved ? "mt-0.5 text-done" : "mt-0.5 text-subtle"}>
              <IconCheck size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-fg">
                {solved
                  ? "Solved — this counts toward the lesson"
                  : `Part of ${origin.lesson.title}`}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {solved
                  ? `${origin.section.title} is marked off once you are back.`
                  : `Opened from ${origin.section.title}. Solving it completes that step.`}
              </p>
            </div>
          </div>

          <Link
            href={`/lessons/${origin.lesson.slug}#${origin.section.id}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
          >
            <IconChevronLeft size={14} />
            Back to the lesson
          </Link>
        </Card>
      ) : null}
    </div>
  );
}

function Workspace({ question }: { question: Question }) {
  switch (question.format) {
    case "code-reading":
      return <CodeReadingWorkspace question={question} />;
    case "code-review":
      return <CodeReviewWorkspace question={question} />;
    case "debugging":
      return <DebuggingWorkspace question={question} />;
    case "quiz":
      return <QuizWorkspace question={question} />;
    case "feature":
    case "system-design":
      return <SystemDesignWorkspace question={question} />;
    case "coding":
    default:
      return <CodingWorkspace question={question} />;
  }
}
