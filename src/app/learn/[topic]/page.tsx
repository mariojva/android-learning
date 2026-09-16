import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Card, DifficultyPill, Badge, LinkButton } from "@/components/ui/primitives";
import { LEARN_HUBS, TOPIC_MAP } from "@/data/topics";
import { ALL_QUESTIONS } from "@/data/questions";
import { ANDROID_ENGINEER_PATH } from "@/data/path";
import { DAY_1 } from "@/data/lessons/day1";
import type { LearnHubId } from "@/lib/types";
import { formatLabels } from "@/lib/utils";
import { IconArrowRight, IconClock, IconBook } from "@/components/icons";

/** Static export: only the paths generated below exist as files. */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(LEARN_HUBS).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const hub = LEARN_HUBS[topic as LearnHubId];
  if (!hub) return { title: "Learn" };
  return { title: hub.title, description: hub.tagline };
}

export default async function LearnHubPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const hub = LEARN_HUBS[topic as LearnHubId];
  if (!hub) notFound();

  const questions = ALL_QUESTIONS.filter((q) =>
    q.topics.some((t) => hub.topics.includes(t)),
  );

  const modules = ANDROID_ENGINEER_PATH.modules.filter((m) =>
    m.topics.some((t) => hub.topics.includes(t)),
  );

  const byFormat = (
    [
      "coding",
      "code-reading",
      "code-review",
      "debugging",
      "quiz",
      "system-design",
    ] as const
  )
    .map((format) => ({
      format,
      count: questions.filter((q) => q.format === format).length,
    }))
    .filter((f) => f.count > 0);

  return (
    <div>
      <PageHeader kicker="Learn" title={hub.title} subtitle={hub.tagline} />

      {/* ----------------------- Topic overview ----------------------- */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hub.topics.map((id) => {
          const t = TOPIC_MAP[id];
          const count = ALL_QUESTIONS.filter((q) => q.topics.includes(id)).length;
          return (
            <Link key={id} href={`/practice?topic=${id}`}>
              <Card interactive className="group h-full p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[14px] font-semibold text-fg transition-colors group-hover:text-accent">
                    {t.label}
                  </h3>
                  <span className="mono-meta shrink-0 text-faint">{count}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {t.blurb}
                </p>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* ------------------------- Day 1 entry ------------------------- */}
      {topic === "kotlin" ? (
        <section className="mb-10">
          <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-accent">
                <IconBook size={18} />
              </span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-fg">
                  {DAY_1.title}
                </h3>
                <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
                  {DAY_1.goal}
                </p>
                <div className="mono-meta mt-2 flex items-center gap-3 text-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={11} />
                    {DAY_1.totalMinutes} min
                  </span>
                  <span className="text-faint">
                    {DAY_1.sections.length} sections
                  </span>
                </div>
              </div>
            </div>
            <LinkButton href="/lessons/day-1" tone="primary" size="sm">
              Open Day 1
              <IconArrowRight size={14} />
            </LinkButton>
          </Card>
        </section>
      ) : null}

      {/* --------------------------- Modules --------------------------- */}
      {modules.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-fg">
            Modules covering this
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {modules.map((m) => (
              <li key={m.id}>
                <Link href="/learn/paths">
                  <Card interactive className="group h-full p-4">
                    <div className="mono-label mb-2 text-faint">
                      Module {String(m.index).padStart(2, "0")}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-fg transition-colors group-hover:text-accent">
                        {m.title}
                      </h3>
                      <DifficultyPill difficulty={m.difficulty} />
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                      {m.summary}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------- Questions -------------------------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">
            Practice in this area
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {byFormat.map((f) => (
              <Badge key={f.format}>
                {formatLabels[f.format]} · {f.count}
              </Badge>
            ))}
          </div>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2">
          {questions.slice(0, 12).map((q) => (
            <li key={q.id}>
              <Link href={`/practice/${q.slug}`}>
                <Card interactive className="group h-full p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-semibold text-fg transition-colors group-hover:text-accent">
                      {q.title}
                    </h3>
                    <DifficultyPill difficulty={q.difficulty} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                    {q.description}
                  </p>
                  <div className="mono-meta mt-3 flex items-center gap-3 text-subtle">
                    <span>{formatLabels[q.format]}</span>
                    <span className="inline-flex items-center gap-1">
                      <IconClock size={11} />~{q.estimatedMinutes}m
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>

        {questions.length > 12 ? (
          <div className="mt-5">
            <LinkButton
              href={`/practice?topic=${hub.topics[0]}`}
              tone="secondary"
              size="sm"
            >
              All {questions.length} questions
              <IconArrowRight size={14} />
            </LinkButton>
          </div>
        ) : null}
      </section>
    </div>
  );
}
