"use client";

import Link from "next/link";
import type { Question } from "@/lib/types";
import { DifficultyPill, Badge, Button } from "@/components/ui/primitives";
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
import { isBookmarked, statusOf } from "@/lib/progress/selectors";

export function QuestionView({ question }: { question: Question }) {
  const { progress, toggleBookmark } = useProgress();
  const bookmarked = isBookmarked(progress, question.slug);
  const status = statusOf(progress, question);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/practice"
          className="mono-meta inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-fg-dim"
        >
          <IconChevronLeft size={13} />
          All questions
        </Link>

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
