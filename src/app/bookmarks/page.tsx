"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, EmptyState, Button, DifficultyPill } from "@/components/ui/primitives";
import { useProgress } from "@/lib/progress/context";
import { getQuestion } from "@/data/questions";
import { getLesson } from "@/data/lessons";
import { statusOf } from "@/lib/progress/selectors";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { IconBookmark, IconNote, IconTrash, IconBook } from "@/components/icons";
import { cn } from "@/lib/utils";
import { lessonLabel } from "@/lib/progress/lessons";

type Tab = "bookmarks" | "notes";

export default function BookmarksPage() {
  const { progress, toggleBookmark, setNote } = useProgress();
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const questionBookmarks = useMemo(
    () =>
      progress.bookmarks
        .filter((b) => b.kind === "question")
        .map((b) => getQuestion(b.ref))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [progress.bookmarks],
  );

  const lessonBookmarks = useMemo(
    () =>
      progress.bookmarks
        .filter((b) => b.kind === "lesson")
        .map((b) => getLesson(b.ref))
        .filter((l): l is NonNullable<typeof l> => Boolean(l)),
    [progress.bookmarks],
  );

  const notes = useMemo(
    () =>
      Object.values(progress.notes).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [progress.notes],
  );

  return (
    <div>
      <PageHeader
        kicker="Saved"
        title="Bookmarks & Notes"
        subtitle="Everything you flagged to return to, and everything you wrote down while you were stuck."
      />

      <div className="mb-5 flex gap-1 border-b border-line">
        {(["bookmarks", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative px-3.5 py-2.5 text-[13px] capitalize transition-colors",
              tab === t ? "text-fg" : "text-subtle hover:text-muted",
            )}
          >
            {t}
            <span className="mono-meta ml-2 text-faint">
              {t === "bookmarks"
                ? progress.bookmarks.length
                : notes.length}
            </span>
            <span
              className={cn(
                "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent transition-opacity",
                tab === t ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ))}
      </div>

      {tab === "bookmarks" ? (
        progress.bookmarks.length === 0 ? (
          <EmptyState
            icon={<IconBookmark size={26} />}
            title="Nothing saved yet"
            body="Use the bookmark control on any question or lesson to collect the things you want to come back to."
          />
        ) : (
          <div className="space-y-8">
            {lessonBookmarks.length > 0 ? (
              <section>
                <h2 className="mono-label mb-3 text-subtle">Lessons</h2>
                <ul className="space-y-2.5">
                  {lessonBookmarks.map((lesson) => (
                    <li key={lesson.id}>
                      <Link href={`/lessons/${lesson.slug}`}>
                        <Card interactive className="group p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-accent">
                              <IconBook size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[14.5px] font-semibold text-fg transition-colors group-hover:text-accent">
                                {lessonLabel(lesson)} — {lesson.title}
                              </h3>
                              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                                {lesson.goal}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {questionBookmarks.length > 0 ? (
              <section>
                <h2 className="mono-label mb-3 text-subtle">Questions</h2>
                <ul className="space-y-2.5">
                  {questionBookmarks.map((q) => (
                    <li key={q.id}>
                      <QuestionCard
                        question={q}
                        status={statusOf(progress, q)}
                        bookmarked
                        onToggleBookmark={(slug) => toggleBookmark(slug, "question")}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )
      ) : null}

      {tab === "notes" ? (
        notes.length === 0 ? (
          <EmptyState
            icon={<IconNote size={26} />}
            title="No notes yet"
            body="Every coding question has a Notes tab. What you write there lands here, alongside the question it belongs to."
          />
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const question = getQuestion(note.ref);
              const isEditing = editing === note.ref;

              return (
                <li key={note.ref}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        {question ? (
                          <Link
                            href={`/practice/${question.slug}`}
                            className="text-[14px] font-semibold text-fg transition-colors hover:text-accent"
                          >
                            {question.title}
                          </Link>
                        ) : (
                          <span className="text-[14px] font-semibold text-fg">
                            {note.ref}
                          </span>
                        )}
                        <div className="mono-meta mt-1.5 text-faint">
                          Updated {note.updatedAt}
                        </div>
                      </div>
                      {question ? (
                        <DifficultyPill difficulty={question.difficulty} />
                      ) : null}
                    </div>

                    {isEditing ? (
                      <>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={5}
                          className="mt-4 w-full resize-none rounded-lg border border-line bg-bg-raised p-3.5 text-[13.5px] leading-relaxed text-fg-dim focus:border-line-strong focus:outline-none"
                        />
                        <div className="mt-3 flex gap-2">
                          <Button
                            tone="primary"
                            size="sm"
                            onClick={() => {
                              setNote(note.ref, draft);
                              setEditing(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            tone="ghost"
                            size="sm"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                          {note.body}
                        </p>
                        <div className="mt-4 flex gap-2 border-t border-line pt-3">
                          <Button
                            tone="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(note.ref);
                              setDraft(note.body);
                            }}
                          >
                            <IconNote size={13} />
                            Edit
                          </Button>
                          <Button
                            tone="ghost"
                            size="sm"
                            onClick={() => setNote(note.ref, "")}
                          >
                            <IconTrash size={13} />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
