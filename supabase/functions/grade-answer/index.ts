// Supabase Edge Function: grade-answer
//
// Judges a learner's free-text answer against a question's reference
// answer using Claude, and returns a short verdict + explanation. This
// exists because the app is a static export with no server of its own —
// the Anthropic API key can only live here, never in the browser bundle.
//
// Deploy: paste this file into Supabase Dashboard -> Edge Functions ->
// grade-answer -> Deploy (or `supabase functions deploy grade-answer` if
// you have the CLI). Requires one secret: ANTHROPIC_API_KEY, set under
// Edge Functions -> Secrets in the same dashboard.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically to every
// Edge Function — nothing to configure for those.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GradeRequest {
  questionTitle?: string;
  prompt: string;
  referenceAnswer: string;
  userAnswer: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not set." }, 500);
  }

  // Only a signed-in user may call this. The anon key alone is a valid
  // JWT too, so this explicitly resolves a *user* rather than trusting
  // "any JWT was present" — that's what actually keeps this from being an
  // open door to anyone who finds the project URL.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Sign in required." }, 401);
  }

  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { questionTitle, prompt, referenceAnswer, userAnswer } = body;
  if (!prompt || !referenceAnswer || !userAnswer) {
    return json(
      { error: "prompt, referenceAnswer and userAnswer are required." },
      400,
    );
  }
  // A cheap guard against a malformed or abusive request turning into an
  // expensive one -- these formats never legitimately need more than this.
  if (
    userAnswer.length > 4000 ||
    prompt.length > 6000 ||
    referenceAnswer.length > 6000
  ) {
    return json({ error: "That answer is too long to grade." }, 400);
  }

  const system = `You are grading a learner's free-text answer on an Android/Kotlin engineering practice platform. You are given the question, a reference answer that sets the bar, and the learner's own answer. Judge whether the learner's answer demonstrates the same understanding as the reference -- not whether the wording matches. Respond with ONLY a JSON object, no prose outside it, in exactly this shape:
{"verdict": "strong" | "partial" | "off-track", "feedback": "2-4 sentences, second person, specific to what they wrote"}
"strong" = shows the core mechanism/reasoning the reference does.
"partial" = on the right track but missing or vague on a key part.
"off-track" = misses the core mechanism, even if superficially plausible.
Be direct and specific -- cite what they got right or missed, don't just restate the reference.`;

  const userMessage = `${questionTitle ? `Question: ${questionTitle}\n\n` : ""}Prompt:\n${prompt}\n\nReference answer:\n${referenceAnswer}\n\nLearner's answer:\n${userAnswer}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error", res.status, errText);
      return json({ error: "The grading model is unavailable right now." }, 502);
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";

    const parsed = parseVerdict(text);
    if (!parsed) {
      console.error("Could not parse verdict from:", text);
      return json({ error: "Could not parse a verdict." }, 502);
    }
    return json(parsed, 200);
  } catch (err) {
    console.error("grade-answer failed", err);
    return json({ error: "Something went wrong grading that answer." }, 500);
  }
});

function parseVerdict(
  text: string,
): { verdict: string; feedback: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (
      typeof obj.feedback === "string" &&
      ["strong", "partial", "off-track"].includes(obj.verdict)
    ) {
      return { verdict: obj.verdict, feedback: obj.feedback };
    }
    return null;
  } catch {
    return null;
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
