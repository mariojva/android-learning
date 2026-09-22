"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { Card, Button, Badge, Divider } from "@/components/ui/primitives";
import { SolutionPanel } from "./SolutionPanel";
import { AiFeedback } from "./AiFeedback";
import {
  IconBug,
  IconLightbulb,
  IconCheck,
  IconAlert,
  IconAndroid,
  IconEye,
} from "@/components/icons";
import { useProgress } from "@/lib/progress/context";
import { useRecordWhenComplete } from "@/lib/progress/completion";
import { questionAnswerRef, useRestoreAnswers } from "@/lib/progress/answers";

/**
 * The learner investigates before anything unlocks. Hints arrive one at a
 * time, and the diagnosis has to be written down before the root cause is
 * shown — otherwise it is far too easy to read the answer and believe you
 * would have found it.
 */
export function DebuggingWorkspace({ question }: { question: Question }) {
  const { recordAttempt, saveAnswer } = useProgress();
  const hints = question.debugHints ?? [];
  const ref = questionAnswerRef(question.slug, "diagnosis");

  const [diagnosis, setDiagnosis] = useState("");
  const [revealedHints, setRevealedHints] = useState(0);
  const [committed, setCommitted] = useState(false);
  /** Read the answer without diagnosing — completes, but not as correct. */
  const [bailed, setBailed] = useState(false);

  useRestoreAnswers([ref], (restored) => {
    const body = restored[ref]?.body;
    if (!body) return;
    setDiagnosis(body);
    setCommitted(true);
  });

  // Derived, so a diagnosis restored from a previous session completes the
  // exercise too — the commit button is gone by then.
  useRecordWhenComplete(question.slug, committed && !bailed);

  const commit = () => {
    setCommitted(true);
    saveAnswer(ref, { body: diagnosis });
  };

  /**
   * Reading the answer without committing a diagnosis is allowed — but it
   * still has to record something. An escape hatch that records nothing
   * leaves the exercise permanently unfinished with its only completing
   * control now hidden, which is how a lesson section ends up stuck at 88%.
   * So it completes the exercise and marks the attempt incorrect, which is
   * exactly what happened.
   */
  const revealWithoutCommitting = () => {
    setBailed(true);
    setCommitted(true);
    recordAttempt(question.slug, { solved: true, correct: false });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* --------------------------- The bug --------------------------- */}
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="border-hard/20 p-5">
            <div className="mono-label mb-3 flex items-center gap-2 text-hard">
              <IconBug size={13} />
              Reported symptom
            </div>
            <p className="text-[13.5px] leading-relaxed text-fg-dim">
              {question.symptom}
            </p>
          </Card>

          <CodePane
            code={question.brokenCode ?? ""}
            caption="The code as it ships today"
            language="kotlin"
            maxHeight={520}
          />
        </div>

        {/* ------------------------ Investigation ------------------------ */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mono-label mb-3 text-subtle">Your diagnosis</div>
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              Before any hint: what is wrong, and what evidence in the code
              supports it? Write it down — a diagnosis you have not committed to
              is a diagnosis you will believe you had all along.
            </p>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={6}
              disabled={committed}
              placeholder="e.g. Each call to load() starts a new collector and nothing cancels the previous one, so…"
              className="w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13.5px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none disabled:opacity-70"
            />

            {!committed ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  tone="primary"
                  size="sm"
                  onClick={commit}
                  disabled={diagnosis.trim().length < 20}
                >
                  <IconCheck size={13} />
                  Commit diagnosis
                </Button>
                <span className="mono-meta text-faint">
                  {diagnosis.trim().length < 20
                    ? `${20 - diagnosis.trim().length} more characters`
                    : "Ready"}
                </span>
              </div>
            ) : (
              <Badge tone="done" className="mt-3">
                <IconCheck size={10} />
                Committed
              </Badge>
            )}
          </Card>

          {/* ---------------------------- Hints ---------------------------- */}
          {hints.length > 0 ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="mono-label flex items-center gap-2 text-subtle">
                  <IconLightbulb size={12} />
                  Hints
                </div>
                <span className="mono-meta text-faint">
                  {revealedHints} / {hints.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {hints.slice(0, revealedHints).map((h, i) => (
                  <li
                    key={i}
                    className="animate-fade-up rounded-lg border border-line bg-surface-2/60 p-3"
                  >
                    <div className="mono-label mb-1.5 text-accent">{h.label}</div>
                    <p className="text-[13px] leading-relaxed text-muted">{h.body}</p>
                  </li>
                ))}
              </ul>

              {revealedHints < hints.length ? (
                <Button
                  tone="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRevealedHints((n) => n + 1)}
                >
                  <IconLightbulb size={13} />
                  {revealedHints === 0 ? "Unlock first hint" : "Unlock next hint"}
                </Button>
              ) : (
                <p className="mt-3 text-[12.5px] text-subtle">
                  Every hint is out. The answer is below once you have committed.
                </p>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      {/* ------------------------- The answer ------------------------- */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="mono-label text-subtle">Root cause & fix</h2>
          {committed ? <Badge tone="accent">Unlocked</Badge> : <Badge>Locked</Badge>}
        </div>

        {!committed ? (
          <Card className="flex flex-col items-center gap-4 border-dashed border-line-strong bg-surface/40 p-10 text-center">
            <span className="text-faint">
              <IconEye size={24} />
            </span>
            <p className="max-w-md text-[13px] leading-relaxed text-subtle">
              Commit a diagnosis first. Reading the root cause before you have
              written one feels like learning and is not — the useful part of
              debugging is the search, not the answer.
            </p>
            <Button tone="ghost" size="sm" onClick={revealWithoutCommitting}>
              Reveal anyway
            </Button>
          </Card>
        ) : (
          <div className="animate-fade-up space-y-5">
            <Card className="p-5">
              <div className="mono-label mb-3 flex items-center gap-2 text-hard">
                <IconAlert size={13} />
                Root cause
              </div>
              <p className="text-[13.5px] leading-relaxed text-fg-dim">
                {question.rootCause}
              </p>
            </Card>

            {question.fixedCode ? (
              <CodePane
                code={question.fixedCode}
                caption="Corrected implementation"
                language="kotlin"
              />
            ) : null}

            {question.productionImplications?.length ? (
              <Card className="p-5">
                <div className="mono-label mb-3.5 flex items-center gap-2 text-subtle">
                  <IconAndroid size={13} />
                  Production implications
                </div>
                <ul className="space-y-2.5">
                  {question.productionImplications.map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
                      <span className="text-[13.5px] leading-relaxed text-muted">
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {diagnosis.trim().length > 0 ? (
              <Card className="p-5">
                <div className="mono-label mb-3 text-subtle">
                  Compare with what you wrote
                </div>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted">
                  {diagnosis}
                </p>
                <Divider className="my-4" />
                <p className="text-[12.5px] leading-relaxed text-subtle">
                  Did you name the mechanism, or only the symptom? &ldquo;It
                  collects twice&rdquo; is a symptom. &ldquo;A cold flow executes
                  its upstream once per collector&rdquo; is a mechanism — and
                  mechanisms are what transfer to the next bug.
                </p>
                <AiFeedback
                  cacheRef={ref}
                  questionTitle={question.title}
                  prompt={question.symptom ?? ""}
                  referenceAnswer={question.rootCause ?? ""}
                  userAnswer={diagnosis}
                />
              </Card>
            ) : null}

            <SolutionPanel question={question} />
          </div>
        )}
      </section>
    </div>
  );
}
