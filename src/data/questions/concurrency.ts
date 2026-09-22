import type { Question } from "@/lib/types";

/* 15 coroutine and Flow questions. */

export const CONCURRENCY_QUESTIONS: Question[] = [
  {
    id: "c01",
    slug: "debounced-search",
    title: "Debounced Search",
    description:
      "Implement search-as-you-type using StateFlow and Flow operators.",
    difficulty: "Medium",
    format: "coding",
    track: "Android",
    topics: ["flow", "coroutines", "viewmodel"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow-operators", "flow", "stateflow"],
    estimatedMinutes: 30,
    completedCount: 12800,
    companyTags: ["Google", "Meta", "Uber"],
    introducedInWeek: 4,
    prompt:
      "A search field emits on every keystroke. Turn that into a stream of results that does not hammer the network, does not repeat identical queries, and never lets a stale response overwrite a newer one.",
    requirements: [
      "Wait 300ms after typing stops before searching",
      "Ignore repeated identical queries",
      "Cancel an in-flight request when a newer query arrives",
      "Blank query produces an empty result list without a network call",
      "Surface errors without terminating the stream",
    ],
    examples: [
      {
        input: `"k" → "ko" → "kot" typed in 120ms`,
        output: `one request, for "kot"`,
        note: "The first two never leave the device.",
      },
    ],
    constraints: [
      "Expose `StateFlow<SearchUiState>`",
      "No manual Job bookkeeping — let the operators do it",
    ],
    relatedConcepts: ["debounce", "distinctUntilChanged", "flatMapLatest", "stateIn", "catch"],
    starterCode: `class SearchViewModel(
    private val repository: SearchRepository,
) : ViewModel() {

    private val query = MutableStateFlow("")

    fun onQueryChange(value: String) {
        query.value = value
    }

    val uiState: StateFlow<SearchUiState> = TODO()
}`,
    solutionCode: `class SearchViewModel(
    private val repository: SearchRepository,
) : ViewModel() {

    private val query = MutableStateFlow("")

    fun onQueryChange(value: String) { query.value = value }

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<SearchUiState> =
        query
            .debounce(300)
            .distinctUntilChanged()
            .flatMapLatest { q ->
                if (q.isBlank()) {
                    flowOf(SearchUiState.Empty)
                } else {
                    flow { emit(repository.search(q)) }
                        .map<List<Result>, SearchUiState> { SearchUiState.Results(it) }
                        .onStart { emit(SearchUiState.Loading) }
                        .catch { emit(SearchUiState.Error(it.message.orEmpty())) }
                }
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = SearchUiState.Empty,
            )
}`,
    tests: [
      { name: "debounces rapid input", call: `type("k","ko","kot") within 120ms`, expected: `1 request` },
      { name: "ignores identical query", call: `type("kot") twice`, expected: `1 request` },
      { name: "cancels stale request", call: `slow("kot") then "kotlin"`, expected: `results for "kotlin"` },
      { name: "blank short-circuits", call: `type("")`, expected: `Empty, 0 requests`, hidden: true },
    ],
    hints: [
      "`debounce` drops values that are superseded within the window; it does not batch them.",
      "`flatMapLatest` cancels the previous inner flow when a new value arrives — that is your stale-response guard.",
      "`catch` inside the inner flow keeps the outer stream alive. Placed outside, one failure ends everything.",
    ],
    solution: {
      mentalModel:
        "Four independent concerns, four operators. Rate (`debounce`), redundancy (`distinctUntilChanged`), staleness (`flatMapLatest`), failure (`catch`). Write them in that order and each one does exactly one job.",
      improved: {
        label: "With loading state",
        code: `.flatMapLatest { q ->
    if (q.isBlank()) flowOf(SearchUiState.Empty)
    else flow { emit(repository.search(q)) }
        .map { SearchUiState.Results(it) as SearchUiState }
        .onStart { emit(SearchUiState.Loading) }
        .catch { emit(SearchUiState.Error(it.message.orEmpty())) }
}`,
      },
      lineByLine: [
        { line: ".debounce(300)", note: "Emits only when 300ms pass with no new value. A fast typist produces one query." },
        { line: ".distinctUntilChanged()", note: "Type a character and delete it and the query is identical — no reason to ask again." },
        { line: ".flatMapLatest { }", note: "Cancels the previous inner flow. This is the only correct answer to out-of-order responses." },
        { line: ".onStart { emit(Loading) }", note: "Inside the inner flow, so Loading appears per query rather than once ever." },
        { line: ".catch { }", note: "Inside too — an error ends the inner flow, not the pipeline." },
        { line: "WhileSubscribed(5_000)", note: "Survives a rotation; stops work five seconds after the last collector really leaves." },
      ],
      whyItWorks: [
        "`flatMapLatest` cancelling the previous coroutine is what makes out-of-order responses structurally impossible, rather than something you guard against with request ids.",
        "Placing `catch` inside the inner flow preserves the outer stream — the search box keeps working after a failed request.",
        "`stateIn` converts the cold pipeline into hot state with a value the UI can read immediately.",
      ],
      commonMistakes: [
        "`flatMapConcat` or `flatMapMerge` — the first queues stale work, the second lets responses race.",
        "`catch` after `stateIn`, which cannot re-emit into the state and ends collection.",
        "Debouncing inside the composable rather than in the ViewModel, so the pipeline restarts on every recomposition.",
        "`SharingStarted.Eagerly`, which keeps searching with no collectors.",
      ],
      alternatives: [
        {
          title: "Manual Job cancellation",
          body: "Keep a `var searchJob: Job?` and `cancel()` before launching. It works, and it is exactly what `flatMapLatest` does — with four more lines to get wrong.",
        },
        {
          title: "mapLatest",
          body: "`mapLatest { repository.search(it) }` is shorter when you do not need per-query Loading and Error states inside the inner flow.",
        },
      ],
      complexity: { time: "One request per settled query", space: "O(1) beyond the current result set" },
      inProduction:
        "This is the reference implementation for search on Android. The 300ms figure is a product decision — under 200ms feels responsive but costs requests; over 500ms feels laggy.",
      followUps: [
        "How would you test this without waiting 300ms in real time?",
        "What changes if results should accumulate for pagination rather than replace?",
        "Where would you add retry, and why not at the outer level?",
      ],
    },
  },
  {
    id: "c02",
    slug: "duplicate-flow-collectors",
    title: "Duplicate Flow Collectors",
    description:
      "Find and fix a bug causing multiple repository subscriptions.",
    difficulty: "Medium",
    format: "debugging",
    track: "Android",
    topics: ["flow", "coroutines", "viewmodel"],
    stage: "predict",
    ownership: "improve",
    concepts: ["flow", "repository"],
    estimatedMinutes: 15,
    completedCount: 9400,
    introducedInWeek: 4,
    symptom:
      "This ViewModel occasionally appears to process events multiple times after a refresh. Analytics shows one screen view producing three identical network calls. Find the problem before reading the hints.",
    brokenCode: `class ItemsViewModel(
    private val repository: ItemsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<List<Item>>(emptyList())
    val state: StateFlow<List<Item>> = _state

    fun load() {
        viewModelScope.launch {
            repository.items.collect {
                _state.value = it
            }
        }
    }
}`,
    debugHints: [
      {
        label: "Hint 1",
        body: "Think about how many times `load()` can execute. Who calls it, and what happens on pull-to-refresh, on a retry tap, or in a LaunchedEffect whose key changes?",
      },
      {
        label: "Hint 2",
        body: "What happens to the previous collector when `load()` runs again? Nothing cancels it. `collect` on a cold flow suspends forever.",
      },
      {
        label: "Hint 3",
        body: "Each call to `load()` starts a new coroutine in `viewModelScope`, and each one subscribes to `repository.items` independently. If that flow is cold, each subscription triggers its own upstream work — including its own network call.",
      },
    ],
    rootCause:
      "`load()` launches an unbounded number of coroutines. Each `collect` on a cold `Flow` starts a *separate* execution of the upstream — a fresh database query, a fresh network call, a fresh subscription. Nothing cancels the previous one, so after three refreshes there are three live collectors, three upstreams, and three writers racing on `_state.value`. The screen appears to work, because the last writer usually wins, but the work is triplicated and the ordering is not guaranteed.",
    fixedCode: `class ItemsViewModel(
    private val repository: ItemsRepository,
) : ViewModel() {

    // Declared once, as a property. There is no load() to call twice.
    val state: StateFlow<List<Item>> =
        repository.items
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = emptyList(),
            )
}`,
    productionImplications: [
      "Cold flows execute per collector. One collector too many is one network call, one database cursor and one socket too many.",
      "Racing writers on a StateFlow make bugs that reproduce only under slow networks — the worst kind to diagnose.",
      "`stateIn` with `WhileSubscribed` shares a single upstream across every collector and stops it when the last one leaves.",
    ],
    solution: {
      mentalModel:
        "A cold flow is a recipe, not a dish. Collecting it cooks it. Two collectors means two dinners. State that a screen observes should be declared once as a property, not started by an imperative call.",
      whyItWorks: [
        "Declaring the state as a property removes the trigger entirely — there is nothing left to call twice.",
        "`stateIn` interposes a single collector over the cold upstream and fans its values out, so N observers cost one subscription.",
        "`WhileSubscribed(5_000)` ties that subscription to the UI's visibility, so the upstream stops when nobody is watching and survives a rotation.",
      ],
      alternatives: [
        {
          title: "Keep load(), make it idempotent",
          body: "If a trigger really is needed, hold the `Job` and cancel before relaunching — or better, model the trigger as a flow and use `flatMapLatest`, which cancels the previous collection for you.",
        },
        {
          title: "shareIn",
          body: "Use `shareIn` when there is no sensible initial value and replay semantics are what you want. `stateIn` is `shareIn(replay = 1)` plus a guaranteed current value.",
        },
      ],
      commonMistakes: [
        "Calling `load()` from `init` *and* from a `LaunchedEffect`.",
        "Assuming `viewModelScope` deduplicates — it only bounds the lifetime.",
        "Fixing it with a `isLoaded` boolean flag, which papers over the race rather than removing it.",
      ],
      followUps: [
        "How would you write a test that fails on the broken version and passes on the fix?",
        "What would `SharingStarted.Lazily` change here, and why is it a poor fit for a screen?",
      ],
    },
  },
  {
    id: "c03",
    slug: "launch-vs-async",
    title: "launch vs async",
    description:
      "Two builders, two failure behaviours. Know which one defers its exception.",
    difficulty: "Medium",
    format: "quiz",
    track: "Kotlin",
    topics: ["coroutines"],
    stage: "predict",
    concepts: ["structured-concurrency", "coroutine-scope"],
    estimatedMinutes: 8,
    completedCount: 14700,
    introducedInWeek: 3,
    quizStem: "What happens when `loadProfile()` throws?",
    quizCode: `viewModelScope.launch {
    val profile = async { loadProfile() }
    val settings = async { loadSettings() }
    render(profile.await(), settings.await())
}`,
    choices: [
      {
        id: "a",
        body: "The exception is swallowed until `await()` is called, so `loadSettings` completes first.",
        correct: false,
        rationale:
          "This is the widely-taught half-truth. It is accurate for a *root* `async` on a plain `CoroutineScope`, but here `async` is a child of `launch`. A failing child cancels its parent immediately, which cancels the sibling — regardless of when you call `await`.",
      },
      {
        id: "b",
        body: "The failure cancels the parent `launch` immediately, which cancels `loadSettings` too.",
        correct: true,
        rationale:
          "Structured concurrency: a child failure propagates up to the parent `Job`, which cancels all its other children. `await()` then rethrows. Deferring the exception only applies when the `async` has no parent to notify.",
      },
      {
        id: "c",
        body: "Nothing — `async` failures are always silent unless awaited.",
        correct: false,
        rationale: "Never true inside a parent coroutine. Silent failure requires a `SupervisorJob` that deliberately breaks propagation.",
      },
      {
        id: "d",
        body: "`render` runs with a null profile.",
        correct: false,
        rationale: "`await()` rethrows; it never returns a default. The coroutine unwinds before `render` is reached.",
      },
    ],
    solution: {
      mentalModel:
        "`launch` fires and forgets, `async` returns a `Deferred`. Both create *children*. Child failure cancels the parent unless the parent's job is a `SupervisorJob`. The 'async defers exceptions' rule is about root coroutines only.",
      whyItWorks: [
        "The parent `Job` receives the child's failure and moves to cancelling, cancelling every other child.",
        "`await()` rethrows the stored exception, so you still see it at the call site.",
      ],
      commonMistakes: [
        "Wrapping only `await()` in try/catch and expecting the sibling to survive — it has already been cancelled.",
        "Using `supervisorScope` to make siblings independent and forgetting that you must then handle each failure yourself.",
        "`async` for a single call with no parallelism — use `withContext`.",
      ],
      inProduction:
        "Parallel loading of two endpoints is the classic case. If one failing should not cancel the other, wrap in `supervisorScope` and `await` each inside its own `runCatching` that rethrows `CancellationException`.",
      followUps: [
        "Rewrite so a failed profile still renders settings.",
        "What does `coroutineScope { }` guarantee that `supervisorScope { }` does not?",
      ],
    },
  },
  {
    id: "c04",
    slug: "structured-concurrency-scope",
    title: "coroutineScope vs supervisorScope",
    description: "Choose the scope that matches how failures should travel.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["coroutines"],
    stage: "implement",
    ownership: "implement",
    concepts: ["structured-concurrency", "coroutine-scope", "http"],
    estimatedMinutes: 15,
    completedCount: 7600,
    introducedInWeek: 3,
    prompt:
      "Load a dashboard from three independent endpoints. A failure in any one should show a placeholder for that section, not blank the whole screen.",
    requirements: [
      "Fetch all three concurrently",
      "A failure in one must not cancel the others",
      "Cancellation of the caller must still cancel all three",
      "Return a result per section",
    ],
    relatedConcepts: ["supervisorScope", "CancellationException", "Structured concurrency"],
    starterCode: `suspend fun loadDashboard(): Dashboard = TODO()`,
    solutionCode: `suspend fun loadDashboard(): Dashboard = supervisorScope {
    val balance = async { runSuspendCatching { api.balance() } }
    val cards = async { runSuspendCatching { api.cards() } }
    val offers = async { runSuspendCatching { api.offers() } }

    Dashboard(
        balance = balance.await().getOrNull(),
        cards = cards.await().getOrNull().orEmpty(),
        offers = offers.await().getOrNull().orEmpty(),
    )
}

/** runCatching that does not swallow cancellation. */
suspend inline fun <T> runSuspendCatching(block: () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }`,
    tests: [
      { name: "all succeed", call: `loadDashboard()`, expected: `Dashboard(balance=..., cards=[...], offers=[...])` },
      { name: "one fails", call: `offers throws`, expected: `Dashboard(offers=[])` },
      { name: "caller cancelled", call: `job.cancel()`, expected: `all three cancelled` },
    ],
    hints: [
      "`supervisorScope` stops child failures propagating upward — but cancellation still propagates downward.",
      "Plain `runCatching` catches `CancellationException`, which silently breaks structured concurrency.",
    ],
    solution: {
      mentalModel:
        "`coroutineScope`: all-or-nothing — one child fails, everything fails. `supervisorScope`: children fail independently, but the scope still owns their lifetime. Downward cancellation is never affected by either choice.",
      whyItWorks: [
        "`SupervisorJob` overrides only the upward failure path.",
        "Catching per-child means each section decides its own fallback.",
        "Rethrowing `CancellationException` keeps the coroutine machinery informed that the work really stopped.",
      ],
      commonMistakes: [
        "`runCatching` in suspend code — it catches `Throwable`, cancellation included.",
        "`supervisorScope` with an uncaught child failure, which then goes to the `CoroutineExceptionHandler` or crashes.",
        "Using `GlobalScope` to 'avoid cancellation', which leaks work past the screen's life.",
      ],
      complexity: { time: "max(t₁,t₂,t₃)", space: "O(1)" },
      inProduction: "Dashboard and home screens assembled from several services almost always want this shape.",
      followUps: ["What if two of the three are required and one is optional?"],
    },
  },
  {
    id: "c05",
    slug: "withcontext-vs-launch-dispatcher",
    title: "Where Does withContext Belong?",
    description: "Dispatcher decisions belong to the function that blocks, not to its caller.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["coroutines", "architecture"],
    stage: "predict",
    concepts: ["dispatchers", "context"],
    estimatedMinutes: 8,
    completedCount: 10200,
    introducedInWeek: 3,
    quizStem: "Which arrangement follows the main-safety convention?",
    quizCode: `// A
viewModelScope.launch(Dispatchers.IO) { repository.save(item) }

// B
viewModelScope.launch { repository.save(item) }
// ...with
suspend fun save(item: Item) = withContext(Dispatchers.IO) { dao.insert(item) }`,
    choices: [
      {
        id: "a",
        body: "A — set the dispatcher at the call site so it is visible.",
        correct: false,
        rationale:
          "It makes every caller responsible for knowing whether `save` blocks. Change the implementation to a non-blocking one and every call site is now wrong, but nothing tells you.",
      },
      {
        id: "b",
        body: "B — a suspend function is main-safe, and enforces that itself.",
        correct: true,
        rationale:
          "The convention: a `suspend` function must be safe to call from `Dispatchers.Main`. The function that knows it blocks is the function that switches. Callers stay simple and the knowledge stays local.",
      },
      {
        id: "c",
        body: "Both are equivalent because `withContext` and `launch(context)` compile to the same thing.",
        correct: false,
        rationale: "Mechanically similar, architecturally opposite: one puts the knowledge in the caller, the other in the implementation.",
      },
      {
        id: "d",
        body: "Neither — Room and Retrofit require `Dispatchers.IO` explicitly.",
        correct: false,
        rationale: "Both are already main-safe for suspend APIs: Room dispatches to its own executor, Retrofit to its call executor. Wrapping them in `withContext(IO)` is redundant.",
      },
    ],
    solution: {
      mentalModel:
        "Main-safety is a contract of the callee. If a function can block, it switches. Callers should never need to know.",
      whyItWorks: [
        "`withContext` returns to the caller's dispatcher when it finishes, so the switch is scoped and invisible.",
        "Injecting the dispatcher (`private val io: CoroutineDispatcher`) rather than hard-coding it makes the function testable with `StandardTestDispatcher`.",
      ],
      commonMistakes: [
        "`withContext(Dispatchers.IO)` around a suspend Room or Retrofit call — already main-safe.",
        "Hard-coding `Dispatchers.IO` instead of injecting it, then fighting flaky tests.",
        "Using `Dispatchers.IO` for CPU work; that is what `Default` is for.",
      ],
      inProduction: "Every Android architecture guide states this rule; it is also the most common review comment on data-layer PRs.",
      followUps: ["How do you test a function that hard-codes its dispatcher? (You largely cannot — that is the argument.)"],
    },
  },
  {
    id: "c06",
    slug: "cancellation-is-cooperative",
    title: "Cancellation Is Cooperative",
    description: "A cancelled coroutine that will not stop. Work out why.",
    difficulty: "Medium",
    format: "debugging",
    track: "Kotlin",
    topics: ["coroutines"],
    stage: "predict",
    ownership: "improve",
    concepts: ["cancellation"],
    estimatedMinutes: 15,
    completedCount: 6300,
    introducedInWeek: 3,
    symptom:
      "The user leaves the screen, the ViewModel is cleared, and the CPU stays pinned for another eight seconds. The coroutine was cancelled — the logs prove it — but it keeps running.",
    brokenCode: `viewModelScope.launch(Dispatchers.Default) {
    var hash = seed
    for (i in 0 until 50_000_000) {
        hash = mix(hash, i)      // pure computation, never suspends
    }
    _state.value = hash
}`,
    debugHints: [
      { label: "Hint 1", body: "What mechanism actually stops a running coroutine? Is there anything in this loop that could participate in it?" },
      { label: "Hint 2", body: "Cancellation sets a flag. Something has to check it. Which functions check it?" },
      { label: "Hint 3", body: "Every suspending function in kotlinx.coroutines checks for cancellation on resume. This loop never suspends, so nothing ever checks." },
    ],
    rootCause:
      "Cancellation is cooperative. `cancel()` marks the `Job` as cancelling and, at the next suspension point, the coroutine throws `CancellationException`. A tight computational loop with no suspension point never reaches such a check, so it runs to completion. The final `_state.value = hash` is the only thing skipped — by then the CPU is already spent.",
    fixedCode: `viewModelScope.launch(Dispatchers.Default) {
    var hash = seed
    for (i in 0 until 50_000_000) {
        if (i % 10_000 == 0) ensureActive()   // or: yield()
        hash = mix(hash, i)
    }
    _state.value = hash
}`,
    productionImplications: [
      "Battery and thermal cost: work that outlives its screen is pure waste on a phone.",
      "`isActive`, `ensureActive()` and `yield()` are the three cooperation points; `ensureActive()` is the cheapest that also throws.",
      "The same trap exists in `while (true)` polling loops and in long `Sequence` chains that never suspend.",
    ],
    solution: {
      mentalModel:
        "Cancellation is a request, not a kill. It becomes real at the next suspension point. Code that never suspends never hears the request.",
      whyItWorks: [
        "`ensureActive()` throws `CancellationException` when the job is no longer active — a few nanoseconds per check.",
        "Checking every N iterations keeps the overhead negligible while bounding how long the work can overrun.",
      ],
      commonMistakes: [
        "`Thread.sleep` in a coroutine — blocks the thread and is not cancellable.",
        "Catching `CancellationException` in a broad `catch (e: Exception)` inside the loop and continuing.",
        "Assuming `withContext(Dispatchers.Default)` makes work interruptible. It changes the thread, not the cooperation.",
      ],
      complexity: { time: "unchanged", space: "unchanged", note: "The check is amortised to near zero." },
      followUps: [
        "What does `withContext(NonCancellable)` exist for, and what is the one legitimate use?",
        "How would you make a blocking third-party call cancellable?",
      ],
    },
  },
  {
    id: "c07",
    slug: "stateflow-vs-sharedflow",
    title: "StateFlow vs SharedFlow",
    description:
      "One models state, the other models events. Using the wrong one causes a specific, recognisable bug.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["flow", "viewmodel"],
    stage: "explain",
    concepts: ["flow", "stateflow"],
    estimatedMinutes: 9,
    completedCount: 13100,
    introducedInWeek: 4,
    quizStem:
      "A one-off 'Saved' snackbar is modelled as `MutableStateFlow<String?>`. The user rotates the device. What do they see, and why?",
    choices: [
      {
        id: "a",
        body: "Nothing — the ViewModel survives rotation, so the event was already consumed.",
        correct: false,
        rationale:
          "The ViewModel surviving is exactly the problem. The StateFlow still holds the last value, and the new collector receives it on subscription.",
      },
      {
        id: "b",
        body: "The snackbar again — StateFlow replays its current value to every new collector.",
        correct: true,
        rationale:
          "`StateFlow` is conflated with `replay = 1` and always has a current value. A new collector after rotation immediately receives the last message and shows the snackbar a second time.",
      },
      {
        id: "c",
        body: "A crash, because a null value cannot be collected.",
        correct: false,
        rationale: "`StateFlow<String?>` is perfectly legal; null is just a value.",
      },
      {
        id: "d",
        body: "Nothing, provided `distinctUntilChanged` is applied.",
        correct: false,
        rationale: "Deduplication is about consecutive equal values in one collection, not about a new collector's initial emission.",
      },
    ],
    solution: {
      mentalModel:
        "State is a value that is true right now and should be re-delivered to anyone who asks. An event happened once and should be delivered once. `StateFlow` for the first, `SharedFlow(replay = 0)` — or better, state that models the event's *consequence* — for the second.",
      improved: {
        label: "Event as a Channel",
        code: `private val _events = Channel<UiEvent>(Channel.BUFFERED)
val events = _events.receiveAsFlow()   // single consumer, no replay`,
      },
      whyItWorks: [
        "`Channel.receiveAsFlow()` delivers each element exactly once to exactly one collector, which is the semantics a navigation or snackbar event actually has.",
        "`MutableSharedFlow(replay = 0)` drops emissions with no collector — acceptable for transient UI, dangerous for navigation.",
      ],
      commonMistakes: [
        "The `SingleLiveEvent` / `Event(consumed)` wrapper, which works but hides the modelling mistake.",
        "`SharedFlow` with `replay = 1` for events, reintroducing the exact bug.",
        "Forgetting that a `SharedFlow` with no collector silently discards emissions, so an event fired during backgrounding disappears.",
      ],
      inProduction:
        "Many teams now model even snackbars as state — `data class UiState(val message: Message?)` with an explicit `onMessageShown()` — because it survives process death and is trivially testable.",
      followUps: [
        "Why does modelling events as state survive process death when a Channel does not?",
        "What does `MutableSharedFlow(extraBufferCapacity = 1, onBufferOverflow = DROP_OLDEST)` buy you?",
      ],
    },
  },
  {
    id: "c08",
    slug: "combine-vs-zip",
    title: "combine vs zip",
    description: "Both merge two streams. Only one is right for UI state.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["flow"],
    stage: "predict",
    concepts: ["flow-operators", "ui-state"],
    estimatedMinutes: 7,
    completedCount: 11800,
    introducedInWeek: 4,
    quizStem:
      "`items` emits 5 times; `preferences` emits twice. How many values does each produce?",
    quizCode: `combine(items, preferences) { i, p -> render(i, p) }
zip(items, preferences) { i, p -> render(i, p) }`,
    choices: [
      {
        id: "a",
        body: "combine: up to 7 · zip: 2",
        correct: true,
        rationale:
          "`combine` re-emits whenever *either* source emits, using the latest from the other — up to 5 + 2 emissions once both have produced a first value. `zip` pairs them positionally and completes with the shorter, so exactly 2.",
      },
      { id: "b", body: "combine: 5 · zip: 5", correct: false, rationale: "`combine` is not driven by one 'primary' source, and `zip` cannot exceed the shorter stream." },
      { id: "c", body: "combine: 2 · zip: 2", correct: false, rationale: "That would make `combine` identical to `zip`, which defeats its purpose." },
      { id: "d", body: "combine: 10 · zip: 10", correct: false, rationale: "`combine` is not a cartesian product; it holds only the latest of each." },
    ],
    solution: {
      mentalModel:
        "`combine` = 'latest of each, whenever anything changes' — the semantics of UI state. `zip` = 'pair them up in order' — the semantics of two request results that correspond one-to-one.",
      whyItWorks: [
        "`combine` waits for a first value from every source, then re-emits on any change.",
        "`zip` buffers until it can form a pair and completes when either source does.",
      ],
      commonMistakes: [
        "`zip` for screen state, which stops updating the moment one source completes.",
        "Expecting `combine` to emit before every source has produced a value — it will not, so a source that never emits blocks the whole thing. Give it `onStart { emit(default) }`.",
        "Combining more than five flows and discovering there is no overload — nest, or use the `Array`-based form.",
      ],
      inProduction: "Screen state assembled from a data flow plus a preferences flow is the archetypal `combine`.",
      followUps: ["What happens to `combine` if one source never emits at all?"],
    },
  },
  {
    id: "c09",
    slug: "sharing-started-policies",
    title: "SharingStarted: Eagerly, Lazily, WhileSubscribed",
    description:
      "The five-second figure is not arbitrary. Work out what it buys and what it costs.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Android",
    topics: ["flow", "lifecycle"],
    stage: "explain",
    concepts: ["stateflow"],
    estimatedMinutes: 16,
    completedCount: 6900,
    introducedInWeek: 4,
    readingCode: `val uiState: StateFlow<UiState> =
    repository.items
        .map(::toUiState)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = UiState.Loading,
        )`,
    readingPrompts: [
      {
        id: "p1",
        question: "What exactly starts and stops when a collector appears and disappears?",
        expert:
          "The upstream — `repository.items` and everything before `stateIn`. With zero collectors for the timeout, `stateIn` cancels the upstream collection. The database cursor closes, the socket is released, the polling stops. The `StateFlow` itself survives and keeps its last value.",
        keywords: ["upstream", "cancel", "collector", "last value"],
      },
      {
        id: "p2",
        question: "Why 5,000 milliseconds rather than 0?",
        expert:
          "A configuration change tears the UI down and rebuilds it. With a zero timeout the upstream is cancelled and immediately restarted — a fresh query and possibly a fresh network call on every rotation. Five seconds comfortably outlasts a rotation while being short enough that backgrounding stops the work promptly. It is a heuristic, not a rule; a cheap in-memory source can use 0, an expensive subscription might use longer.",
        keywords: ["rotation", "configuration", "restart"],
      },
      {
        id: "p3",
        question: "What would `Eagerly` change, and when is it right?",
        expert:
          "`Eagerly` starts the upstream at construction and never stops it until the scope dies — so the screen keeps querying while the user is in another app. It is right when the value must be warm the instant the UI appears and the upstream is cheap, or when you need to observe side effects regardless of UI presence. Usually it is a battery bug.",
        keywords: ["eagerly", "never stops", "battery"],
      },
      {
        id: "p4",
        question: "Why must the UI collect with `repeatOnLifecycle` for any of this to work?",
        expert:
          "`WhileSubscribed` only knows about subscribers. A naive `lifecycleScope.launch { flow.collect { } }` keeps collecting while the app is backgrounded, so the subscriber count never drops and the upstream never stops. `repeatOnLifecycle(STARTED)` cancels the collection at `onStop` and restarts at `onStart` — that is what makes the subscriber count reflect visibility.",
        keywords: ["repeatOnLifecycle", "collectAsStateWithLifecycle", "stop"],
      },
      {
        id: "p5",
        question: "Is `initialValue = Loading` telling the truth?",
        expert:
          "Only on first construction. After the upstream has produced a value the StateFlow holds *that*, so a later re-subscription gets real data rather than Loading — which is what you want. The subtlety: if the upstream is restarted after the timeout, the StateFlow still serves the stale last value until fresh data arrives, so the UI shows old data rather than a spinner. Usually desirable; occasionally a bug, if staleness matters.",
        keywords: ["stale", "initial", "first"],
      },
    ],
    solution: {
      mentalModel:
        "`stateIn` is a shared, cached, lifecycle-aware subscription. The sharing policy answers one question: when there is nobody watching, should the work continue?",
      whyItWorks: [
        "Reference counting on subscribers drives upstream start and stop.",
        "A grace period bridges the gap between configuration-change teardown and rebuild.",
      ],
      commonMistakes: [
        "`WhileSubscribed(5_000)` in the ViewModel combined with a non-lifecycle-aware collect in the UI — the policy is then dead code.",
        "`Eagerly` for anything touching the network.",
        "Assuming the timeout affects the retained value. It does not; it affects the upstream only.",
      ],
      inProduction: "The `WhileSubscribed(5_000)` + `collectAsStateWithLifecycle()` pairing is the current standard combination on Android.",
      followUps: ["How would you verify the upstream really stops? (Log in `onCompletion`, or count active collectors in a fake repository.)"],
    },
  },
  {
    id: "c10",
    slug: "flatmaplatest-vs-concat-merge",
    title: "flatMapLatest, flatMapConcat, flatMapMerge",
    description: "Three flattening strategies for three different problems.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["flow"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow-operators"],
    estimatedMinutes: 14,
    completedCount: 8100,
    introducedInWeek: 4,
    prompt:
      "For each scenario pick the operator and justify it: (a) search-as-you-type, (b) an upload queue that must preserve order, (c) prefetching thumbnails for visible items.",
    requirements: [
      "Write one pipeline per scenario",
      "State the failure mode of choosing wrongly in each case",
    ],
    relatedConcepts: ["flatMapLatest", "flatMapConcat", "flatMapMerge", "concurrency"],
    starterCode: `// a) queries: Flow<String>  -> results
// b) uploads: Flow<File>    -> upload results, in order
// c) visible: Flow<List<Id>> -> thumbnails, in parallel`,
    solutionCode: `// a) Only the newest query matters. Cancel the rest.
val results = queries.flatMapLatest { repository.search(it) }

// b) Order matters and work must not overlap. Wait for each.
val uploaded = uploads.flatMapConcat { uploader.upload(it) }

// c) Independent work, order irrelevant, parallelism bounded.
val thumbs = visible.flatMapMerge(concurrency = 4) { ids ->
    ids.asFlow().map { loader.thumbnail(it) }
}`,
    tests: [
      { name: "search cancels stale", call: `flatMapLatest`, expected: `previous inner flow cancelled` },
      { name: "uploads stay ordered", call: `flatMapConcat`, expected: `sequential, FIFO` },
      { name: "thumbnails bounded", call: `flatMapMerge(4)`, expected: `at most 4 in flight` },
    ],
    hints: [
      "Ask: if a new value arrives while the previous is still working, should the previous be cancelled, queued, or run alongside?",
      "`flatMapMerge`'s default concurrency is 16 — usually too many for network work on mobile.",
    ],
    solution: {
      mentalModel:
        "One question decides it: what should happen to in-flight work when a new value arrives? Cancel it → Latest. Queue behind it → Concat. Run beside it → Merge.",
      whyItWorks: [
        "`flatMapLatest` cancels the previous inner flow's coroutine, guaranteeing the newest result wins.",
        "`flatMapConcat` collects inner flows one at a time, preserving order and bounding concurrency to one.",
        "`flatMapMerge(n)` runs up to n inner flows, interleaving results in completion order.",
      ],
      commonMistakes: [
        "`flatMapConcat` for search: every keystroke's request is queued and eventually runs. The user sees results for 'k' after they typed 'kotlin'.",
        "`flatMapMerge` for search: responses race and the slower, older one can land last.",
        "Leaving `flatMapMerge` at its default concurrency and opening sixteen sockets.",
      ],
      complexity: { time: "Latest: newest only · Concat: sum · Merge: bounded parallel", space: "Concat buffers pending values" },
      inProduction: "All three appear in a single app: search uses Latest, an offline write queue uses Concat, image prefetch uses Merge.",
      followUps: ["Why are these still marked `@ExperimentalCoroutinesApi` after all this time, and does it matter in practice?"],
    },
  },
  {
    id: "c11",
    slug: "testing-a-flow-with-turbine",
    title: "Testing a Debounced Flow Without Waiting",
    description: "Virtual time, not Thread.sleep.",
    difficulty: "Hard",
    format: "coding",
    track: "Android",
    topics: ["testing", "flow", "coroutines"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow", "repository", "flow-operators"],
    estimatedMinutes: 20,
    completedCount: 4600,
    introducedInWeek: 10,
    prompt:
      "Write a test proving that three keystrokes within the debounce window produce exactly one repository call — and that it finishes in milliseconds of real time.",
    requirements: [
      "Use `runTest` and a `TestDispatcher`",
      "Advance virtual time rather than sleeping",
      "Assert on the emitted state sequence",
      "Assert the repository was called exactly once",
    ],
    relatedConcepts: ["runTest", "StandardTestDispatcher", "advanceTimeBy", "Turbine"],
    starterCode: `@Test
fun \`debounces rapid input\`() = runTest {
    TODO()
}`,
    solutionCode: `@Test
fun \`debounces rapid input\`() = runTest {
    val repository = FakeSearchRepository()
    val viewModel = SearchViewModel(repository)

    viewModel.uiState.test {                 // Turbine
        assertEquals(SearchUiState.Empty, awaitItem())

        viewModel.onQueryChange("k")
        viewModel.onQueryChange("ko")
        viewModel.onQueryChange("kot")

        advanceTimeBy(299)
        expectNoEvents()                     // still inside the window

        advanceTimeBy(2)
        assertEquals(SearchUiState.Loading, awaitItem())
        assertEquals(SearchUiState.Results(listOf(hit)), awaitItem())

        assertEquals(listOf("kot"), repository.queries)
        cancelAndIgnoreRemainingEvents()
    }
}`,
    tests: [
      { name: "one call for three keystrokes", call: `repository.queries`, expected: `[kot]` },
      { name: "no emission before 300ms", call: `advanceTimeBy(299)`, expected: `no events` },
      { name: "runs in real milliseconds", call: `test duration`, expected: `< 50ms` },
    ],
    hints: [
      "`runTest` installs a scheduler whose clock you control — `delay(300)` returns instantly when you advance time.",
      "Set `Dispatchers.setMain(StandardTestDispatcher(testScheduler))` so `viewModelScope` shares the same clock.",
    ],
    solution: {
      mentalModel:
        "Virtual time turns timing from a source of flakiness into an assertion. You are not waiting for 300ms — you are asserting that nothing happens before it and something happens after.",
      whyItWorks: [
        "`TestScope` skips `delay` and advances a virtual clock, so debounce and timeout logic is deterministic.",
        "Turbine turns a Flow into a queue you pull from, making 'exactly these emissions, in this order' expressible.",
        "A fake repository recording its calls asserts the *absence* of work, which a mock verification also does but less readably.",
      ],
      commonMistakes: [
        "Forgetting `Dispatchers.setMain`, so `viewModelScope` uses the real main dispatcher and virtual time has no effect.",
        "`Thread.sleep(300)` — slow and still flaky under load.",
        "`UnconfinedTestDispatcher` everywhere, which runs eagerly and hides ordering bugs the production dispatcher would expose.",
      ],
      inProduction: "A `MainDispatcherRule` that sets and tears down the main dispatcher is standard in Android test suites.",
      followUps: [
        "What is the difference between `advanceTimeBy` and `advanceUntilIdle`?",
        "Why does `runTest` fail the test if a coroutine is still running at the end?",
      ],
    },
  },
  {
    id: "c12",
    slug: "cold-vs-hot-flow",
    title: "Cold and Hot: What Collection Starts",
    description: "Predict how many times the block runs for two collectors.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["flow"],
    stage: "predict",
    concepts: ["flow", "cold-hot"],
    estimatedMinutes: 7,
    completedCount: 12400,
    introducedInWeek: 4,
    quizStem: "How many times does `println(\"fetching\")` run?",
    quizCode: `val items = flow {
    println("fetching")
    emit(api.items())
}

scope.launch { items.collect { } }
scope.launch { items.collect { } }`,
    choices: [
      {
        id: "a",
        body: "Twice — each collector runs the builder independently.",
        correct: true,
        rationale:
          "A `flow { }` is cold: the block executes once per collection. Two collectors means two executions and two network calls.",
      },
      { id: "b", body: "Once — flows are shared by default.", correct: false, rationale: "Sharing is opt-in via `shareIn`/`stateIn`. Nothing is shared by default." },
      { id: "c", body: "Once, because the second collector receives the replayed value.", correct: false, rationale: "Replay belongs to `SharedFlow`. A cold flow has no buffer and no memory." },
      { id: "d", body: "Zero — `collect` inside `launch` does not start until the scope joins.", correct: false, rationale: "`launch` starts eagerly by default; collection begins as soon as the dispatcher runs it." },
    ],
    solution: {
      mentalModel: "Cold: the producer runs per collector. Hot: the producer runs independently and collectors observe whatever is happening.",
      whyItWorks: [
        "`flow { }` stores the block; `collect` invokes it.",
        "`shareIn`/`stateIn` interpose a single collector over the cold source and fan its values out.",
      ],
      commonMistakes: [
        "Assuming a repository `Flow` is shared and being surprised by duplicate requests.",
        "Making everything hot to 'fix' it, and keeping work alive with no collectors.",
      ],
      followUps: ["Is a Room `Flow` cold? (Yes — each collector opens its own observed query.)"],
    },
  },
  {
    id: "c13",
    slug: "flow-retry-backoff",
    title: "Retry With Backoff, Without Retrying Forever",
    description: "Add resilience to a flow without turning a 404 into an infinite loop.",
    difficulty: "Medium",
    format: "coding",
    track: "Android",
    topics: ["flow", "networking"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow", "idempotency"],
    estimatedMinutes: 16,
    completedCount: 5300,
    introducedInWeek: 8,
    prompt:
      "Wrap a request flow so transient failures are retried with exponential backoff, permanent failures are not retried at all, and the UI is told which happened.",
    requirements: [
      "Retry at most 3 times",
      "Delay 1s, 2s, 4s between attempts with jitter",
      "Retry only on IO errors and HTTP 5xx",
      "Never retry 4xx",
      "Emit a terminal error state rather than throwing",
    ],
    relatedConcepts: ["retryWhen", "catch", "Exponential backoff", "Error taxonomy"],
    starterCode: `fun <T> Flow<T>.withRetry(): Flow<T> = TODO()`,
    solutionCode: `fun <T> Flow<T>.withRetry(
    maxAttempts: Int = 3,
    baseDelayMs: Long = 1_000,
): Flow<T> = retryWhen { cause, attempt ->
    val retryable = cause is IOException ||
        (cause is HttpException && cause.code() in 500..599)

    if (!retryable || attempt >= maxAttempts) {
        false
    } else {
        val backoff = baseDelayMs shl attempt.toInt()   // 1s, 2s, 4s
        val jitter = Random.nextLong(0, backoff / 4)
        delay(backoff + jitter)
        true
    }
}`,
    tests: [
      { name: "retries IO errors", call: `IOException x2 then success`, expected: `success after 2 retries` },
      { name: "does not retry 404", call: `HttpException(404)`, expected: `fails immediately` },
      { name: "stops after 3 attempts", call: `IOException always`, expected: `3 retries then failure` },
    ],
    hints: [
      "`retryWhen` gives you the cause *and* the zero-based attempt number.",
      "Jitter matters: without it, every client that failed together retries together.",
    ],
    solution: {
      mentalModel:
        "Retry answers 'will trying again plausibly help?'. Network hiccup: yes. Server error: possibly. 'Not found' or 'unauthorised': never — retrying is just a slower failure.",
      whyItWorks: [
        "`retryWhen` returning false lets the exception propagate to `catch` downstream, where it becomes a state.",
        "Exponential growth bounds total wait; jitter prevents the thundering herd.",
      ],
      commonMistakes: [
        "`retry(3)` with no predicate, retrying a 401 three times and delaying the login prompt.",
        "Backoff without jitter.",
        "Retrying a non-idempotent POST without an idempotency key — three retries can mean three payments.",
      ],
      complexity: { time: "worst case ~7s of waiting", space: "O(1)" },
      inProduction: "Usually lives in an OkHttp interceptor rather than per-flow, so retry policy is defined once. The flow-level version is for non-HTTP sources.",
      followUps: ["Which HTTP methods are safe to retry blindly, and what makes a request idempotent?"],
    },
  },
  {
    id: "c14",
    slug: "channel-vs-shared-flow",
    title: "Channel or SharedFlow for Events?",
    description: "Delivery guarantees differ. Pick the one whose guarantee you need.",
    difficulty: "Hard",
    format: "quiz",
    track: "Android",
    topics: ["flow", "coroutines"],
    stage: "explain",
    concepts: ["flow", "stateflow"],
    estimatedMinutes: 9,
    completedCount: 4100,
    introducedInWeek: 4,
    quizStem:
      "A navigation event is emitted while the app is backgrounded and the UI is not collecting. Which delivers it when the user returns?",
    choices: [
      {
        id: "a",
        body: "`MutableSharedFlow(replay = 0)` — it buffers until someone collects.",
        correct: false,
        rationale:
          "With `replay = 0` and no buffer, `tryEmit` fails and `emit` suspends. A shared flow with no subscriber and no buffer drops the value.",
      },
      {
        id: "b",
        body: "`Channel(Channel.BUFFERED).receiveAsFlow()` — elements are queued until received.",
        correct: true,
        rationale:
          "A Channel is a queue with exactly-once semantics for a single consumer. The event waits in the buffer and is delivered when collection resumes.",
      },
      {
        id: "c",
        body: "Both, because `SharedFlow` replays the last value by default.",
        correct: false,
        rationale: "The default `replay` is 0. Replay is opt-in — and for events it reintroduces duplicate delivery on rotation.",
      },
      {
        id: "d",
        body: "Neither — navigation events must be state.",
        correct: false,
        rationale:
          "A defensible architectural opinion, and increasingly the recommended one, but it does not answer which primitive delivers. The Channel does.",
      },
    ],
    solution: {
      mentalModel:
        "`Channel` is a queue: exactly once, to one consumer, buffered. `SharedFlow` is a broadcast: to every current subscriber, and nobody else, ever.",
      whyItWorks: [
        "`receiveAsFlow` preserves the channel's single-consumer, exactly-once semantics.",
        "`SharedFlow` is the right choice when several collectors must each see the event and missing it is acceptable.",
      ],
      commonMistakes: [
        "Two collectors on one `receiveAsFlow()` — each event goes to exactly one of them, seemingly at random.",
        "`SharedFlow` for navigation, losing events during backgrounding.",
        "`tryEmit` and ignoring its `Boolean` return.",
      ],
      inProduction:
        "Channel-backed events are common; state-modelled events are what current Android guidance prefers, because they survive process death.",
      followUps: ["What happens to a buffered Channel event if the process is killed? (It is gone — the argument for state.)"],
    },
  },
  {
    id: "c15",
    slug: "race-condition-optimistic-update",
    title: "A Race in an Optimistic Update",
    description: "Two taps, one revert. Find the window where state is lost.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["coroutines", "flow", "viewmodel"],
    stage: "predict",
    ownership: "improve",
    concepts: ["structured-concurrency"],
    estimatedMinutes: 20,
    completedCount: 3800,
    introducedInWeek: 9,
    symptom:
      "Double-tapping the favourite button leaves the heart filled when the server says unfavourited, and empty when the server says favourited. Single taps always work.",
    brokenCode: `fun toggleFavourite(id: String) {
    viewModelScope.launch {
        val current = _state.value
        val optimistic = current.copy(isFavourite = !current.isFavourite)
        _state.value = optimistic                       // (1)

        try {
            repository.setFavourite(id, optimistic.isFavourite)   // (2)
        } catch (e: Exception) {
            _state.value = current                      // (3) revert
        }
    }
}`,
    debugHints: [
      { label: "Hint 1", body: "Two taps launch two coroutines. What does the second one capture at line (1)?" },
      { label: "Hint 2", body: "Line (3) reverts to a snapshot taken before the suspension at (2). What has happened to the state in between?" },
      { label: "Hint 3", body: "The revert is not 'undo my change' — it is 'overwrite whatever is there now with an old value'." },
    ],
    rootCause:
      "The read-modify-write across a suspension point is not atomic. Tap A reads state S₀ and suspends. Tap B reads S₁ (A's optimistic value), toggles to S₂ and suspends. If A's request now fails, it writes S₀ back — discarding B's change entirely. Even without failure, the last write wins arbitrarily. Capturing a snapshot for the revert compounds the problem: it restores a value that may be several edits stale.",
    fixedCode: `private val toggles = MutableSharedFlow<String>(extraBufferCapacity = 16)

init {
    toggles
        .flatMapLatest { id ->            // supersede in-flight work for the same item
            flow {
                val desired = !_state.value.isFavourite
                _state.update { it.copy(isFavourite = desired) }
                runSuspendCatching { repository.setFavourite(id, desired) }
                    .onFailure {
                        // Revert relative to the *current* value, not a snapshot.
                        _state.update { it.copy(isFavourite = !desired) }
                        emit(UiEvent.ShowError)
                    }
            }
        }
        .launchIn(viewModelScope)
}

fun toggleFavourite(id: String) { toggles.tryEmit(id) }`,
    productionImplications: [
      "Any read-modify-write spanning a suspension point needs either serialisation or a compare-and-set.",
      "`MutableStateFlow.update { }` is a CAS loop — it never writes a value derived from a stale read.",
      "The durable fix is to make the database the source of truth: write the optimistic value locally, let the sync layer reconcile, and let the UI observe one stream.",
    ],
    solution: {
      mentalModel:
        "A suspension point is a place where the world changes. Any value you read before one is a guess by the time you use it afterwards.",
      whyItWorks: [
        "`update { }` applies the transformation to whatever the current value is, atomically.",
        "`flatMapLatest` keyed on the item means a newer tap cancels the in-flight request for the same item.",
        "Reverting relatively — flipping back — rather than absolutely avoids clobbering unrelated edits.",
      ],
      commonMistakes: [
        "`_state.value = _state.value.copy(...)` across suspension points.",
        "Disabling the button during the request: it hides the race and makes the UI feel slow.",
        "Reverting to a captured snapshot of the whole state object, undoing everything else that changed meanwhile.",
      ],
      complexity: { time: "O(1) per toggle", space: "O(pending toggles)" },
      followUps: [
        "How would an offline-first design make this bug structurally impossible?",
        "What should happen if the user toggles twice and both requests fail?",
      ],
    },
  },
];
