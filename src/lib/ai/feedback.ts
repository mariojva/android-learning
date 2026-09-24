import { getSupabaseClient } from "@/lib/supabase/client";

export type FeedbackVerdict = "strong" | "partial" | "off-track";

export interface AnswerFeedback {
  verdict: FeedbackVerdict;
  feedback: string;
}

export interface GradeAnswerInput {
  questionTitle?: string;
  prompt: string;
  referenceAnswer: string;
  userAnswer: string;
  /** The code the question is about, when there is one. */
  codeContext?: string;
}

/**
 * supabase-js reports any non-2xx as the same opaque sentence and keeps the
 * actual response on `error.context`. That sentence is useless for telling
 * "you have no Anthropic credit" apart from "the secret is missing", so we
 * dig the real body out before giving up on it.
 */
async function describeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    const status = context.status;
    let detail = "";
    try {
      const text = await context.clone().text();
      try {
        const parsed = JSON.parse(text) as { error?: string; msg?: string };
        detail = parsed.error ?? parsed.msg ?? text;
      } catch {
        detail = text;
      }
    } catch {
      /* body already consumed or unreadable — fall back to the status */
    }

    if (detail) return `${detail} (HTTP ${status})`;

    if (status === 401) {
      return "The function rejected the request as signed out (HTTP 401).";
    }
    if (status === 404) {
      return "No Edge Function named `grade-answer` was found (HTTP 404).";
    }
    if (status === 546 || status === 503) {
      return "The function failed to boot — check its logs in Supabase (HTTP " + status + ").";
    }
    return `The function returned HTTP ${status}.`;
  }

  if (error instanceof Error) return error.message;
  return "The grading request failed.";
}

/**
 * Sends a learner's free-text answer to the `grade-answer` Supabase Edge
 * Function, which asks Claude to judge it against the reference answer.
 *
 * Requires a signed-in session -- the function itself rejects anonymous
 * calls with a 401, which surfaces here as a thrown Error the caller can
 * show inline.
 */
export async function gradeAnswer(
  input: GradeAnswerInput,
): Promise<AnswerFeedback> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Sign in first — grading runs against your account.");
  }

  const { data, error } = await supabase.functions.invoke<
    AnswerFeedback | { error: string }
  >("grade-answer", { body: input });

  if (error) {
    throw new Error(await describeFunctionError(error));
  }
  if (!data || "error" in data) {
    throw new Error(
      (data as { error?: string } | undefined)?.error ??
        "The grading request failed.",
    );
  }
  return data;
}
