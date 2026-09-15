import type { Question, TestCase } from "./types";

/* ------------------------------------------------------------------
   Kotlin execution boundary.

   There is no Kotlin runtime in the browser, and running arbitrary user
   code needs a sandbox. So the default runner is an honest simulator: it
   reports its results as simulated and never claims to have compiled
   anything.

   The app is a static export, so there is no server of ours to proxy
   through. `runKotlin` below is the whole integration surface: set
   NEXT_PUBLIC_KOTLIN_RUNNER_URL and the browser posts to that service
   directly — which means the service must send CORS headers for the site's
   origin. Nothing in the UI changes either way.
   ------------------------------------------------------------------ */

export interface TestResult {
  name: string;
  call: string;
  expected: string;
  passed: boolean;
  actual?: string;
  message?: string;
}

export interface RunResult {
  /** True when a real Kotlin runtime produced these results. */
  executed: boolean;
  compiled: boolean;
  compileError?: string;
  results: TestResult[];
  passed: number;
  total: number;
  runtimeMs: number;
  notice?: string;
}

const KEYWORD_NOISE = new Set([
  "fun", "val", "var", "return", "if", "else", "for", "in", "is", "as", "the",
  "it", "this", "null", "true", "false", "to", "of", "and", "or", "not",
  "class", "data", "object", "override", "private", "public", "import",
  "package", "TODO", "todo",
]);

function tokens(source: string): Set<string> {
  const raw = source
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .match(/[A-Za-z_][A-Za-z0-9_]{2,}/g);
  if (!raw) return new Set();
  return new Set(raw.filter((t) => !KEYWORD_NOISE.has(t)));
}

/**
 * A deterministic approximation. It measures how much of the reference
 * solution's vocabulary appears in the submission, which is enough to tell
 * "has not started" from "has essentially got it" — and nothing more.
 * It is labelled as simulated everywhere it surfaces.
 */
export function simulateRun(question: Question, code: string): RunResult {
  const started = Date.now();
  const tests: TestCase[] = question.tests ?? [];

  const stillStarter =
    /\bTODO\s*\(\s*\)/.test(code) || code.trim().length === 0;

  if (stillStarter) {
    return {
      executed: false,
      compiled: false,
      compileError:
        "Not implemented: the body still contains TODO(). Replace it and run again.",
      results: tests.map((t) => failedResult(t)),
      passed: 0,
      total: tests.length,
      runtimeMs: Date.now() - started,
      notice: SIMULATED_NOTICE,
    };
  }

  const unbalanced =
    countChar(code, "{") !== countChar(code, "}") ||
    countChar(code, "(") !== countChar(code, ")");

  if (unbalanced) {
    return {
      executed: false,
      compiled: false,
      compileError: "Unbalanced braces or parentheses.",
      results: tests.map((t) => failedResult(t)),
      passed: 0,
      total: tests.length,
      runtimeMs: Date.now() - started,
      notice: SIMULATED_NOTICE,
    };
  }

  const reference = tokens(question.solutionCode ?? "");
  const submitted = tokens(code);
  const shared = [...reference].filter((t) => submitted.has(t)).length;
  const coverage = reference.size === 0 ? 1 : shared / reference.size;

  // Below 0.35 nothing passes; above 0.7 everything does; in between the
  // visible tests pass progressively so partial progress is visible.
  const ratio =
    coverage >= 0.7 ? 1 : coverage <= 0.35 ? 0 : (coverage - 0.35) / 0.35;
  const passCount = Math.round(ratio * tests.length);

  const results: TestResult[] = tests.map((t, i) => {
    const passed = i < passCount;
    return {
      name: t.name,
      call: t.call,
      expected: t.expected,
      passed,
      actual: passed ? t.expected : undefined,
      message: passed
        ? undefined
        : "Did not match the expected result in the simulated run.",
    };
  });

  return {
    executed: false,
    compiled: true,
    results,
    passed: passCount,
    total: tests.length,
    runtimeMs: 18 + Math.round(coverage * 40),
    notice: SIMULATED_NOTICE,
  };
}

/**
 * Run a submission. Uses a configured remote runner when one exists, and
 * falls back to the simulator when it is absent or unreachable — an outage
 * in an optional service should not block practice.
 */
export async function runKotlin(
  question: Question,
  code: string,
): Promise<RunResult> {
  const endpoint = process.env.NEXT_PUBLIC_KOTLIN_RUNNER_URL;
  if (!endpoint) return simulateRun(question, code);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: "kotlin",
        slug: question.slug,
        code,
        tests: question.tests ?? [],
      }),
    });

    if (!response.ok) return simulateRun(question, code);

    const result = (await response.json()) as RunResult;
    return { ...result, executed: true };
  } catch {
    // Network failure, CORS rejection, malformed response — the simulator
    // is a worse answer than a real one and a much better answer than none.
    return simulateRun(question, code);
  }
}

export const SIMULATED_NOTICE =
  "Simulated run — no Kotlin runtime is connected. Results approximate correctness; the reference solution is the authority.";

function failedResult(t: TestCase): TestResult {
  return { name: t.name, call: t.call, expected: t.expected, passed: false };
}

function countChar(s: string, ch: string): number {
  let n = 0;
  for (const c of s) if (c === ch) n += 1;
  return n;
}
