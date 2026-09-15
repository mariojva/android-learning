import type { LearningPath, Module } from "@/lib/types";

const MODULES: Module[] = [
  {
    id: "m01",
    index: 1,
    title: "Kotlin Foundations",
    summary:
      "References versus objects, nullability as a type, and why val is not immutability.",
    difficulty: "Warmup",
    lessonCount: 6,
    exerciseCount: 14,
    estimatedHours: 5,
    topics: ["kotlin"],
    unlockedByDefault: true,
    outcomes: [
      "Explain val, var and immutability without reaching for analogies",
      "Read a nullable type and predict where the compiler will stop you",
      "Choose between ?., ?:, !! and requireNotNull with a reason",
    ],
  },
  {
    id: "m02",
    index: 2,
    title: "Kotlin Collections & Functional Programming",
    summary:
      "map, filter, fold, groupBy, associateBy — and the cost of each intermediate list.",
    difficulty: "Easy",
    lessonCount: 7,
    exerciseCount: 22,
    estimatedHours: 7,
    topics: ["collections", "kotlin"],
    unlockedByDefault: true,
    outcomes: [
      "Pick the transformation whose return type is the shape you need",
      "Order operations so filtering happens before mapping",
      "Know when a Sequence earns its keep and when it does not",
    ],
  },
  {
    id: "m03",
    index: 3,
    title: "Object-Oriented Kotlin & the Type System",
    summary:
      "Sealed hierarchies, data classes, delegation, equality and exhaustiveness.",
    difficulty: "Easy",
    lessonCount: 6,
    exerciseCount: 16,
    estimatedHours: 6,
    topics: ["oop", "kotlin"],
    outcomes: [
      "Model state so impossible combinations cannot be constructed",
      "Explain when a data class copy() is a liability",
      "Use sealed interfaces to get exhaustive when for free",
    ],
  },
  {
    id: "m04",
    index: 4,
    title: "Coroutines",
    summary:
      "Structured concurrency: scopes, jobs, cancellation and how exceptions travel.",
    difficulty: "Medium",
    lessonCount: 8,
    exerciseCount: 20,
    estimatedHours: 9,
    topics: ["coroutines"],
    outcomes: [
      "Trace a cancellation from scope to suspension point",
      "Explain why async in a launch block propagates differently",
      "Choose a dispatcher from first principles, not habit",
    ],
  },
  {
    id: "m05",
    index: 5,
    title: "Flow & Reactive Programming",
    summary:
      "Cold and hot, combine and zip, flatMapLatest, stateIn and the sharing policy.",
    difficulty: "Medium",
    lessonCount: 9,
    exerciseCount: 24,
    estimatedHours: 10,
    topics: ["flow", "coroutines"],
    outcomes: [
      "Say what a collector actually starts, and what stops when it leaves",
      "Choose between StateFlow, SharedFlow and a plain Flow with a reason",
      "Configure SharingStarted for rotation without leaking a subscription",
    ],
  },
  {
    id: "m06",
    index: 6,
    title: "Android Fundamentals & Lifecycle",
    summary:
      "Process death, configuration change, saved state, and who owns what for how long.",
    difficulty: "Medium",
    lessonCount: 7,
    exerciseCount: 15,
    estimatedHours: 7,
    topics: ["lifecycle", "viewmodel"],
    outcomes: [
      "Distinguish configuration change from process death in code",
      "Decide what belongs in SavedStateHandle rather than memory",
      "Collect a Flow from UI without keeping work alive in the background",
    ],
  },
  {
    id: "m07",
    index: 7,
    title: "Jetpack Compose Fundamentals",
    summary:
      "Composition, recomposition, remember, state hoisting and unidirectional data flow.",
    difficulty: "Medium",
    lessonCount: 8,
    exerciseCount: 20,
    estimatedHours: 9,
    topics: ["compose"],
    outcomes: [
      "Explain what remember stores and what invalidates it",
      "Hoist state to the lowest common owner and justify the level",
      "Read a LazyColumn and predict what happens on reorder",
    ],
  },
  {
    id: "m08",
    index: 8,
    title: "Advanced Compose",
    summary:
      "Effects, derivedStateOf, stability, skippability and measured performance.",
    difficulty: "Hard",
    lessonCount: 8,
    exerciseCount: 18,
    estimatedHours: 10,
    topics: ["compose", "performance"],
    outcomes: [
      "Choose between LaunchedEffect, DisposableEffect and SideEffect correctly",
      "Identify an unstable parameter and know the three ways to fix it",
      "Read compiler metrics rather than guessing at recomposition",
    ],
  },
  {
    id: "m09",
    index: 9,
    title: "Android Architecture",
    summary:
      "MVVM, MVI, Clean boundaries, use cases and a model per layer.",
    difficulty: "Medium",
    lessonCount: 7,
    exerciseCount: 16,
    estimatedHours: 8,
    topics: ["architecture", "viewmodel"],
    outcomes: [
      "Justify a use case layer — or its absence — on a real feature",
      "Place a mapper where the dependency direction stays correct",
      "Explain single source of truth beyond the slogan",
    ],
  },
  {
    id: "m10",
    index: 10,
    title: "Networking & the Data Layer",
    summary:
      "HTTP semantics, serialisation, an error taxonomy, pagination and auth refresh.",
    difficulty: "Medium",
    lessonCount: 7,
    exerciseCount: 16,
    estimatedHours: 8,
    topics: ["networking", "architecture"],
    outcomes: [
      "Design an error type the UI can act on rather than display",
      "Implement cursor pagination that survives an inserted item",
      "Refresh a token once under concurrent 401s",
    ],
  },
  {
    id: "m11",
    index: 11,
    title: "Room, DataStore & Offline-First",
    summary:
      "The database as the source of truth, sync, conflict and cache invalidation.",
    difficulty: "Hard",
    lessonCount: 7,
    exerciseCount: 18,
    estimatedHours: 9,
    topics: ["room", "architecture"],
    outcomes: [
      "Make the database the only thing the UI reads from",
      "Reconcile a local optimistic write with a server rejection",
      "Schedule sync work that survives process death",
    ],
  },
  {
    id: "m12",
    index: 12,
    title: "Dependency Injection",
    summary:
      "Scopes, graph shape, testability, and what Hilt is actually doing.",
    difficulty: "Medium",
    lessonCount: 5,
    exerciseCount: 10,
    estimatedHours: 5,
    topics: ["architecture", "testing"],
    outcomes: [
      "Pick a scope from the lifetime of the thing, not convenience",
      "Replace a binding in a test without touching production code",
      "Explain constructor injection's advantage in one sentence",
    ],
  },
  {
    id: "m13",
    index: 13,
    title: "Testing",
    summary:
      "Test dispatchers, Turbine, fakes over mocks, and what a ViewModel test should assert.",
    difficulty: "Medium",
    lessonCount: 7,
    exerciseCount: 18,
    estimatedHours: 8,
    topics: ["testing", "coroutines", "flow"],
    outcomes: [
      "Control virtual time instead of sleeping",
      "Assert on emitted state sequences, not on internals",
      "Write a fake that is easier to read than the mock it replaces",
    ],
  },
  {
    id: "m14",
    index: 14,
    title: "Performance & Debugging",
    summary:
      "Startup, jank, memory, ANRs, race conditions and disciplined profiling.",
    difficulty: "Hard",
    lessonCount: 7,
    exerciseCount: 16,
    estimatedHours: 9,
    topics: ["performance", "compose", "coroutines"],
    outcomes: [
      "Measure before changing anything, every time",
      "Find the allocation or the lock rather than guessing",
      "Explain an ANR trace to someone who did not write the code",
    ],
  },
  {
    id: "m15",
    index: 15,
    title: "Android System Design",
    summary:
      "Feeds, offline downloads, live tracking, chat — designed end to end.",
    difficulty: "Hard",
    lessonCount: 6,
    exerciseCount: 10,
    estimatedHours: 10,
    topics: ["architecture", "room", "networking", "performance"],
    outcomes: [
      "Drive a design from requirements to testing without skipping state ownership",
      "Defend a caching policy against a concrete failure mode",
      "Name the trade-off you accepted and what would change your mind",
    ],
  },
  {
    id: "m16",
    index: 16,
    title: "Android Interview Mastery",
    summary:
      "Timed coding, architecture discussion, and explaining your reasoning out loud.",
    difficulty: "Hard",
    lessonCount: 6,
    exerciseCount: 24,
    estimatedHours: 12,
    topics: ["dsa", "architecture", "compose", "flow"],
    outcomes: [
      "Solve a DSA problem in Kotlin under time pressure",
      "Answer 'why' three levels deep without losing the thread",
      "Turn a vague prompt into a scoped design in five minutes",
    ],
  },
];

export const ANDROID_ENGINEER_PATH: LearningPath = {
  id: "android-engineer",
  title: "Android Engineer Path",
  tagline: "Sixteen modules from language semantics to system design.",
  summary:
    "The spine of Android Academy. Each module ends only when you can predict, implement, break and explain — not when you have read the last page.",
  modules: MODULES,
};

export const MODULE_MAP = new Map(MODULES.map((m) => [m.id, m]));
