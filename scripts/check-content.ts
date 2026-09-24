/**
 * Content integrity check.
 *
 * Every bug this catches is the same bug wearing a different hat: a piece of
 * progress whose denominator is structurally zero. A coding exercise with no
 * tests can never pass. A lesson section with no answerable block can never
 * complete. A module whose topics match no questions sits at 0% forever and
 * gates everything behind it. None of these throw, none of them look wrong in
 * a diff, and all of them surface weeks later as "why is this stuck at 88%".
 *
 * Run with:  npm run check:content
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_QUESTIONS } from "../src/data/questions/index";
import { ALL_LESSONS } from "../src/data/lessons/index";
import { ANDROID_ENGINEER_PATH } from "../src/data/path";

const MODULES = ANDROID_ENGINEER_PATH.modules;
import { CONCEPTS } from "../src/data/concepts";
import { GLOSSARY } from "../src/data/glossary";

const problems: string[] = [];
const notes: string[] = [];

const fail = (m: string) => problems.push(m);
const note = (m: string) => notes.push(m);

/* ----------------------- questions can be finished ---------------------- */

/** The payload each format needs before its workspace can ever say "done". */
const payloadFor: Record<string, string> = {
  quiz: "choices",
  "code-reading": "readingPrompts",
  "code-review": "reviewFindings",
  debugging: "debugHints",
  "system-design": "designStages",
  feature: "designStages",
};

const seen = new Set<string>();
for (const q of ALL_QUESTIONS) {
  if (seen.has(q.slug)) fail(`duplicate question slug: ${q.slug}`);
  seen.add(q.slug);

  const key = payloadFor[q.format];
  if (key) {
    const value = (q as unknown as Record<string, unknown[]>)[key];
    if (!Array.isArray(value) || value.length === 0) {
      fail(`${q.slug} (${q.format}) has no ${key} — it can never be completed`);
    }
  }

  if (q.format === "coding") {
    // Allowed, but it must be deliberate: CodingWorkspace shows a completion
    // control instead of Run/Submit for these.
    if (!q.tests?.length) note(`${q.slug} is a coding exercise with no tests`);
    if (!q.solutionCode) {
      fail(`${q.slug} has neither tests nor a reference solution to compare against`);
    }
  }

  if (!q.topics?.length) fail(`${q.slug} has no topics — it is unreachable from every module`);
}

/* ------------------------ lessons can be finished ----------------------- */

for (const lesson of ALL_LESSONS) {
  const declared = lesson.totalMinutes;
  const summed = lesson.sections.reduce(
    (s, sec) => s + (sec.endMinute - sec.startMinute),
    0,
  );
  if (declared !== summed) {
    note(`${lesson.slug}: totalMinutes ${declared} but sections sum to ${summed}`);
  }

  for (const section of lesson.sections) {
    if (section.endMinute <= section.startMinute) {
      fail(`${lesson.slug}/${section.id} has a zero or negative duration`);
    }
    for (const block of section.blocks) {
      if (block.kind === "implement") {
        const slug = (block as { questionSlug?: string }).questionSlug;
        if (!slug || !seen.has(slug)) {
          fail(`${lesson.slug}/${section.id} links to a missing question: ${slug}`);
        }
      }
    }
  }
}

/* ------------------------- modules have content ------------------------- */

for (const m of MODULES) {
  const count = ALL_QUESTIONS.filter((q) =>
    q.topics.some((t) => m.topics.includes(t)),
  ).length;
  if (count === 0) {
    // Not fatal — the path renders these as "Exercises coming" and does not
    // let them gate the modules after them. Worth seeing on every run.
    note(`module ${m.id} (${m.title}) matches no questions`);
  }
}

/* ------------------------- the concept graph ---------------------------- */

const conceptIds = new Set(CONCEPTS.map((c) => c.id));
const glossaryIds = new Set(GLOSSARY.map((g) => g.id));
for (const c of CONCEPTS) {
  for (const p of c.prerequisites ?? []) {
    if (!conceptIds.has(p)) fail(`concept ${c.id} requires a missing concept: ${p}`);
  }
  if (c.glossaryId && !glossaryIds.has(c.glossaryId)) {
    fail(`concept ${c.id} points at a missing glossary entry: ${c.glossaryId}`);
  }
}

/* ------------------------- content coverage ----------------------------- */

/**
 * Which modules are still mostly empty, measured rather than remembered.
 *
 * `estimatedHours` is now derived from the lessons and exercises that exist;
 * `plannedHours` is what the module is meant to become. The gap between them
 * is the build queue, and printing it on every run is what stops "go down the
 * list" from quietly meaning "go down a list of placeholders".
 */
/* ------------------- what a lesson actually teaches ---------------------- */

/**
 * A lesson's `concepts` are ids now, so two things become checkable: that
 * every id is real, and how much of a module its lessons actually cover.
 *
 * The second one is the gap that prompted this. m01 declares ten concepts and
 * Day 1 teaches five — but the module card said "1 lesson" and the path moved
 * straight on to m02, so finishing Day 1 read as finishing Kotlin Foundations.
 */
for (const lesson of ALL_LESSONS) {
  for (const id of lesson.concepts) {
    if (!conceptIds.has(id)) {
      fail(`${lesson.slug} names a concept that does not exist: ${id}`);
    }
  }
}

for (const m of MODULES) {
  const declared = CONCEPTS.filter((c) => c.moduleId === m.id).map((c) => c.id);
  if (declared.length === 0) continue;
  const taught = new Set(
    ALL_LESSONS.filter((l) => l.moduleId === m.id).flatMap((l) => l.concepts),
  );
  const missing = declared.filter((id) => !taught.has(id));
  if (missing.length > 0 && taught.size > 0) {
    note(
      `${m.id} teaches ${taught.size}/${declared.length} of its concepts — ` +
        `untaught: ${missing.join(", ")}`,
    );
  }
}

const lessonless = MODULES.filter((m) => m.lessonCount === 0);
if (lessonless.length > 0) {
  // One line, not twenty-six: a check nobody can read is a check nobody runs.
  const thinnest = [...lessonless]
    .sort((a, b) => a.estimatedHours - b.estimatedHours)
    .slice(0, 3)
    .map((m) => `${m.id} ${m.estimatedHours}h`)
    .join(", ");
  note(
    `${lessonless.length} of ${MODULES.length} modules have no lesson (thinnest: ${thinnest})`,
  );
}

/* ---------------------- claimed counts in the UI ------------------------ */

/**
 * A number written out in prose is a claim that stops being true silently.
 * The knowledge graph said "Sixty concepts" while rendering 69 of them, two
 * lines above a badge showing the real figure. Nothing failed; the page just
 * lied.
 *
 * This is a heuristic — prose legitimately contains number words — so it
 * notes rather than fails. Every hit should either be derived from the data
 * or be a genuine phrase rather than a count.
 */
const NUMBER_WORD =
  /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|twenty-eight)\s+(concepts?|weeks?|areas?|stages?|modules?|questions?|exercises?|lessons?|days?|entries|topics?|sections?)\b/gi;

function scanForClaimedCounts(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForClaimedCounts(full);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    // Strip comments first, including block-comment interiors — otherwise
    // the explanation above matches itself and every design note becomes a
    // false positive, which is how a check stops being read.
    const text = readFileSync(full, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const line of text.split("\n")) {
      const hit = line.match(NUMBER_WORD);
      if (hit) note(`${full}: claims "${hit[0]}" in prose — derive it instead?`);
    }
  }
}
scanForClaimedCounts("src/app");
scanForClaimedCounts("src/components");

/* -------------------------------- report -------------------------------- */

for (const n of notes) console.log(`note   ${n}`);
for (const p of problems) console.log(`FAIL   ${p}`);
console.log(
  `\n${ALL_QUESTIONS.length} questions · ${ALL_LESSONS.length} lessons · ` +
    `${MODULES.length} modules · ${CONCEPTS.length} concepts`,
);
console.log(`${problems.length} problems, ${notes.length} notes`);
process.exit(problems.length > 0 ? 1 : 0);
