import type { Question } from "@/lib/types";

/* 10 architecture questions. */

export const ARCHITECTURE_QUESTIONS: Question[] = [
  {
    id: "ar01",
    slug: "three-models-one-concept",
    title: "Three Models for One Concept",
    description:
      "DTO, domain, UI model. Defend the duplication — or decide against it.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["architecture"],
    stage: "explain",
    concepts: ["dto"],
    estimatedMinutes: 9,
    completedCount: 9100,
    introducedInWeek: 7,
    quizStem:
      "A reviewer calls three models for one concept 'boilerplate'. Which response is strongest?",
    choices: [
      {
        id: "a",
        body: "They serve different masters: the DTO follows the server's schema, the domain model follows the business rules, the UI model follows the screen. Coupling them means a server rename becomes a UI change.",
        correct: true,
        rationale:
          "Each model has a different reason to change, which is the only real justification for a separate type. It is also the honest one: if two of them always change together, they should be one type.",
      },
      {
        id: "b",
        body: "Clean Architecture requires it.",
        correct: false,
        rationale: "An appeal to authority, not a reason. Architecture rules that cannot be justified on the feature in front of you are cargo cult.",
      },
      {
        id: "c",
        body: "It makes the app easier to test.",
        correct: false,
        rationale: "Partly true but weak — you can test a single model perfectly well. Testability is a consequence of the real reason, not the reason.",
      },
      {
        id: "d",
        body: "It is required if you ever want to change backend.",
        correct: false,
        rationale: "Speculative. Most apps never change backend, and designing for imagined futures is how you get layers nobody can navigate.",
      },
    ],
    solution: {
      mentalModel:
        "Separate types when they have separate reasons to change. One model is right for a settings toggle; three is right for a screen whose server schema, business rules and presentation all move independently.",
      whyItWorks: [
        "Mapping at boundaries localises change: a renamed JSON field touches one mapper.",
        "UI models can hold pre-formatted strings and display flags that have no business meaning.",
        "The domain model can express rules the API knows nothing about.",
      ],
      commonMistakes: [
        "Three identical models with a mapper that copies fields one-to-one — that is genuine boilerplate, and evidence you need fewer.",
        "Putting `@SerialName` on a domain model, which makes the network the shape of your business logic.",
        "Applying the rule uniformly regardless of feature size.",
      ],
      followUps: ["Which features in your codebase genuinely need three, and which need one? What is your test?"],
    },
  },
  {
    id: "ar02",
    slug: "use-case-or-not",
    title: "Does This Feature Need a Use Case?",
    description: "Decide, with a rule you can apply to the next feature too.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Architecture",
    topics: ["architecture"],
    stage: "explain",
    ownership: "design",
    concepts: ["use-case"],
    estimatedMinutes: 14,
    completedCount: 6300,
    introducedInWeek: 7,
    readingCode: `class GetUserUseCase(private val repository: UserRepository) {
    suspend operator fun invoke(id: String): User = repository.user(id)
}

class ObserveVisibleTasksUseCase(
    private val tasks: TaskRepository,
    private val filters: FilterRepository,
) {
    operator fun invoke(): Flow<List<Task>> =
        combine(tasks.all(), filters.current()) { all, filter ->
            all.filter(filter::matches).sortedWith(filter.comparator)
        }
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "What does the first use case add?",
        expert:
          "Nothing but a file. It forwards one call with no transformation, no combination and no business rule. The ViewModel could depend on the repository directly and be strictly simpler. This is the case reviewers are right to object to.",
        keywords: ["nothing", "forwards", "indirection"],
      },
      {
        id: "p2",
        question: "What does the second one add?",
        expert:
          "It combines two repositories and holds a rule — what 'visible' means — that is neither a data concern nor a presentation concern. If three screens need that definition, it lives in exactly one place. That is a use case earning its keep.",
        keywords: ["combines", "rule", "reuse", "two repositories"],
      },
      {
        id: "p3",
        question: "State a rule you could apply to the next feature.",
        expert:
          "Introduce a use case when at least one holds: it combines more than one repository; it contains a business rule that is not presentation logic; or the same logic is needed by more than one ViewModel. Pure pass-through fails all three. Teams that require a use case for *every* interaction end up with hundreds of one-line classes and reviewers who stop reading them.",
        keywords: ["combines", "rule", "reused", "three"],
      },
      {
        id: "p4",
        question: "Why `operator fun invoke` rather than a named method?",
        expert:
          "It lets the call site read `getVisibleTasks()` rather than `getVisibleTasksUseCase.execute()`, which keeps the ViewModel readable. It is a convention rather than a requirement; the cost is that the class name no longer appears at the call site, which some teams find makes navigation harder.",
        keywords: ["invoke", "readable", "convention"],
      },
    ],
    solution: {
      mentalModel:
        "A use case is a home for logic that belongs to neither the data layer nor a single screen. If no such logic exists, the use case is a redirect.",
      whyItWorks: [
        "Combining repositories in one place keeps ViewModels thin and keeps the combination testable in isolation.",
        "Rules expressed once cannot drift between screens.",
      ],
      commonMistakes: [
        "A use case per repository method, by policy.",
        "Use cases that hold state — they should be stateless functions over repositories.",
        "Use cases that depend on other use cases three levels deep.",
      ],
      inProduction: "Google's own guidance describes the domain layer as optional, to be added when it earns its place.",
      followUps: ["What would you do if a use case is needed by exactly one ViewModel today, but the rule is genuinely business logic?"],
    },
  },
  {
    id: "ar03",
    slug: "repository-boundary",
    title: "What Belongs Behind a Repository?",
    description: "Draw the line so the ViewModel cannot see through it.",
    difficulty: "Medium",
    format: "coding",
    track: "Architecture",
    topics: ["architecture", "networking", "room"],
    stage: "implement",
    ownership: "implement",
    concepts: ["repository", "viewmodel", "layering"],
    estimatedMinutes: 18,
    completedCount: 6900,
    introducedInWeek: 7,
    prompt:
      "This repository leaks its implementation in four separate ways. Find them and rewrite the interface so a caller cannot tell whether the data came from the network, the cache, or a test fake.",
    requirements: [
      "No Retrofit, Room or OkHttp types in the interface",
      "No nullable returns standing in for errors",
      "Caching policy invisible to callers",
      "The interface must be implementable by a fake in ten lines",
    ],
    relatedConcepts: ["Dependency inversion", "Leaky abstractions", "Interface design"],
    starterCode: `interface ArticleRepository {
    suspend fun fetchArticles(page: Int): Response<List<ArticleDto>>
    suspend fun getCached(): List<ArticleEntity>?
    fun clearCache()
    suspend fun getArticle(id: String): ArticleDto?
}`,
    solutionCode: `interface ArticleRepository {
    /** Observes the single source of truth. Never fails. */
    fun observeArticles(): Flow<List<Article>>

    /** Refreshes from the network; caching is an implementation detail. */
    suspend fun refresh(): Result<Unit, DataError>

    /** Absence is a distinct outcome, not a null. */
    suspend fun article(id: String): Result<Article, DataError>
}`,
    tests: [
      { name: "no transport types", call: `interface signature`, expected: `domain types only` },
      { name: "fake is trivial", call: `FakeArticleRepository`, expected: `~10 lines` },
    ],
    hints: [
      "`Response<T>` is Retrofit. `ArticleEntity` is Room. Both name the implementation in the contract.",
      "`clearCache()` forces the caller to know there is a cache and to decide when it is stale.",
    ],
    solution: {
      mentalModel:
        "A repository interface is a promise about *what*, never about *how*. If a caller must know whether something is cached, the abstraction has already failed.",
      whyItWorks: [
        "Domain types only means the interface is stable across a change of HTTP client or database.",
        "A `Result` with a domain error type removes null-as-error, which conflates 'no article' with 'request failed'.",
        "Observation plus refresh is the shape that supports offline-first without exposing it.",
      ],
      commonMistakes: [
        "`suspend fun getArticles(): List<Article>` with no error channel, so failure becomes an exception the UI must catch.",
        "`forceRefresh: Boolean` parameters, which are caching policy leaking into the signature.",
        "Interfaces written after the implementation, which inevitably mirror it.",
      ],
      alternatives: [
        {
          title: "No interface at all",
          body: "If there is exactly one implementation and your test strategy uses a fake HTTP server rather than a fake repository, a concrete class is fine. An interface with one implementation and one fake is common but not mandatory.",
        },
      ],
      inProduction: "The strongest signal that a boundary is right: writing the fake is boring.",
      followUps: ["Where does 'refresh if older than five minutes' live in this design?"],
    },
  },
  {
    id: "ar04",
    slug: "mvi-vs-mvvm",
    title: "MVI or MVVM?",
    description: "Compare on the dimensions that actually differ.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["architecture", "viewmodel"],
    stage: "explain",
    concepts: ["layering"],
    estimatedMinutes: 9,
    completedCount: 7700,
    introducedInWeek: 7,
    quizStem: "What is the substantive difference between the two, as practised on Android today?",
    choices: [
      {
        id: "a",
        body: "MVI has a single immutable state object and models user input as explicit intents; MVVM commonly exposes several state holders and public methods. The gap has narrowed to almost nothing.",
        correct: true,
        rationale:
          "Modern MVVM with one `StateFlow<UiState>` and method calls is functionally MVI without the `Intent` sealed class. The real distinctions left are state granularity and whether input is a typed value or a method call.",
      },
      { id: "b", body: "MVI is unidirectional and MVVM is bidirectional.", correct: false, rationale: "MVVM with a single state flow and events upward is unidirectional too. The old bidirectional-binding criticism applies to data-binding-era MVVM, not to the current practice." },
      { id: "c", body: "MVI requires a reducer function and MVVM forbids one.", correct: false, rationale: "Neither requires nor forbids a reducer; a reducer is an implementation choice available to both." },
      { id: "d", body: "MVI is better for Compose because Compose is declarative.", correct: false, rationale: "Compose wants a single source of state, which both patterns can provide. This is a slogan, not a difference." },
    ],
    solution: {
      mentalModel:
        "Both aim at one state, one direction. MVI adds a typed intent channel, which buys you an audit log and easy replay at the cost of a sealed class per screen and a layer of indirection at every call site.",
      whyItWorks: [
        "A single immutable state object makes the screen's condition inspectable at a glance and trivially testable.",
        "Typed intents make every possible user action enumerable — useful for logging, analytics and time-travel debugging.",
      ],
      commonMistakes: [
        "Adopting MVI ceremony for a screen with two interactions.",
        "MVVM with five separate `StateFlow`s that can disagree — the actual failure the single-state idea fixes.",
        "Arguing pattern names instead of asking what the screen's state and inputs are.",
      ],
      followUps: ["On which screen in your app would typed intents have paid for themselves this month?"],
    },
  },
  {
    id: "ar05",
    slug: "module-boundaries",
    title: "Where to Cut Modules",
    description: "By layer or by feature? The build graph has an opinion.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Architecture",
    topics: ["architecture", "performance"],
    stage: "explain",
    ownership: "design",
    concepts: ["gradle-build", "layering"],
    estimatedMinutes: 16,
    completedCount: 4200,
    introducedInWeek: 7,
    readingCode: `// Option A — by layer
:app
:data
:domain
:ui

// Option B — by feature, layered inside
:app
:core:network  :core:database  :core:designsystem
:feature:feed  :feature:profile  :feature:settings`,
    readingPrompts: [
      {
        id: "p1",
        question: "You change one field on the feed's UI model. What rebuilds under each layout?",
        expert:
          "Under A, `:ui` rebuilds — and `:ui` contains every screen in the app, so everything downstream of it rebuilds too. Under B, only `:feature:feed` and `:app` rebuild. Layer modules concentrate change; feature modules isolate it.",
        keywords: ["ui rebuilds", "feature only", "isolate"],
      },
      {
        id: "p2",
        question: "Which layout makes an accidental dependency between two features possible?",
        expert:
          "A. With everything in `:ui`, profile code can call feed code with no visible change to any build file. Under B, `:feature:profile` cannot see `:feature:feed` unless someone adds the dependency explicitly — which a reviewer sees in the diff.",
        keywords: ["accidental", "explicit", "build file"],
      },
      {
        id: "p3",
        question: "What does B cost?",
        expert:
          "Real overhead: more Gradle files, a convention-plugin setup to keep them consistent, shared code that must find a home in `:core`, and navigation between features that needs an indirection (a navigator interface or a route registry) so features do not depend on each other. Below roughly ten screens it is usually not worth it.",
        keywords: ["gradle", "core", "navigation", "overhead"],
      },
      {
        id: "p4",
        question: "How would you decide which one your project needs?",
        expert:
          "Measure incremental build time on the change you make most often, and count how often a change to one feature forces a rebuild of another. If your full build is under a minute and the team is small, a single module is defensible. Modularisation is a response to measured build pain and measured coupling, not a starting position.",
        keywords: ["measure", "build time", "team size"],
      },
    ],
    solution: {
      mentalModel:
        "Modules are a build-time and dependency-visibility tool. Cut where you want change to stop, and expect the cut to cost you plumbing.",
      whyItWorks: [
        "Feature modules bound the blast radius of a change to one feature plus the app module.",
        "Explicit dependencies in build files make coupling reviewable.",
      ],
      commonMistakes: [
        "Modularising a five-screen app and spending a week on Gradle.",
        "A `:common` module that everything depends on, which becomes a second monolith.",
        "Feature modules that depend on each other directly, recreating the coupling you split to avoid.",
      ],
      followUps: ["How would you let `:feature:profile` navigate to `:feature:feed` without depending on it?"],
    },
  },
  {
    id: "ar06",
    slug: "di-scope-selection",
    title: "Choosing a DI Scope",
    description: "Lifetime of the thing, not convenience of the annotation.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["architecture", "testing"],
    stage: "explain",
    concepts: ["dagger-scopes"],
    estimatedMinutes: 8,
    completedCount: 6600,
    introducedInWeek: 7,
    quizStem:
      "A `SessionManager` holds the signed-in user and must be the same instance everywhere, cleared on sign-out. Which scope?",
    choices: [
      {
        id: "a",
        body: "`@Singleton` — one instance for the process, with explicit `clear()` on sign-out.",
        correct: true,
        rationale:
          "The session outlives every Activity and must be shared, so the application scope matches its lifetime. Sign-out is a state change within that lifetime, handled explicitly rather than by destroying the graph.",
      },
      { id: "b", body: "`@ActivityRetainedScoped`, so it clears with the ViewModel.", correct: false, rationale: "The session must survive navigation across Activities and be visible to background workers, neither of which this scope covers." },
      { id: "c", body: "No scope — a new instance per injection.", correct: false, rationale: "Then two injection sites see two different sessions, which is the specific failure the requirement rules out." },
      { id: "d", body: "A custom `@UserScope` component created at sign-in and destroyed at sign-out.", correct: false, rationale: "Architecturally the most precise answer, and a legitimate advanced choice. On Hilt it means a custom component and manual lifecycle management that most teams do not need — but say so in an interview and you have made a good point." },
    ],
    solution: {
      mentalModel:
        "Scope = lifetime. Ask how long the object must live and who must share it; the answer names the scope. Everything else is convenience.",
      whyItWorks: [
        "`@Singleton` matches process lifetime, which is what a session has.",
        "Explicit clearing keeps the lifetime simple and the transition observable.",
      ],
      commonMistakes: [
        "`@Singleton` everywhere, which turns every object into a potential leak and hides lifetime mistakes.",
        "Scoped objects holding Activity references.",
        "Assuming a singleton survives process death.",
      ],
      followUps: ["What would you scope to `@ActivityRetainedScoped`, and why does it exist at all?"],
    },
  },
  {
    id: "ar07",
    slug: "state-ownership",
    title: "Who Owns This State?",
    description: "Four pieces of state, four different homes.",
    difficulty: "Medium",
    format: "coding",
    track: "Architecture",
    topics: ["architecture", "viewmodel", "compose"],
    stage: "implement",
    ownership: "implement",
    concepts: ["compose-state", "udf", "viewmodel"],
    estimatedMinutes: 15,
    completedCount: 7900,
    introducedInWeek: 7,
    prompt:
      "For each of these, name the owner and defend it: (a) whether a card is expanded, (b) the text in a search field, (c) the list of results, (d) whether onboarding has been completed.",
    requirements: [
      "Name the layer for each",
      "Say what event would prove the choice wrong",
    ],
    relatedConcepts: ["State ownership", "SavedStateHandle", "DataStore"],
    starterCode: `// a) expanded  → ?
// b) query     → ?
// c) results   → ?
// d) onboarded → ?`,
    solutionCode: `// a) Composition: remember { mutableStateOf(false) }
//    Purely visual, no business meaning, cheap to lose.
//    Wrong if: the expansion must survive rotation → rememberSaveable.

// b) The text field itself, forwarded to the ViewModel as an event.
//    Editing state is local; the *query* is application state.
//    Wrong if: characters drop while typing → you hoisted too far.

// c) ViewModel: StateFlow<SearchUiState>
//    Survives configuration change, tested without UI, shared by the screen.
//    Wrong if: it should survive process death → back it with SavedStateHandle
//    or re-derive from the persisted query.

// d) DataStore: a persisted boolean read at startup.
//    Must survive app restart and reinstall-independent of any screen.
//    Wrong if: it resets when the process dies → you kept it in memory.`,
    tests: [
      { name: "expansion survives recomposition", call: `recompose`, expected: `preserved` },
      { name: "results survive rotation", call: `rotate`, expected: `preserved` },
      { name: "onboarding survives restart", call: `restart app`, expected: `preserved` },
    ],
    hints: [
      "For each, ask: what event must it survive? The shortest storage that survives that event is the right one.",
      "Hoisting everything to the ViewModel is as much a mistake as hoisting nothing.",
    ],
    solution: {
      mentalModel:
        "Four lifetimes, in order: recomposition, configuration change, process, device. Pick the shortest one that satisfies the requirement — longer lifetimes cost complexity and create state that can go stale.",
      whyItWorks: [
        "Transient UI state in the composition keeps the ViewModel focused on what the screen means rather than how it looks.",
        "Application state in the ViewModel is testable without a device.",
        "Persisted state in DataStore is the only thing that survives a restart.",
      ],
      commonMistakes: [
        "Expansion state in the ViewModel, so the ViewModel has a field per card.",
        "Search text owned by the ViewModel, causing dropped keystrokes.",
        "Onboarding flag in a ViewModel, so it re-runs after every process death.",
      ],
      followUps: ["Which of these four would you change if the screen had to restore exactly after process death?"],
    },
  },
  {
    id: "ar08",
    slug: "feature-flag-architecture",
    title: "Feature Flags Without Spaghetti",
    description: "Keep the conditional out of forty call sites.",
    difficulty: "Medium",
    format: "coding",
    track: "Architecture",
    topics: ["architecture", "testing"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow", "observability"],
    estimatedMinutes: 16,
    completedCount: 3900,
    introducedInWeek: 7,
    prompt:
      "A new checkout flow is behind a flag. `if (flags.newCheckout)` currently appears in eleven places. Restructure so the decision is made once.",
    requirements: [
      "One decision point",
      "Both implementations testable in isolation",
      "Removing the flag later should delete code, not edit it in eleven places",
    ],
    relatedConcepts: ["Strategy pattern", "DI binding", "Flag lifecycle"],
    starterCode: `if (flags.newCheckout) { /* new */ } else { /* old */ }   // × 11`,
    solutionCode: `interface CheckoutFlow {
    fun start(cart: Cart): Destination
    suspend fun submit(order: Order): Result<Receipt, DataError>
}

class LegacyCheckoutFlow(...) : CheckoutFlow { ... }
class ExpressCheckoutFlow(...) : CheckoutFlow { ... }

@Module @InstallIn(SingletonComponent::class)
object CheckoutModule {
    @Provides
    fun checkoutFlow(
        flags: FeatureFlags,
        legacy: Provider<LegacyCheckoutFlow>,
        express: Provider<ExpressCheckoutFlow>,
    ): CheckoutFlow =
        if (flags.isEnabled(Flag.ExpressCheckout)) express.get() else legacy.get()
}

// Deleting the flag later: delete LegacyCheckoutFlow, delete the branch,
// bind ExpressCheckoutFlow directly. Nothing else changes.`,
    tests: [
      { name: "one branch in the codebase", call: `grep isEnabled(ExpressCheckout)`, expected: `1 result` },
      { name: "both flows unit-tested", call: `test each implementation`, expected: `no flag needed` },
    ],
    hints: [
      "A flag that appears in eleven places is really one polymorphic decision written eleven times.",
      "`Provider<T>` avoids constructing the branch that will not be used.",
    ],
    solution: {
      mentalModel:
        "A feature flag is a runtime choice between implementations. Make the choice at the composition root and the rest of the code never learns the flag exists.",
      whyItWorks: [
        "Each implementation is a normal class with normal tests.",
        "One branch means one place to check when the flag is removed.",
        "The interface documents exactly what varies between the two.",
      ],
      commonMistakes: [
        "Flags read directly inside composables and ViewModels, which makes every test need a flag setup.",
        "No removal plan: flags accumulate until nobody knows which combinations are tested.",
        "Flags that change value mid-session, so half the screen is on each path.",
      ],
      followUps: ["What is your process for retiring a flag, and who owns it?"],
    },
  },
  {
    id: "ar09",
    slug: "analytics-without-coupling",
    title: "Analytics Without Coupling Every Screen",
    description: "Instrument the app without putting tracking calls in forty composables.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["architecture", "testing"],
    stage: "explain",
    concepts: ["observability"],
    estimatedMinutes: 8,
    completedCount: 4400,
    introducedInWeek: 7,
    quizStem: "Where should screen-view tracking live?",
    choices: [
      {
        id: "a",
        body: "A navigation listener that maps destinations to events, plus explicit calls only for interactions that are not navigation.",
        correct: true,
        rationale:
          "Screen views are already an event the navigation layer knows about. Observing it once gives complete coverage with no per-screen code, and no screen can forget to add tracking.",
      },
      { id: "b", body: "A `LaunchedEffect(Unit) { analytics.screen(\"Feed\") }` in every screen composable.", correct: false, rationale: "It works and is forgettable — a new screen ships untracked and nobody notices for a month. It also fires again on process-death restoration." },
      { id: "c", body: "In each ViewModel's `init`.", correct: false, rationale: "A ViewModel's `init` fires once per ViewModel, not per screen view, so returning to a screen via back does not track. It also couples every ViewModel to analytics." },
      { id: "d", body: "In the repository, so events accompany data loads.", correct: false, rationale: "Conflates data access with user behaviour. A cached load is not a screen view, and a prefetch is not a user action." },
    ],
    solution: {
      mentalModel:
        "Instrument at the layer that already owns the concept. Navigation owns screen views; the UI owns taps; the data layer owns request outcomes.",
      whyItWorks: [
        "One listener means complete and consistent coverage.",
        "An `Analytics` interface with a no-op implementation keeps tests free of setup.",
      ],
      commonMistakes: [
        "Analytics scattered through composables, which makes them harder to read and to test.",
        "Screen names duplicated as string literals in two places.",
        "Tracking in `init`, which misses returns and double-counts restorations.",
      ],
      followUps: ["How would you assert in a test that a particular user journey produced exactly the expected event sequence?"],
    },
  },
  {
    id: "ar10",
    slug: "migration-strategy",
    title: "Migrating a Legacy Screen",
    description: "Sequence the work so the app ships every week.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Architecture",
    topics: ["architecture", "compose", "testing"],
    stage: "explain",
    ownership: "design",
    concepts: ["migrations", "room"],
    estimatedMinutes: 18,
    completedCount: 3100,
    introducedInWeek: 7,
    readingCode: `// The screen today
Activity
  ├── 900-line Fragment
  ├── RxJava streams in a Presenter
  ├── direct Retrofit calls from the Presenter
  └── XML layout with data binding`,
    readingPrompts: [
      {
        id: "p1",
        question: "What would you change first, and why not the UI?",
        expert:
          "The data layer. Extract a repository behind an interface and give it the current behaviour exactly. It is the lowest-risk change, it is independently testable, and every later step depends on it. Rewriting the UI first leaves you re-testing presentation against untested data.",
        keywords: ["data layer", "repository", "lowest risk"],
      },
      {
        id: "p2",
        question: "How do Rx and coroutines coexist during the migration?",
        expert:
          "`kotlinx-coroutines-rx3` bridges both ways: `Single.await()`, `Observable.asFlow()`, `flow.asFlowable()`. Convert at the boundary you are currently moving so each step is small and shippable. Converting everything in one commit is the change nobody can review.",
        keywords: ["bridge", "asFlow", "await", "boundary"],
      },
      {
        id: "p3",
        question: "How does the Fragment survive a Compose migration mid-way?",
        expert:
          "`ComposeView` inside the existing XML lets you replace one section at a time, and `AndroidView` lets a Compose screen host a legacy view it is not ready to rewrite. Both directions work, so the migration can proceed section by section rather than screen by screen.",
        keywords: ["composeview", "androidview", "incremental"],
      },
      {
        id: "p4",
        question: "What makes this safe rather than merely incremental?",
        expert:
          "Characterisation tests written *before* the first change, describing what the screen currently does — including behaviour that is arguably wrong. Without them 'refactor' and 'change behaviour' are indistinguishable. Add a feature flag so the new path can be rolled out and rolled back, and keep each step independently releasable.",
        keywords: ["characterisation tests", "before", "flag", "rollback"],
      },
    ],
    solution: {
      mentalModel:
        "Migrate bottom-up, one shippable step at a time, behind tests you wrote before you touched anything. A migration that cannot ship halfway is a rewrite wearing a disguise.",
      whyItWorks: [
        "Each layer has an interop bridge, so mixed states are legitimate rather than temporary hacks.",
        "Characterisation tests make behaviour preservation checkable.",
        "Flags make rollout reversible.",
      ],
      commonMistakes: [
        "Starting with the UI because it is the visible part.",
        "A long-lived migration branch that never merges.",
        "Improving behaviour during a refactor, so a regression cannot be attributed.",
      ],
      followUps: ["How would you know the migration was finished, and what would you delete?"],
    },
  },
];
