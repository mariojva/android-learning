"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "./context";

/**
 * Marks a question solved from the *state* of the workspace rather than from
 * the click that happened to produce it.
 *
 * The difference matters. A workspace that records its attempt inside the
 * "Finish" handler only completes for a learner who finishes in one sitting
 * on one device. Come back tomorrow, have the saved answers restore you
 * straight to the finished screen, and the recording never happens — while
 * the button that would have done it is now hidden, because you are finished.
 * The exercise is then permanently stuck at done-but-not-complete, which is
 * the same failure as a lesson section with nothing to answer in it.
 *
 * Deriving it instead means any route to the completed state completes it.
 *
 * @param complete Whether the workspace now considers the exercise finished.
 */
export function useRecordWhenComplete(slug: string, complete: boolean): void {
  const { progress, recordAttempt } = useProgress();
  const alreadySolved = Boolean(progress.attempts[slug]?.solved);

  // One recording per mount. Without this the effect re-fires on every
  // progress change and inflates the attempt count just by sitting on the
  // page.
  const recorded = useRef(false);

  useEffect(() => {
    if (!complete || alreadySolved || recorded.current) return;
    recorded.current = true;
    recordAttempt(slug, { solved: true, correct: true });
  }, [complete, alreadySolved, slug, recordAttempt]);
}
