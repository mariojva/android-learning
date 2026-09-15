"use client";

import { useState } from "react";
import type { Question, QuizChoice } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { SolutionPanel } from "./SolutionPanel";
import { IconCheck, IconX, IconRefresh } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";

/**
 * Answering reveals the reasoning for *every* option, not just the correct
 * one. Knowing why the distractors are wrong is most of the understanding;
 * remembering that the answer was "C" is none of it.
 */
export function QuizWorkspace({ question }: { question: Question }) {
  const { recordAttempt } = useProgress();
  const choices = question.choices ?? [];

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const correctChoice = choices.find((c) => c.correct);
  const isCorrect = answered && selected === correctChoice?.id;

  const submit = () => {
    if (!selected) return;
    setAnswered(true);
    const right = selected === correctChoice?.id;
    recordAttempt(question.slug, { solved: right, correct: right });
  };

  const retry = () => {
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="mono-label mb-3 text-subtle">Question</div>
        <h2 className="text-[16px] font-semibold leading-snug tracking-tight text-fg">
          {question.quizStem}
        </h2>

        {question.quizCode ? (
          <CodePane
            code={question.quizCode}
            language="kotlin"
            className="mt-4"
            copyable={false}
          />
        ) : null}
      </Card>

      <ul className="space-y-2.5">
        {choices.map((choice, i) => (
          <li key={choice.id}>
            <ChoiceRow
              choice={choice}
              index={i}
              selected={selected === choice.id}
              answered={answered}
              onSelect={() => !answered && setSelected(choice.id)}
            />
          </li>
        ))}
      </ul>

      {!answered ? (
        <div className="flex items-center gap-3">
          <Button tone="primary" onClick={submit} disabled={!selected}>
            Submit answer
          </Button>
          <span className="mono-meta text-faint">
            {selected ? "Commit before you see the reasoning" : "Choose one"}
          </span>
        </div>
      ) : (
        <div className="animate-fade-up space-y-5">
          <Card
            className={cn(
              "p-5",
              isCorrect ? "border-done/25 bg-done/[0.05]" : "border-hard/25 bg-hard/[0.05]",
            )}
          >
            <div className="flex items-center gap-2.5">
              {isCorrect ? (
                <IconCheck size={17} className="animate-check text-done" />
              ) : (
                <IconX size={17} className="text-hard" />
              )}
              <span
                className={cn(
                  "text-[14.5px] font-semibold",
                  isCorrect ? "text-done" : "text-hard",
                )}
              >
                {isCorrect ? "Correct" : "Not quite"}
              </span>
              {!isCorrect ? (
                <Badge className="ml-auto">
                  Correct answer: {correctChoice?.id.toUpperCase()}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-fg-dim">
              {isCorrect
                ? "Read the other three explanations anyway — the distractors are where the remaining confusion lives."
                : "Every option is explained above. Work out which assumption led you to the one you picked; that assumption is the thing worth fixing."}
            </p>
            <Button tone="ghost" size="sm" className="mt-3" onClick={retry}>
              <IconRefresh size={13} />
              Try again
            </Button>
          </Card>

          <SolutionPanel question={question} />
        </div>
      )}
    </div>
  );
}

function ChoiceRow({
  choice,
  index,
  selected,
  answered,
  onSelect,
}: {
  choice: QuizChoice;
  index: number;
  selected: boolean;
  answered: boolean;
  onSelect: () => void;
}) {
  const letter = String.fromCharCode(65 + index);

  const state = !answered
    ? selected
      ? "selected"
      : "idle"
    : choice.correct
      ? "correct"
      : selected
        ? "wrong"
        : "muted";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        state === "idle" && "border-line bg-surface hover:border-line-strong",
        state === "selected" && "border-accent/45 bg-accent/[0.06]",
        state === "correct" && "border-done/40 bg-done/[0.06]",
        state === "wrong" && "border-hard/40 bg-hard/[0.06]",
        state === "muted" && "border-line bg-surface/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={answered}
        className="flex w-full items-start gap-3.5 p-4 text-left"
      >
        <span
          className={cn(
            "mono-meta mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
            state === "correct"
              ? "bg-done/15 text-done ring-done/30"
              : state === "wrong"
                ? "bg-hard/15 text-hard ring-hard/30"
                : state === "selected"
                  ? "bg-accent/15 text-accent ring-accent/30"
                  : "bg-surface-2 text-subtle ring-line-strong",
          )}
        >
          {state === "correct" ? (
            <IconCheck size={12} />
          ) : state === "wrong" ? (
            <IconX size={12} />
          ) : (
            letter
          )}
        </span>
        <span
          className={cn(
            "flex-1 text-[13.5px] leading-relaxed",
            state === "muted" ? "text-muted" : "text-fg-dim",
          )}
        >
          {choice.body}
        </span>
      </button>

      {answered ? (
        <div className="animate-fade-in border-t border-line/70 px-4 py-3 pl-[54px]">
          <p className="text-[13px] leading-relaxed text-muted">
            <span
              className={cn(
                "mono-label mr-2",
                choice.correct ? "text-done" : "text-subtle",
              )}
            >
              {choice.correct ? "Why it is right" : "Why it is wrong"}
            </span>
            {choice.rationale}
          </p>
        </div>
      ) : null}
    </div>
  );
}
