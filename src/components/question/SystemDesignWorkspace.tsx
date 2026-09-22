"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Card, Button, Badge, ProgressBar } from "@/components/ui/primitives";
import { SolutionPanel } from "./SolutionPanel";
import { AiFeedback } from "./AiFeedback";
import {
  IconCheck,
  IconEye,
  IconChevronRight,
  IconSitemap,
  IconQuiz,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";
import { useRecordWhenComplete } from "@/lib/progress/completion";
import { questionAnswerRef, useRestoreAnswers } from "@/lib/progress/answers";

/**
 * A design workbook rather than an essay. Each stage is answered before its
 * reference is revealed, so the exercise is producing a design — not
 * recognising one.
 */
export function SystemDesignWorkspace({ question }: { question: Question }) {
  const { saveAnswer } = useProgress();
  const stages = question.designStages ?? [];

  const refFor = (stageId: string) => questionAnswerRef(question.slug, stageId);

  const [open, setOpen] = useState<string | null>(stages[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Fourteen stages is a workbook, not a form — it gets returned to. Reopen
  // it on the first stage still unanswered rather than back at the brief.
  useRestoreAnswers(
    stages.map((s) => refFor(s.id)),
    (restored) => {
      const bodies: Record<string, string> = {};
      const seen: Record<string, boolean> = {};
      for (const stage of stages) {
        const body = restored[refFor(stage.id)]?.body;
        if (!body) continue;
        bodies[stage.id] = body;
        seen[stage.id] = true;
      }
      if (Object.keys(bodies).length === 0) return;

      setAnswers(bodies);
      setRevealed(seen);
      setOpen(stages.find((s) => !seen[s.id])?.id ?? null);
    },
  );

  const done = Object.keys(revealed).length;
  const percent = stages.length === 0 ? 0 : (done / stages.length) * 100;

  // Completion is derived, not fired from the last click — see the hook.
  useRecordWhenComplete(question.slug, stages.length > 0 && done >= stages.length);

  const revealStage = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: true }));
    saveAnswer(refFor(id), { body: answers[id] ?? "" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mono-label mb-3 flex items-center gap-2 text-accent">
          <IconSitemap size={13} />
          Design brief
        </div>
        <p className="text-[14px] leading-relaxed text-fg-dim">
          {question.designBrief}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <ProgressBar value={percent} className="max-w-xs" />
          <span className="mono-meta text-subtle">
            {done} / {stages.length} stages
          </span>
        </div>
      </Card>

      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const isOpen = open === stage.id;
          const isRevealed = Boolean(revealed[stage.id]);
          const answer = answers[stage.id] ?? "";

          return (
            <Card
              key={stage.id}
              className={cn(
                "overflow-hidden transition-colors",
                isOpen && "border-line-strong",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : stage.id)}
                className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
              >
                <span
                  className={cn(
                    "mono-meta flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                    isRevealed
                      ? "bg-done/12 text-done ring-done/25"
                      : "bg-surface-2 text-subtle ring-line-strong",
                  )}
                >
                  {isRevealed ? <IconCheck size={12} /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[14px] font-semibold tracking-tight text-fg">
                  {stage.title}
                </span>
                <IconChevronRight
                  size={15}
                  className={cn(
                    "shrink-0 text-faint transition-transform duration-200",
                    isOpen && "rotate-90",
                  )}
                />
              </button>

              {isOpen ? (
                <div className="animate-fade-in border-t border-line px-5 py-5">
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    {stage.prompt}
                  </p>

                  <textarea
                    value={answer}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [stage.id]: e.target.value }))
                    }
                    rows={5}
                    disabled={isRevealed}
                    placeholder="Your design decision, and the reason for it."
                    className="mt-4 w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13.5px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-70"
                  />

                  {!isRevealed ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        tone="primary"
                        size="sm"
                        disabled={answer.trim().length < 15}
                        onClick={() => revealStage(stage.id)}
                      >
                        <IconEye size={13} />
                        Compare with reference
                      </Button>
                      <span className="mono-meta text-faint">
                        {answer.trim().length < 15
                          ? "Sketch an answer first"
                          : "Ready"}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 animate-fade-up space-y-3.5">
                      <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
                        <div className="mono-label mb-3 text-accent">
                          Reference answer
                        </div>
                        <ul className="space-y-2.5">
                          {stage.reference.map((r, ri) => (
                            <li key={ri} className="flex gap-3">
                              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                              <span className="text-[13.5px] leading-relaxed text-fg-dim">
                                {r}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {stage.signals?.length ? (
                        <div className="rounded-lg border border-line bg-surface-2/50 p-4">
                          <div className="mono-label mb-2.5 flex items-center gap-2 text-subtle">
                            <IconQuiz size={12} />
                            What an interviewer listens for
                          </div>
                          <ul className="space-y-1.5">
                            {stage.signals.map((s, si) => (
                              <li key={si} className="text-[13px] leading-relaxed text-muted">
                                · {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <AiFeedback
                        cacheRef={refFor(stage.id)}
                        questionTitle={question.title}
                        prompt={stage.prompt}
                        referenceAnswer={stage.reference.join(" ")}
                        userAnswer={answer}
                      />

                      {i < stages.length - 1 ? (
                        <Button
                          tone="secondary"
                          size="sm"
                          onClick={() => setOpen(stages[i + 1].id)}
                        >
                          Next stage: {stages[i + 1].title}
                          <IconChevronRight size={13} />
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {done >= stages.length && stages.length > 0 ? (
        <section className="animate-fade-up">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="mono-label text-subtle">Design review</h2>
            <Badge tone="accent">Complete</Badge>
          </div>
          <SolutionPanel question={question} />
        </section>
      ) : null}
    </div>
  );
}
