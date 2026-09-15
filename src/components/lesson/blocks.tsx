"use client";

import { useState } from "react";
import Link from "next/link";
import type { LessonBlock, QuizChoice } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { Card, Button, Badge } from "@/components/ui/primitives";
import {
  IconLightbulb,
  IconAlert,
  IconQuiz,
  IconCheck,
  IconX,
  IconEye,
  IconArrowRight,
  IconArrowDown,
  IconTerminal,
  IconSpark,
} from "@/components/icons";
import { cn, looseMatch, keywordCoverage } from "@/lib/utils";

export function LessonBlockView({
  block,
  completed,
  onComplete,
}: {
  block: LessonBlock;
  completed: boolean;
  onComplete: () => void;
}) {
  switch (block.kind) {
    case "prose":
      return <Prose block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "predict":
      return <Predict block={block} completed={completed} onComplete={onComplete} />;
    case "explain":
      return <Explain block={block} completed={completed} onComplete={onComplete} />;
    case "quiz":
      return <Quiz block={block} completed={completed} onComplete={onComplete} />;
    case "compare":
      return <Compare block={block} />;
    case "pipeline":
      return <Pipeline block={block} />;
    case "mutation":
      return <Mutation block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "implement":
      return <Implement block={block} onComplete={onComplete} />;
    default:
      return <Prose block={block} />;
  }
}

/* ------------------------------- Prose ----------------------------- */

function Prose({ block }: { block: LessonBlock }) {
  return (
    <div className="max-w-2xl space-y-3">
      {block.title ? (
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}
      {block.body?.map((p, i) => (
        <p key={i} className="text-[14px] leading-[1.75] text-fg-dim">
          {p}
        </p>
      ))}
    </div>
  );
}

function CodeBlock({ block }: { block: LessonBlock }) {
  return (
    <div className="max-w-2xl space-y-3">
      {block.title ? (
        <h3 className="text-[14px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}
      {block.code ? (
        <CodePane
          code={block.code.code}
          language={block.code.language ?? "kotlin"}
        />
      ) : null}
      {block.body?.map((p, i) => (
        <p key={i} className="text-[13.5px] leading-relaxed text-muted">
          {p}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------ Predict ---------------------------- */

function Predict({
  block,
  completed,
  onComplete,
}: {
  block: LessonBlock;
  completed: boolean;
  onComplete: () => void;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const correct = block.expected ? looseMatch(value, block.expected) : false;

  return (
    <Card className="max-w-2xl border-accent/15 p-5">
      <div className="mono-label mb-3 flex items-center gap-2 text-accent">
        <IconTerminal size={12} />
        Predict
      </div>

      {block.title ? (
        <h3 className="mb-3 text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}

      {block.code ? (
        <CodePane
          code={block.code.code}
          language={block.code.language ?? "kotlin"}
          copyable={false}
        />
      ) : null}

      <p className="mt-4 text-[13.5px] text-fg-dim">{block.question}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={checked}
          placeholder="Type your prediction…"
          className="h-10 flex-1 min-w-[200px] rounded-lg border border-line bg-bg-raised px-3 font-mono text-[13px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-70"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim().length > 0 && !checked) {
              setChecked(true);
              onComplete();
            }
          }}
        />
        {!checked ? (
          <Button
            tone="primary"
            size="md"
            disabled={value.trim().length === 0}
            onClick={() => {
              setChecked(true);
              onComplete();
            }}
          >
            Check
          </Button>
        ) : null}
      </div>

      {checked ? (
        <div className="mt-4 animate-fade-up space-y-3">
          <div
            className={cn(
              "flex items-center gap-2 text-[13px] font-semibold",
              correct ? "text-done" : "text-medium",
            )}
          >
            {correct ? (
              <IconCheck size={14} className="animate-check" />
            ) : (
              <IconAlert size={14} />
            )}
            {correct ? "That matches" : "Not quite — read on"}
          </div>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-dim">
            {block.answer}
          </p>
        </div>
      ) : null}

      {completed && !checked ? (
        <Badge tone="done" className="mt-3">
          <IconCheck size={10} />
          Answered earlier
        </Badge>
      ) : null}
    </Card>
  );
}

/* ------------------------------ Explain ---------------------------- */

function Explain({
  block,
  completed,
  onComplete,
}: {
  block: LessonBlock;
  completed: boolean;
  onComplete: () => void;
}) {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const keywords = block.keywords ?? [];
  const covered = keywordCoverage(value, keywords);

  return (
    <Card className="max-w-2xl p-5">
      {completed && !revealed ? (
        <Badge tone="done" className="mb-3">
          <IconCheck size={10} />
          Answered earlier
        </Badge>
      ) : null}
      <div className="mono-label mb-3 flex items-center gap-2 text-info">
        <IconQuiz size={12} />
        Explain
      </div>

      {block.title ? (
        <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}

      {block.code ? (
        <CodePane
          code={block.code.code}
          language={block.code.language ?? "kotlin"}
          copyable={false}
          className="mb-4"
        />
      ) : null}

      <p className="text-[14px] leading-relaxed text-fg-dim">{block.question}</p>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={revealed}
        rows={5}
        placeholder="In your own words. Saying it badly and then reading the answer teaches more than reading the answer first."
        className="mt-3 w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13.5px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-70"
      />

      {!revealed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            tone="primary"
            size="sm"
            disabled={value.trim().length < 15}
            onClick={() => {
              setRevealed(true);
              onComplete();
            }}
          >
            <IconEye size={13} />
            Show the answer
          </Button>
          <span className="mono-meta text-faint">
            {value.trim().length < 15 ? "Commit to something first" : "Ready"}
          </span>
        </div>
      ) : (
        <div className="mt-4 animate-fade-up space-y-3">
          {keywords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mono-label mr-1 text-subtle">You mentioned</span>
              {keywords.map((k) => (
                <Badge key={k} tone={covered.includes(k) ? "done" : "neutral"}>
                  {covered.includes(k) ? <IconCheck size={10} /> : null}
                  {k}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
            <div className="mono-label mb-2.5 flex items-center gap-2 text-accent">
              <IconSpark size={12} />
              Answer
            </div>
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-dim">
              {block.answer}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------- Quiz ------------------------------ */

function Quiz({
  block,
  completed,
  onComplete,
}: {
  block: LessonBlock;
  completed: boolean;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const choices = block.choices ?? [];

  return (
    <Card className="max-w-2xl p-5">
      {completed && !answered ? (
        <Badge tone="done" className="mb-3">
          <IconCheck size={10} />
          Answered earlier
        </Badge>
      ) : null}
      <div className="mono-label mb-3 flex items-center gap-2 text-violet">
        <IconQuiz size={12} />
        Check yourself
      </div>

      <p className="text-[14.5px] font-semibold leading-snug text-fg">
        {block.question}
      </p>

      <ul className="mt-4 space-y-2">
        {choices.map((choice: QuizChoice, i) => {
          const state = !answered
            ? selected === choice.id
              ? "selected"
              : "idle"
            : choice.correct
              ? "correct"
              : selected === choice.id
                ? "wrong"
                : "muted";

          return (
            <li key={choice.id}>
              <div
                className={cn(
                  "rounded-lg border transition-all duration-200",
                  state === "idle" && "border-line bg-surface hover:border-line-strong",
                  state === "selected" && "border-accent/45 bg-accent/[0.06]",
                  state === "correct" && "border-done/40 bg-done/[0.06]",
                  state === "wrong" && "border-hard/40 bg-hard/[0.06]",
                  state === "muted" && "border-line bg-surface/60",
                )}
              >
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setSelected(choice.id);
                    setAnswered(true);
                    onComplete();
                  }}
                  className="flex w-full items-start gap-3 p-3.5 text-left"
                >
                  <span
                    className={cn(
                      "mono-meta mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded ring-1 ring-inset",
                      state === "correct"
                        ? "bg-done/15 text-done ring-done/30"
                        : state === "wrong"
                          ? "bg-hard/15 text-hard ring-hard/30"
                          : "bg-surface-2 text-subtle ring-line-strong",
                    )}
                  >
                    {state === "correct" ? (
                      <IconCheck size={11} />
                    ) : state === "wrong" ? (
                      <IconX size={11} />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="flex-1 text-[13.5px] leading-relaxed text-fg-dim">
                    {choice.body}
                  </span>
                </button>

                {answered ? (
                  <p className="animate-fade-in border-t border-line/70 px-3.5 py-2.5 pl-[46px] text-[12.5px] leading-relaxed text-muted">
                    {choice.rationale}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------ Compare ---------------------------- */

function Compare({ block }: { block: LessonBlock }) {
  return (
    <div className="space-y-3">
      {block.title ? (
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {block.compare?.map((item, i) => (
          <Card key={i} className="flex flex-col overflow-hidden">
            <div className="border-b border-line bg-surface/60 px-4 py-2.5">
              <span className="mono-label text-fg-dim">{item.label}</span>
            </div>
            <CodePane
              code={item.code}
              language="kotlin"
              showLineNumbers={false}
              copyable={false}
              className="rounded-none border-0"
            />
            <p className="border-t border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
              {item.verdict}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Pipeline --------------------------- */

function Pipeline({ block }: { block: LessonBlock }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {block.title ? (
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}

      <Card className="p-5">
        <ol className="space-y-1">
          {block.stages?.map((stage, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                  active === i ? "bg-surface-2" : "bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "mono-meta flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors",
                    active === i
                      ? "bg-accent/15 text-accent ring-accent/30"
                      : "bg-surface-2 text-subtle ring-line-strong",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[13px] text-fg-dim">
                    {stage.label}
                  </span>
                  {stage.caption ? (
                    <span className="block text-[12.5px] text-subtle">
                      {stage.caption}
                    </span>
                  ) : null}
                </span>
              </button>
              {i < (block.stages?.length ?? 0) - 1 ? (
                <div className="flex items-center pl-[26px] text-faint">
                  <IconArrowDown size={13} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      {block.body?.map((p, i) => (
        <p key={i} className="max-w-2xl text-[13.5px] leading-relaxed text-muted">
          {p}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------ Mutation --------------------------- */

function Mutation({ block }: { block: LessonBlock }) {
  const [step, setStep] = useState(0);
  const steps = block.steps ?? [];
  const current = steps[Math.min(step, steps.length - 1)];

  return (
    <div className="max-w-2xl space-y-3">
      {block.title ? (
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-col items-center gap-1">
          <span className="mono-meta rounded-md border border-line bg-surface-2 px-3 py-1.5 text-accent">
            users
          </span>
          <span className="text-faint">
            <IconArrowDown size={15} />
          </span>
          <span className="mono-label text-subtle">MutableList&lt;String&gt;</span>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {current?.items.map((item, i) => (
              <span
                key={`${step}-${item}-${i}`}
                className={cn(
                  "mono-meta rounded-md border px-3 py-2 transition-all duration-300",
                  step > 0 && i === current.items.length - 1
                    ? "animate-fade-up border-accent/40 bg-accent/10 text-accent"
                    : "border-line bg-bg-raised text-fg-dim",
                )}
              >
                &quot;{item}&quot;
              </span>
            ))}
          </div>

          <div className="mono-label mt-4 text-subtle">{current?.label}</div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                step === i ? "w-6 bg-accent" : "w-1.5 bg-surface-3",
              )}
            />
          ))}
          {step < steps.length - 1 ? (
            <Button
              tone="ghost"
              size="sm"
              className="ml-3"
              onClick={() => setStep((s) => s + 1)}
            >
              Run add()
              <IconArrowRight size={13} />
            </Button>
          ) : (
            <Button
              tone="ghost"
              size="sm"
              className="ml-3"
              onClick={() => setStep(0)}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {block.body?.map((p, i) => (
        <p key={i} className="text-[13.5px] leading-relaxed text-muted">
          {p}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------ Callout ---------------------------- */

function Callout({ block }: { block: LessonBlock }) {
  const tones = {
    insight: {
      wrap: "border-accent/25 bg-accent/[0.05]",
      label: "text-accent",
      icon: <IconLightbulb size={13} />,
      title: "Insight",
    },
    warning: {
      wrap: "border-hard/25 bg-hard/[0.05]",
      label: "text-hard",
      icon: <IconAlert size={13} />,
      title: "Watch out",
    },
    why: {
      wrap: "border-info/25 bg-info/[0.05]",
      label: "text-info",
      icon: <IconQuiz size={13} />,
      title: "Why",
    },
  } as const;

  const tone = tones[block.tone ?? "insight"];

  return (
    <div className={cn("max-w-2xl rounded-xl border p-5", tone.wrap)}>
      <div className={cn("mono-label mb-3 flex items-center gap-2", tone.label)}>
        {tone.icon}
        {block.title ?? tone.title}
      </div>
      <ul className="space-y-2">
        {block.body?.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={cn(
                "mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full",
                block.tone === "warning"
                  ? "bg-hard"
                  : block.tone === "why"
                    ? "bg-info"
                    : "bg-accent",
              )}
            />
            <span className="text-[13.5px] leading-relaxed text-fg-dim">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Implement --------------------------- */

function Implement({
  block,
  onComplete,
}: {
  block: LessonBlock;
  onComplete: () => void;
}) {
  return (
    <Card className="max-w-2xl border-accent/20 p-5">
      <div className="mono-label mb-3 flex items-center gap-2 text-accent">
        <IconTerminal size={12} />
        Implement
      </div>
      {block.title ? (
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {block.title}
        </h3>
      ) : null}
      {block.body?.map((p, i) => (
        <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-muted">
          {p}
        </p>
      ))}
      {block.questionSlug ? (
        <Link
          href={`/practice/${block.questionSlug}`}
          onClick={onComplete}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[13.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
        >
          Open the editor
          <IconArrowRight size={15} />
        </Link>
      ) : null}
    </Card>
  );
}
