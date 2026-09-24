"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "./context";

/**
 * Logs a minute of study for every minute this page is actually open and
 * visible.
 *
 * It replaces a "Log 15 minutes" button that lived in the lesson sidebar and
 * was the only thing in the app that ever recorded time. Asking someone to
 * tell the app what it just watched them do is a tracking design that
 * reliably records nothing.
 *
 * Only counted while the tab is visible, so a lesson left open in a
 * background tab overnight does not turn into eight hours of study. That
 * makes it an undercount rather than an overcount, which is the right way
 * for a number like this to be wrong.
 */
export function useTimeOnTask(active = true): void {
  const { addStudyMinutes } = useProgress();
  const elapsed = useRef(0);

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      elapsed.current += 1;
      addStudyMinutes(1);
    };

    const handle = window.setInterval(tick, 60_000);
    return () => window.clearInterval(handle);
  }, [active, addStudyMinutes]);
}
