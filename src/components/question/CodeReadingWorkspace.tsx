"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { Card, Button, Badge, ProgressBar } from "@/components/ui/primitives";
import { SolutionPanel } from "./SolutionPanel";
import { AiFeedback } from "./AiFeedback";
import { IconEye, IconCheck, IconArrowRight, IconSpark } from "@/components/icons";
import { keywordCoverage } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";

/**
 * Code reading is deliberately one question at a time. Showing all nine at
 * once turns it into a form; showing one turns it into thinking.
 */
export function CodeReadingWorkspace({ question }: { question: Question }) {
  const prompts = question.readingPrompts ?? [];
  const { recordAttempt } = useProgress();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const current = prompts[index];
  const answeredCount = Object.keys(revealed).length;
  const percent = prompts.length === 0 ? 0 : (answeredCount / prompts.length) * 100;

  const reveal = () => {
    if (!current) return;
    setRevealed((prev) => ({ ...prev, [current.id]: true }));
  };

  const next = () => {
    if (index < prompts.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setFinished(true);
      recordAttempt(question.slug, { solved: true, correct: true });
    }
  };

  const covered = current?.keywords
    ? keywordCoverage(answers[current.id] ?? "", current.keywords)
    : [];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* --------------------------- The code --------------------------- */}
      <div className="xl:sticky xl:top-20 xl:self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-surface/60 px-4 py-2.5">
            <span className="mono-label text-subtle">Read this carefully</span>
          </div>
          <CodePane
            code={question.readingCode ?? ""}
            language="kotlin"
            copyable={false}
            className="rounded-none border-0"
            maxHeight={620}
          />
        </Card>

        {question.prompt ? (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            {question.prompt}
          </p>
        ) : null}
      </div>

      {/* -------------------------- Questions --------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProgressBar value={percent} className="flex-1" />
          <span className="mono-meta shrink-0 text-subtle">
            {answeredCount} / {prompts.length}
          </span>
        </div>

        {current && !finished ? (
          <Card key={current.id} className="animate-fade-up p-5">
            <div className="mono-label mb-3 text-accent">
              Question {index + 1} of {prompts.length}
            </div>
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-fg">
              {current.question}
            </h3>

            <textarea
              value={answers[current.id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))
              }
              placeholder="Write your answer in your own words. Committing to an answer before reading the expert one is the whole exercise."
              rows={6}
              disabled={revealed[current.id]}
              className="mt-4 w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13.5px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-70"
            />

            {!revealed[current.id] ? (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  tone="primary"
                  size="sm"
                  onClick={reveal}
                  disabled={(answers[current.id] ?? "").trim().length < 12}
                >
                  <IconEye size={13} />
                  Reveal expert answer
                </Button>
                <span className="mono-meta text-faint">
                  {(answers[current.id] ?? "").trim().length < 12
                    ? "Write something first"
                    : "Ready"}
                </span>
              </div>
            ) : (
              <div className="mt-4 animate-fade-up space-y-4">
                {current.keywords?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mono-label mr-1 text-subtle">You mentioned</span>
                    {current.keywords.map((k) => (
                      <Badge
                        key={k}
                        tone={covered.includes(k) ? "done" : "neutral"}
                      >
                        {covered.includes(k) ? <IconCheck size={10} /> : null}
                        {k}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
                  <div className="mono-label mb-2.5 flex items-center gap-2 text-accent">
                    <IconSpark size={12} />
                    Expert answer
                  </div>
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-dim">
                    {current.expert}
                  </p>
                  <AiFeedback
                    questionTitle={question.title}
                    prompt={current.question}
                    referenceAnswer={current.expert}
                    userAnswer={answers[current.id] ?? ""}
                  />
                </div>

                <Button tone="secondary" size="sm" onClick={next}>
                  {index < prompts.length - 1 ? "Next question" : "Finish"}
                  <IconArrowRight size={13} />
                </Button>
              </div>
            )}
          </Card>
        ) : null}

        {finished ? (
          <div className="animate-fade-up space-y-5">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-done">
                <IconCheck size={16} className="animate-check" />
                <span className="text-[14px] font-semibold">
                  All {prompts.length} questions answered
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">
                Reread the code once more now. The second reading is where the
                structure stops being a wall of operators and starts being a
                sequence of decisions.
              </p>
            </Card>
            <SolutionPanel question={question} />
          </div>
        ) : null}

        {/* Answered questions, collapsed for reference. */}
        {prompts.slice(0, index).length > 0 && !finished ? (
          <details className="rounded-xl border border-line bg-surface/50 p-4">
            <summary className="mono-label cursor-pointer text-subtle">
              Previous answers ({index})
            </summary>
            <ul className="mt-4 space-y-4">
              {prompts.slice(0, index).map((p) => (
                <li key={p.id}>
                  <div className="text-[13px] font-medium text-fg-dim">
                    {p.question}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-subtle">
                    {answers[p.id]}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
