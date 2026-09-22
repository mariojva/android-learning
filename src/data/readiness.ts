import type { TopicId } from "@/lib/types";

/* ------------------------------------------------------------------
   Mid-level readiness.

   Deliberately not a score. A single number would be either flattering
   or demoralising and would never be actionable, and "82% ready" is not
   a thing anyone can act on.

   Instead: capability areas, each with a stated bar. `proficientRequires`
   is the contract — what you would have to be able to do, in words, for
   the label to be honest. It is written so that reading it tells you
   whether the label is true, independently of whatever the app computed.
   ------------------------------------------------------------------ */

export type ReadinessBand = "Learning" | "Practising" | "Proficient" | "Strong";

export interface CapabilityArea {
  id: string;
  name: string;
  /** What this capability is, in one line. */
  summary: string;
  /** Concepts whose mastery evidences it. */
  concepts: string[];
  /** Questions in these topics count as practice for it. */
  topics: TopicId[];
  /** The bar, stated plainly. */
  proficientRequires: string[];
}

export const CAPABILITY_AREAS: CapabilityArea[] = [
  {
    id: "kotlin",
    name: "Kotlin fluency",
    summary: "Reading and writing idiomatic Kotlin without fighting the language.",
    concepts: ["val-var", "read-only-collections", "nullability", "collection-operators",
               "lazy-sequences", "data-classes", "sealed-types", "scope-functions",
               "generics-variance", "extension-functions", "equality"],
    topics: ["kotlin", "collections", "generics"],
    proficientRequires: [
      "Say what val guarantees and what it does not, without hedging",
      "Choose a collection operator by its return type rather than by habit",
      "Model a set of states so the invalid combinations cannot be written",
    ],
  },
  {
    id: "android-fundamentals",
    name: "Android fundamentals",
    summary: "Process, lifecycle, Context and what survives what.",
    concepts: ["context", "lifecycle", "config-change", "viewmodel", "saved-state", "navigation"],
    topics: ["lifecycle", "viewmodel"],
    proficientRequires: [
      "Answer 'survives rotation' and 'survives process death' as separate questions",
      "Pick a Context and name what the wrong one would leak",
      "Explain what SavedStateHandle solves that a ViewModel does not",
    ],
  },
  {
    id: "concurrency",
    name: "Concurrency",
    summary: "Coroutines, scopes, cancellation and who owns running work.",
    concepts: ["main-thread", "suspend", "coroutine-scope", "structured-concurrency",
               "cancellation", "dispatchers"],
    topics: ["coroutines", "execution"],
    proficientRequires: [
      "Name the owner of any coroutine on screen, and when it gets cancelled",
      "Predict what happens to siblings when one child fails",
      "Say why swallowing CancellationException is a bug",
    ],
  },
  {
    id: "reactive-state",
    name: "Reactive state",
    summary: "Flow, StateFlow, and the difference between state and events.",
    concepts: ["flow", "cold-hot", "stateflow", "flow-operators"],
    topics: ["flow"],
    proficientRequires: [
      "Spot the duplicate-collector bug on a cold flow",
      "Choose between combine and zip, map and flatMapLatest, with a reason",
      "Justify a WhileSubscribed timeout rather than copying 5000",
    ],
  },
  {
    id: "compose",
    name: "Compose",
    summary: "UI as a function of state, and the cost of recomposition.",
    concepts: ["recomposition", "compose-state", "compose-stability", "compose-effects", "udf"],
    topics: ["compose"],
    proficientRequires: [
      "Say what causes a given composable to recompose",
      "Explain why a List parameter costs you skipping",
      "Choose between remember, rememberSaveable and ViewModel state",
    ],
  },
  {
    id: "data-layer",
    name: "Data layer",
    summary: "Models, mapping, repositories and where data actually comes from.",
    concepts: ["dto", "domain-model", "mapper", "repository", "single-source-of-truth",
               "cache-invalidation"],
    topics: ["data-modelling", "repositories", "networking", "offline"],
    proficientRequires: [
      "Justify every model that exists — or delete the one that does not earn its place",
      "Decide precedence when cache and network disagree",
      "Translate errors at the boundary instead of leaking transport details",
    ],
  },
  {
    id: "persistence",
    name: "Database & persistence",
    summary: "Relational basics, Room, and migrations that do not lose data.",
    concepts: ["relational-basics", "room", "migrations"],
    topics: ["room", "sql"],
    proficientRequires: [
      "Design a small schema with sane keys and say when an index helps",
      "Explain why a DAO query returns Flow but an insert suspends",
      "Write a migration rather than reaching for destructive fallback",
    ],
  },
  {
    id: "architecture",
    name: "Architecture",
    summary: "Deriving boundaries from pressure, and knowing when to stop.",
    concepts: ["layering", "use-case", "udf", "ui-state"],
    topics: ["architecture"],
    proficientRequires: [
      "Derive a boundary from a real problem rather than from a diagram",
      "Compare MVVM, MVI and Clean Architecture on trade-offs, not definitions",
      "Argue against an abstraction that is not paying for itself",
    ],
  },
  {
    id: "di",
    name: "Dependency injection",
    summary: "Constructor injection, the object graph, and what Dagger generates.",
    concepts: ["dependency-inversion", "constructor-injection", "object-graph", "dagger-scopes"],
    topics: ["di", "dagger"],
    proficientRequires: [
      "Explain what constructor injection buys before any framework appears",
      "Describe a scope as a lifetime and predict what a wrong one leaks",
      "Debug a missing binding from the compiler error alone",
    ],
  },
  {
    id: "testing",
    name: "Testing",
    summary: "Protecting behaviour, at the right seam, with the right double.",
    concepts: ["test-doubles", "test-seams"],
    topics: ["testing"],
    proficientRequires: [
      "Say what a test protects — and delete it when the answer is nothing",
      "Prefer a fake where a mock would encode implementation",
      "Test coroutines and Flow without sleeping or flaking",
    ],
  },
  {
    id: "build-delivery",
    name: "Build & delivery",
    summary: "Gradle, the build pipeline, and what reaches users.",
    concepts: ["gradle-build", "pipeline"],
    topics: ["gradle", "ci-cd"],
    proficientRequires: [
      "Walk the build from source to DEX to package",
      "Explain every step of a pipeline you did not write",
      "Decide what belongs in PR validation versus a release pipeline",
    ],
  },
  {
    id: "debugging",
    name: "Debugging & performance",
    summary: "Finding causes by evidence rather than by changing things.",
    concepts: ["debugging-method", "leaks"],
    topics: ["performance"],
    proficientRequires: [
      "Work a disciplined loop: observe, hypothesise, isolate, verify",
      "Find why a list drops frames rather than sprinkling remember",
      "Leave a regression test behind, not only a fix",
    ],
  },
  {
    id: "production",
    name: "Production thinking",
    summary: "Knowing a feature is healthy without waiting for a bug report.",
    concepts: ["observability"],
    topics: ["observability"],
    proficientRequires: [
      "Decide what to log — and what must never be logged",
      "Roll a risky change out behind a flag, with a defined way back",
      "Diagnose a report you cannot reproduce locally",
    ],
  },
  {
    id: "codebase",
    name: "Working in unfamiliar code",
    summary: "Tracing a feature nobody has explained to you.",
    concepts: ["tracing-a-feature", "code-review"],
    topics: ["codebase", "git"],
    proficientRequires: [
      "Find screen, state owner, data source and tests, in that order",
      "Read a change-set rather than a file",
      "Separate blocking from preference when reviewing",
    ],
  },
  {
    id: "ownership",
    name: "Feature ownership",
    summary: "Carrying a scoped requirement all the way to production.",
    concepts: ["requirement-decomposition", "feature-ownership"],
    topics: ["ownership"],
    proficientRequires: [
      "Turn an ambiguous ticket into clarified scope and sequenced work",
      "Choose persistence, concurrency and failure behaviour deliberately",
      "Plan the rollout, the metrics and the way back",
    ],
  },
];
