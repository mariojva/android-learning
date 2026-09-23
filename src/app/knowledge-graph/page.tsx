"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Divider } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/RichText";
import { GlossaryCard } from "@/components/lesson/GlossaryCard";
import {
  IconSitemap,
  IconCheck,
  IconLock,
  IconArrowRight,
  IconSpark,
} from "@/components/icons";
import { CONCEPTS, CONCEPT_MAP, unlockedBy } from "@/data/concepts";
import { glossaryEntry } from "@/data/glossary";
import { ANDROID_ENGINEER_PATH } from "@/data/path";
import { useProgress } from "@/lib/progress/context";
import {
  conceptProgress,
  proficiencyOf,
  masteryFor,
  STAGE_LABELS,
  STAGE_BLURBS,
} from "@/lib/progress/mastery";
import { MASTERY_STAGES, type ConceptProficiency } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   The knowledge graph.

   Deliberately not a force-directed cloud of sixty floating nodes. That
   looks impressive and answers no question a learner actually has. This
   is grouped by module — which is to say by dependency order — and the
   edges you can see are the ones that matter at the node you are
   looking at: what it needs, and what it opens up.
   ------------------------------------------------------------------ */

const PROFICIENCY_TONE: Record<
  ConceptProficiency,
  { dot: string; badge: "neutral" | "info" | "warn" | "accent" | "done" }
> = {
  "Not Started": { dot: "bg-surface-3", badge: "neutral" },
  Learning: { dot: "bg-info", badge: "info" },
  Practising: { dot: "bg-medium", badge: "warn" },
  Proficient: { dot: "bg-accent", badge: "accent" },
  Mastered: { dot: "bg-done", badge: "done" },
};

export default function KnowledgeGraphPage() {
  const { progress } = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byModule = useMemo(() => {
    return ANDROID_ENGINEER_PATH.modules
      .map((module) => ({
        module,
        concepts: CONCEPTS.filter((c) => c.moduleId === module.id),
      }))
      .filter((group) => group.concepts.length > 0);
  }, []);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const c of CONCEPTS) {
      const p = proficiencyOf(masteryFor(progress, c.id));
      tally[p] = (tally[p] ?? 0) + 1;
    }
    return tally;
  }, [progress]);

  const selected = selectedId ? CONCEPT_MAP.get(selectedId) : null;
  const detail = selected ? conceptProgress(progress, selected) : null;

  return (
    <div>
      <PageHeader
        kicker="Knowledge graph"
        title="What depends on what"
        subtitle={`${CONCEPTS.length} concepts in dependency order. Open one to see what it needs first, what it unlocks, and how far along you are.`}
        right={
          <div className="flex flex-wrap gap-1.5">
            {(
              ["Mastered", "Proficient", "Practising", "Learning"] as const
            ).map((p) =>
              counts[p] ? (
                <Badge key={p} tone={PROFICIENCY_TONE[p].badge}>
                  {counts[p]} {p.toLowerCase()}
                </Badge>
              ) : null,
            )}
            <Badge>{CONCEPTS.length} total</Badge>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ------------------------- the graph ------------------------- */}
        <div className="space-y-3">
          {byModule.map(({ module, concepts }) => (
            <Card key={module.id} className="p-5">
              <div className="mb-3.5 flex items-baseline gap-3">
                <span className="mono-meta text-faint">
                  {String(module.index).padStart(2, "0")}
                </span>
                <h2 className="text-[14px] font-semibold tracking-tight text-fg">
                  {module.title}
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {concepts.map((concept) => {
                  const p = conceptProgress(progress, concept);
                  const tone = PROFICIENCY_TONE[p.proficiency];
                  const isSelected = selectedId === concept.id;

                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() =>
                        setSelectedId(isSelected ? null : concept.id)
                      }
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-all duration-150",
                        isSelected
                          ? "border-accent/45 bg-accent/[0.08] text-fg"
                          : "border-line bg-surface-2/50 text-muted hover:border-line-strong hover:text-fg-dim",
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", tone.dot)}
                      />
                      {concept.name}
                      {p.blockedBy.length > 0 ? (
                        <IconLock size={10} className="text-faint" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* ------------------------- the detail ------------------------ */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          {detail ? (
            <Card className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone={PROFICIENCY_TONE[detail.proficiency].badge}>
                  {detail.proficiency}
                </Badge>
                <span className="mono-meta text-faint">
                  {detail.concept.topics.join(" · ")}
                </span>
              </div>

              <h2 className="text-[18px] font-semibold tracking-tight text-fg">
                {detail.concept.name}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-dim">
                {detail.concept.definition}
              </p>

              <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-3.5">
                <div className="mono-label mb-1.5 flex items-center gap-2 text-accent">
                  <IconSpark size={11} />
                  Why it exists
                </div>
                <p className="text-[13px] leading-relaxed text-fg-dim">
                  {detail.concept.why}
                </p>
              </div>

              <Divider className="my-4" />

              {/* ---------------------- mastery ---------------------- */}
              <div className="mono-label mb-2.5 text-subtle">Your mastery</div>
              <ul className="space-y-1.5">
                {MASTERY_STAGES.map((stage) => {
                  const done = detail.mastery[stage];
                  return (
                    <li key={stage} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                          done
                            ? "bg-done/15 text-done ring-done/30"
                            : "bg-surface-2 ring-line-strong",
                        )}
                      >
                        {done ? <IconCheck size={8} /> : null}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "text-[13px] font-medium",
                            done ? "text-fg-dim" : "text-subtle",
                          )}
                        >
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="block text-[12px] leading-relaxed text-faint">
                          {STAGE_BLURBS[stage]}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* -------------------- dependencies -------------------- */}
              {detail.concept.prerequisites?.length ? (
                <>
                  <Divider className="my-4" />
                  <div className="mono-label mb-2 text-subtle">Needs first</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.concept.prerequisites.map((id) => {
                      const c = CONCEPT_MAP.get(id);
                      if (!c) return null;
                      const blocked = detail.blockedBy.some((b) => b.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className={cn(
                            "mono-meta rounded-md px-2 py-[3px] ring-1 ring-inset transition-colors",
                            blocked
                              ? "bg-medium/10 text-medium ring-medium/25"
                              : "bg-done/10 text-done ring-done/25",
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                  {detail.blockedBy.length > 0 ? (
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-subtle">
                      Not blocked, exactly — but the orange ones will make this
                      harder than it needs to be.
                    </p>
                  ) : null}
                </>
              ) : null}

              {unlockedBy(detail.concept.id).length > 0 ? (
                <>
                  <Divider className="my-4" />
                  <div className="mono-label mb-2 text-subtle">Opens up</div>
                  <div className="flex flex-wrap gap-1.5">
                    {unlockedBy(detail.concept.id).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="mono-meta rounded-md bg-surface-2 px-2 py-[3px] text-muted ring-1 ring-inset ring-line-strong transition-colors hover:text-fg-dim"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {/* ------------------ deeper treatment ------------------ */}
              {detail.concept.glossaryId &&
              glossaryEntry(detail.concept.glossaryId) ? (
                <>
                  <Divider className="my-4" />
                  <GlossaryCard
                    entry={glossaryEntry(detail.concept.glossaryId)!}
                  />
                </>
              ) : null}

              <Divider className="my-4" />
              <Link
                href="/practice"
                className="mono-meta inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-accent"
              >
                Find practice for this
                <IconArrowRight size={12} />
              </Link>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center border-dashed border-line-strong bg-surface/40 p-10 text-center">
              <span className="mb-3 text-faint">
                <IconSitemap size={24} />
              </span>
              <h3 className="text-[14px] font-semibold text-fg-dim">
                Pick a concept
              </h3>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-subtle">
                <RichText>
                  {"Each one says what it is, **why it exists**, what it needs first, and what it opens up once you have it."}
                </RichText>
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
