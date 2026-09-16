"use client";

import { useMemo, useState } from "react";
import type { Question, ReviewFinding, ReviewSeverity } from "@/lib/types";
import { highlightKotlin } from "@/components/ui/code";
import { Card, Button, Badge, Divider } from "@/components/ui/primitives";
import { SolutionPanel } from "./SolutionPanel";
import {
  IconCheck,
  IconX,
  IconAlert,
  IconPlus,
  IconSubmit,
  IconEye,
  IconNote,
  IconSpark,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";

/* ------------------------------------------------------------------
   Code review.

   The other formats ask whether you can produce correct code. This one
   asks whether you can read someone else's and say something useful
   about it — which is the skill that actually shows up in a standup.

   Grading free text is not possible honestly, so the exercise grades
   *attention* instead: did you comment on the line where the problem
   lives, and did you weight it the way a senior reviewer would? The
   reasoning is then shown side by side with your own note and you mark
   yourself. Anchoring is the part a machine can check; judgement is the
   part you have to check.
   ------------------------------------------------------------------ */

/** How far from a finding's anchor a comment still counts as catching it. */
const NEAR = 2;

const SEVERITY: Record<
  ReviewSeverity,
  { label: string; tone: "danger" | "warn" | "neutral" | "done"; blurb: string }
> = {
  blocking: {
    label: "Blocking",
    tone: "danger",
    blurb: "Merging this ships a defect.",
  },
  "should-fix": {
    label: "Should fix",
    tone: "warn",
    blurb: "Not a defect today; a defect eventually.",
  },
  nit: {
    label: "Nit",
    tone: "neutral",
    blurb: "Preference. Say so, then let it go.",
  },
  praise: {
    label: "Praise",
    tone: "done",
    blurb: "Worth naming so it gets repeated.",
  },
};

const DECISIONS = [
  {
    id: "approve" as const,
    label: "Approve",
    blurb: "Ship it. Anything left is the author's call.",
  },
  {
    id: "comment" as const,
    label: "Comment",
    blurb: "Questions worth answering, nothing that blocks.",
  },
  {
    id: "request-changes" as const,
    label: "Request changes",
    blurb: "Something here should not reach main.",
  },
];

interface Draft {
  severity: ReviewSeverity;
  body: string;
}

export function CodeReviewWorkspace({ question }: { question: Question }) {
  const brief = question.review;
  const findings = useMemo(
    () => question.reviewFindings ?? [],
    [question.reviewFindings],
  );
  const lines = useMemo(
    () => (question.reviewCode ?? "").replace(/\n$/, "").split("\n"),
    [question.reviewCode],
  );
  const { recordAttempt } = useProgress();

  const [comments, setComments] = useState<Record<number, Draft>>({});
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [composer, setComposer] = useState<Draft>({
    severity: "should-fix",
    body: "",
  });
  const [decision, setDecision] =
    useState<(typeof DECISIONS)[number]["id"] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const commentedLines = Object.keys(comments).map(Number);

  const openComposer = (line: number) => {
    if (submitted) return;
    const existing = comments[line];
    setComposer(existing ?? { severity: "should-fix", body: "" });
    setActiveLine(line);
  };

  const saveComment = () => {
    if (activeLine === null || composer.body.trim().length === 0) return;
    setComments((prev) => ({ ...prev, [activeLine]: composer }));
    setActiveLine(null);
    setComposer({ severity: "should-fix", body: "" });
  };

  const removeComment = (line: number) => {
    setComments((prev) => {
      const next = { ...prev };
      delete next[line];
      return next;
    });
  };

  /* ---------------------------- scoring ---------------------------- */

  const near = (finding: ReviewFinding, line: number) => {
    const lo = finding.line - NEAR;
    const hi = (finding.throughLine ?? finding.line) + NEAR;
    return line >= lo && line <= hi;
  };

  const results = useMemo(() => {
    const caught: { finding: ReviewFinding; line: number; draft: Draft }[] = [];
    const missed: ReviewFinding[] = [];
    const usedLines = new Set<number>();

    for (const finding of findings) {
      // One comment catches one issue. Without this, two findings on
      // adjacent lines would both be credited to a single note, and the
      // score would flatter the reader.
      const hit = commentedLines.find(
        (line) => !usedLines.has(line) && near(finding, line),
      );
      if (hit === undefined) {
        missed.push(finding);
      } else {
        usedLines.add(hit);
        caught.push({ finding, line: hit, draft: comments[hit]! });
      }
    }

    const additional = commentedLines
      .filter((line) => !usedLines.has(line))
      .sort((a, b) => a - b);

    const blocking = findings.filter((f) => f.severity === "blocking");
    const caughtBlocking = caught.filter(
      (c) => c.finding.severity === "blocking",
    );

    return { caught, missed, additional, blocking, caughtBlocking };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, comments, submitted]);

  const submit = () => {
    if (!decision) return;
    setSubmitted(true);
    const allBlockingCaught =
      results.blocking.length === 0 ||
      results.caughtBlocking.length === results.blocking.length;
    const verdictRight = decision === question.reviewVerdict?.decision;
    recordAttempt(question.slug, {
      solved: true,
      correct: allBlockingCaught && verdictRight,
    });
  };

  /* Lines carrying a reference finding, revealed only after submitting. */
  const findingByLine = new Map<number, ReviewFinding>();
  if (submitted) {
    for (const f of findings) findingByLine.set(f.line, f);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ------------------------ The pull request ----------------------- */}
      <div className="space-y-4">
        {brief ? (
          <Card className="p-5">
            <div className="mono-label mb-3 flex flex-wrap items-center gap-2 text-subtle">
              <Badge tone="violet">Pull request</Badge>
              <span className="text-faint">opened by {brief.author}</span>
            </div>
            <h2 className="text-[16px] font-semibold leading-snug tracking-tight text-fg">
              {brief.prTitle}
            </h2>
            <div className="mt-3 space-y-2">
              {brief.description.map((p, i) => (
                <p key={i} className="text-[13.5px] leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </div>

            {brief.filesChanged?.length ? (
              <>
                <Divider className="my-4" />
                <div className="mono-label mb-2 text-subtle">Files changed</div>
                <ul className="space-y-1">
                  {brief.filesChanged.map((f) => (
                    <li key={f} className="mono-meta text-fg-dim">
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {brief.context?.length ? (
              <>
                <Divider className="my-4" />
                <div className="mono-label mb-2 text-subtle">
                  What you already know about this codebase
                </div>
                <ul className="space-y-1.5">
                  {brief.context.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13px] leading-relaxed text-muted"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint" />
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        ) : null}

        {/* -------------------------- The diff -------------------------- */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface/60 px-4 py-2.5">
            <span className="mono-label text-subtle">
              {submitted ? "Reviewed" : "Click any line to leave a comment"}
            </span>
            <span className="mono-label text-faint">
              {commentedLines.length}{" "}
              {commentedLines.length === 1 ? "comment" : "comments"}
            </span>
          </div>

          <div className="overflow-auto" style={{ maxHeight: 640 }}>
            <div className="min-w-full py-2 font-mono text-[12.5px] leading-[1.65]">
              {lines.map((line, i) => {
                const n = i + 1;
                const mine = comments[n];
                const ref = findingByLine.get(n);
                return (
                  <div key={n}>
                    <button
                      type="button"
                      onClick={() => openComposer(n)}
                      disabled={submitted}
                      className={cn(
                        "flex w-full px-3.5 text-left transition-colors",
                        !submitted && "hover:bg-surface-2/60",
                        activeLine === n && "bg-accent/[0.07]",
                        mine &&
                          "shadow-[inset_2px_0_0_0_var(--color-accent)] bg-accent/[0.04]",
                        ref &&
                          !mine &&
                          "shadow-[inset_2px_0_0_0_var(--color-hard)] bg-hard/[0.06]",
                      )}
                    >
                      <span className="mr-4 w-7 shrink-0 select-none text-right text-faint">
                        {n}
                      </span>
                      <span className="whitespace-pre text-fg-dim">
                        {highlightKotlin(line)}
                        {line.length === 0 ? " " : null}
                      </span>
                    </button>

                    {/* The learner's own note, inline where they left it. */}
                    {mine && activeLine !== n ? (
                      <InlineNote
                        severity={mine.severity}
                        body={mine.body}
                        onRemove={submitted ? undefined : () => removeComment(n)}
                        onEdit={submitted ? undefined : () => openComposer(n)}
                      />
                    ) : null}

                    {/* The composer, anchored under the line being discussed. */}
                    {activeLine === n && !submitted ? (
                      <div className="animate-fade-up border-y border-line bg-surface/80 px-3.5 py-3 font-sans">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {(
                            Object.keys(SEVERITY) as ReviewSeverity[]
                          ).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setComposer((c) => ({ ...c, severity: s }))
                              }
                              className={cn(
                                "mono-label rounded-md border px-2 py-1 transition-colors",
                                composer.severity === s
                                  ? "border-accent/40 bg-accent/10 text-accent"
                                  : "border-line text-subtle hover:text-fg-dim",
                              )}
                            >
                              {SEVERITY[s].label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          autoFocus
                          value={composer.body}
                          onChange={(e) =>
                            setComposer((c) => ({ ...c, body: e.target.value }))
                          }
                          rows={3}
                          placeholder={`Line ${n} — what would you say to the author, and why does it matter?`}
                          className="w-full resize-none rounded-lg border border-line bg-bg-raised p-3 text-[13px] leading-relaxed text-fg-dim placeholder:text-faint focus:border-line-strong focus:outline-none"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            tone="primary"
                            size="sm"
                            onClick={saveComment}
                            disabled={composer.body.trim().length === 0}
                          >
                            <IconPlus size={13} />
                            Add comment
                          </Button>
                          <Button
                            tone="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveLine(null);
                              setComposer({
                                severity: "should-fix",
                                body: "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <span className="mono-meta ml-auto text-faint">
                            {SEVERITY[composer.severity].blurb}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* After submitting, the reference comment for this line. */}
                    {ref ? <ReferenceNote finding={ref} /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* --------------------------- Your review ------------------------- */}
      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        {!submitted ? (
          <Card className="p-5">
            <div className="mono-label mb-3 flex items-center gap-2 text-subtle">
              <IconNote size={13} />
              Your review
            </div>

            {commentedLines.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted">
                Nothing yet. Read the description, then the code, and comment on
                the lines that would make you pause if this landed in your
                inbox on a Friday afternoon.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {commentedLines
                  .sort((a, b) => a - b)
                  .map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <Badge tone={SEVERITY[comments[line]!.severity].tone}>
                        L{line}
                      </Badge>
                      <p className="flex-1 text-[12.5px] leading-relaxed text-muted">
                        {comments[line]!.body}
                      </p>
                    </li>
                  ))}
              </ul>
            )}

            <Divider className="my-5" />

            <div className="mono-label mb-2.5 text-subtle">Verdict</div>
            <div className="space-y-2">
              {DECISIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDecision(d.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    decision === d.id
                      ? "border-accent/40 bg-accent/[0.07]"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <div
                    className={cn(
                      "text-[13.5px] font-semibold",
                      decision === d.id ? "text-accent" : "text-fg-dim",
                    )}
                  >
                    {d.label}
                  </div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-subtle">
                    {d.blurb}
                  </div>
                </button>
              ))}
            </div>

            <Button
              tone="primary"
              size="md"
              className="mt-4 w-full"
              onClick={submit}
              disabled={!decision}
            >
              <IconSubmit size={14} />
              Submit review
            </Button>
            <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
              You can submit with no comments. An approve that misses something
              is itself a result worth seeing.
            </p>
          </Card>
        ) : (
          <ReviewScore question={question} results={results} decision={decision} />
        )}
      </div>

      {submitted ? (
        <div className="xl:col-span-2">
          <SolutionPanel question={question} />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ pieces ----------------------------- */

function InlineNote({
  severity,
  body,
  onRemove,
  onEdit,
}: {
  severity: ReviewSeverity;
  body: string;
  onRemove?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="border-y border-line bg-surface/60 px-3.5 py-2.5 font-sans">
      <div className="flex items-start gap-2.5">
        <Badge tone={SEVERITY[severity].tone}>{SEVERITY[severity].label}</Badge>
        <p className="flex-1 text-[12.5px] leading-relaxed text-fg-dim">{body}</p>
        <div className="flex shrink-0 gap-1">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="mono-meta text-faint transition-colors hover:text-fg-dim"
            >
              edit
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove comment"
              className="text-faint transition-colors hover:text-hard"
            >
              <IconX size={12} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReferenceNote({ finding }: { finding: ReviewFinding }) {
  return (
    <div className="animate-fade-up border-y border-accent/20 bg-accent/[0.05] px-3.5 py-3 font-sans">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone="accent">
          <IconSpark size={10} />
          Reviewer
        </Badge>
        <Badge tone={SEVERITY[finding.severity].tone}>
          {SEVERITY[finding.severity].label}
        </Badge>
        <span className="mono-meta text-faint">
          line {finding.line}
          {finding.throughLine ? `–${finding.throughLine}` : ""}
        </span>
      </div>
      <div className="text-[13px] font-semibold text-fg-dim">
        {finding.summary}
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-muted">
        {finding.detail}
      </p>
    </div>
  );
}

function ReviewScore({
  question,
  results,
  decision,
}: {
  question: Question;
  results: {
    caught: { finding: ReviewFinding; line: number; draft: Draft }[];
    missed: ReviewFinding[];
    additional: number[];
    blocking: ReviewFinding[];
    caughtBlocking: { finding: ReviewFinding }[];
  };
  decision: string | null;
}) {
  const total = results.caught.length + results.missed.length;
  const verdict = question.reviewVerdict;
  const verdictRight = decision === verdict?.decision;

  /* Caught the line but weighted it differently to the reference. */
  const misweighted = results.caught.filter(
    (c) => c.draft.severity !== c.finding.severity,
  );

  return (
    <div className="animate-fade-up space-y-4">
      <Card className="p-5">
        <div className="mono-label mb-4 text-subtle">Review compared</div>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Issues found"
            value={`${results.caught.length} / ${total}`}
            tone={results.caught.length === total ? "done" : "neutral"}
          />
          <Stat
            label="Blocking found"
            value={`${results.caughtBlocking.length} / ${results.blocking.length}`}
            tone={
              results.caughtBlocking.length === results.blocking.length
                ? "done"
                : "danger"
            }
          />
        </div>

        <Divider className="my-5" />

        <div className="mono-label mb-2 text-subtle">Your verdict</div>
        <div className="flex items-center gap-2">
          {verdictRight ? (
            <Badge tone="done">
              <IconCheck size={10} />
              Matched
            </Badge>
          ) : (
            <Badge tone="warn">
              <IconAlert size={10} />
              Reviewer said &ldquo;{verdict?.decision}&rdquo;
            </Badge>
          )}
        </div>
        {verdict ? (
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            {verdict.rationale}
          </p>
        ) : null}
      </Card>

      {misweighted.length > 0 ? (
        <Card className="p-5">
          <div className="mono-label mb-3 flex items-center gap-2 text-medium">
            <IconAlert size={13} />
            Weighted differently
          </div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
            You found these, but called them something other than the reviewer
            did. Calibration is the difference between a review people act on
            and one they skim.
          </p>
          <ul className="space-y-2.5">
            {misweighted.map((c) => (
              <li key={c.finding.id} className="flex flex-wrap items-center gap-2">
                <span className="mono-meta text-faint">L{c.finding.line}</span>
                <Badge tone={SEVERITY[c.draft.severity].tone}>
                  you: {SEVERITY[c.draft.severity].label}
                </Badge>
                <Badge tone={SEVERITY[c.finding.severity].tone}>
                  reviewer: {SEVERITY[c.finding.severity].label}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {results.missed.length > 0 ? (
        <Card className="p-5">
          <div className="mono-label mb-3 flex items-center gap-2 text-hard">
            <IconEye size={13} />
            Missed — marked in the diff
          </div>
          <ul className="space-y-3">
            {results.missed.map((f) => (
              <li key={f.id}>
                <div className="flex items-center gap-2">
                  <span className="mono-meta text-faint">L{f.line}</span>
                  <Badge tone={SEVERITY[f.severity].tone}>
                    {SEVERITY[f.severity].label}
                  </Badge>
                </div>
                <div className="mt-1 text-[13px] font-medium text-fg-dim">
                  {f.summary}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {results.additional.length > 0 ? (
        <Card className="p-5">
          <div className="mono-label mb-2 text-subtle">
            Your other {results.additional.length}{" "}
            {results.additional.length === 1 ? "comment" : "comments"}
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Lines {results.additional.map((l) => `L${l}`).join(", ")} were not in
            the reference review. That does not make them wrong — reviewers
            legitimately raise things a checklist does not. It is worth asking of
            each one whether the author would be glad you said it.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "done" | "danger" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface/60 p-3">
      <div className="mono-label text-subtle">{label}</div>
      <div
        className={cn(
          "mt-1 text-[20px] font-semibold tabular-nums tracking-tight",
          tone === "done" && "text-done",
          tone === "danger" && "text-hard",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}
