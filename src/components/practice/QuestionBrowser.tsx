"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Difficulty,
  MasteryStage,
  OwnershipLevel,
  Question,
  QuestionFormat,
  QuestionStatus,
  QuestionTrack,
  TopicId,
} from "@/lib/types";
import { MASTERY_STAGES, OWNERSHIP_LEVELS } from "@/lib/types";
import { STAGE_LABELS, OWNERSHIP_LABELS } from "@/lib/progress/mastery";
import { ALL_QUESTIONS } from "@/data/questions";
import { TOPICS } from "@/data/topics";
import { QuestionCard } from "./QuestionCard";
import { useProgress } from "@/lib/progress/context";
import { isBookmarked, statusOf } from "@/lib/progress/selectors";
import { cn, formatLabels } from "@/lib/utils";
import { Button, EmptyState } from "@/components/ui/primitives";
import { IconSearch, IconX, IconFilter, IconList } from "@/components/icons";

const TABS: { id: "all" | QuestionFormat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "coding", label: "Coding" },
  { id: "code-reading", label: "Code Reading" },
  { id: "code-review", label: "Code Review" },
  { id: "feature", label: "Feature Assignments" },
  { id: "debugging", label: "Debugging" },
  { id: "quiz", label: "Quiz" },
  { id: "system-design", label: "System Design" },
];

const DIFFICULTIES: Difficulty[] = ["Warmup", "Easy", "Medium", "Hard"];

/*
 * Two ordered scales, shown in order. These are not alternative ways to
 * slice the bank — they answer different questions: "what kind of thinking
 * does this demand of me" and "how much of the work is mine".
 */
const STAGES: { id: MasteryStage; label: string }[] = MASTERY_STAGES.map((s) => ({
  id: s,
  label: STAGE_LABELS[s],
}));

const OWNERSHIPS: { id: OwnershipLevel; label: string }[] = OWNERSHIP_LEVELS.map(
  (o) => ({ id: o, label: OWNERSHIP_LABELS[o] }),
);

const TRACKS: QuestionTrack[] = [
  "Kotlin",
  "Android",
  "Compose",
  "Architecture",
  "Interview",
  "System Design",
];

const STATUSES: { id: QuestionStatus; label: string }[] = [
  { id: "not-started", label: "Not started" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "bookmarked", label: "Bookmarked" },
];

export interface BrowserPreset {
  format?: QuestionFormat;
  track?: QuestionTrack;
  topics?: TopicId[];
  /** Hide the tab row when the collection already fixes the format. */
  hideTabs?: boolean;
}

export function QuestionBrowser({ preset }: { preset?: BrowserPreset }) {
  const params = useSearchParams();
  const initialTopic = params.get("topic") as TopicId | null;

  const { progress, toggleBookmark } = useProgress();

  const [tab, setTab] = useState<"all" | QuestionFormat>(preset?.format ?? "all");
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<TopicId[]>(
    initialTopic ? [initialTopic] : (preset?.topics ?? []),
  );
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [tracks, setTracks] = useState<QuestionTrack[]>(
    preset?.track ? [preset.track] : [],
  );
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [stages, setStages] = useState<MasteryStage[]>([]);
  const [ownerships, setOwnerships] = useState<OwnershipLevel[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const pool = useMemo(() => {
    let list = ALL_QUESTIONS;
    if (preset?.format) list = list.filter((q) => q.format === preset.format);
    if (preset?.track) list = list.filter((q) => q.track === preset.track);
    return list;
  }, [preset?.format, preset?.track]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return pool.filter((q) => {
      if (tab !== "all" && q.format !== tab) return false;
      if (topics.length > 0 && !q.topics.some((t) => topics.includes(t))) return false;
      if (difficulties.length > 0 && !difficulties.includes(q.difficulty)) return false;
      if (stages.length > 0 && (!q.stage || !stages.includes(q.stage))) return false;
      if (
        ownerships.length > 0 &&
        (!q.ownership || !ownerships.includes(q.ownership))
      ) {
        return false;
      }
      if (tracks.length > 0 && !tracks.includes(q.track)) return false;

      if (statuses.length > 0) {
        const status = statusOf(progress, q);
        const bookmarked = isBookmarked(progress, q.slug);
        const matches = statuses.some((s) =>
          s === "bookmarked" ? bookmarked : s === status,
        );
        if (!matches) return false;
      }

      if (needle.length > 0) {
        const haystack = `${q.title} ${q.description} ${q.topics.join(" ")} ${q.track}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [pool, tab, topics, difficulties, tracks, statuses, stages, ownerships, query, progress]);

  const activeFilterCount =
    topics.length +
    difficulties.length +
    tracks.length +
    statuses.length +
    stages.length +
    ownerships.length;

  const clearAll = () => {
    setTopics([]);
    setDifficulties([]);
    setTracks(preset?.track ? [preset.track] : []);
    setStatuses([]);
    setQuery("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[228px_1fr]">
      {/* ------------------------- Filter rail ------------------------- */}
      <aside
        className={cn(
          "space-y-6 lg:block",
          filtersOpen ? "block" : "hidden",
        )}
      >
        <FilterGroup title="Topic">
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map((topic) => (
              <Chip
                key={topic.id}
                label={topic.label}
                active={topics.includes(topic.id)}
                onClick={() =>
                  setTopics((prev) =>
                    prev.includes(topic.id)
                      ? prev.filter((t) => t !== topic.id)
                      : [...prev, topic.id],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Difficulty">
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                active={difficulties.includes(d)}
                onClick={() =>
                  setDifficulties((prev) =>
                    prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Question type">
          <div className="flex flex-wrap gap-1.5">
            {TRACKS.map((t) => (
              <Chip
                key={t}
                label={t}
                active={tracks.includes(t)}
                onClick={() =>
                  setTracks((prev) =>
                    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="What it demands">
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={stages.includes(s.id)}
                onClick={() =>
                  setStages((prev) =>
                    prev.includes(s.id)
                      ? prev.filter((x) => x !== s.id)
                      : [...prev, s.id],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="How much you own">
          <div className="flex flex-wrap gap-1.5">
            {OWNERSHIPS.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                active={ownerships.includes(o.id)}
                onClick={() =>
                  setOwnerships((prev) =>
                    prev.includes(o.id)
                      ? prev.filter((x) => x !== o.id)
                      : [...prev, o.id],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Status">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={statuses.includes(s.id)}
                onClick={() =>
                  setStatuses((prev) =>
                    prev.includes(s.id)
                      ? prev.filter((x) => x !== s.id)
                      : [...prev, s.id],
                  )
                }
              />
            ))}
          </div>
        </FilterGroup>

        {activeFilterCount > 0 ? (
          <Button tone="ghost" size="sm" onClick={clearAll} className="w-full">
            <IconX size={13} />
            Clear filters
          </Button>
        ) : null}
      </aside>

      {/* --------------------------- Results --------------------------- */}
      <div className="min-w-0">
        {!preset?.hideTabs ? (
          <div className="scrollbar-none mb-4 flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors",
                  tab === t.id ? "text-fg" : "text-subtle hover:text-muted",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent transition-opacity duration-200",
                    tab === t.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-2">
          <label className="relative flex-1">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, topic or concept…"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13.5px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
          </label>
          <Button
            tone="secondary"
            size="md"
            className="lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <IconFilter size={14} />
            Filters
            {activeFilterCount > 0 ? (
              <span className="mono-meta ml-1 rounded bg-accent px-1 text-accent-ink">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="mono-meta mb-3 flex items-center justify-between text-subtle">
          <span>
            {results.length} question{results.length === 1 ? "" : "s"}
            {tab !== "all" ? ` · ${formatLabels[tab as QuestionFormat]}` : ""}
          </span>
          <span className="text-faint">
            {results.filter((q) => statusOf(progress, q) === "completed").length}{" "}
            completed
          </span>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={<IconList size={26} />}
            title="Nothing matches those filters"
            body="Widen the difficulty range or clear a topic — the bank is deliberately uneven, and some corners are thin on purpose."
            action={
              <Button tone="secondary" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {results.map((question: Question) => (
              <li key={question.id} className="animate-fade-up">
                <QuestionCard
                  question={question}
                  status={statusOf(progress, question)}
                  bookmarked={isBookmarked(progress, question.slug)}
                  onToggleBookmark={(slug) => toggleBookmark(slug, "question")}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mono-label mb-2.5 text-subtle">{title}</div>
      {children}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-[5px] text-[11.5px] transition-all duration-150",
        active
          ? "border-accent/40 bg-accent/12 text-accent"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg-dim",
      )}
    >
      {label}
    </button>
  );
}
