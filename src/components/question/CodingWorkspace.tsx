"use client";

import { useCallback, useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import { CodeEditor } from "./CodeEditor";
import { SolutionPanel, SolutionLock } from "./SolutionPanel";
import { Card, Button, Badge, Divider } from "@/components/ui/primitives";
import { CodePane, Tok } from "@/components/ui/code";
import {
  IconPlay,
  IconSubmit,
  IconCheck,
  IconX,
  IconRefresh,
  IconLightbulb,
  IconTimer,
  IconAlert,
  IconNote,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";
import { runKotlin, type RunResult } from "@/lib/kotlin-runner";

type EditorTab = "code" | "tests" | "notes";

export function CodingWorkspace({ question }: { question: Question }) {
  const { progress, recordAttempt, setNote } = useProgress();
  const attempt = progress.attempts[question.slug];

  const [code, setCode] = useState(
    attempt?.code ?? question.starterCode ?? "",
  );
  const [tab, setTab] = useState<EditorTab>("code");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [submitted, setSubmitted] = useState(Boolean(attempt?.solved));
  const [revealedHints, setRevealedHints] = useState(0);
  const [forceSolution, setForceSolution] = useState(false);

  const visibleTests = useMemo(
    () => (question.tests ?? []).filter((t) => !t.hidden),
    [question.tests],
  );

  const run = useCallback(
    async (isSubmit: boolean) => {
      setRunning(true);
      try {
        const payload: RunResult = await runKotlin(question, code);
        setResult(payload);

        if (isSubmit) {
          const solved = payload.total > 0 && payload.passed === payload.total;
          setSubmitted(true);
          recordAttempt(question.slug, {
            solved,
            correct: solved,
            passedTests: payload.passed,
            totalTests: payload.total,
            runtimeMs: payload.runtimeMs,
            code,
          });
        }
      } finally {
        setRunning(false);
      }
    },
    [code, question, recordAttempt],
  );

  const solutionUnlocked =
    forceSolution || submitted || Boolean(attempt?.solved);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ------------------------- Problem ------------------------- */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mono-label mb-3 text-subtle">Problem</div>
            <p className="text-[13.5px] leading-relaxed text-fg-dim">
              {question.prompt}
            </p>

            {question.requirements?.length ? (
              <>
                <Divider className="my-5" />
                <div className="mono-label mb-3 text-subtle">Requirements</div>
                <ul className="space-y-2">
                  {question.requirements.map((r, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mono-meta mt-[2px] shrink-0 text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] leading-relaxed text-muted">
                        {r}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {question.examples?.length ? (
              <>
                <Divider className="my-5" />
                <div className="mono-label mb-3 text-subtle">Examples</div>
                <div className="space-y-2.5">
                  {question.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-line bg-bg-raised p-3"
                    >
                      <div className="mono-meta text-muted">
                        <span className="text-faint">in&nbsp;&nbsp;</span>
                        {ex.input}
                      </div>
                      <div className="mono-meta mt-1.5 text-accent-soft">
                        <span className="text-faint">out&nbsp;</span>
                        {ex.output}
                      </div>
                      {ex.note ? (
                        <div className="mt-2 text-[12.5px] text-subtle">{ex.note}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {question.constraints?.length ? (
              <>
                <Divider className="my-5" />
                <div className="mono-label mb-3 text-subtle">Constraints</div>
                <ul className="space-y-1.5">
                  {question.constraints.map((c, i) => (
                    <li key={i} className="mono-meta text-muted">
                      · {c}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {question.relatedConcepts?.length ? (
              <>
                <Divider className="my-5" />
                <div className="mono-label mb-3 text-subtle">Related concepts</div>
                <div className="flex flex-wrap gap-1.5">
                  {question.relatedConcepts.map((c) => (
                    <Tok key={c}>{c}</Tok>
                  ))}
                </div>
              </>
            ) : null}
          </Card>

          {question.hints?.length ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="mono-label flex items-center gap-2 text-subtle">
                  <IconLightbulb size={12} />
                  Hints
                </div>
                <span className="mono-meta text-faint">
                  {revealedHints} / {question.hints.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {question.hints.slice(0, revealedHints).map((h, i) => (
                  <li
                    key={i}
                    className="animate-fade-up rounded-lg border border-line bg-surface-2/60 p-3 text-[13px] leading-relaxed text-muted"
                  >
                    <span className="mono-label mr-2 text-accent">
                      Hint {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>

              {revealedHints < question.hints.length ? (
                <Button
                  tone="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRevealedHints((n) => n + 1)}
                >
                  <IconLightbulb size={13} />
                  {revealedHints === 0 ? "Reveal first hint" : "Next hint"}
                </Button>
              ) : (
                <p className="mt-3 text-[12.5px] text-subtle">
                  That is every hint. The rest is yours.
                </p>
              )}
            </Card>
          ) : null}
        </div>

        {/* -------------------------- Editor -------------------------- */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-surface/60 px-2">
              <div className="flex">
                {(["code", "tests", "notes"] as EditorTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "relative px-3.5 py-2.5 text-[12.5px] capitalize transition-colors",
                      tab === t ? "text-fg" : "text-subtle hover:text-muted",
                    )}
                  >
                    {t}
                    <span
                      className={cn(
                        "absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent transition-opacity",
                        tab === t ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="mono-label pr-2 text-faint">Kotlin</span>
            </div>

            {tab === "code" ? (
              <CodeEditor value={code} onChange={setCode} height={440} />
            ) : null}

            {tab === "tests" ? (
              <div className="max-h-[440px] overflow-y-auto p-4">
                <p className="mb-3 text-[12.5px] text-subtle">
                  {visibleTests.length} visible test
                  {visibleTests.length === 1 ? "" : "s"}
                  {(question.tests?.length ?? 0) > visibleTests.length
                    ? ` · ${(question.tests?.length ?? 0) - visibleTests.length} hidden`
                    : ""}
                </p>
                <ul className="space-y-2">
                  {visibleTests.map((t) => (
                    <li
                      key={t.name}
                      className="rounded-lg border border-line bg-bg-raised p-3"
                    >
                      <div className="text-[12.5px] text-fg-dim">{t.name}</div>
                      <div className="mono-meta mt-2 text-muted">{t.call}</div>
                      <div className="mono-meta mt-1 text-accent-soft">
                        → {t.expected}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tab === "notes" ? (
              <NotesTab
                value={progress.notes[question.slug]?.body ?? ""}
                onChange={(body) => setNote(question.slug, body)}
              />
            ) : null}

            <div className="flex items-center gap-2 border-t border-line bg-surface/60 px-3 py-2.5">
              <Button
                tone="secondary"
                size="sm"
                disabled={running}
                onClick={() => void run(false)}
              >
                <IconPlay size={12} />
                Run
              </Button>
              <Button
                tone="primary"
                size="sm"
                disabled={running}
                onClick={() => void run(true)}
              >
                <IconSubmit size={13} />
                Submit
              </Button>
              <Button
                tone="ghost"
                size="sm"
                onClick={() => {
                  setCode(question.starterCode ?? "");
                  setResult(null);
                }}
              >
                <IconRefresh size={13} />
                Reset
              </Button>
              <span className="mono-meta ml-auto text-faint">
                {attempt ? `${attempt.attempts} attempt${attempt.attempts === 1 ? "" : "s"}` : "No attempts yet"}
              </span>
            </div>
          </Card>

          {running ? (
            <Card className="p-4">
              <div className="mono-meta flex items-center gap-2 text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Running tests…
              </div>
            </Card>
          ) : null}

          {result && !running ? <ResultPanel result={result} /> : null}
        </div>
      </div>

      {/* ------------------------- Solution ------------------------- */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="mono-label text-subtle">Solution</h2>
          {solutionUnlocked ? (
            <Badge tone="accent">Unlocked</Badge>
          ) : (
            <Badge>Locked</Badge>
          )}
        </div>

        {solutionUnlocked ? (
          <div className="animate-fade-up space-y-5">
            {question.solutionCode ? (
              <CodePane
                code={question.solutionCode}
                caption="Reference solution"
                language="kotlin"
              />
            ) : null}
            <SolutionPanel question={question} />
          </div>
        ) : (
          <SolutionLock
            reason="Submit an attempt first. The value of this page is in what you notice while you are stuck — reading the answer early spends that for nothing."
            onUnlock={() => setForceSolution(true)}
          />
        )}
      </section>
    </div>
  );
}

function ResultPanel({ result }: { result: RunResult }) {
  const allPassed = result.total > 0 && result.passed === result.total;

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3",
          allPassed
            ? "border-done/20 bg-done/[0.07]"
            : result.compiled
              ? "border-medium/20 bg-medium/[0.06]"
              : "border-hard/20 bg-hard/[0.06]",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 text-[13px] font-semibold",
            allPassed ? "text-done" : result.compiled ? "text-medium" : "text-hard",
          )}
        >
          {allPassed ? (
            <IconCheck size={14} className="animate-check" />
          ) : (
            <IconAlert size={14} />
          )}
          {result.compiled
            ? `${result.passed} / ${result.total} tests passed`
            : "Did not compile"}
        </span>

        {result.compiled ? (
          <span className="mono-meta flex items-center gap-1.5 text-subtle">
            <IconTimer size={12} />
            {result.runtimeMs}ms
          </span>
        ) : null}

        {!result.executed ? (
          <span className="mono-label ml-auto rounded border border-line bg-surface px-1.5 py-1 text-faint">
            Simulated
          </span>
        ) : null}
      </div>

      {result.compileError ? (
        <div className="border-b border-line px-4 py-3">
          <p className="mono-meta text-hard">{result.compileError}</p>
        </div>
      ) : null}

      {result.results.length > 0 ? (
        <ul className="divide-y divide-line">
          {result.results.map((t) => (
            <li key={t.name} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-[3px] shrink-0">
                {t.passed ? (
                  <IconCheck size={13} className="text-done" />
                ) : (
                  <IconX size={13} className="text-hard" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-fg-dim">{t.name}</div>
                <div className="mono-meta mt-1 truncate text-subtle">{t.call}</div>
              </div>
              <div className="mono-meta shrink-0 text-right">
                <span className={t.passed ? "text-done" : "text-subtle"}>
                  {t.expected}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {result.notice ? (
        <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-subtle">
          {result.notice}
        </p>
      ) : null}
    </Card>
  );
}

function NotesTab({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="p-4" style={{ height: 440 }}>
      <div className="mono-label mb-2.5 flex items-center gap-2 text-subtle">
        <IconNote size={12} />
        Your notes
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What did you notice? What would you do differently? Notes are saved automatically and collected on the Bookmarks page."
        className="h-[calc(100%-32px)] w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none"
      />
    </div>
  );
}
