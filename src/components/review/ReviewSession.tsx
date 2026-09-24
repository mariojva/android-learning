"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ProgressBar,
  EmptyState,
  Divider,
} from "@/components/ui/primitives";
import {
  IconCheck,
  IconX,
  IconSpark,
  IconArrowRight,
  IconEye,
  IconClock,
  IconSitemap,
} from "@/components/icons";
import { useProgress } from "@/lib/progress/context";
import { buildSession, upcoming, type ReviewItem } from "@/lib/progress/review";
import { CONCEPT_MAP } from "@/data/concepts";
import { RichText } from "@/components/ui/RichText";
import { cn, formatMinutes } from "@/lib/utils";

/**
 * A review session.
 *
 * Deliberately recall-first: the concept's name appears alone, and the
 * explanation is hidden until you have committed to remembering it. Reading
 * a definition feels like reviewing and is not — the retrieval is the part
 * that moves the memory, which is the entire premise of the schedule that
 * chose this concept.
 *
 * Then the second half: a question tagged with the same concept that you
 * have not seen recently, in a different format from the last one. Seeing
 * the same question again tests whether you remember that question. Seeing
 * the idea somewhere new tests whether you hold the idea.
 */
export function ReviewSession() {
  const { progress, hydrated, recordConceptReview } = useProgress();

  // Built once per mount. Rebuilding as answers land would reshuffle the
  // queue under the learner mid-session.
  const session = useMemo(
    () => (hydrated ? buildSession(progress) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated],
  );
  const later = useMemo(() => upcoming(progress, 5), [progress]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const item: ReviewItem | undefined = session[index];
  const done = index >= session.length;

  const answer = (correct: boolean) => {
    if (!item) return;
    recordConceptReview(item.conceptId, correct);
    setResults((prev) => ({ ...prev, [item.conceptId]: correct }));
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  /* ----------------------------- empty ----------------------------- */

  if (hydrated && session.length === 0) {
    return (
      <div>
        <PageHeader
          kicker="Review"
          title="Nothing due"
          subtitle="Concepts come back on a widening schedule — a day after you first meet one, then three, seven, sixteen, thirty-five."
        />
        <EmptyState
          icon={<IconSpark size={22} />}
          title="Nothing to review today"
          body={
            later.length > 0
              ? `Next up: ${later[0].name}, due ${later[0].dueOn}.`
              : "Solve a few exercises and concepts will start appearing here as the intervals come round."
          }
          action={
            <Link
              href="/practice"
              className="mono-meta inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-2 text-fg-dim transition-colors hover:border-line-strong hover:text-accent"
            >
              Go to Practice
              <IconArrowRight size={12} />
            </Link>
          }
        />
        {later.length > 0 ? <Upcoming rows={later} /> : null}
      </div>
    );
  }

  /* ---------------------------- finished ---------------------------- */

  if (done && session.length > 0) {
    const right = Object.values(results).filter(Boolean).length;
    return (
      <div>
        <PageHeader kicker="Review" title="Session complete" />
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2.5 text-done">
            <IconCheck size={18} className="animate-check" />
            <span className="text-[15px] font-semibold">
              {right} of {session.length} recalled
            </span>
          </div>
          <p className="max-w-xl text-[13.5px] leading-relaxed text-muted">
            The ones you recalled move further out. The ones you did not come
            back tomorrow — which is the point, not a penalty: the schedule is
            supposed to find the edges of what you hold, and a session where
            everything is easy has told you nothing.
          </p>
          <Divider className="my-5" />
          <ul className="space-y-2">
            {session.map((s) => (
              <li key={s.conceptId} className="flex items-center gap-3">
                {results[s.conceptId] ? (
                  <IconCheck size={13} className="shrink-0 text-done" />
                ) : (
                  <IconX size={13} className="shrink-0 text-hard" />
                )}
                <span className="text-[13px] text-fg-dim">{s.conceptName}</span>
                <Link
                  href={`/practice/${s.question.slug}`}
                  className="mono-meta ml-auto shrink-0 text-subtle hover:text-accent"
                >
                  {s.question.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        {later.length > 0 ? <Upcoming rows={later} /> : null}
      </div>
    );
  }

  if (!item) return <div className="h-64" />;

  /* ---------------------------- the card ---------------------------- */

  const concept = CONCEPT_MAP.get(item.conceptId);

  return (
    <div>
      <PageHeader
        kicker="Review"
        title="Recall before you read"
        subtitle="Each concept is one you met before and are about due to lose. Answer out loud or in your head first — the retrieval is what moves it."
        right={
          <Card className="px-5 py-4">
            <div className="mono-label mb-2 text-subtle">This session</div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[22px] font-semibold text-accent">
                {index + 1}/{session.length}
              </span>
              <ProgressBar
                value={(index / session.length) * 100}
                className="w-24"
              />
            </div>
          </Card>
        }
      />

      <Card className="p-6" key={item.conceptId}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="violet">
            <IconSitemap size={10} />
            Concept
          </Badge>
          {item.overdueDays > 0 ? (
            <Badge tone="warn">
              <IconClock size={10} />
              {item.overdueDays} day{item.overdueDays === 1 ? "" : "s"} overdue
            </Badge>
          ) : (
            <Badge tone="accent">Due today</Badge>
          )}
        </div>

        <h2 className="text-[22px] font-semibold tracking-tight text-fg">
          {item.conceptName}
        </h2>

        {!revealed ? (
          <div className="mt-5">
            <p className="max-w-xl text-[13.5px] leading-relaxed text-muted">
              What is it, why does it exist, and what breaks without it? Commit
              to an answer — then check.
            </p>
            <Button
              tone="primary"
              className="mt-5"
              onClick={() => setRevealed(true)}
            >
              <IconEye size={14} />
              Show me
            </Button>
          </div>
        ) : (
          <div className="mt-5 animate-fade-up space-y-5">
            {concept ? (
              <div className="space-y-3.5">
                <div className="rounded-lg border border-line bg-surface-2/50 p-4">
                  <div className="mono-label mb-2 text-subtle">What it is</div>
                  <p className="text-[13.5px] leading-relaxed text-fg-dim">
                    <RichText>{concept.definition}</RichText>
                  </p>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
                  <div className="mono-label mb-2 text-accent">
                    Why it exists
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-fg-dim">
                    <RichText>{concept.why}</RichText>
                  </p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-line bg-bg-raised p-4">
              <div className="mono-label mb-2.5 flex items-center gap-2 text-subtle">
                <IconSpark size={12} />
                Same idea, a form you have not seen recently
              </div>
              <Link
                href={`/practice/${item.question.slug}`}
                className="group flex items-center gap-3"
              >
                <span className="flex-1 text-[13.5px] text-fg-dim group-hover:text-accent">
                  {item.question.title}
                </span>
                <span className="mono-meta shrink-0 text-faint">
                  {item.question.format} · {formatMinutes(item.question.estimatedMinutes)}
                </span>
                <IconArrowRight size={13} className="shrink-0 text-faint" />
              </Link>
            </div>

            <Divider />

            <div>
              <div className="mono-label mb-3 text-subtle">
                Did you recall it before reading?
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button tone="primary" onClick={() => answer(true)}>
                  <IconCheck size={14} />
                  Yes — push it out
                </Button>
                <Button tone="secondary" onClick={() => answer(false)}>
                  <IconX size={14} />
                  No — bring it back tomorrow
                </Button>
              </div>
              <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-subtle">
                Answer honestly rather than generously. The interval is only
                useful if it reflects what you actually held.
              </p>
            </div>
          </div>
        )}
      </Card>

      {later.length > 0 ? <Upcoming rows={later} /> : null}
    </div>
  );
}

function Upcoming({
  rows,
}: {
  rows: { conceptId: string; name: string; dueOn: string }[];
}) {
  return (
    <Card className="mt-6 p-5">
      <div className="mono-label mb-3.5 flex items-center gap-2 text-subtle">
        <IconClock size={12} />
        Coming up
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.conceptId} className="flex items-center gap-3">
            <span className="mono-meta shrink-0 text-faint">{r.dueOn}</span>
            <span className={cn("text-[13px] text-muted")}>{r.name}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
