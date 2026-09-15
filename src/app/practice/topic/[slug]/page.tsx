import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Card, DifficultyPill } from "@/components/ui/primitives";
import { QuestionBrowser } from "@/components/practice/QuestionBrowser";
import { PRACTICE_COLLECTIONS } from "@/components/shell/nav";
import { dsaByPattern } from "@/data/questions";
import type { QuestionFormat, QuestionTrack } from "@/lib/types";
import { IconArrowRight, IconClock } from "@/components/icons";

/** Static export: only the paths generated below exist as files. */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PRACTICE_COLLECTIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = PRACTICE_COLLECTIONS[slug];
  if (!collection) return { title: "Practice" };
  return { title: collection.title, description: collection.subtitle };
}

export default async function PracticeCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = PRACTICE_COLLECTIONS[slug];
  if (!collection) notFound();

  if (slug === "interview-coding") {
    return <InterviewCoding title={collection.title} subtitle={collection.subtitle} />;
  }

  return (
    <div>
      <PageHeader
        kicker="Practice"
        title={collection.title}
        subtitle={collection.subtitle}
      />
      <Suspense fallback={<div className="h-64" />}>
        <QuestionBrowser
          preset={{
            format: collection.format as QuestionFormat | undefined,
            track: collection.track as QuestionTrack | undefined,
            hideTabs: Boolean(collection.format),
          }}
        />
      </Suspense>
    </div>
  );
}

/** Interview problems read better grouped by pattern than listed flat. */
function InterviewCoding({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const groups = dsaByPattern();

  return (
    <div>
      <PageHeader kicker="Practice" title={title} subtitle={subtitle} />

      <p className="mb-8 max-w-2xl rounded-xl border border-line bg-surface p-4 text-[13px] leading-relaxed text-muted">
        Problems are grouped by pattern rather than listed at random. The skill an
        interview actually tests is recognising which pattern a new problem
        belongs to — not recalling a solution you have seen before.
      </p>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.pattern}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-[15px] font-semibold tracking-tight text-fg">
                {group.pattern}
              </h2>
              <span className="mono-meta text-subtle">
                {group.questions.length} problem
                {group.questions.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {group.questions.map((q) => (
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
                        <span className="inline-flex items-center gap-1">
                          <IconClock size={11} />~{q.estimatedMinutes}m
                        </span>
                        {q.companyTags?.length ? (
                          <span className="text-faint">
                            {q.companyTags.slice(0, 3).join(" · ")}
                          </span>
                        ) : null}
                        <IconArrowRight
                          size={13}
                          className="ml-auto text-faint opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
