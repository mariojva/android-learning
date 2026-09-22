"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Divider } from "@/components/ui/primitives";
import { IconCheck, IconArrowRight, IconAlert } from "@/components/icons";
import { CAPABILITY_AREAS, type ReadinessBand } from "@/data/readiness";
import { CONCEPT_MAP } from "@/data/concepts";
import { ALL_QUESTIONS } from "@/data/questions";
import { useProgress } from "@/lib/progress/context";
import {
  earnedStages,
  masteryFor,
  proficiencyOf,
  stagesCleared,
} from "@/lib/progress/mastery";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Mid-level readiness.

   The band is computed; the bar is written down. That ordering is the
   point — the app can tell you it thinks you are Proficient at the data
   layer and immediately show you the three things Proficient is supposed
   to mean, so you are equipped to disagree with it.

   A capability with no exercises in the bank says so rather than
   reporting a confident zero. "You have not done this" and "this does
   not exist yet" are different facts, and only one of them is about you.
   ------------------------------------------------------------------ */

const BANDS: ReadinessBand[] = ["Learning", "Practising", "Proficient", "Strong"];

/**
 * Below this many exercises, a band says more about the content library
 * than about the learner. "Learning" over one exercise and "Learning"
 * over seventeen are not the same claim, and the page should not print
 * them identically.
 */
const THIN_COVERAGE = 5;

const BAND_TONE: Record<
  ReadinessBand,
  { bar: string; badge: "neutral" | "info" | "accent" | "done" }
> = {
  Learning: { bar: "bg-ord-2", badge: "info" },
  Practising: { bar: "bg-ord-3", badge: "info" },
  Proficient: { bar: "bg-ord-4", badge: "accent" },
  Strong: { bar: "bg-ord-5", badge: "done" },
};

interface AreaState {
  area: (typeof CAPABILITY_AREAS)[number];
  band: ReadinessBand | null;
  depth: number;
  conceptsHeld: number;
  conceptsTotal: number;
  solved: number;
  available: number;
}

export default function ReadinessPage() {
  const { progress } = useProgress();

  const areas: AreaState[] = useMemo(() => {
    const earned = earnedStages(progress);

    return CAPABILITY_AREAS.map((area) => {
      const concepts = area.concepts
        .map((id) => CONCEPT_MAP.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      const depths = concepts.map(
        (c) => stagesCleared(masteryFor(progress, c.id, earned)).length,
      );
      const depth = depths.length
        ? depths.reduce((a, b) => a + b, 0) / depths.length
        : 0;

      const held = concepts.filter((c) => {
        const p = proficiencyOf(masteryFor(progress, c.id, earned));
        return p === "Proficient" || p === "Mastered";
      }).length;

      // Union of concept- and topic-matched questions, and the union is
      // load-bearing rather than generous: depth is earned through a
      // question's `concepts`, so anything that can raise depth must also
      // be in the pool. Matching the pool on topics alone let an area
      // report "Practising" above a stated count of zero exercises.
      const wantedTopics = new Set(area.topics);
      const wantedConcepts = new Set(area.concepts);
      const pool = ALL_QUESTIONS.filter(
        (q) =>
          q.topics.some((t) => wantedTopics.has(t)) ||
          (q.concepts ?? []).some((id) => wantedConcepts.has(id)),
      );
      const solved = pool.filter((q) => progress.attempts[q.slug]?.solved).length;

      // No exercises and no depth means no claim. A band here would be a
      // statement about the content library dressed up as one about them.
      const band: ReadinessBand | null =
        pool.length === 0 && depth === 0
          ? null
          : depth >= 4.5
            ? "Strong"
            : depth >= 3.5
              ? "Proficient"
              : depth >= 2
                ? "Practising"
                : "Learning";

      return {
        area,
        band,
        depth,
        conceptsHeld: held,
        conceptsTotal: concepts.length,
        solved,
        available: pool.length,
      };
    });
  }, [progress]);

  const proficient = areas.filter(
    (a) => a.band === "Proficient" || a.band === "Strong",
  ).length;
  const thin = areas.filter((a) => a.available < THIN_COVERAGE);

  return (
    <div>
      <PageHeader
        kicker="Mid-level readiness"
        title="What you could be handed"
        subtitle="Not a score. Fifteen capability areas, each with its bar written out, so you can check the label against what it claims."
        right={
          <Badge tone={proficient > 0 ? "accent" : "neutral"}>
            {proficient} of {areas.length} proficient or above
          </Badge>
        }
      />

      {thin.length > 0 ? (
        <Card className="mb-5 border-medium/25 bg-medium/[0.05] p-4">
          <div className="mono-label mb-2 flex items-center gap-2 text-medium">
            <IconAlert size={12} />
            Barely measurable yet
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            These areas have almost nothing in the question bank, so their band
            reflects the library rather than you:{" "}
            {thin
              .map(
                (a) =>
                  `${a.area.name} (${a.available} ${
                    a.available === 1 ? "exercise" : "exercises"
                  })`,
              )
              .join(", ")}
            . A gap in the content, not in you.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {areas.map(
          ({ area, band, depth, conceptsHeld, conceptsTotal, solved, available }) => (
            <Card key={area.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-fg">
                    {area.name}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {area.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {available < THIN_COVERAGE ? (
                    <Badge tone="warn">thin coverage</Badge>
                  ) : null}
                  {band ? (
                    <Badge tone={BAND_TONE[band].badge}>{band}</Badge>
                  ) : (
                    <Badge>no exercises yet</Badge>
                  )}
                </div>
              </div>

              {/* Ordinal track: four bands, filled to where you are. */}
              <div className="mt-4 flex items-start gap-1.5">
                {BANDS.map((b, i) => {
                  const reached = band ? BANDS.indexOf(band) >= i : false;
                  return (
                    <span key={b} className="flex-1">
                      <span
                        className={cn(
                          "block h-1.5 rounded-full transition-colors duration-300",
                          reached ? BAND_TONE[b].bar : "bg-surface-3",
                        )}
                      />
                      <span
                        className={cn(
                          "mono-meta mt-1.5 block",
                          reached ? "text-subtle" : "text-faint",
                        )}
                      >
                        {b}
                      </span>
                    </span>
                  );
                })}
              </div>

              <Divider className="my-4" />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div>
                  <div className="mono-label mb-2 text-subtle">
                    Proficient means you can
                  </div>
                  <ul className="space-y-1.5">
                    {area.proficientRequires.map((req, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span
                          className={cn(
                            "mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full",
                            band === "Proficient" || band === "Strong"
                              ? "bg-ord-4"
                              : "bg-surface-3",
                          )}
                        />
                        <span className="text-[13px] leading-relaxed text-fg-dim">
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <Row
                    label="Concepts held"
                    value={`${conceptsHeld} / ${conceptsTotal}`}
                  />
                  <Row label="Average depth" value={`${depth.toFixed(1)} / 5 stages`} />
                  <Row
                    label="Exercises solved"
                    value={
                      available === 0 ? "none exist yet" : `${solved} / ${available}`
                    }
                  />
                </div>
              </div>
            </Card>
          ),
        )}
      </div>

      <Card className="mt-5 p-5">
        <div className="mono-label mb-2 flex items-center gap-2 text-subtle">
          <IconCheck size={12} />
          How a band is decided
        </div>
        <p className="text-[13px] leading-relaxed text-muted">
          Purely from how deep you have gone on the area&rsquo;s concepts — the
          average number of mastery stages cleared, where stages are earned by
          solving questions tagged for them, never by opening a page. Proficient
          is an average of 3.5 of 5; Strong is 4.5. The written bar above is the
          real test, and where the label and the bar disagree, the bar is right.
        </p>
        <Link
          href="/knowledge-graph"
          className="mono-meta mt-4 inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-accent"
        >
          See the concepts behind these areas
          <IconArrowRight size={12} />
        </Link>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5 last:border-0">
      <span className="text-[12.5px] text-subtle">{label}</span>
      <span className="mono-meta text-fg-dim">{value}</span>
    </div>
  );
}
