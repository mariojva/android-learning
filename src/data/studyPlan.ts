import type { StudyWeek } from "@/lib/types";

/**
 * Twelve weeks, roughly two focused hours a day.
 * Every week pairs language work with the Android idea it unlocks, then
 * closes with the interview pattern that keeps the DSA muscle warm.
 */
export const STUDY_PLAN: StudyWeek[] = [
  {
    week: 1,
    theme: "Kotlin foundations + collections",
    focus:
      "Get the language out of the way. Most Android confusion later is a collections or nullability misunderstanding today.",
    kotlin: [
      "val vs var",
      "types and inference",
      "nullability",
      "List vs MutableList",
      "map",
      "filter",
      "mapNotNull",
      "associate",
      "associateBy",
      "groupBy",
      "fold",
      "reduce",
      "flatMap",
      "firstOrNull",
      "any / all / none",
      "data classes",
      "sealed classes",
    ],
    android: [
      "UI state",
      "DTO → Domain → UI transformation",
      "basic ViewModel concepts",
      "unidirectional data flow",
    ],
    interview: ["arrays", "strings", "HashMap", "HashSet"],
    outcome:
      "You can turn a network response into a UI model and defend the order of every operation in the chain.",
  },
  {
    week: 2,
    theme: "Kotlin abstraction + Android architecture",
    focus:
      "Learn the abstractions Android leans on, then use them to draw layer boundaries that hold.",
    kotlin: [
      "lambdas",
      "higher-order functions",
      "extension functions",
      "interfaces",
      "generics",
      "scope functions",
      "sealed interfaces",
    ],
    android: [
      "ViewModel",
      "state ownership",
      "events vs state",
      "MVVM",
      "MVI",
      "Clean Architecture",
      "repositories",
      "mappers",
      "use cases",
    ],
    interview: ["two pointers", "sliding window"],
    outcome:
      "You can say which layer owns a decision and why the dependency points the way it does.",
  },
  {
    week: 3,
    theme: "Coroutines",
    focus:
      "Structured concurrency properly: a scope is a lifetime, and cancellation is cooperative.",
    kotlin: [
      "suspend",
      "CoroutineScope",
      "Job",
      "SupervisorJob",
      "launch",
      "async / await",
      "withContext",
      "Dispatchers",
      "structured concurrency",
      "cancellation",
      "exception propagation",
    ],
    android: [
      "viewModelScope",
      "lifecycle-aware collection",
      "parallel loading",
      "race conditions",
    ],
    interview: ["stack", "queue"],
    outcome:
      "You can trace a failure from a child coroutine to the screen, and say exactly where it should have been caught.",
  },
  {
    week: 4,
    theme: "Flow",
    focus:
      "Cold versus hot, and the operator that keeps your search box from firing eleven requests.",
    kotlin: [
      "Flow",
      "StateFlow",
      "SharedFlow",
      "map / filter",
      "combine",
      "zip",
      "flatMapLatest",
      "debounce",
      "distinctUntilChanged",
      "catch",
      "retry",
      "stateIn",
      "shareIn",
    ],
    android: ["search as you type", "screen state modelling", "rotation behaviour"],
    interview: ["binary search"],
    project: "Autocomplete search over a debounced, cancelling Flow pipeline.",
    outcome:
      "You can build a search pipeline that cancels stale work and explain every operator in it.",
  },
  {
    week: 5,
    theme: "Compose fundamentals",
    focus:
      "UI as a function of state. Learn what the runtime does before learning its API surface.",
    kotlin: ["trailing lambdas", "function references", "immutability in practice"],
    android: [
      "composition",
      "recomposition",
      "remember",
      "rememberSaveable",
      "state hoisting",
      "events",
      "unidirectional data flow",
      "LazyColumn",
    ],
    interview: ["linked lists"],
    outcome:
      "You can hoist state to the right place and justify why it does not live one level lower.",
  },
  {
    week: 6,
    theme: "Advanced Compose",
    focus:
      "Effects, stability and skipping — the difference between a screen that works and one that stays smooth.",
    kotlin: ["immutable collections", "stable types", "inline lambdas"],
    android: [
      "LaunchedEffect",
      "DisposableEffect",
      "SideEffect",
      "derivedStateOf",
      "rememberCoroutineScope",
      "stability and skippability",
      "LazyColumn keys",
    ],
    interview: ["trees"],
    project: "A complex state-driven screen that survives rotation and stays skippable.",
    outcome:
      "You can read compiler metrics and point at the parameter causing recomposition.",
  },
  {
    week: 7,
    theme: "Architecture",
    focus:
      "Boundaries with teeth: a model per layer, dependencies pointing inward, use cases that earn their place.",
    kotlin: ["interfaces as seams", "typealias", "sealed result types"],
    android: [
      "MVVM",
      "MVI",
      "Clean Architecture",
      "repository boundaries",
      "domain layer",
      "use cases",
      "mappers",
      "DTO / domain / UI models",
      "dependency inversion",
    ],
    interview: ["DFS", "BFS"],
    outcome:
      "You can defend three models for one concept without calling it boilerplate.",
  },
  {
    week: 8,
    theme: "Data layer",
    focus:
      "The network is not a function call. Model its failures, its pages and its tokens honestly.",
    kotlin: ["Result modelling", "runCatching pitfalls", "serialisation"],
    android: [
      "Retrofit concepts",
      "HTTP semantics",
      "serialisation",
      "error taxonomy",
      "pagination",
      "authentication",
      "Room",
      "DataStore",
      "caching",
    ],
    interview: ["heaps"],
    project: "A paginated feed with cursors, retry and a stable list identity.",
    outcome:
      "You can name every failure mode of a request and where each one is handled.",
  },
  {
    week: 9,
    theme: "Offline-first Android",
    focus:
      "One source of truth. The network becomes an input to the database, never to the UI.",
    kotlin: ["flows from the database", "conflict resolution logic"],
    android: [
      "single source of truth",
      "Room + API synchronisation",
      "cache invalidation",
      "connectivity",
      "sync strategies",
      "WorkManager",
    ],
    interview: ["graphs"],
    project: "An offline-first feed with optimistic writes and reconciliation.",
    outcome:
      "You can explain what the user sees in aeroplane mode at every step of a write.",
  },
  {
    week: 10,
    theme: "Testing",
    focus:
      "Tests that describe behaviour. Virtual time, emitted state sequences and readable fakes.",
    kotlin: ["test doubles", "coroutine test APIs"],
    android: [
      "unit tests",
      "ViewModel tests",
      "repository tests",
      "coroutine tests",
      "Flow testing",
      "Compose testing",
      "fakes vs mocks",
    ],
    interview: ["backtracking"],
    outcome:
      "You can test a debounced Flow without a single Thread.sleep.",
  },
  {
    week: 11,
    theme: "Performance + debugging",
    focus:
      "Measure, then change one thing. Guessing is the slowest optimisation technique there is.",
    kotlin: ["allocation awareness", "sequences vs lists at scale"],
    android: [
      "recomposition counts",
      "startup",
      "memory",
      "ANRs",
      "network efficiency",
      "database performance",
      "profiling",
      "race conditions",
      "memory leaks",
    ],
    interview: ["basic dynamic programming"],
    outcome:
      "You can take a jank report and arrive at a cause rather than a theory.",
  },
  {
    week: 12,
    theme: "Android interview mastery",
    focus:
      "Put it together under pressure and say it out loud clearly.",
    kotlin: ["timed Kotlin problems", "idiomatic refactors"],
    android: [
      "architecture questions",
      "Kotlin interviews",
      "Compose interviews",
      "system design",
      "behavioural engineering questions",
      "mock interviews",
    ],
    interview: ["timed mixed sets", "pattern recall"],
    outcome:
      "You can take an ambiguous prompt to a scoped design and a defended trade-off in under an hour.",
  },
];
