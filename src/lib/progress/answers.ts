"use client";

import { useEffect, useRef } from "react";
import type { SavedAnswer } from "@/lib/types";
import { useProgress } from "./context";

/* ------------------------------------------------------------------
   Refs for saved answers.

   One format, in one place, because these strings are a storage key: a
   ref that changes shape orphans everything written under the old one.
   ------------------------------------------------------------------ */

export function lessonAnswerRef(lessonId: string, blockId: string): string {
  return `lesson:${lessonId}#${blockId}`;
}

export function questionAnswerRef(slug: string, partId: string): string {
  return `question:${slug}#${partId}`;
}

/**
 * Hands back whatever was previously written for `refs` — once, as soon as
 * the store has hydrated.
 *
 * One-shot on purpose. The obvious version ("restore whenever the textarea
 * is empty") fights the learner: clear the box to start over and it types
 * the old answer back in. This fires once per set of refs and then leaves
 * the component alone, so anything written afterwards is the learner's.
 */
export function useRestoreAnswers(
  refs: string[],
  restore: (saved: Record<string, SavedAnswer>) => void,
): void {
  const { progress, hydrated } = useProgress();

  // Identity of both changes every render; neither should retrigger the
  // effect, so the effect reads them through refs instead.
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  const key = refs.join("|");
  const restoredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (restoredKey.current === key) return;
    restoredKey.current = key;

    const saved: Record<string, SavedAnswer> = {};
    for (const ref of refsRef.current) {
      const entry = progress.answers[ref];
      if (entry?.body) saved[ref] = entry;
    }
    if (Object.keys(saved).length > 0) restoreRef.current(saved);
  }, [hydrated, key, progress.answers]);
}
