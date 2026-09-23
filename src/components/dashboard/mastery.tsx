"use client";

import Link from "next/link";
import { Card, Badge } from "@/components/ui/primitives";
import { IconArrowRight, IconSpark } from "@/components/icons";
import {
  STAGE_LABELS,
  OWNERSHIP_LABELS,
  OWNERSHIP_BLURBS,
  type ConceptProgress,
  type OwnershipProgress,
} from "@/lib/progress/mastery";
import { REVIEW_DAYS } from "@/lib/progress/mastery";
import { MASTERY_STAGES, type ConceptProficiency } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Mastery visualisations.

   Both of the scales here are ORDINAL — five stages of understanding,
   five levels of ownership. That decides the encoding: one hue in five
   monotone steps, not five separate colours. Five hues would claim these
   are different kinds of thing, when what they are is the same thing
   further along.

   Nothing is identified by colour alone. Every step carries its label,
   so the meaning survives greyscale, colourblindness and a screenshot.
   ------------------------------------------------------------------ */

const ORD = [
  "bg-ord-1",
  "bg-ord-2",
  "bg-ord-3",
  "bg-ord-4",
  "bg-ord-5",
] as const;

/** Five pips, filled up to where you are. The label is the identity. */
export function MasteryMeter({
  progress,
  showLabels = true,
}: {
  progress: ConceptProgress;
  showLabels?: boolean;
}) {
  const reached = progress.cleared.length;

  return (
    <div className="flex items-center gap-1.5">
      {MASTERY_STAGES.map((stage, i) => {
        const filled = progress.mastery[stage];
        return (
          <span
            key={stage}
            title={STAGE_LABELS[stage]}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              filled ? ORD[i] : "bg-surface-3",
            )}
          />
        );
      })}
      {showLabels ? (
        <span className="mono-meta ml-1.5 w-20 shrink-0 text-right text-subtle">
          {reached === 0
            ? "not started"
            : (STAGE_LABELS[progress.cleared[reached - 1]] ?? "").toLowerCase()}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The lead card: one concept, where you are, and the single next thing.
 * A hero figure rather than a chart — the number *is* the chart.
 */
export function CurrentFocus({ focus }: { focus: ConceptProgress | null }) {
  if (!focus) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="mono-label mb-3 flex items-center gap-2 text-accent">
          <IconSpark size={12} />
          Current focus
        </div>
        <p className="text-[14px] leading-relaxed text-muted">
          Nothing in progress yet. Open any lesson or question and the concepts
          it covers start tracking themselves.
        </p>
        <Link
          href="/knowledge-graph"
          className="mono-meta mt-4 inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-accent"
        >
          Browse the knowledge graph
          <IconArrowRight size={12} />
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="mono-label flex items-center gap-2 text-accent">
          <IconSpark size={12} />
          Current focus
        </div>
        <Badge tone="accent">{focus.proficiency}</Badge>
      </div>

      <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-fg">
        {focus.concept.name}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        {focus.concept.why}
      </p>

      <div className="mt-5">
        <MasteryMeter progress={focus} showLabels={false} />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="mono-meta text-subtle">
            {focus.cleared.length} of {MASTERY_STAGES.length} stages
          </span>
          {focus.nextStage ? (
            <span className="text-[12.5px] text-muted">
              Next milestone:{" "}
              <span className="text-fg-dim">
                {STAGE_LABELS[focus.nextStage]}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/** Concepts you have started and not finished, deepest first. */
export function ConceptsInProgress({ items }: { items: ConceptProgress[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mono-label mb-4 text-subtle">Concepts in progress</div>
      <ul className="space-y-3.5">
        {items.map((p) => (
          <li key={p.concept.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13.5px] font-medium text-fg-dim">
                {p.concept.name}
              </span>
              <span className="mono-meta shrink-0 text-faint">
                {p.nextStage ? `next: ${STAGE_LABELS[p.nextStage]}` : "complete"}
              </span>
            </div>
            <MasteryMeter progress={p} showLabels={false} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Ownership, as bars. `percent === null` means nothing is tagged at that
 * level yet — rendered as a stated absence rather than a 0% bar, because
 * an empty bar reads as failure and this one means "no exercises exist".
 */
export function OwnershipPanel({ levels }: { levels: OwnershipProgress[] }) {
  return (
    <Card className="p-5">
      <div className="mono-label mb-1 text-subtle">Engineering ownership</div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-faint">
        How much of a feature you could carry on your own.
      </p>

      <ul className="space-y-3.5">
        {levels.map((level, i) => (
          <li key={level.level}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-fg-dim">
                {OWNERSHIP_LABELS[level.level]}
              </span>
              <span className="mono-meta shrink-0 text-faint">
                {level.percent === null
                  ? "no exercises yet"
                  : `${level.solved}/${level.total}`}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              {level.percent === null ? null : (
                <div
                  className={cn("h-full rounded-full", ORD[i])}
                  style={{
                    width: `${Math.max(level.percent, level.solved > 0 ? 4 : 0)}%`,
                    transition: "width 900ms var(--ease-out-soft)",
                  }}
                />
              )}
            </div>

            <p className="mt-1 text-[12px] leading-relaxed text-faint">
              {OWNERSHIP_BLURBS[level.level]}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Concepts whose spaced-review date has come round. */
export function ConceptReviewPanel({ items }: { items: ConceptProgress[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="mono-label text-subtle">Ready for review</div>
        {items.length > 0 ? <Badge tone="warn">{items.length} due</Badge> : null}
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">
          Nothing due. Concepts come back on a widening schedule — a day after
          you first meet one, {Math.round(REVIEW_DAYS[REVIEW_DAYS.length - 1] / 7)}{" "}
          weeks after you can reason about it.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 6).map((p) => (
            <li
              key={p.concept.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-[13px] text-fg-dim">
                {p.concept.name}
              </span>
              <span className="mono-meta shrink-0 text-subtle">
                {p.proficiency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Not a scoreboard. These are the concepts whose prerequisites are in
 * place — the honest answer to "what should I do next", which is a
 * different question from "what am I worst at".
 */
export function ReadyToStartPanel({ items }: { items: ConceptProgress[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mono-label mb-1 text-subtle">Ready to start</div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-faint">
        Prerequisites already in place.
      </p>
      <ul className="space-y-2.5">
        {items.map((p) => (
          <li key={p.concept.id} className="flex items-start gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ord-3" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-fg-dim">
                {p.concept.name}
              </span>
              <span className="block text-[12.5px] leading-relaxed text-subtle">
                {p.concept.definition}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export const PROFICIENCY_ORDER: ConceptProficiency[] = [
  "Not Started",
  "Learning",
  "Practising",
  "Proficient",
  "Mastered",
];

/** A compact distribution strip: how the whole graph is going. */
export function MasterySpread({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const started = total - (counts["Not Started"] ?? 0);

  return (
    <Card className="p-5">
      <div className="mono-label mb-4 text-subtle">Concept mastery</div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[30px] font-semibold leading-none text-fg">
          {started}
        </span>
        <span className="text-[13px] text-muted">of {total} concepts touched</span>
      </div>

      {/* 2px surface gaps separate the segments — not borders. */}
      <div className="mt-4 flex gap-[2px] overflow-hidden rounded-full">
        {PROFICIENCY_ORDER.slice(1).map((p, i) => {
          const n = counts[p] ?? 0;
          if (n === 0) return null;
          return (
            <span
              key={p}
              title={`${n} ${p}`}
              className={cn("h-1.5", ORD[i + 1])}
              style={{ width: `${(n / total) * 100}%` }}
            />
          );
        })}
        <span
          className="h-1.5 flex-1 bg-surface-3"
          title={`${counts["Not Started"] ?? 0} not started`}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {PROFICIENCY_ORDER.slice(1).map((p, i) => (
          <li key={p} className="flex items-center gap-2.5">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ORD[i + 1])} />
            <span className="flex-1 text-[12.5px] text-muted">{p}</span>
            <span className="mono-meta text-subtle">{counts[p] ?? 0}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
