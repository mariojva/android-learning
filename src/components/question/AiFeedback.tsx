"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui/primitives";
import {
  IconSpark,
  IconRefresh,
  IconCheck,
  IconAlert,
  IconX,
} from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgress } from "@/lib/progress/context";
import { gradeAnswer, type AnswerFeedback } from "@/lib/ai/feedback";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: AnswerFeedback }
  | { status: "error"; message: string };

const VERDICT_META: Record<
  AnswerFeedback["verdict"],
  {
    label: string;
    tone: "done" | "warn" | "danger";
    icon: typeof IconCheck;
  }
> = {
  strong: { label: "Strong", tone: "done", icon: IconCheck },
  partial: { label: "Partial", tone: "warn", icon: IconAlert },
  "off-track": { label: "Off track", tone: "danger", icon: IconX },
};

/**
 * A "grade this against the reference" button for the free-text formats.
 * Calls the `grade-answer` Supabase Edge Function, which is the only place
 * the Anthropic API key exists -- nothing here talks to Claude directly.
 *
 * Pass `cacheRef` and the verdict is stored with the answer, so reopening a
 * lesson replays the grade you already paid for instead of buying it again.
 *
 * Renders nothing when signed out (the function requires a session) or
 * before the learner has written something worth grading.
 */
export function AiFeedback({
  cacheRef,
  questionTitle,
  prompt,
  referenceAnswer,
  userAnswer,
}: {
  cacheRef?: string;
  questionTitle?: string;
  prompt: string;
  referenceAnswer: string;
  userAnswer: string;
}) {
  const { user, configured } = useAuth();
  const { progress, saveAnswer } = useProgress();
  const [state, setState] = useState<State>({ status: "idle" });

  const cached = cacheRef ? progress.answers[cacheRef] : undefined;
  const cachedVerdict = cached?.verdict;
  const cachedFeedback = cached?.feedback;

  // A grade stored on a previous visit is shown without a round trip. It is
  // only trusted while the answer it judged is still the answer on screen --
  // rewrite your answer and the old verdict stops applying to it.
  const cacheMatchesAnswer =
    Boolean(cached?.body) && cached?.body.trim() === userAnswer.trim();

  useEffect(() => {
    if (
      state.status === "idle" &&
      cacheMatchesAnswer &&
      cachedVerdict &&
      cachedFeedback
    ) {
      setState({
        status: "done",
        result: { verdict: cachedVerdict, feedback: cachedFeedback },
      });
    }
  }, [state.status, cacheMatchesAnswer, cachedVerdict, cachedFeedback]);

  if (!configured || !user) return null;
  if (userAnswer.trim().length < 8) return null;

  const run = async () => {
    setState({ status: "loading" });
    try {
      const result = await gradeAnswer({
        questionTitle,
        prompt,
        referenceAnswer,
        userAnswer,
      });
      setState({ status: "done", result });
      if (cacheRef) {
        saveAnswer(cacheRef, {
          body: userAnswer,
          verdict: result.verdict,
          feedback: result.feedback,
        });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  if (state.status === "idle") {
    return (
      <Button tone="ghost" size="sm" onClick={run} className="mt-3">
        <IconSpark size={13} />
        Get AI feedback
      </Button>
    );
  }

  if (state.status === "loading") {
    return (
      <Button tone="ghost" size="sm" disabled className="mt-3">
        <IconRefresh size={13} className="animate-spin" />
        Reading your answer…
      </Button>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-hard/25 bg-hard/[0.06] p-3">
        <IconAlert size={13} className="shrink-0 text-hard" />
        <p className="flex-1 text-[12.5px] leading-relaxed text-hard">
          {state.message}
        </p>
        <Button tone="ghost" size="sm" onClick={run}>
          Retry
        </Button>
      </div>
    );
  }

  const meta = VERDICT_META[state.result.verdict];
  const Icon = meta.icon;
  const fromCache = cacheMatchesAnswer && cachedFeedback === state.result.feedback;

  return (
    <div className="animate-fade-up mt-3 rounded-lg border border-line bg-surface-2/50 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <IconSpark size={12} className="text-accent" />
        <span className="mono-label text-subtle">AI feedback</span>
        <Badge tone={meta.tone}>
          <Icon size={10} />
          {meta.label}
        </Badge>
        {fromCache ? (
          <button
            type="button"
            onClick={run}
            className="mono-meta ml-auto text-faint transition-colors hover:text-muted"
          >
            Grade again
          </button>
        ) : null}
      </div>
      <p className="text-[13px] leading-relaxed text-muted">
        {state.result.feedback}
      </p>
    </div>
  );
}
