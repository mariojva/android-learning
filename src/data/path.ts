import type { LearningPath, Module, TopicId } from "@/lib/types";
import { ALL_QUESTIONS } from "@/data/questions";
import { ALL_LESSONS } from "@/data/lessons";
import { CONCEPTS } from "@/data/concepts";

/* ------------------------------------------------------------------
   The curriculum.

   Ordered by conceptual dependency rather than by Android's own API
   surface: you cannot reason about a ViewModel's lifetime without
   understanding object lifetime, and you cannot judge a repository
   without first feeling the problem one solves.

   Note what is NOT hard-coded below. `lessonCount` and `exerciseCount`
   are counted from the content that actually exists, so the path can
   never advertise 111 lessons while shipping one. A module with nothing
   written yet says zero, and says it honestly.
   ------------------------------------------------------------------ */

interface ModuleSpec {
  id: string;
  title: string;
  summary: string;
  difficulty: Module["difficulty"];
  /** What this module is intended to grow into. A target, not a measurement. */
  plannedHours: number;
  topics: TopicId[];
  unlockedByDefault?: boolean;
  outcomes: string[];
}

const SPECS: ModuleSpec[] = [
  {
    id: "m01",
    title: "Kotlin Foundations",
    summary:
      "References versus objects, nullability as a type, and why val is not immutability.",
    difficulty: "Warmup",
    plannedHours: 6,
    topics: ["kotlin", "collections"],
    unlockedByDefault: true,
    outcomes: [
      "Say what val actually guarantees, and what it does not",
      "Predict whether an operation mutates its input or returns a new value",
      "Choose a collection operator by its return type rather than by habit",
    ],
  },
  {
    id: "m02",
    title: "OOP & Kotlin Abstraction",
    summary:
      "Interfaces, composition and delegation — derived from problems, not from a definition of SOLID.",
    difficulty: "Easy",
    plannedHours: 8,
    topics: ["oop", "generics", "kotlin"],
    unlockedByDefault: true,
    outcomes: [
      "Split a class that has quietly acquired five responsibilities",
      "Argue for composition over inheritance on a concrete example",
      "Follow the line from interface, to dependency inversion, to testability",
    ],
  },
  {
    id: "m03",
    title: "Program Execution & State",
    summary:
      "Call stack, heap, references and mutation — enough machinery to reason about what Android does at runtime.",
    difficulty: "Easy",
    plannedHours: 5,
    topics: ["execution", "kotlin"],
    outcomes: [
      "Explain what is on the stack and what is on the heap, and why it matters",
      "Trace what two references to one object means for a bug you have seen",
      "Describe synchronous and asynchronous execution without hand-waving",
    ],
  },
  {
    id: "m04",
    title: "Android Runtime & Lifecycle",
    summary:
      "Process, Application, Activity, Context. Who owns what, how long it lives, and what survives.",
    difficulty: "Medium",
    plannedHours: 10,
    topics: ["lifecycle", "viewmodel"],
    outcomes: [
      "Answer 'what survives rotation' and 'what survives process death' separately",
      "Pick the right Context and say what the wrong one leaks",
      "Explain SavedStateHandle against the problem it solves",
    ],
  },
  {
    id: "m05",
    title: "Concurrency Foundations",
    summary:
      "Main-thread blocking, ANRs and background work — the problem coroutines were invented to solve.",
    difficulty: "Medium",
    plannedHours: 6,
    topics: ["execution", "coroutines"],
    outcomes: [
      "Explain why a five-second call on the main thread is an ANR",
      "Walk the path from blocking, to Thread, to callback, to coroutine",
      "Name what callbacks made hard that structured concurrency makes easy",
    ],
  },
  {
    id: "m06",
    title: "Coroutines",
    summary:
      "Scopes, jobs, cancellation and structured concurrency — ownership as the organising idea.",
    difficulty: "Medium",
    plannedHours: 14,
    topics: ["coroutines"],
    outcomes: [
      "Say who owns a coroutine and when it is cancelled, for any snippet",
      "Choose launch or async with a reason, and use async only for real concurrency",
      "Predict what happens to siblings when one child fails",
    ],
  },
  {
    id: "m07",
    title: "Flow & Reactive Programming",
    summary:
      "One value versus many over time. Cold and hot, and the operators that actually differ.",
    difficulty: "Medium",
    plannedHours: 14,
    topics: ["flow", "coroutines"],
    outcomes: [
      "Explain cold versus hot, and spot the duplicate-collector bug",
      "Choose between combine and zip, map and flatMapLatest, with reasons",
      "Justify stateIn, WhileSubscribed and the timeout you picked",
    ],
  },
  {
    id: "m08",
    title: "ViewModel, State & UDF",
    summary:
      "Making impossible states impossible, and pushing every decision out of the UI.",
    difficulty: "Medium",
    plannedHours: 8,
    topics: ["viewmodel", "flow", "architecture"],
    outcomes: [
      "Convert loose flags into a state type that cannot express nonsense",
      "Separate state from events, and say why the distinction matters",
      "Defend where a piece of state lives",
    ],
  },
  {
    id: "m09",
    title: "Jetpack Compose",
    summary:
      "UI as a function of state: recomposition, stability, effects and the cost of doing work in a composable.",
    difficulty: "Medium",
    plannedHours: 16,
    topics: ["compose"],
    outcomes: [
      "Say what causes a given composable to recompose",
      "Explain stability and why a List parameter costs you skipping",
      "Choose between remember, rememberSaveable and ViewModel state",
    ],
  },
  {
    id: "m10",
    title: "Networking Fundamentals",
    summary:
      "HTTP before Retrofit: verbs, status codes, headers, auth, pagination, timeouts and retries.",
    difficulty: "Medium",
    plannedHours: 8,
    topics: ["networking"],
    outcomes: [
      "Read a request and response without a library in the way",
      "Explain idempotency and why retrying a POST is not free",
      "Map transport failures onto something the UI can act on",
    ],
  },
  {
    id: "m11",
    title: "Data Modelling: DTO / Entity / Domain / UI",
    summary:
      "Four representations of one thing, why they diverge, and when fewer is the right answer.",
    difficulty: "Medium",
    plannedHours: 8,
    topics: ["data-modelling", "networking", "architecture"],
    outcomes: [
      "Justify each model that exists — or delete the one that does not earn its place",
      "Put mapping at a boundary and keep formatting out of composables",
      "Predict the blast radius of an API schema change",
    ],
  },
  {
    id: "m12",
    title: "Database Fundamentals",
    summary:
      "Tables, keys, indexes, joins and transactions — enough relational thinking to reason about Room.",
    difficulty: "Medium",
    plannedHours: 8,
    topics: ["sql"],
    outcomes: [
      "Design a small schema with sane keys and relationships",
      "Say when an index will help and what it costs",
      "Explain a transaction in terms of a failure you want to survive",
    ],
  },
  {
    id: "m13",
    title: "Room & Persistence",
    summary:
      "Entities, DAOs, Flow queries and migrations — and choosing between Room, DataStore and memory.",
    difficulty: "Medium",
    plannedHours: 10,
    topics: ["room", "sql", "flow"],
    outcomes: [
      "Explain why a DAO query returns Flow but an insert suspends",
      "Write a migration that does not destroy user data",
      "Choose Room, DataStore or an in-memory cache with a reason",
    ],
  },
  {
    id: "m14",
    title: "Repositories & Data Layer",
    summary:
      "Coordinating remote and local sources behind one honest answer to 'where does this come from?'.",
    difficulty: "Hard",
    plannedHours: 10,
    topics: ["repositories", "architecture", "room", "networking"],
    outcomes: [
      "Decide precedence when cache and network disagree",
      "Translate errors at the boundary instead of leaking transport details",
      "Say whether a repository needs an interface — and mean the answer",
    ],
  },
  {
    id: "m15",
    title: "Offline-First Architecture",
    summary:
      "The database as source of truth, refresh as a side effect, and what stale actually costs.",
    difficulty: "Hard",
    plannedHours: 10,
    topics: ["offline", "repositories", "room"],
    outcomes: [
      "Trace a write from tap, through cache, to server and back",
      "Design invalidation you can defend rather than a timeout you guessed",
      "Handle a conflict between local edits and server state",
    ],
  },
  {
    id: "m16",
    title: "Architecture",
    summary:
      "Deriving layers from a screen that does too much — and knowing when to stop adding them.",
    difficulty: "Hard",
    plannedHours: 12,
    topics: ["architecture", "repositories"],
    outcomes: [
      "Derive boundaries from real pressure rather than from a diagram",
      "Compare MVVM, MVI and Clean Architecture on trade-offs",
      "Argue against an abstraction that is not paying for itself",
    ],
  },
  {
    id: "m17",
    title: "Dependency Injection",
    summary:
      "Constructing the graph by hand until the problem is obvious, then naming the pattern.",
    difficulty: "Hard",
    plannedHours: 6,
    topics: ["di", "oop"],
    outcomes: [
      "Explain what constructor injection buys before any framework appears",
      "Swap a real implementation for a fake without touching the class under test",
      "Describe an object graph and who is responsible for building it",
    ],
  },
  {
    id: "m18",
    title: "Dagger & Hilt",
    summary:
      "What the annotations actually generate, what a scope means, and when @Binds beats @Provides.",
    difficulty: "Hard",
    plannedHours: 12,
    topics: ["dagger", "di"],
    outcomes: [
      "Describe the code Dagger generates rather than only the annotations you typed",
      "Explain a scope as a lifetime, and predict what a wrong one leaks",
      "Debug a missing binding from the compiler error alone",
    ],
  },
  {
    id: "m19",
    title: "Testing",
    summary:
      "Starting from the behaviour worth protecting, then choosing the seam and the double.",
    difficulty: "Hard",
    plannedHours: 14,
    topics: ["testing"],
    outcomes: [
      "Say what a given test actually protects, and delete it if the answer is nothing",
      "Prefer a fake to a mock when the mock would encode implementation",
      "Test coroutines and Flow without sleeping or flaking",
    ],
  },
  {
    id: "m20",
    title: "Gradle & Android Builds",
    summary:
      "What happens between clicking Run and an APK existing, and why builds get slow.",
    difficulty: "Hard",
    plannedHours: 8,
    topics: ["gradle"],
    outcomes: [
      "Walk the build from source to DEX to package",
      "Read a build file and say what each block is actually doing",
      "Explain variants, flavours and signing without guessing",
    ],
  },
  {
    id: "m21",
    title: "CI/CD",
    summary:
      "What runs between a push and users receiving the change — and what should block a merge.",
    difficulty: "Hard",
    plannedHours: 6,
    topics: ["ci-cd", "gradle"],
    outcomes: [
      "Explain every step of a pipeline you did not write",
      "Decide what belongs in PR validation versus a release pipeline",
      "Handle secrets and artefacts without hand-waving",
    ],
  },
  {
    id: "m22",
    title: "Git & Team Engineering",
    summary:
      "Branches, reviews and the parts of the job that are communication rather than code.",
    difficulty: "Medium",
    plannedHours: 6,
    topics: ["git"],
    outcomes: [
      "Produce a change-set a reviewer can actually follow",
      "Give review feedback that separates blocking from preference",
      "Turn an ambiguous ticket into scoped, sequenced work",
    ],
  },
  {
    id: "m23",
    title: "Observability & Production",
    summary:
      "How you find out a feature is broken for users when nobody has filed a bug.",
    difficulty: "Hard",
    plannedHours: 6,
    topics: ["observability"],
    outcomes: [
      "Decide what to log — and what must never be logged",
      "Roll a risky change out behind a flag and define the rollback",
      "Diagnose a production report you cannot reproduce locally",
    ],
  },
  {
    id: "m24",
    title: "Performance & Debugging",
    summary:
      "Leaks, jank, duplicate work and races — found by hypothesis and evidence, not by guessing.",
    difficulty: "Hard",
    plannedHours: 10,
    topics: ["performance", "compose", "coroutines"],
    outcomes: [
      "Follow a disciplined loop: observe, hypothesise, isolate, verify",
      "Find why a list drops frames rather than sprinkling remember",
      "Leave behind a regression test, not just a fix",
    ],
  },
  {
    id: "m25",
    title: "Working in Unfamiliar Codebases",
    summary:
      "Tracing a feature end to end in a codebase nobody has explained to you.",
    difficulty: "Hard",
    plannedHours: 8,
    topics: ["codebase", "architecture"],
    outcomes: [
      "Find the screen, its state owner, its data source and its tests, in that order",
      "Build a mental map of a feature before changing any of it",
      "Ask the question that unblocks you instead of the one that reveals nothing",
    ],
  },
  {
    id: "m26",
    title: "Feature Ownership",
    summary:
      "From an ambiguous ticket to a shipped, tested, observable feature you can defend.",
    difficulty: "Hard",
    plannedHours: 16,
    topics: ["ownership", "architecture", "testing"],
    outcomes: [
      "Turn 'add favourites' into clarified requirements and a sequenced plan",
      "Choose persistence, concurrency and failure behaviour deliberately",
      "Plan the rollout, the metrics and the way back",
    ],
  },
  {
    id: "m27",
    title: "Android System Design",
    summary:
      "Designing a client feature end to end under real constraints: offline, sync, paging, scale.",
    difficulty: "Hard",
    plannedHours: 12,
    topics: ["architecture", "offline", "performance"],
    outcomes: [
      "Drive a design from requirements through data flow to trade-offs",
      "Justify caching, pagination and sync choices against the product",
      "Say what you would measure once it shipped",
    ],
  },
  {
    id: "m28",
    title: "Interview Mastery",
    summary:
      "Surviving several layers of 'why?' on the things you actually built.",
    difficulty: "Hard",
    plannedHours: 12,
    topics: ["dsa", "architecture", "coroutines"],
    outcomes: [
      "Answer a concept question and then three follow-ups beneath it",
      "Solve a Kotlin problem while narrating the trade-offs",
      "Explain a decision you made as an engineer rather than as a candidate",
    ],
  },
];

/* Counted, not claimed. */
function countExercises(topics: TopicId[]): number {
  const wanted = new Set(topics);
  return ALL_QUESTIONS.filter((q) => q.topics.some((t) => wanted.has(t))).length;
}

function countLessons(moduleId: string): number {
  return ALL_LESSONS.filter((l) => l.moduleId === moduleId).length;
}

/**
 * Hours of material that actually exists — lesson minutes plus the exercises'
 * own estimates — not a number somebody typed.
 *
 * The authored figures claimed ~253 hours across the 26 modules that have no
 * lesson at all. That is the same claimed-not-computed shape as every other
 * figure this file already derives, and the most expensive version of it: it
 * tells the learner the course is four times the size it is.
 *
 * `spec.estimatedHours` survives as `plannedHours` — what the module is
 * intended to become — so the gap between planned and real stays visible
 * instead of being quietly rounded away.
 */
function availableHours(moduleId: string, topics: TopicId[]): number {
  const wanted = new Set(topics);
  const lessonMinutes = ALL_LESSONS.filter((l) => l.moduleId === moduleId).reduce(
    (n, l) => n + l.sections.reduce((m, s) => m + (s.endMinute - s.startMinute), 0),
    0,
  );
  const exerciseMinutes = ALL_QUESTIONS.filter((q) =>
    q.topics.some((t) => wanted.has(t)),
  ).reduce((n, q) => n + (q.estimatedMinutes ?? 0), 0);
  return Math.round(((lessonMinutes + exerciseMinutes) / 60) * 10) / 10;
}

/**
 * How many lessons a module needs, derived rather than authored.
 *
 * A 120-minute lesson can teach roughly four concepts properly — Day 1 covers
 * five of m01's ten and is already full. So the denominator on "Lesson 1 of 3"
 * comes from the concept graph, and moves on its own when concepts are added,
 * instead of being a number somebody typed once.
 */
const CONCEPTS_PER_LESSON = 4;

function plannedLessons(moduleId: string): number {
  const n = CONCEPTS.filter((c) => c.moduleId === moduleId).length;
  return Math.max(1, Math.ceil(n / CONCEPTS_PER_LESSON));
}

const MODULES: Module[] = SPECS.map((spec, i) => ({
  id: spec.id,
  index: i + 1,
  title: spec.title,
  summary: spec.summary,
  difficulty: spec.difficulty,
  lessonCount: countLessons(spec.id),
  exerciseCount: countExercises(spec.topics),
  estimatedHours: availableHours(spec.id, spec.topics),
  plannedHours: spec.plannedHours,
  plannedLessons: plannedLessons(spec.id),
  topics: spec.topics,
  unlockedByDefault: spec.unlockedByDefault,
  outcomes: spec.outcomes,
}));

export const ANDROID_ENGINEER_PATH: LearningPath = {
  id: "android-engineer",
  title: "Android Engineer Path",
  tagline: `${MODULES.length} modules, ordered by what depends on what.`,
  summary:
    "From language semantics to owning a feature in production. Each module ends when you can predict, implement, break and explain — not when you have read the last page.",
  modules: MODULES,
};

export const MODULE_MAP = new Map(MODULES.map((m) => [m.id, m]));
