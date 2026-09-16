"use client";

import Link from "next/link";
import type { Question, QuestionStatus } from "@/lib/types";
import { Card, DifficultyPill } from "@/components/ui/primitives";
import {
  IconCheck,
  IconBookmark,
  IconClock,
  IconHalfCircle,
  IconCircle,
  IconBug,
  IconQuiz,
  IconBook,
  IconSitemap,
  IconTerminal,
  IconEye,
} from "@/components/icons";
import { cn, formatCount, formatLabels } from "@/lib/utils";
import { topicLabel } from "@/data/topics";
import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

const FORMAT_ICON: Record<Question["format"], ComponentType<IconProps>> = {
  coding: IconTerminal,
  "code-reading": IconBook,
  "code-review": IconEye,
  debugging: IconBug,
  quiz: IconQuiz,
  "system-design": IconSitemap,
};

function StatusMark({ status }: { status: QuestionStatus }) {
  if (status === "completed") {
    return (
      <span className="animate-check flex h-5 w-5 items-center justify-center rounded-full bg-done/15 text-done ring-1 ring-inset ring-done/30">
        <IconCheck size={11} strokeWidth={2.6} />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-medium">
        <IconHalfCircle size={13} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center text-faint">
      <IconCircle size={12} />
    </span>
  );
}

export function QuestionCard({
  question,
  status,
  bookmarked,
  onToggleBookmark,
}: {
  question: Question;
  status: QuestionStatus;
  bookmarked: boolean;
  onToggleBookmark?: (slug: string) => void;
}) {
  const FormatIcon = FORMAT_ICON[question.format];

  return (
    <Card interactive className="group relative">
      <Link href={`/practice/${question.slug}`} className="block p-4 sm:p-[18px]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <StatusMark status={status} />
          </span>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-[14.5px] font-semibold tracking-tight transition-colors",
                status === "completed" ? "text-fg-dim" : "text-fg",
                "group-hover:text-accent",
              )}
            >
              {question.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
              {question.description}
            </p>

            <div className="mono-meta mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-subtle">
              <span className="inline-flex items-center gap-1.5 text-fg-dim">
                <FormatIcon size={12} className="text-faint" />
                {formatLabels[question.format]}
              </span>
              <span className="text-faint">·</span>
              <span>
                {question.topics.slice(0, 2).map(topicLabel).join(" · ")}
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <IconClock size={11} />~{question.estimatedMinutes}m
                </span>
                {question.completedCount ? (
                  <span className="hidden sm:inline">
                    {formatCount(question.completedCount)} completed
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          <div className="ml-1 flex shrink-0 flex-col items-end gap-2">
            <DifficultyPill difficulty={question.difficulty} />
            {question.companyTags?.length ? (
              <span className="mono-label hidden text-faint sm:block">
                {question.companyTags.slice(0, 2).join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {onToggleBookmark ? (
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
          onClick={(e) => {
            e.preventDefault();
            onToggleBookmark(question.slug);
          }}
          className={cn(
            "absolute bottom-3 right-3 rounded-md p-1.5 transition-all duration-150",
            bookmarked
              ? "text-accent"
              : "text-faint opacity-0 hover:text-muted group-hover:opacity-100",
          )}
        >
          <IconBookmark
            size={14}
            fill={bookmarked ? "currentColor" : "none"}
          />
        </button>
      ) : null}
    </Card>
  );
}

export function QuestionRowSkeleton() {
  return (
    <Card className="p-[18px]">
      <div className="h-4 w-1/3 rounded bg-surface-2" />
      <div className="mt-3 h-3 w-2/3 rounded bg-surface-2/70" />
      <div className="mt-4 h-3 w-1/4 rounded bg-surface-2/50" />
    </Card>
  );
}
