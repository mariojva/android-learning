import type { Question } from "@/lib/types";

/* 14 Android platform questions — lifecycle, ViewModel, data layer, performance. */

export const ANDROID_QUESTIONS: Question[] = [
  {
    id: "a01",
    slug: "dto-to-ui-model",
    title: "DTO → Domain → UI",
    description:
      "Write the mapper that keeps transport concerns out of your screen.",
    difficulty: "Easy",
    format: "coding",
    track: "Android",
    topics: ["architecture", "collections"],
    stage: "implement",
    ownership: "implement",
    concepts: ["dto", "mapper", "ui-state"],
    estimatedMinutes: 20,
    completedCount: 15700,
    introducedInWeek: 1,
    prompt:
      "A transactions endpoint returns nullable merchants, raw doubles and a `pending` flag. The screen needs a list it can render directly, with formatting already applied. Write the mapper and defend the order of operations.",
    requirements: [
      "Remove pending transactions",
      "Remove zero-amount transactions",
      "Use \"Unknown merchant\" where the merchant is null",
      "Map remaining records to UI models",
      "Sort highest amount first",
      "Do not mutate the input collection",
    ],
    examples: [
      {
        input: `[TransactionResponse("1", null, 42.5, false), TransactionResponse("2", "Cafe", 0.0, false)]`,
        output: `[TransactionUiModel("1", "Unknown merchant", "$42.50")]`,
      },
    ],
    constraints: ["Pure function, no I/O", "Single expression is achievable"],
    relatedConcepts: ["Mappers", "Layer boundaries", "filter before map"],
    starterCode: `data class TransactionResponse(
    val id: String,
    val merchant: String?,
    val amount: Double,
    val pending: Boolean,
)

data class TransactionUiModel(
    val id: String,
    val merchantName: String,
    val amountText: String,
)

fun mapTransactions(
    transactions: List<TransactionResponse>,
): List<TransactionUiModel> {
    TODO()
}`,
    solutionCode: `fun mapTransactions(
    transactions: List<TransactionResponse>,
): List<TransactionUiModel> =
    transactions
        .filterNot { it.pending }
        .filter { it.amount != 0.0 }
        .sortedByDescending { it.amount }
        .map { response ->
            TransactionUiModel(
                id = response.id,
                merchantName = response.merchant ?: "Unknown merchant",
                amountText = "$%.2f".format(response.amount),
            )
        }`,
    tests: [
      {
        name: "drops pending",
        call: `mapTransactions(listOf(TransactionResponse("1", "A", 10.0, true)))`,
        expected: `[]`,
      },
      {
        name: "drops zero amounts",
        call: `mapTransactions(listOf(TransactionResponse("1", "A", 0.0, false)))`,
        expected: `[]`,
      },
      {
        name: "null merchant becomes placeholder",
        call: `mapTransactions(listOf(TransactionResponse("1", null, 5.0, false)))`,
        expected: `[TransactionUiModel(id=1, merchantName=Unknown merchant, amountText=$5.00)]`,
      },
      {
        name: "sorted descending",
        call: `mapTransactions(listOf(t(5.0), t(50.0)))`,
        expected: `[50.00 first]`,
        hidden: true,
      },
    ],
    hints: [
      "Every element you drop early is one fewer object the mapper has to build.",
      "Sorting before mapping lets you sort on the numeric amount rather than the formatted string.",
      "`\"$50.00\" < \"$9.00\"` as strings — which is why the order matters, not just the cost.",
    ],
    solution: {
      mentalModel:
        "A mapper is a boundary. Everything transport-shaped — nullability, raw numbers, server flags — stops here, and everything below it is already in the shape the screen renders.",
      straightforward: {
        label: "Explicit",
        code: `fun mapTransactions(transactions: List<TransactionResponse>): List<TransactionUiModel> {
    val result = mutableListOf<TransactionUiModel>()
    for (t in transactions) {
        if (t.pending) continue
        if (t.amount == 0.0) continue
        result += TransactionUiModel(t.id, t.merchant ?: "Unknown merchant", "$%.2f".format(t.amount))
    }
    result.sortByDescending { it.amountText }   // ← already wrong
    return result
}`,
      },
      improved: {
        label: "Pipeline",
        code: `transactions
    .filterNot { it.pending }
    .filter { it.amount != 0.0 }
    .sortedByDescending { it.amount }
    .map(::toUiModel)`,
      },
      lineByLine: [
        { line: ".filterNot { it.pending }", note: "Cheapest predicate first — a boolean read." },
        { line: ".filter { it.amount != 0.0 }", note: "Still working on the source type, where `amount` is a number." },
        { line: ".sortedByDescending { it.amount }", note: "Sort before mapping, while the numeric value still exists." },
        { line: ".map(::toUiModel)", note: "Formatting last, on the smallest possible set." },
      ],
      whyItWorks: [
        "Filtering first minimises the number of objects allocated by `map`.",
        "Sorting before mapping sorts on `Double`. After mapping you would be sorting `\"$9.00\"` against `\"$50.00\"` lexicographically, which is simply wrong.",
        "The returned `List` is new, so the caller's collection is untouched.",
      ],
      commonMistakes: [
        "Sorting after mapping and comparing formatted strings.",
        "Formatting currency by hand instead of using a locale-aware formatter — `$%.2f` is fine for an exercise and wrong in production.",
        "Letting `TransactionResponse` reach the composable, so the UI now knows about `pending` and nullable merchants.",
        "Using `Double` for money at all.",
      ],
      alternatives: [
        {
          title: "Domain model in the middle",
          body: "DTO → Domain → UI gives you a layer where business rules (what counts as pending) live independently of both the API shape and the screen. On a small feature the middle layer is ceremony; on a feature with three screens and two endpoints it pays for itself immediately.",
        },
      ],
      complexity: { time: "O(n log n)", space: "O(n)" },
      inProduction:
        "Mappers live in the data layer as extension functions (`fun TransactionResponse.toDomain()`), so the domain model has no knowledge of the DTO and the dependency points inward.",
      followUps: [
        "Why did you choose that order of operations? Which swaps are merely slower, and which are incorrect?",
        "Where would currency formatting belong if the app supported multiple locales?",
        "What would change if the endpoint became paginated?",
      ],
    },
  },
  {
    id: "a02",
    slug: "paginated-feed",
    title: "Paginated Feed With Cursors",
    description:
      "Load pages that stay correct when items are inserted between requests.",
    difficulty: "Medium",
    format: "coding",
    track: "Android",
    topics: ["networking", "flow", "viewmodel"],
    stage: "implement",
    ownership: "implement",
    concepts: ["repository", "flow-operators", "cache-invalidation"],
    estimatedMinutes: 35,
    completedCount: 8600,
    companyTags: ["Meta", "Reddit", "Twitter"],
    introducedInWeek: 8,
    prompt:
      "Implement paging for an infinite feed. Offset paging duplicates and skips items when the list changes underneath you; cursor paging does not. Build the cursor version, with a single in-flight request and an end-of-list signal.",
    requirements: [
      "Load the next page when the user nears the end",
      "Never run two page requests at once",
      "Append, never replace, on success",
      "Expose a distinct `endReached` state",
      "A failed page must be retryable without losing what is loaded",
    ],
    relatedConcepts: ["Cursor pagination", "Idempotent loads", "Append-only state"],
    starterCode: `data class FeedState(
    val items: List<Post> = emptyList(),
    val cursor: String? = null,
    val isLoadingMore: Boolean = false,
    val endReached: Boolean = false,
    val error: String? = null,
)

fun loadNextPage() { TODO() }`,
    solutionCode: `class FeedViewModel(private val repository: FeedRepository) : ViewModel() {

    private val _state = MutableStateFlow(FeedState())
    val state: StateFlow<FeedState> = _state.asStateFlow()

    private var loadJob: Job? = null

    fun loadNextPage() {
        val current = _state.value
        if (current.isLoadingMore || current.endReached) return   // idempotent
        if (loadJob?.isActive == true) return

        loadJob = viewModelScope.launch {
            _state.update { it.copy(isLoadingMore = true, error = null) }
            runSuspendCatching { repository.page(cursor = current.cursor) }
                .onSuccess { page ->
                    _state.update {
                        it.copy(
                            items = it.items + page.items,
                            cursor = page.nextCursor,
                            endReached = page.nextCursor == null,
                            isLoadingMore = false,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoadingMore = false, error = e.message) }
                }
        }
    }
}`,
    tests: [
      { name: "appends pages", call: `loadNextPage() twice`, expected: `items from both pages, in order` },
      { name: "single in-flight request", call: `loadNextPage() x3 rapidly`, expected: `1 request` },
      { name: "end reached", call: `page with nextCursor = null`, expected: `endReached = true` },
      { name: "retry after failure keeps items", call: `fail then succeed`, expected: `existing items preserved`, hidden: true },
    ],
    hints: [
      "The guard must read the state, not a separate boolean — two sources of truth will disagree.",
      "`state.update { }` is atomic; `state.value = state.value.copy()` across a suspension point is not.",
      "`nextCursor == null` is the server telling you there is no more. Do not infer it from a short page.",
    ],
    solution: {
      mentalModel:
        "A page request is a state machine with one legal transition at a time: idle → loading → (appended | failed) → idle. Every bug in paging is a missing guard on that machine.",
      whyItWorks: [
        "Cursors describe a position in the data, so an insertion above does not shift what 'next' means. Offsets do shift, which is why offset paging duplicates items on active feeds.",
        "The early return makes `loadNextPage()` idempotent, so a scroll listener can call it freely.",
        "Appending rather than replacing preserves scroll position and any per-item state.",
      ],
      commonMistakes: [
        "Inferring the end from `page.items.size < pageSize` — legitimate short pages exist, and this causes premature termination.",
        "Clearing `items` on failure, so a network blip empties a feed the user was reading.",
        "Triggering the load from a composable body rather than from a scroll-position effect, so it fires on every recomposition.",
        "Keeping `isLoadingMore` in a separate field from the state it guards.",
      ],
      alternatives: [
        {
          title: "Paging 3",
          body: "`PagingSource` + `RemoteMediator` handles this plus placeholders, retry and database-backed paging. It is a lot of machinery; for a simple append-only feed the hand-rolled version above is easier to reason about and to test.",
        },
      ],
      complexity: { time: "O(page) per load", space: "O(total loaded)" },
      inProduction:
        "Trigger from `snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }` with a threshold, not from the item composable.",
      followUps: [
        "What happens on pull-to-refresh — do you clear the cursor, and what does the user see?",
        "How would you deduplicate if the server can return the same id twice?",
      ],
    },
  },
  {
    id: "a03",
    slug: "offline-first-write",
    title: "An Offline-First Write",
    description:
      "The user taps Save with no connection. Design what happens next.",
    difficulty: "Hard",
    format: "coding",
    track: "Android",
    topics: ["room", "architecture", "coroutines"],
    stage: "implement",
    ownership: "implement",
    concepts: ["cache-invalidation", "single-source-of-truth", "repository"],
    estimatedMinutes: 35,
    completedCount: 5100,
    introducedInWeek: 9,
    prompt:
      "Implement a note save that works offline: the UI updates immediately, the write survives process death, and a later sync reconciles with the server — including the case where the server rejects it.",
    requirements: [
      "Write to the local database first and return",
      "The UI reads only from the database",
      "Pending writes survive process death",
      "A sync worker pushes pending writes when connectivity returns",
      "Server rejection surfaces to the user without losing their text",
    ],
    relatedConcepts: ["Single source of truth", "WorkManager", "Sync status column", "Conflict resolution"],
    starterCode: `suspend fun saveNote(note: Note) { TODO() }`,
    solutionCode: `@Entity
data class NoteEntity(
    @PrimaryKey val id: String,
    val body: String,
    val updatedAt: Long,
    val syncState: SyncState,   // SYNCED, PENDING, FAILED
)

class NoteRepository(
    private val dao: NoteDao,
    private val workManager: WorkManager,
) {
    // The UI observes this and nothing else.
    fun notes(): Flow<List<Note>> = dao.observeAll().map { it.map(NoteEntity::toDomain) }

    suspend fun saveNote(note: Note) {
        dao.upsert(note.toEntity(syncState = SyncState.PENDING))
        workManager.enqueueUniqueWork(
            "sync-notes",
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<SyncNotesWorker>()
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build(),
        )
    }
}

class SyncNotesWorker(...) : CoroutineWorker(...) {
    override suspend fun doWork(): Result {
        val pending = dao.pending()
        pending.forEach { entity ->
            when (val outcome = api.push(entity.toDto())) {
                is Pushed -> dao.upsert(entity.copy(syncState = SyncState.SYNCED))
                is Rejected -> dao.upsert(entity.copy(syncState = SyncState.FAILED))
                is Transient -> return Result.retry()
            }
        }
        return Result.success()
    }
}`,
    tests: [
      { name: "returns immediately offline", call: `saveNote(note)`, expected: `local row written, no network` },
      { name: "survives process death", call: `kill after save`, expected: `PENDING row still present` },
      { name: "syncs on reconnect", call: `network available`, expected: `row becomes SYNCED` },
      { name: "rejection is visible", call: `server 422`, expected: `row becomes FAILED, body intact`, hidden: true },
    ],
    hints: [
      "If the UI reads from anywhere other than the database, you have two sources of truth and they will disagree.",
      "A `syncState` column turns 'is this saved?' from a guess into a query.",
      "`ExistingWorkPolicy.KEEP` avoids queuing one worker per keystroke.",
    ],
    solution: {
      mentalModel:
        "Offline-first inverts the usual direction. The database is the application; the network is a background process that reconciles the database with a server. The UI never waits for the network because it never talks to it.",
      whyItWorks: [
        "Writing locally first makes the operation synchronous from the user's point of view and durable across process death.",
        "The `syncState` column makes pending work queryable, so sync is a pure function of database state rather than of in-memory bookkeeping.",
        "WorkManager persists its queue and applies constraints and backoff, so connectivity handling is not your problem.",
      ],
      commonMistakes: [
        "Optimistically updating in-memory state and writing to the database only after the server confirms — the write is lost on process death.",
        "No `syncState`, so a failed push is indistinguishable from a successful one.",
        "Retrying rejections (4xx) forever instead of surfacing them.",
        "Using `updatedAt` from the device clock for conflict resolution without accounting for clock skew.",
      ],
      alternatives: [
        {
          title: "Last-write-wins vs merge",
          body: "LWW is simple and loses data silently. Field-level merge or a CRDT preserves concurrent edits at real complexity cost. Choose based on how expensive a lost edit is to the user — for notes, quite expensive.",
        },
      ],
      complexity: { time: "O(pending) per sync", space: "O(pending)" },
      inProduction: "The Now in Android sample and most serious offline apps use exactly this shape: entity + sync state + unique background work.",
      followUps: [
        "How does the user discover a FAILED note, and what can they do about it?",
        "What happens if the same note is edited on two devices while both are offline?",
      ],
    },
  },
  {
    id: "a04",
    slug: "configuration-change-vs-process-death",
    title: "Configuration Change vs Process Death",
    description: "Three storage layers. Predict what survives each event.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["lifecycle", "viewmodel"],
    stage: "explain",
    concepts: ["config-change"],
    estimatedMinutes: 8,
    completedCount: 13800,
    introducedInWeek: 6,
    quizStem:
      "A value is held in a ViewModel property (not SavedStateHandle). The user backgrounds the app, the system reclaims the process, and they return via the recents screen. What happens?",
    choices: [
      {
        id: "a",
        body: "The value survives — ViewModels are retained.",
        correct: false,
        rationale:
          "ViewModels survive *configuration changes* because they are retained across Activity recreation within one process. Process death destroys the process, and everything in memory with it.",
      },
      {
        id: "b",
        body: "The value is lost; the Activity is recreated with saved instance state but a fresh ViewModel.",
        correct: true,
        rationale:
          "The system restores the task and the saved instance state bundle, but the process is new. `SavedStateHandle` reads from that bundle, which is exactly why it exists.",
      },
      { id: "c", body: "The app restarts from the launcher activity.", correct: false, rationale: "The system restores the back stack and recreates the top Activity. Starting from scratch would be a different, more visible failure." },
      { id: "d", body: "The value survives if the ViewModel is a singleton in the DI graph.", correct: false, rationale: "A singleton is scoped to the application object, which also dies with the process." },
    ],
    solution: {
      mentalModel:
        "Three lifetimes: composition (`remember`), process (ViewModel, singletons), and device (saved state bundle, DataStore, Room). Ask which one your data needs — and test with 'Don't keep activities'.",
      whyItWorks: [
        "`SavedStateHandle` is backed by the same bundle mechanism the platform saves before killing the process.",
        "Room and DataStore are on disk, so they are indifferent to process lifetime.",
      ],
      commonMistakes: [
        "Testing only rotation and declaring the screen state-safe.",
        "Putting large objects in saved state — the bundle has a hard size limit.",
        "Assuming process death is rare. It is routine on low-memory devices.",
      ],
      followUps: ["How do you simulate process death during development without waiting for the system to do it?"],
    },
  },
  {
    id: "a05",
    slug: "viewmodel-event-leak",
    title: "The Navigation That Happens Twice",
    description: "The user lands on the detail screen, rotates, and lands there again.",
    difficulty: "Medium",
    format: "debugging",
    track: "Android",
    topics: ["viewmodel", "flow", "lifecycle"],
    stage: "predict",
    ownership: "improve",
    concepts: ["viewmodel", "navigation", "config-change"],
    estimatedMinutes: 15,
    completedCount: 8200,
    introducedInWeek: 4,
    symptom:
      "After a successful save the app navigates to the detail screen. Rotate the device there and it navigates again, pushing a second copy onto the back stack.",
    brokenCode: `// ViewModel
private val _navigateTo = MutableStateFlow<String?>(null)
val navigateTo: StateFlow<String?> = _navigateTo

fun onSaved(id: String) { _navigateTo.value = id }

// UI
val target by viewModel.navigateTo.collectAsStateWithLifecycle()
LaunchedEffect(target) {
    target?.let { navController.navigate("detail/\$it") }
}`,
    debugHints: [
      { label: "Hint 1", body: "The ViewModel survives rotation. What is still in `_navigateTo` afterwards?" },
      { label: "Hint 2", body: "A new collector subscribes to a StateFlow. What is the first thing it receives?" },
      { label: "Hint 3", body: "Nothing ever sets the value back to null. The event has become permanent state." },
    ],
    rootCause:
      "A one-off event is being modelled as state. `StateFlow` always has a current value and replays it to every new collector. After rotation the recreated UI subscribes, immediately receives the same id, and navigates again. The bug is not in the effect — it is that 'navigate to X' was stored as a fact rather than delivered as an occurrence.",
    fixedCode: `// Option 1 — consume explicitly. Survives process death, testable.
private val _state = MutableStateFlow(SaveUiState())
val state = _state.asStateFlow()

fun onSaved(id: String) = _state.update { it.copy(navigateTo = id) }
fun onNavigated() = _state.update { it.copy(navigateTo = null) }

LaunchedEffect(state.navigateTo) {
    state.navigateTo?.let {
        navController.navigate("detail/\$it")
        viewModel.onNavigated()
    }
}

// Option 2 — a Channel: exactly-once delivery, lost on process death.
private val _events = Channel<Nav>(Channel.BUFFERED)
val events = _events.receiveAsFlow()`,
    productionImplications: [
      "Duplicate navigation is the visible symptom; duplicate analytics events and duplicate payments are the same bug with worse consequences.",
      "Consumed-state modelling survives process death; Channel-based events do not.",
      "Any effect that performs a real-world action must be idempotent or explicitly consumed.",
    ],
    solution: {
      mentalModel:
        "Ask of every value: is this true *now*, or did it happen *once*? State is the first, events are the second. `StateFlow` only models the first honestly.",
      whyItWorks: [
        "Setting the field back to null after navigating makes the consumption explicit and visible in state.",
        "A `Channel` delivers each element to exactly one collector and does not replay.",
      ],
      commonMistakes: [
        "`SingleLiveEvent`-style wrappers that hide the modelling problem rather than fixing it.",
        "`SharedFlow(replay = 1)` for events — identical bug, different class.",
        "Navigating inside the ViewModel, which couples it to a NavController it should not know about.",
      ],
      followUps: ["Which of the two options would you choose for a payment confirmation, and why?"],
    },
  },
  {
    id: "a06",
    slug: "main-thread-blocking",
    title: "The ANR Nobody Could Reproduce",
    description: "It only happens on cold start, on slow devices, with a large database.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["performance", "coroutines"],
    stage: "predict",
    ownership: "improve",
    concepts: ["debugging-method", "main-thread"],
    estimatedMinutes: 18,
    completedCount: 6400,
    introducedInWeek: 11,
    symptom:
      "Play Console reports ANRs at around 0.9%, concentrated on entry-level devices. The main-thread stack shows `SharedPreferences.getString` and, below it, `ContentProvider.onCreate`.",
    brokenCode: `class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val prefs = getSharedPreferences("settings", MODE_PRIVATE)   // (1)
        val theme = prefs.getString("theme", "system")               // (2)
        analytics.init(this)                                          // (3)
        Room.databaseBuilder(this, Db::class.java, "db")
            .build()
            .openHelper.writableDatabase                              // (4)
    }
}`,
    debugHints: [
      { label: "Hint 1", body: "Application.onCreate runs on the main thread, before the first frame. Everything in it is on the startup critical path." },
      { label: "Hint 2", body: "Which of these four lines touches the disk? Which of them is lazy and which forces work immediately?" },
      { label: "Hint 3", body: "`getSharedPreferences` loads and parses the whole XML file synchronously on first access. Line (4) opens and migrates the database. Both are disk I/O on the main thread." },
    ],
    rootCause:
      "Four independent startup costs on the main thread. `getSharedPreferences` parses XML synchronously; the first `getString` blocks until that load completes. `analytics.init` typically does more disk and network setup. Forcing `writableDatabase` opens the file and runs migrations. On a device with slow storage and a large database this exceeds the ANR threshold before a single frame is drawn.",
    fixedCode: `class App : Application() {
    override fun onCreate() {
        super.onCreate()
        // Nothing blocking here. Dependencies are lazy; work is deferred.
    }
}

// 1. DataStore instead of SharedPreferences: a Flow, read off the main thread.
val Context.settings by preferencesDataStore("settings")

// 2. Let the DI graph construct the database lazily — first use is inside
//    a suspend function that is already main-safe.

// 3. Defer non-critical initialisation past the first frame.
class StartupInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        ProcessLifecycleOwner.get().lifecycleScope.launch(Dispatchers.Default) {
            analytics.init(context)
        }
    }
}`,
    productionImplications: [
      "ANR rate is a Play Store ranking signal; above 0.47% an app is flagged as having bad behaviour.",
      "Startup work compounds: every library that initialises eagerly in a ContentProvider adds to the same critical path.",
      "Baseline Profiles help with code execution but do nothing about blocking I/O.",
    ],
    solution: {
      mentalModel:
        "Everything in `Application.onCreate` and every auto-initialising ContentProvider runs before your first frame. The correct amount of blocking I/O there is zero.",
      whyItWorks: [
        "DataStore returns a `Flow` and performs its reads on `Dispatchers.IO`.",
        "Lazy construction moves database opening to the first real query, which is already off the main thread.",
        "App Startup with deferred work removes non-critical libraries from the cold-start path entirely.",
      ],
      commonMistakes: [
        "Assuming SharedPreferences is cheap because it is a `Map` — the first access is a synchronous parse.",
        "`runBlocking` in `onCreate` to 'just get the value'.",
        "Measuring startup on a flagship device only.",
      ],
      followUps: [
        "How would you measure cold start reliably? (Macrobenchmark with `StartupTimingMetric`, on a low-end device.)",
        "What is StrictMode's role here, and why should it be on in debug builds?",
      ],
    },
  },
  {
    id: "a07",
    slug: "room-single-source-of-truth",
    title: "Room as the Single Source of Truth",
    description: "Wire the network into the database, not into the UI.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Android",
    topics: ["room", "architecture", "flow"],
    stage: "explain",
    concepts: ["room", "single-source-of-truth"],
    estimatedMinutes: 14,
    completedCount: 7300,
    introducedInWeek: 9,
    readingCode: `fun observeArticles(): Flow<List<Article>> = flow {
    emit(dao.getAll())                    // cached
    val fresh = api.articles()            // network
    dao.insertAll(fresh)
    emit(dao.getAll())                    // updated
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "What happens if another part of the app writes to this table while a collector is active?",
        expert:
          "Nothing. This flow emits twice and completes; it is not observing the database, it is reading it twice. Any write from elsewhere — a sync worker, a user action on another screen — is invisible until the whole flow is collected again.",
        keywords: ["not observing", "twice", "invisible", "stale"],
      },
      {
        id: "p2",
        question: "What does a Room `Flow`-returning query do differently?",
        expert:
          "Room's `Flow` queries register an `InvalidationTracker` observer on the tables the query touches. Any write to those tables re-runs the query and emits. It becomes a genuine subscription to the data, and every writer in the app automatically reaches every reader.",
        keywords: ["invalidationtracker", "observe", "re-emit", "subscription"],
      },
      {
        id: "p3",
        question: "Rewrite it. Where does the network call go?",
        expert:
          "`fun observeArticles(): Flow<List<Article>> = dao.observeAll().map { it.map(::toDomain) }` and, separately, `suspend fun refresh() { dao.insertAll(api.articles()) }`. Reading and refreshing become two operations with two lifetimes: the read lives as long as the screen, the refresh is triggered on entry, on pull-to-refresh, or by a worker.",
        keywords: ["separate", "refresh", "observe", "dao"],
      },
      {
        id: "p4",
        question: "What does this change about error handling?",
        expert:
          "A failed refresh no longer breaks the read. The UI keeps showing cached data and can display a non-blocking 'couldn't refresh' banner — which is the behaviour users actually want. In the original, a network failure throws inside the flow and terminates it, taking the cached data with it.",
        keywords: ["cached", "banner", "terminates", "independent"],
      },
    ],
    solution: {
      mentalModel:
        "One stream out of the database, one operation into it. The UI subscribes to the database; the network is one of several things that write to it.",
      whyItWorks: [
        "Room's invalidation tracking makes every writer visible to every reader with no coordination.",
        "Separating read from refresh gives them independent lifetimes and independent failure modes.",
      ],
      commonMistakes: [
        "Emitting cache-then-network from one flow, coupling the two and losing observation.",
        "Returning `suspend fun getAll(): List<Article>` from the DAO and polling it.",
        "Letting the UI call `refresh()` and then `getAll()` manually.",
      ],
      inProduction: "This is the shape recommended by the Android architecture guidance and used throughout Now in Android.",
      followUps: ["What are the costs of Room's invalidation tracking on a table written to very frequently?"],
    },
  },
  {
    id: "a08",
    slug: "http-error-taxonomy",
    title: "An Error Type the UI Can Act On",
    description: "Turn HTTP outcomes into decisions rather than status codes.",
    difficulty: "Medium",
    format: "coding",
    track: "Android",
    topics: ["networking", "architecture"],
    stage: "implement",
    ownership: "implement",
    concepts: ["http", "layering"],
    estimatedMinutes: 18,
    completedCount: 6800,
    introducedInWeek: 8,
    prompt:
      "The UI currently does `if (e is HttpException && e.code() == 401)`. Push that knowledge down into the data layer and give the UI a type whose branches map to things the user can do.",
    requirements: [
      "A sealed error type in the domain layer",
      "Distinguish: offline, timeout, unauthorised, not found, validation (with field errors), server, unknown",
      "The UI must never see `HttpException` or `IOException`",
      "Each branch must map to a distinct user-facing action",
    ],
    relatedConcepts: ["Error taxonomy", "Layer boundaries", "Actionable errors"],
    starterCode: `sealed interface DataError { /* TODO */ }

fun Throwable.toDataError(): DataError = TODO()`,
    solutionCode: `sealed interface DataError {
    data object Offline : DataError                       // → "You're offline. Retry"
    data object Timeout : DataError                       // → "Taking too long. Retry"
    data object Unauthorised : DataError                  // → re-authenticate
    data object NotFound : DataError                      // → empty state, no retry
    data class Validation(val fields: Map<String, String>) : DataError  // → inline errors
    data class Server(val code: Int) : DataError          // → "Something went wrong. Retry"
    data class Unknown(val cause: Throwable) : DataError  // → report, generic message
}

fun Throwable.toDataError(): DataError = when (this) {
    is UnknownHostException, is ConnectException -> DataError.Offline
    is SocketTimeoutException -> DataError.Timeout
    is HttpException -> when (code()) {
        401, 403 -> DataError.Unauthorised
        404 -> DataError.NotFound
        422 -> DataError.Validation(parseFieldErrors(this))
        in 500..599 -> DataError.Server(code())
        else -> DataError.Unknown(this)
    }
    else -> DataError.Unknown(this)
}`,
    tests: [
      { name: "offline", call: `UnknownHostException().toDataError()`, expected: `Offline` },
      { name: "unauthorised", call: `HttpException(401).toDataError()`, expected: `Unauthorised` },
      { name: "validation carries fields", call: `HttpException(422).toDataError()`, expected: `Validation(fields={email=taken})` },
    ],
    hints: [
      "Name the cases after what the user should do, not after the status code.",
      "'Retryable' is a property of the case — consider exposing it as `val DataError.isRetryable`.",
    ],
    solution: {
      mentalModel:
        "An error type is a list of the situations your product has decided to handle. Status codes are an implementation detail of one transport; they should not appear above the layer that speaks that transport.",
      whyItWorks: [
        "Exhaustive `when` in the UI means a new error case fails the build everywhere it must be handled.",
        "The mapping lives once, so behaviour is consistent across every screen.",
        "Validation carrying structured field errors is what lets a form highlight the right input rather than showing a toast.",
      ],
      commonMistakes: [
        "A single `Error(message: String)` case — you cannot decide whether to show Retry from a string.",
        "Showing raw server messages to users. They are written for developers and are not localised.",
        "Treating 401 as retryable and looping.",
      ],
      alternatives: [
        {
          title: "Per-feature error types",
          body: "A shared `DataError` plus a feature-specific type for domain failures (`InsufficientFunds`, `AccountLocked`) keeps transport and business failures distinct — they need different handling and different copy.",
        },
      ],
      inProduction: "Pair this with an OkHttp `Authenticator` so 401 refresh happens below the repository and never surfaces at all in the common case.",
      followUps: ["Where should retry logic live given this taxonomy, and which cases should it be allowed to retry?"],
    },
  },
  {
    id: "a09",
    slug: "token-refresh-race",
    title: "Three Requests, One Token Refresh",
    description: "Concurrent 401s produce three refreshes and two invalid tokens.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["networking", "coroutines"],
    stage: "predict",
    ownership: "improve",
    concepts: ["structured-concurrency", "cancellation", "idempotency"],
    estimatedMinutes: 20,
    completedCount: 4300,
    introducedInWeek: 8,
    symptom:
      "When the access token expires while three requests are in flight, users are occasionally logged out. Logs show three refresh calls; the server's rotating refresh token invalidates the first two.",
    brokenCode: `class AuthInterceptor(private val store: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request().withToken(store.access))
        if (response.code == 401) {
            val fresh = runBlocking { api.refresh(store.refresh) }   // (!)
            store.save(fresh)
            return chain.proceed(chain.request().withToken(fresh.access))
        }
        return response
    }
}`,
    debugHints: [
      { label: "Hint 1", body: "Three requests on three OkHttp threads all get a 401 at roughly the same moment. How many enter the refresh branch?" },
      { label: "Hint 2", body: "Nothing coordinates them. If the refresh token rotates, the second and third refreshes present a token the server has already invalidated." },
      { label: "Hint 3", body: "You need the first caller to refresh and the others to wait for its result, not to start their own." },
    ],
    rootCause:
      "No mutual exclusion around refresh. Each thread independently observes a 401 and starts its own refresh with the same refresh token. With rotation, the first succeeds and invalidates that token; the other two fail with 401 and the app logs the user out. There is also no retry bound, so a persistently failing refresh can loop.",
    fixedCode: `class TokenRefresher(private val api: AuthApi, private val store: TokenStore) {
    private val mutex = Mutex()

    /** Only the first caller refreshes; the rest wait and reuse the result. */
    suspend fun refreshIfNeeded(staleToken: String): String = mutex.withLock {
        val current = store.access
        if (current != staleToken) return@withLock current   // someone already refreshed
        val fresh = api.refresh(store.refresh)
        store.save(fresh)
        fresh.access
    }
}

class TokenAuthenticator(private val refresher: TokenRefresher) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.priorResponseCount >= 2) return null      // give up, log out
        val stale = response.request.header("Authorization")?.removePrefix("Bearer ")
        val fresh = runBlocking { refresher.refreshIfNeeded(stale.orEmpty()) }
        return response.request.newBuilder()
            .header("Authorization", "Bearer \$fresh")
            .build()
    }
}

private val Response.priorResponseCount: Int
    get() = generateSequence(this) { it.priorResponse }.count() - 1`,
    productionImplications: [
      "OkHttp's `Authenticator` is the right hook: it is invoked on 401 and its retry count is visible via `priorResponse`.",
      "The double-check inside the lock is what prevents a queue of waiters each refreshing in turn.",
      "Unbounded retry on a failing refresh is an infinite loop that drains the battery and hammers the auth service.",
    ],
    solution: {
      mentalModel:
        "Refresh is a single-flight operation: many callers, one execution, one shared result. Any design where N failures cause N refreshes is wrong.",
      whyItWorks: [
        "The mutex serialises entry; the token comparison means only the caller holding the stale token performs the work.",
        "`Authenticator` runs outside the interceptor chain, so it can retry the original request cleanly.",
        "Counting prior responses bounds the retry.",
      ],
      commonMistakes: [
        "Refreshing in an `Interceptor` rather than an `Authenticator`, which fights OkHttp's own retry handling.",
        "`synchronized` around a suspending call, which blocks a thread and can deadlock.",
        "Forgetting the second check inside the lock, so every waiter refreshes in sequence.",
      ],
      complexity: { time: "One refresh per expiry", space: "O(1)" },
      followUps: ["How would you test this deterministically? (Fake clock, fake auth API counting calls, three concurrent requests on a test dispatcher.)"],
    },
  },
  {
    id: "a10",
    slug: "workmanager-constraints",
    title: "Background Work That Actually Runs",
    description: "Choose the API that matches the guarantee the feature needs.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["room", "lifecycle"],
    stage: "explain",
    concepts: ["background-work"],
    estimatedMinutes: 8,
    completedCount: 5800,
    introducedInWeek: 9,
    quizStem:
      "A sync must complete even if the user closes the app, and must survive a reboot. Which API?",
    choices: [
      {
        id: "a",
        body: "`WorkManager` with a unique `OneTimeWorkRequest` and a network constraint.",
        correct: true,
        rationale:
          "WorkManager persists its queue to disk, reschedules across reboots, and honours Doze and App Standby. It is the only option here that offers a completion guarantee.",
      },
      {
        id: "b",
        body: "A coroutine in `GlobalScope`.",
        correct: false,
        rationale: "It dies with the process, which the system may reclaim the moment the app is backgrounded. No persistence, no reboot survival, no constraints.",
      },
      { id: "c", body: "A foreground `Service` started on app exit.", correct: false, rationale: "Modern Android restricts starting services from the background, and a foreground service needs a visible notification and a declared type. Wrong tool for deferrable work." },
      { id: "d", body: "`AlarmManager` with `setExactAndAllowWhileIdle`.", correct: false, rationale: "Alarms are for time-precise wakeups, not for deferrable guaranteed work, and exact alarms require a special permission and are heavily rate-limited." },
    ],
    solution: {
      mentalModel:
        "Match the API to the guarantee: deferrable and guaranteed → WorkManager. Immediate and user-visible → foreground service. Time-exact → AlarmManager. Tied to the UI → `viewModelScope`.",
      whyItWorks: [
        "WorkManager stores requests in its own database and reschedules on boot.",
        "Constraints (network, charging, battery-not-low) let the system pick a moment that does not hurt the user.",
        "Unique work with `KEEP` or `APPEND` policies prevents duplicate queues.",
      ],
      commonMistakes: [
        "Expecting WorkManager to run at an exact time — it is explicitly deferrable, with a minimum periodic interval of 15 minutes.",
        "Enqueuing non-unique work per user action, building a queue of hundreds of identical jobs.",
        "Doing work in `onDestroy`, which is not guaranteed to run at all.",
      ],
      followUps: ["What does `setExpedited` change, and what does the system ask of you in return?"],
    },
  },
  {
    id: "a11",
    slug: "memory-leak-context",
    title: "The Leak That Only Shows Up After Twenty Rotations",
    description: "Find the reference chain that keeps an Activity alive.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["performance", "lifecycle"],
    stage: "predict",
    ownership: "improve",
    concepts: ["context", "config-change", "leaks"],
    estimatedMinutes: 18,
    completedCount: 5600,
    introducedInWeek: 11,
    symptom:
      "LeakCanary reports a retained Activity after each rotation. Memory climbs steadily; after about twenty rotations the app is noticeably slower and eventually OOMs on a low-memory device.",
    brokenCode: `object ImageCache {
    private val entries = mutableMapOf<String, Bitmap>()
    lateinit var context: Context                      // (1)

    fun init(context: Context) { this.context = context }
}

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ImageCache.init(this)                          // (2)
    }
}`,
    debugHints: [
      { label: "Hint 1", body: "Follow the reference chain from the GC root. What holds the Activity, and how long does that thing live?" },
      { label: "Hint 2", body: "A Kotlin `object` is a process-lifetime singleton. It outlives every Activity by definition." },
      { label: "Hint 3", body: "The bitmaps are a second problem: nothing ever evicts them, so the map grows without bound." },
    ],
    rootCause:
      "A process-lifetime singleton holds a reference to an Activity. Each rotation creates a new Activity and overwrites the field, but the previous Activity is retained until then — and any callback registered with the old instance keeps it alive longer still. The Activity holds its entire view hierarchy, so each leak is megabytes, not bytes. Separately, the unbounded bitmap map is a leak in its own right.",
    fixedCode: `object ImageCache {
    // LruCache bounds memory; applicationContext has process lifetime,
    // so retaining it leaks nothing.
    private lateinit var appContext: Context
    private val entries = object : LruCache<String, Bitmap>(maxSizeBytes) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }

    fun init(context: Context) { appContext = context.applicationContext }
}

// Better: do not use a singleton at all. Let the DI graph own it with an
// @ApplicationContext binding, which makes the lifetime explicit and the
// class testable.`,
    productionImplications: [
      "Activity leaks are large — the whole view tree, its bitmaps and its listeners go with it.",
      "`applicationContext` is correct for anything with a lifetime longer than a screen; an Activity context is required only for UI things (inflation, theming, dialogs).",
      "Unbounded caches are leaks with better manners. `LruCache` with a byte-based size makes the bound real.",
    ],
    solution: {
      mentalModel:
        "A leak is an object with a lifetime shorter than the thing referencing it. Singletons live for the process, so anything they hold does too.",
      whyItWorks: [
        "`applicationContext` has process lifetime, so there is no mismatch.",
        "`LruCache` evicts by a size you define rather than growing until the heap is gone.",
        "Constructor injection makes the dependency and its scope explicit instead of implicit.",
      ],
      commonMistakes: [
        "Storing an Activity, View, or Fragment in any singleton, companion object or static field.",
        "Registering a listener in `onCreate` and never unregistering.",
        "Inner classes and non-static handlers holding an implicit outer reference.",
        "Assuming a `WeakReference` is the fix — it hides the design problem and makes behaviour non-deterministic.",
      ],
      followUps: ["Which Context should you use to inflate a layout, and why is `applicationContext` wrong there?"],
    },
  },
  {
    id: "a12",
    slug: "viewmodel-testing",
    title: "Test a ViewModel's State Sequence",
    description: "Assert on what the screen actually saw, in order.",
    difficulty: "Medium",
    format: "coding",
    track: "Android",
    topics: ["testing", "viewmodel", "flow"],
    stage: "implement",
    ownership: "implement",
    concepts: ["viewmodel", "lazy-sequences"],
    estimatedMinutes: 20,
    completedCount: 6100,
    introducedInWeek: 10,
    prompt:
      "Write a test that proves the screen shows Loading, then Success — and that a failure shows Loading then Error while preserving any previously loaded data.",
    requirements: [
      "Use a fake repository, not a mock",
      "Control the main dispatcher",
      "Assert on the emitted sequence, not on internal fields",
      "Cover both success and failure",
    ],
    relatedConcepts: ["MainDispatcherRule", "Turbine", "Fakes"],
    starterCode: `class ProfileViewModelTest {
    @Test fun \`emits loading then success\`() = runTest { TODO() }
}`,
    solutionCode: `class FakeProfileRepository : ProfileRepository {
    var result: Result<Profile> = Result.success(Profile("1", "Alex"))
    var callCount = 0
    override suspend fun profile(id: String): Profile {
        callCount++
        return result.getOrThrow()
    }
}

@get:Rule val mainDispatcherRule = MainDispatcherRule()

@Test
fun \`emits loading then success\`() = runTest {
    val repository = FakeProfileRepository()
    val viewModel = ProfileViewModel(repository)

    viewModel.state.test {
        assertEquals(ProfileUiState.Loading, awaitItem())
        assertEquals(ProfileUiState.Success(Profile("1", "Alex")), awaitItem())
        assertEquals(1, repository.callCount)
        cancelAndIgnoreRemainingEvents()
    }
}

@Test
fun \`failure emits error\`() = runTest {
    val repository = FakeProfileRepository().apply {
        result = Result.failure(IOException("offline"))
    }
    val viewModel = ProfileViewModel(repository)

    viewModel.state.test {
        assertEquals(ProfileUiState.Loading, awaitItem())
        assertTrue(awaitItem() is ProfileUiState.Error)
        cancelAndIgnoreRemainingEvents()
    }
}`,
    tests: [
      { name: "success path", call: `emits`, expected: `[Loading, Success]` },
      { name: "failure path", call: `emits`, expected: `[Loading, Error]` },
      { name: "one repository call", call: `callCount`, expected: `1` },
    ],
    hints: [
      "`MainDispatcherRule` calls `Dispatchers.setMain(testDispatcher)` in `before` and `resetMain` in `after`.",
      "A fake that counts calls proves the absence of duplicate work — something a state assertion cannot.",
    ],
    solution: {
      mentalModel:
        "A ViewModel's public contract is the sequence of states it emits. Test that; everything else is implementation you should be free to change.",
      whyItWorks: [
        "`Dispatchers.setMain` makes `viewModelScope` share the test's virtual clock.",
        "Turbine makes emission order an explicit assertion rather than something you infer from a final value.",
        "A hand-written fake reads like the production collaborator and does not break when you rename a method.",
      ],
      commonMistakes: [
        "Asserting only on `state.value`, which misses every intermediate emission — including a Loading state that never clears.",
        "Mocking a suspend function and fighting the framework instead of writing ten lines of fake.",
        "Forgetting to reset the main dispatcher, so one test poisons the next.",
      ],
      inProduction: "Fakes live in a `testFixtures` source set so both unit and instrumented tests share them.",
      followUps: ["How would you test a state that is only produced under a race?"],
    },
  },
  {
    id: "a13",
    slug: "deep-link-argument-handling",
    title: "A Deep Link With a Missing Argument",
    description: "The screen crashes when opened from a notification. Model the absence.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["lifecycle", "viewmodel", "architecture"],
    stage: "explain",
    concepts: ["navigation"],
    estimatedMinutes: 8,
    completedCount: 4900,
    introducedInWeek: 7,
    quizStem:
      "A ViewModel reads `savedStateHandle.get<String>(\"orderId\")!!` in `init`. It works in-app and crashes from a deep link. What is the best fix?",
    choices: [
      {
        id: "a",
        body: "Use `savedStateHandle.get<String>(\"orderId\") ?: \"\"` and handle an empty id downstream.",
        correct: false,
        rationale: "It stops the crash and replaces it with a request for order `\"\"`, which fails somewhere less obvious. An empty string is not a meaningful absence.",
      },
      {
        id: "b",
        body: "Model the missing argument as a terminal UI state and surface it, using `requireNotNull` only where the route guarantees the argument.",
        correct: true,
        rationale:
          "A deep link is untrusted input. Either the navigation graph enforces the argument (in which case `requireNotNull` documents a real invariant and a crash means a graph bug), or it does not, and the missing case is a legitimate state — an 'order not found' screen.",
      },
      { id: "c", body: "Move the read out of `init` into a `LaunchedEffect`.", correct: false, rationale: "It changes when the crash happens, not whether it happens." },
      { id: "d", body: "Catch the NPE and log it.", correct: false, rationale: "Catching NPEs as control flow hides a modelling gap and leaves the user on a blank screen." },
    ],
    solution: {
      mentalModel:
        "Arguments arriving from outside the app are input, not invariants. Decide explicitly which guarantees the navigation graph enforces, and model everything else as state.",
      whyItWorks: [
        "Typed navigation arguments with `nullable = false` make the graph enforce presence, so `requireNotNull` documents rather than hopes.",
        "A `NotFound` UI state gives the user somewhere to go instead of a crash or a blank screen.",
      ],
      commonMistakes: [
        "Substituting empty defaults for missing required arguments.",
        "Assuming deep links always match the in-app route shape — they are constructed by servers, emails and other apps.",
      ],
      followUps: ["How would you validate deep-link arguments before the destination is created?"],
    },
  },
  {
    id: "a14",
    slug: "recyclerview-to-compose-state",
    title: "Migrating a List: What Actually Changes",
    description: "Beyond syntax — what stops being your responsibility.",
    difficulty: "Easy",
    format: "quiz",
    track: "Android",
    topics: ["compose", "performance"],
    stage: "explain",
    concepts: ["compose-state"],
    estimatedMinutes: 7,
    completedCount: 8400,
    introducedInWeek: 5,
    quizStem:
      "Moving a `RecyclerView` with `DiffUtil` to a `LazyColumn`, which responsibility disappears?",
    choices: [
      {
        id: "a",
        body: "Computing the diff between old and new lists.",
        correct: true,
        rationale:
          "Compose re-executes the item lambda for the current list and the runtime reconciles it, using `key` for identity. There is no explicit diff to compute or dispatch — though keys become mandatory to get the same identity guarantees `DiffUtil` gave you.",
      },
      { id: "b", body: "Providing stable item identity.", correct: false, rationale: "It moves from `areItemsTheSame` to the `key` parameter — still your job, and still the thing everyone forgets." },
      { id: "c", body: "Recycling views for memory efficiency.", correct: false, rationale: "`LazyColumn` still composes only visible items and reuses composition slots. The mechanism differs; the concern remains." },
      { id: "d", body: "Deciding what makes two items equal.", correct: false, rationale: "`areContentsTheSame` becomes parameter stability and equality — a different expression of the same decision." },
    ],
    solution: {
      mentalModel:
        "Compose removes the imperative update step. It does not remove the modelling work: identity, equality and stability are still yours, just expressed differently.",
      whyItWorks: [
        "The runtime compares parameters against the previous composition and skips unchanged subtrees.",
        "`key` supplies identity, exactly as `areItemsTheSame` did.",
      ],
      commonMistakes: [
        "Assuming Compose 'handles performance', then shipping an unkeyed list of unstable types.",
        "Porting the ViewHolder structure one-to-one instead of rethinking state ownership.",
      ],
      followUps: ["What is the Compose equivalent of `ListAdapter.submitList` and its async diff?"],
    },
  },
];
