import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Card, DifficultyPill, Badge } from "@/components/ui/primitives";
import { DESIGN_STAGE_TITLES } from "@/data/questions/systemDesign";
import { questionsByFormat } from "@/data/questions";

/** Every design exercise, wherever it is defined. */
const SYSTEM_DESIGN_QUESTIONS = questionsByFormat("system-design");
import { IconClock, IconArrowRight, IconSitemap } from "@/components/icons";

export const metadata: Metadata = {
  title: "Android System Design",
  description:
    "Long-form design exercises worked through fourteen stages, from requirements to testing.",
};

export default function SystemDesignPage() {
  return (
    <div>
      <PageHeader
        kicker="System design"
        title="Android System Design"
        subtitle="Long-form exercises where the answer is a defended design, not a diagram. Each one walks the same fourteen stages, so the method transfers to a prompt you have never seen."
      />

      {/* ------------------------- The method -------------------------- */}
      <Card className="mb-8 p-5">
        <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
          <IconSitemap size={13} />
          The workbook
        </div>
        <ol className="flex flex-wrap gap-1.5">
          {DESIGN_STAGE_TITLES.map((stage, i) => (
            <li
              key={stage}
              className="mono-meta flex items-center gap-2 rounded-md border border-line bg-surface-2/60 px-2.5 py-1.5 text-muted"
            >
              <span className="text-faint">{String(i + 1).padStart(2, "0")}</span>
              {stage}
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-subtle">
          Every stage asks for your answer before it shows a reference one.
          Recognising a good design is easy; producing one under a blank page is
          the skill an interview tests.
        </p>
      </Card>

      {/* ------------------------- Exercises --------------------------- */}
      <ul className="grid gap-3 lg:grid-cols-2">
        {SYSTEM_DESIGN_QUESTIONS.map((q) => (
          <li key={q.id}>
            <Link href={`/practice/${q.slug}`}>
              <Card interactive className="group h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[16px] font-semibold tracking-tight text-fg transition-colors group-hover:text-accent">
                    {q.title}
                  </h2>
                  <DifficultyPill difficulty={q.difficulty} />
                </div>

                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                  {q.description}
                </p>

                <div className="mono-meta mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={12} />~{q.estimatedMinutes} min
                  </span>
                  <span className="text-faint">
                    {q.designStages?.length ?? 0} stages
                  </span>
                  {q.companyTags?.length ? (
                    <span className="text-faint">{q.companyTags.join(" · ")}</span>
                  ) : null}
                  <IconArrowRight
                    size={14}
                    className="ml-auto text-faint opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                  {q.designStages?.slice(0, 5).map((s) => (
                    <Badge key={s.id}>{s.title}</Badge>
                  ))}
                  {(q.designStages?.length ?? 0) > 5 ? (
                    <Badge>+{(q.designStages?.length ?? 0) - 5} more</Badge>
                  ) : null}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
