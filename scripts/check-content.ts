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

/* -------------------------------- report -------------------------------- */

for (const n of notes) console.log(`note   ${n}`);
for (const p of problems) console.log(`FAIL   ${p}`);
console.log(
  `\n${ALL_QUESTIONS.length} questions · ${ALL_LESSONS.length} lessons · ` +
    `${MODULES.length} modules · ${CONCEPTS.length} concepts`,
);
console.log(`${problems.length} problems, ${notes.length} notes`);
process.exit(problems.length > 0 ? 1 : 0);
