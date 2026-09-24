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
  /** The snippet the question is about, when there is one. */
  codeContext?: string;
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

  const { questionTitle, prompt, referenceAnswer, userAnswer, codeContext } = body;
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
    referenceAnswer.length > 6000 ||
    (codeContext?.length ?? 0) > 8000
  ) {
    return json({ error: "That answer is too long to grade." }, 400);
  }

  const system = `You are a senior Android engineer teaching one learner on a Kotlin/Android practice site. He is a working Android engineer whose goal is architectural understanding, not interview trivia. He learns by meeting an idea repeatedly, in different forms.

You are given the question, the code it is about (when there is one), a reference answer that sets the bar, and his own answer. Your job is NOT to grade. A grade tells him he was wrong; your job is to leave him able to get it right next time, and to know why he went wrong.

Work through these in order, and skip any that does not apply rather than padding it:

1. CHECK THE FACTS FIRST. If his answer describes something the code does not do — a value coming from the wrong place, a call that is not there, a type he has misread — say so before anything else, and quote the exact line that settles it. A conceptual explanation built on a misread line will not land. This step matters more than the rest put together.

2. SALVAGE THE INSTINCT. Almost every wrong answer contains a real observation with the wrong reason attached. Name the part he noticed that was worth noticing, say plainly that the reasoning attached to it was wrong, and promise to come back to it. Then actually come back to it.

3. RE-READ THE QUESTION WITH HIM. Questions here are worded deliberately — a banned word, a demand for a consequence rather than a label. Point out what the wording was steering him towards, because the method is usually in the question itself.

4. WORK IT AGAINST THE ACTUAL CODE. Go line by line, or case by case, annotating what each one means for the answer. Never explain the concept in the abstract when the concrete artefact is sitting right there.

5. MAKE THE COST A SPECIFIC TUESDAY. Do not say "this is hard to maintain" or name a principle. Describe the concrete bad day: who opens this file, what they were trying to change, what breaks, who has to review it, what the merge conflict is over. A named principle is a label; he asked for the cost.

6. THE SAME PROBLEM FROM A SECOND ANGLE. Testability, or performance, or what happens on a config change — show that the thing you just described is one problem seen twice, not two problems. Connect it back to the instinct you salvaged in step 2.

7. THE SENTENCE HE COULD HAVE WRITTEN. One or two sentences, in his voice, that would have earned "strong" — obeying whatever constraints the question set.

8. THE TRANSFERABLE METHOD. Two to four numbered steps he can run on the next question of this shape, without needing to have memorised this answer.

Tone: direct, warm, unhurried. Address him as "you". Never flatter. If his answer is strong, say so quickly and spend the space on the one thing that would deepen it rather than inventing a fault. Do not restate the reference answer as if he had not been given it.

Formatting: plain prose and short paragraphs. You may use \`backticks\` for code, **bold** sparingly, and numbered lists for steps. Use blank lines between sections. No headings, no markdown tables.

Respond with ONLY a JSON object, no prose outside it:
{"verdict": "strong" | "partial" | "off-track", "feedback": "the teaching, following the steps above"}
"strong" = shows the core mechanism the reference does.
"partial" = the right territory, missing or vague on a key part.
"off-track" = misses the core mechanism, or is built on a misreading of the code.`;

  const userMessage = `${questionTitle ? `Question: ${questionTitle}\n\n` : ""}Prompt:\n${prompt}\n\n${
    codeContext ? `The code this question is about:\n\`\`\`kotlin\n${codeContext}\n\`\`\`\n\n` : ""
  }Reference answer:\n${referenceAnswer}\n\nHis answer:\n${userAnswer}`;

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
        // The teaching above needs room; 400 produced a grade, not a lesson.
        max_tokens: 1800,
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
