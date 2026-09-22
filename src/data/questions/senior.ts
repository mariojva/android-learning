import type { Question } from "@/lib/types";

/* ------------------------------------------------------------------
   The competence set.

   Everything else in this bank asks whether you can write the right
   code. These ask the questions that fill an actual working week:
   reading something you did not write, changing it without stopping
   the world, keeping a decade of legacy alive alongside it, and
   deciding what is worth a test.

   None of it is interview material. All of it is the difference
   between shipping features and being trusted with the codebase.
   ------------------------------------------------------------------ */

export const SENIOR_QUESTIONS: Question[] = [
  /* ---------------------- Reading whole features -------------------- */
  {
    id: "sr01",
    slug: "read-a-feature-you-did-not-write",
    title: "Read a Feature You Did Not Write",
    description:
      "Ninety lines of someone else's sync code. Account for the design before you touch it.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Architecture",
    topics: ["architecture", "room", "flow", "coroutines"],
    stage: "explain",
    ownership: "design",
    concepts: ["layering", "tracing-a-feature"],
    estimatedMinutes: 35,
    completedCount: 2400,
    introducedInWeek: 9,
    prompt:
      "You joined last week. This is the sync layer for the notes feature and you have been asked to add attachments to it. Before you write anything, you owe yourself an account of why it looks like this — including the parts that look wrong and are not.",
    readingCode: `class NoteSyncManager(
    private val local: NoteDao,
    private val remote: NoteApi,
    private val pending: PendingOperationDao,
    private val connectivity: ConnectivityMonitor,
    private val scope: CoroutineScope,
) {

    private val syncMutex = Mutex()

    val notes: Flow<List<Note>> =
        local.observeAll()
            .map { entities -> entities.map(NoteEntity::toDomain) }
            .distinctUntilChanged()

    init {
        connectivity.online
            .filter { it }
            .onEach { syncNow() }
            .launchIn(scope)
    }

    suspend fun create(draft: NoteDraft): NoteId {
        val id = NoteId(UUID.randomUUID().toString())
        local.insert(draft.toEntity(id, syncState = SyncState.PENDING))
        pending.enqueue(PendingOperation.Create(id))
        scope.launch { syncNow() }
        return id
    }

    suspend fun edit(id: NoteId, body: String) {
        local.updateBody(id, body, syncState = SyncState.PENDING)
        pending.enqueueIfAbsent(PendingOperation.Update(id))
        scope.launch { syncNow() }
    }

    suspend fun delete(id: NoteId) {
        local.markDeleted(id)
        pending.enqueue(PendingOperation.Delete(id))
        scope.launch { syncNow() }
    }

    private suspend fun syncNow() = syncMutex.withLock {
        if (!connectivity.isOnline()) return@withLock

        val operations = pending.all()
        for (operation in operations) {
            val result = runCatching {
                when (operation) {
                    is PendingOperation.Create ->
                        remote.create(local.byId(operation.id)!!.toRequest())
                    is PendingOperation.Update ->
                        remote.update(operation.id.value, local.byId(operation.id)!!.toRequest())
                    is PendingOperation.Delete ->
                        remote.delete(operation.id.value)
                }
            }

            result
                .onSuccess {
                    pending.remove(operation)
                    local.markSynced(operation.id)
                }
                .onFailure { error ->
                    when (error) {
                        is CancellationException -> throw error
                        is IOException -> return@withLock
                        is HttpException ->
                            if (error.code() in 400..499) {
                                pending.remove(operation)
                                local.markConflicted(operation.id)
                            } else {
                                return@withLock
                            }
                        else -> throw error
                    }
                }
        }

        val server = remote.since(local.lastSyncToken())
        local.upsertAll(server.notes.map(NoteResponse::toEntity))
        local.setLastSyncToken(server.token)
    }
}`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "Why does `create` write to the local database *before* it touches the network, and return an id the server has never seen?",
        expert:
          "Because the database is the single source of truth and the network is an implementation detail of keeping it current. The UI observes `notes`, which reads from Room, so writing locally makes the note appear instantly whether or not there is signal — and the return value has to be an id that exists locally, because the caller needs to navigate to the note before any round trip could finish.\n\nGenerating the id client-side (a UUID rather than a server sequence) is what makes this possible. It also makes create idempotent: if the request is retried after a timeout that actually succeeded, the server sees the same id and can reject the duplicate rather than creating a second note.",
        keywords: ["source of truth", "offline", "UUID", "idempotent", "instant"],
      },
      {
        id: "p2",
        question:
          "What is the `syncMutex` protecting against, given that every caller here is already a suspend function?",
        expert:
          "Suspend functions are not mutually exclusive — they are just suspendable. Three things can call syncNow concurrently: the connectivity listener when the radio comes back, any of create/edit/delete, and a retry. Without the mutex, two passes read the same pending queue and send the same operations twice.\n\nIt is a Mutex rather than `synchronized` because the body suspends on network calls; blocking a thread for the duration of a sync would be considerably worse.",
        keywords: ["concurrent", "queue", "twice", "suspend", "Mutex"],
      },
      {
        id: "p3",
        question:
          "Three different failure branches do three different things: IOException returns, a 4xx removes the operation, anything else rethrows. Reconstruct the reasoning.",
        expert:
          "The branches encode whether retrying could ever help.\n\nIOException means the network failed — the operation is still valid and will probably succeed later, so it stays on the queue and the whole pass stops (there is no point attempting the rest while offline).\n\nA 4xx means the *server rejected this specific request*: the note references a deleted parent, or the payload is malformed. Retrying it forever would wedge the queue permanently, so it is removed and the row is marked conflicted for the UI to surface. This is the branch that prevents a poison message.\n\nAnything else — a 5xx, a serialisation bug — is either transient at the server or a programming error. Rethrowing surfaces it rather than silently swallowing a class of failure nobody has thought about yet.",
        keywords: ["retry", "poison", "4xx", "conflict", "wedge"],
      },
      {
        id: "p4",
        question:
          "`enqueue` for Create and Delete, but `enqueueIfAbsent` for Update. Why the asymmetry?",
        expert:
          "Updates are idempotent in a way creates and deletes are not. Editing the same note five times offline produces five Update operations that would each send the note's *current* body — so four of them are wasted round trips sending identical data. Collapsing them to one is free.\n\nCreate cannot be collapsed because each one is a different note. Delete could arguably be deduplicated too, and the fact that it is not is either an oversight or a deliberate choice to keep the queue's history readable. That is a fair question to ask the author — it is the kind of asymmetry that is usually accidental.",
        keywords: ["idempotent", "collapse", "duplicate", "asymmetry"],
      },
      {
        id: "p5",
        question:
          "Find the two `!!` operators. Are they safe? What would make them unsafe?",
        expert:
          "`local.byId(operation.id)!!` assumes a pending operation always has a corresponding local row. Today that holds, because operations are only enqueued immediately after the row is written and removed when synced.\n\nIt stops holding the moment anything deletes a row without clearing its pending operations — a cache eviction, a 'clear local data' setting, a future migration, or a Delete operation processed before an earlier Update for the same note. The last one is reachable right now if the queue is not strictly ordered.\n\nThis is the line that will crash first when you add attachments. The honest fix is to treat a missing row as 'this operation is obsolete', remove it and continue.",
        keywords: ["null", "crash", "obsolete", "ordering", "eviction"],
      },
      {
        id: "p6",
        question:
          "The pull at the end happens after the push loop, and only if the loop completed. What does that ordering buy, and what does it cost?",
        expert:
          "Pushing first means local changes reach the server before the server's view is pulled back down, so the pull cannot overwrite a local edit that was never sent. Skipping the pull when the push bailed out avoids applying a server state that does not yet include the changes sitting in the queue.\n\nThe cost is that one wedged operation blocks *all* incoming changes indefinitely. If a note gets into a state that repeatedly fails with a 5xx, the user stops receiving anyone else's updates and there is nothing in the UI to explain why. A retry budget per operation, after which it is parked as conflicted, would bound that.",
        keywords: ["overwrite", "order", "wedge", "budget", "blocked"],
      },
      {
        id: "p7",
        question:
          "You have been asked to add attachments. Name the two places in this design that will fight you, before you write a line.",
        expert:
          "First, the operation queue is modelled as small value objects carrying only an id — the body is read from the database at send time. That works for text. A file upload needs its own progress, resumability and failure semantics, and it does not want to be re-read from a Room row at send time. Attachments probably want a separate queue rather than a fourth PendingOperation.\n\nSecond, `syncNow` is a single sequential loop under one mutex. A 40MB upload inside it blocks every text edit behind it, and IOException mid-upload restarts the whole pass. Uploads want to run outside this lock, most likely in WorkManager, with the note operation queue only recording that an attachment exists.\n\nThe general form of the answer: the design assumes operations are small, fast and interchangeable. Attachments are none of those things.",
        keywords: ["queue", "upload", "WorkManager", "blocking", "assumption"],
      },
    ],
    solution: {
      mentalModel:
        "Reading unfamiliar code well means reconstructing the constraints the author was under, not judging the code against the one you would have written. Every odd-looking line is either a constraint you have not found yet or a genuine mistake — and you cannot tell which until you have looked for the constraint.",
      whyItWorks: [
        "Local-first writes make the feature work offline without the UI knowing anything about connectivity.",
        "A client-generated id makes create retryable, which is what lets the queue exist at all.",
        "Classifying failures by whether a retry could help is what keeps a queue from wedging on one bad row.",
        "One mutex around the whole pass buys simple reasoning at the cost of throughput — a reasonable trade while every operation is small.",
      ],
      commonMistakes: [
        "Reading for style rather than intent — noticing the `!!` but not asking what invariant makes it hold today.",
        "Calling the sequential loop 'inefficient' without noticing that it is what makes the ordering guarantees possible.",
        "Proposing a rewrite before you can explain the failure taxonomy. If you cannot say why 4xx is treated differently from 5xx, you do not yet know enough to replace it.",
      ],
      alternatives: [
        {
          title: "WorkManager instead of a scope",
          body: "Everything here dies with the process. A WorkManager chain survives it, at the cost of losing the immediate in-process trigger that makes the UI feel instant. Most mature implementations end up with both: optimistic in-process sync plus a periodic worker as the safety net.",
        },
        {
          title: "An operation log rather than a queue",
          body: "Storing an append-only log with a cursor, rather than a mutable queue, makes the ordering explicit and the state recoverable after a crash mid-pass. It is more machinery than this feature currently needs.",
        },
      ],
      inProduction:
        "This is roughly the shape of every offline-first sync layer that survives contact with real users. The parts that look over-engineered — the failure taxonomy, the mutex, the client-side id — are the parts added after an outage.",
      followUps: [
        "Write the two-sentence summary of this file you would give a teammate who has to page in tomorrow.",
        "Which single change would most reduce the blast radius of one bad operation?",
      ],
    },
  },

  {
    id: "sr02",
    slug: "the-change-set-not-the-file",
    title: "Read the Change, Not the File",
    description:
      "Nine files moved. Decide what the author was actually doing — and whether they finished.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Architecture",
    topics: ["architecture", "testing", "viewmodel"],
    stage: "explain",
    ownership: "design",
    concepts: ["tracing-a-feature"],
    estimatedMinutes: 25,
    completedCount: 1900,
    introducedInWeek: 11,
    prompt:
      "You are reviewing a change-set summary rather than a file. This is how most real review starts: the diff is too large to read line by line, so you read its shape first and then choose where to look closely.",
    readingCode: `# Change summary — 9 files, +412 / -287

  M  checkout/CheckoutViewModel.kt            +38  -96
  M  checkout/CheckoutState.kt                +21  -4
  A  checkout/CheckoutReducer.kt              +104 -0
  A  checkout/CheckoutReducerTest.kt          +187 -0
  M  checkout/CheckoutScreen.kt               +12  -31
  M  data/OrderRepository.kt                  +9   -14
  D  checkout/CheckoutValidator.kt            +0   -102
  M  di/CheckoutModule.kt                     +6   -8
  M  analytics/CheckoutAnalytics.kt           +35  -32

# Commit messages, oldest first

  1. extract pure reducer from CheckoutViewModel
  2. move validation into the reducer
  3. tests for the reducer
  4. delete CheckoutValidator
  5. wire analytics through reducer output
  6. fix: don't emit analytics on state restore

# CheckoutViewModel.kt — the part that changed shape

- private fun onCardEntered(number: String) {
-     val result = validator.validateCard(number)
-     if (result.isValid) {
-         _state.update { it.copy(card = number, cardError = null) }
-         analytics.cardEntered()
-     } else {
-         _state.update { it.copy(cardError = result.message) }
-     }
- }

+ private fun onCardEntered(number: String) {
+     val outcome = reducer.reduce(state.value, CheckoutAction.CardEntered(number))
+     _state.value = outcome.state
+     outcome.events.forEach(analytics::track)
+ }`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "From the file list alone — before reading any code — what is this change?",
        expert:
          "A refactor, not a feature. The signals: one file added with a matching test file roughly twice its size, one file deleted, the ViewModel losing far more than it gains (-96 / +38), and the screen losing lines too. Nothing in the data layer grew meaningfully.\n\nA feature adds behaviour and usually adds net lines across several layers. This moves lines from one place to another and deletes a class. The net +125 is almost entirely the new test file.",
        keywords: ["refactor", "deleted", "test file", "net", "moved"],
      },
      {
        id: "p2",
        question:
          "The commit messages tell a story. What does commit 6 — 'fix: don't emit analytics on state restore' — reveal about commits 1 to 5?",
        expert:
          "That the refactor introduced a regression the author found themselves. Folding analytics into the reducer's output made events a function of state transitions, and state restoration after process death replays a transition — so restoring the screen fired a `cardEntered` event that no user caused.\n\nIt is a good sign that it is here: the author tested the restore path. It is also the single highest-value place to look closely, because it means the coupling between state and events is subtle enough to have already bitten once. Ask whether the fix handles *every* replayed transition or just the one they noticed.",
        keywords: ["regression", "restore", "process death", "replay", "coupling"],
      },
      {
        id: "p3",
        question:
          "What did the ViewModel gain by this change, and what did it lose?",
        expert:
          "Gained: the decision logic is now a pure function, so it can be tested without a ViewModel, a dispatcher or a mock — which is why a 187-line test file could be written at all. The ViewModel becomes a thin adapter between input events and a reducer.\n\nLost: locality. Reading `onCardEntered` no longer tells you what happens when a card is entered; you now need the reducer, the action type and the event list to answer that. For a screen with three fields that is a poor trade. For checkout, with validation rules that change per market, it is probably a good one.\n\nThe honest review question is whether this screen is complex enough to have earned the indirection — and the deleted 102-line validator suggests it is.",
        keywords: ["pure", "testable", "locality", "indirection", "trade"],
      },
      {
        id: "p4",
        question:
          "CheckoutAnalytics changed by +35 / -32 — almost exactly balanced. Is that suspicious?",
        expert:
          "It is worth a look, because a balanced change often means a rewrite rather than an edit, and rewrites of analytics code silently change what the business sees.\n\nSpecifically: if event names or parameters changed shape while the diff looks like a refactor, every dashboard built on those events breaks, and nobody notices for a quarter. Analytics is the one place where 'this is just a refactor' is frequently untrue in a way that no test catches.\n\nThe question for the author is simply: are the emitted event names and payloads byte-identical to before?",
        keywords: ["rewrite", "event names", "dashboard", "silent", "payload"],
      },
      {
        id: "p5",
        question:
          "Where would you actually read closely, and in what order? You have twenty minutes, not two hours.",
        expert:
          "First, the reducer's event emission and commit 6's fix — that is where the known regression lives and where a second one probably hides.\n\nSecond, the analytics diff, for renamed events.\n\nThird, the *deleted* validator against the new reducer, checking every rule survived. Deleted files are where behaviour disappears silently: nothing fails if a validation rule simply stopped existing.\n\nThe test file can be skimmed rather than read — it is new, so it cannot have broken anything, and its value is in whether it covers the rules the validator used to enforce. The DI and screen changes are almost certainly mechanical.\n\nThat ordering follows a general rule: read where behaviour could have vanished, not where lines were added.",
        keywords: ["deleted", "regression", "analytics", "order", "skim"],
      },
    ],
    solution: {
      mentalModel:
        "A large diff is a shape before it is a text. File names, add/delete ratios and commit messages tell you what kind of change it is and where the risk sits — and that is what decides where your limited attention goes.",
      whyItWorks: [
        "Deleted code is the highest-risk part of any refactor: nothing fails when behaviour merely stops existing.",
        "A self-authored 'fix:' commit marks the exact spot the author already found to be subtle.",
        "Balanced add/delete counts often mean rewrite rather than edit.",
        "New test files cannot break production and can be read last.",
      ],
      commonMistakes: [
        "Starting at the first file alphabetically and running out of attention before reaching the risky one.",
        "Treating a refactor as low-risk because it 'doesn't change behaviour' — that is the claim under review, not a given.",
        "Skipping analytics diffs, which no test covers and which the business notices last.",
      ],
      inProduction:
        "The refactor that silently drops a validation rule is one of the most common ways a shipped bug enters a mature codebase, precisely because review attention goes to the added code.",
      followUps: [
        "What would you ask the author to add to the PR description to make this reviewable in half the time?",
        "How would you verify the validator's rules all survived, without reading both files line by line?",
      ],
    },
  },

  /* ------------------------- Changing things ------------------------ */
  {
    id: "sr03",
    slug: "migration-you-can-stop-halfway",
    title: "A Migration You Can Stop Halfway",
    description:
      "Replace a legacy screen over six weeks without a long-lived branch, and without a release where it is half done.",
    difficulty: "Hard",
    format: "coding",
    track: "Architecture",
    topics: ["architecture", "testing", "compose"],
    stage: "implement",
    ownership: "implement",
    concepts: ["viewmodel", "lifecycle", "migrations"],
    estimatedMinutes: 35,
    completedCount: 2100,
    introducedInWeek: 11,
    prompt:
      "The search screen is a 900-line Fragment with a presenter, written in 2019. It works. You have been asked to move it to Compose and the current ViewModel pattern. You ship every two weeks and there is no appetite for a feature freeze.\n\nWrite the seam that makes this migration incremental: a single entry point the rest of the app calls, behind which either implementation can serve, per user, switchable without a release.",
    requirements: [
      "The rest of the app depends on one interface, not on either implementation",
      "Which implementation runs is decided at runtime, not at compile time",
      "Both implementations can be exercised in the same build — including by QA on demand",
      "Rolling back means changing a flag, not reverting a merge",
      "The legacy implementation stays deletable in one commit once the flag is fully on",
    ],
    constraints: [
      "No long-lived feature branch",
      "Every intermediate state must be shippable",
      "The public surface must not leak which implementation is in use",
    ],
    starterCode: `/**
 * The app currently does this from four call sites:
 *
 *     startActivity(LegacySearchActivity.intent(context, query))
 *
 * Design the seam. Sketch the interface, the two implementations'
 * entry points, and the routing decision.
 */

interface SearchEntryPoint {
    // TODO
}
`,
    solutionCode: `/**
 * One interface, two implementations, one router. The call sites know
 * only the interface, so the migration is invisible to them from the
 * first commit to the last.
 */
interface SearchEntryPoint {
    fun open(context: Context, query: String?)
}

class LegacySearchEntryPoint @Inject constructor() : SearchEntryPoint {
    override fun open(context: Context, query: String?) {
        context.startActivity(LegacySearchActivity.intent(context, query))
    }
}

class ComposeSearchEntryPoint @Inject constructor() : SearchEntryPoint {
    override fun open(context: Context, query: String?) {
        context.startActivity(SearchActivity.intent(context, query))
    }
}

/**
 * The router is the only class that knows a migration is happening.
 * When the flag reaches 100% and stays there, deleting the legacy
 * implementation is: delete two classes, delete this router, bind the
 * Compose implementation directly. One commit, no call-site churn.
 */
class RoutingSearchEntryPoint @Inject constructor(
    private val legacy: LegacySearchEntryPoint,
    private val modern: ComposeSearchEntryPoint,
    private val flags: FeatureFlags,
    private val overrides: DebugOverrides,
) : SearchEntryPoint {

    override fun open(context: Context, query: String?) {
        val useModern = when (val forced = overrides.searchImplementation) {
            // QA and dogfooders can pin either implementation without a build.
            Override.Modern -> true
            Override.Legacy -> false
            null -> flags.isEnabled(Flag.ComposeSearch)
        }
        val target = if (useModern) modern else legacy
        target.open(context, query)
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class SearchModule {
    @Binds
    abstract fun entryPoint(impl: RoutingSearchEntryPoint): SearchEntryPoint
}`,
    tests: [
      {
        name: "flag off routes to legacy",
        call: "router.open(context, \"shoes\")  // flag disabled",
        expected: "legacy.open called once, modern never",
      },
      {
        name: "flag on routes to the new screen",
        call: "router.open(context, \"shoes\")  // flag enabled",
        expected: "modern.open called once, legacy never",
      },
      {
        name: "debug override beats the flag in both directions",
        call: "overrides.searchImplementation = Legacy; flag enabled",
        expected: "legacy.open called once",
      },
      {
        name: "callers depend only on the interface",
        call: "compile check: no call site references LegacySearchActivity",
        expected: "true",
      },
    ],
    hints: [
      "The question is not 'how do I write the new screen' — it is 'what do the four call sites depend on while both exist?'",
      "If rolling back requires reverting a merge, the seam is in the wrong place.",
      "Who needs to run the other implementation without waiting for a release?",
    ],
    solution: {
      mentalModel:
        "Incremental migration is a dependency problem before it is a UI problem. Put an interface between the callers and the implementation, make the choice a runtime value, and every intermediate commit is shippable. The new screen is then just a normal feature that happens to have a competitor.",
      whyItWorks: [
        "Call sites depend on an interface, so neither implementation's existence is visible to them.",
        "A runtime flag makes rollback a configuration change rather than a code change — minutes, not a release cycle.",
        "The debug override lets QA test both paths in one build, which is what makes 'both exist' survivable for six weeks.",
        "All the migration knowledge lives in one router class, so the cleanup is mechanical and obviously complete.",
      ],
      commonMistakes: [
        "A long-lived branch. Six weeks of divergence turns a migration into a merge, and the merge is where the regressions come from.",
        "A compile-time switch (build flavour, `if (BuildConfig.DEBUG)`), which cannot be rolled back without shipping and cannot be tested by QA on a release build.",
        "Migrating the ViewModel and the UI framework in the same step, so a failure gives you no way to tell which half broke.",
        "Leaving the flag in permanently. A flag that never reaches 100% is a second codebase you now maintain forever — put a removal date on it.",
      ],
      alternatives: [
        {
          title: "Strangler at the navigation layer",
          body: "If the app has a central navigator, the routing decision belongs there rather than in a per-feature entry point — one interception point serves every screen being migrated, at the cost of a navigator that knows about flags.",
        },
        {
          title: "Parallel run",
          body: "For pure logic rather than UI, run both implementations and compare results in production, logging divergence without showing it. Expensive, and unbeatable when correctness matters more than latency.",
        },
      ],
      complexity: {
        time: "n/a",
        space: "n/a",
        note: "The cost that matters here is organisational: how long the two implementations coexist, and how many people have to hold both in their head meanwhile.",
      },
      inProduction:
        "This is the shape of essentially every successful large migration in a shipping app — and its absence is the shape of every one that stalled at 70% and left two half-screens in the codebase for three years.",
      followUps: [
        "What is your removal criterion, stated precisely enough that someone else could decide it without you?",
        "How would you migrate the presenter's logic separately from the UI, so a rollback tells you which half was wrong?",
        "What does this seam cost you if the migration is cancelled after two weeks?",
      ],
    },
  },

  {
    id: "sr04",
    slug: "compose-inside-a-fragment-world",
    title: "Compose Inside a Fragment World",
    description:
      "The interop layer where lifecycles meet. Four lines here are load-bearing.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Android",
    topics: ["compose", "lifecycle", "architecture"],
    stage: "explain",
    concepts: ["lifecycle", "layering"],
    estimatedMinutes: 20,
    completedCount: 3300,
    introducedInWeek: 6,
    prompt:
      "Most Compose in real codebases is not in a Compose app — it is a ComposeView inside a Fragment inside an Activity written years earlier. This is where that boundary is drawn.",
    readingCode: `class OrdersFragment : Fragment() {

    private val viewModel: OrdersViewModel by viewModels()
    private var binding: FragmentOrdersBinding? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        val inflated = FragmentOrdersBinding.inflate(inflater, container, false)
        binding = inflated

        inflated.composeRoot.apply {
            setViewCompositionStrategy(
                ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
            )
            setContent {
                AppTheme {
                    val state by viewModel.state.collectAsStateWithLifecycle()
                    OrdersContent(
                        state = state,
                        onRefresh = viewModel::refresh,
                        onOrderClick = { id ->
                            findNavController().navigate(
                                OrdersFragmentDirections.toDetail(id)
                            )
                        },
                    )
                }
            }
        }

        return inflated.root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding = null
    }
}`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "What does `DisposeOnViewTreeLifecycleDestroyed` change, and what goes wrong with the default?",
        expert:
          "It ties the composition's lifetime to the Fragment's *view* lifecycle rather than to the ComposeView being detached from the window.\n\nThe default, `DisposeOnDetachedFromWindow`, is wrong in a Fragment because a Fragment's view can be detached and reattached without being destroyed — putting a Fragment on the back stack, for instance. With the default, the composition is thrown away and rebuilt on every back-stack transaction, losing all `remember` state including scroll position.\n\nThis is the single most common interop bug, and it presents as 'the list jumps to the top when you come back'.",
        keywords: ["view lifecycle", "back stack", "detached", "remember", "scroll"],
      },
      {
        id: "p2",
        question:
          "`collectAsStateWithLifecycle` is inside `setContent`. Whose lifecycle does it actually observe here, and why does that matter in a Fragment specifically?",
        expert:
          "It reads the lifecycle from the LocalLifecycleOwner composition local, which in a Fragment's ComposeView resolves to the *view* lifecycle owner — not the Fragment itself.\n\nThat is the behaviour you want: collection stops when the view is destroyed rather than when the Fragment is, so a Fragment sitting on the back stack with no view is not still processing emissions.\n\nIt matters more in Fragments than anywhere else because the Fragment and its view have genuinely different lifetimes, and a Fragment can outlive several of its own views. Collecting against the Fragment lifecycle there is a classic leak.",
        keywords: ["view lifecycle", "LocalLifecycleOwner", "back stack", "leak"],
      },
      {
        id: "p3",
        question:
          "Navigation is called inside a composable lambda. Is that safe? What is the failure mode if the user double-taps?",
        expert:
          "`findNavController()` is fine to *call* here — the lambda runs in response to a click, not during composition — but the double-tap is a real problem. Two clicks in quick succession both reach `navigate`, and the second fires against a controller whose current destination has already changed, producing either a duplicate destination on the back stack or an IllegalArgumentException that the destination is unknown to the current node.\n\nThe usual answers are a debounce on the click, checking `currentDestination?.id` before navigating, or routing navigation through the ViewModel as a one-shot event so it can be de-duplicated at the source.\n\nThe deeper point is that composables recompose freely and lambdas can be invoked more often than you expect — anything with a side effect on a shared object needs to be idempotent or guarded.",
        keywords: ["double tap", "duplicate", "IllegalArgumentException", "debounce", "idempotent"],
      },
      {
        id: "p4",
        question:
          "`binding` is nulled in onDestroyView but the ComposeView is not explicitly cleared. Is something missing?",
        expert:
          "No — and understanding why is the point. The binding is nulled because a Fragment outlives its view and holding the binding would leak the whole view hierarchy. The ComposeView needs no equivalent because the composition strategy already disposed it when the view lifecycle was destroyed, which happens before onDestroyView returns.\n\nAdding `composeRoot.disposeComposition()` here would be harmless but redundant; the strategy is the mechanism, and duplicating it by hand suggests to the next reader that the strategy is not trusted.",
        keywords: ["binding", "leak", "disposed", "redundant", "strategy"],
      },
      {
        id: "p5",
        question:
          "A teammate proposes replacing the XML layout with `ComposeView(requireContext())` returned directly from onCreateView. What do you gain and what do you lose?",
        expert:
          "You gain the removal of a layout file and its binding, and with it the whole nulling dance in onDestroyView.\n\nYou lose the ability to mix — the XML root is what lets this screen keep a legacy toolbar, a CoordinatorLayout, or an AdView alongside the Compose content during a migration. You also lose the inflater-driven configuration handling that some legacy themes depend on.\n\nFor a screen that is fully migrated, returning the ComposeView directly is cleaner and the right end state. For one mid-migration, the XML root is the seam that makes partial migration possible, and removing it forces an all-or-nothing conversion.",
        keywords: ["mixed", "toolbar", "migration", "end state", "seam"],
      },
    ],
    solution: {
      mentalModel:
        "Interop is a lifecycle question wearing a UI costume. Compose has one lifetime, the View system has another, and a Fragment has two of its own — the bugs live entirely in the mismatches, not in the rendering.",
      whyItWorks: [
        "The composition strategy binds the composition to the view lifecycle, which is the one that actually matches a Fragment's view.",
        "LocalLifecycleOwner resolves to the view lifecycle owner inside a Fragment's ComposeView, so lifecycle-aware collection lands on the right owner without being told.",
        "Keeping an XML root preserves the seam that lets legacy and Compose share a screen during migration.",
      ],
      commonMistakes: [
        "Leaving the default composition strategy and then debugging 'scroll position resets' as a LazyColumn problem.",
        "Collecting against `viewLifecycleOwner` manually outside setContent and passing the value in — it works, but it reintroduces the plumbing the composition local exists to remove.",
        "Calling navigation directly from a lambda with no guard, then treating the resulting crash report as a navigation library bug.",
      ],
      inProduction:
        "The overwhelming majority of Compose in commercial Android is hosted this way, and will be for years. The interop layer is not a transitional detail — it is where most people's Compose actually runs.",
      followUps: [
        "Which of these five points would you still make if this were an Activity rather than a Fragment?",
        "How would you make the double-tap safe in a way that works for every screen rather than this one?",
      ],
    },
  },

  /* ---------------------- Testing as judgement ---------------------- */
  {
    id: "sr05",
    slug: "what-deserves-a-test",
    title: "What Deserves a Test?",
    description:
      "Four candidates, a finite afternoon. Choose, and be able to defend the choice.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["testing", "architecture"],
    stage: "explain",
    concepts: ["test-seams"],
    estimatedMinutes: 10,
    completedCount: 5400,
    introducedInWeek: 10,
    quizStem:
      "You have one afternoon to add tests to an untested checkout feature. Which of these four earns it?",
    choices: [
      {
        id: "a",
        body: "The discount calculation: twelve branches, changed four times this quarter, and a bug here charges the wrong amount.",
        correct: true,
        rationale:
          "High branch count, high change frequency, high cost of being wrong, and it is pure logic — cheap to test and expensive to get wrong. That combination is the whole heuristic: test where mistakes are likely, consequential and easy to detect.",
      },
      {
        id: "b",
        body: "The ViewModel's getters, which return fields from state.",
        correct: false,
        rationale:
          "No branches, no history of changing, and a failure would be immediately visible in any screenshot. Tests here restate the implementation and then have to be updated every time it changes — negative value, paid twice.",
      },
      {
        id: "c",
        body: "The Retrofit interface, verified with a mock web server returning the documented payloads.",
        correct: false,
        rationale:
          "Tempting, and occasionally worth it — but you are mostly testing Retrofit and your own fixture. It catches serialisation mistakes only if your fixture matches the real server, which is exactly the assumption that breaks. A contract test against the real schema is the tool for that worry.",
      },
      {
        id: "d",
        body: "The Compose layout of the receipt screen, via screenshot tests.",
        correct: false,
        rationale:
          "Valuable eventually, and the wrong thing to spend the single afternoon on. Screenshot tests are expensive to stabilise and they fail on every intentional design change, so introducing them under time pressure buys you a maintenance burden before it buys you safety.",
      },
    ],
    solution: {
      mentalModel:
        "Test where the expected cost of a bug is highest, divided by what the test costs to write and maintain. Branches, change frequency and blast radius push the numerator up; purity and determinism push the denominator down. Pure logic that changes often and touches money is the top-left corner of that chart.",
      whyItWorks: [
        "Branch count is a decent proxy for the number of ways the code can be wrong.",
        "Change frequency predicts future regressions better than complexity does.",
        "A test's cost is not writing it — it is every time someone has to update it for a change that was not a bug.",
      ],
      commonMistakes: [
        "Testing what is easy to test rather than what is risky, which is how coverage rises while confidence does not.",
        "Writing tests that assert the implementation, so every refactor turns red and the team learns to distrust the suite.",
        "Starting with the slowest, most brittle layer because it feels the most thorough.",
      ],
      followUps: [
        "Name something in your current codebase that is well tested and did not need to be.",
        "What would change your answer if the discount logic had not been touched in three years?",
      ],
    },
  },

  {
    id: "sr06",
    slug: "fakes-over-mocks",
    title: "Fakes Over Mocks",
    description:
      "The same test written both ways. One of them fails when the code breaks.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Architecture",
    topics: ["testing", "architecture", "coroutines"],
    stage: "explain",
    ownership: "design",
    concepts: ["test-doubles"],
    estimatedMinutes: 18,
    completedCount: 3600,
    introducedInWeek: 10,
    readingCode: `/* ---------- Version A: mocked ---------- */

@Test
fun \`refresh replaces the cached orders\`() = runTest {
    val repository = mockk<OrderRepository>()
    coEvery { repository.cached() } returns listOf(order("1"))
    coEvery { repository.fetch() } returns listOf(order("2"))
    coEvery { repository.replaceCache(any()) } just Runs

    val viewModel = OrdersViewModel(repository)
    viewModel.refresh()

    coVerify { repository.replaceCache(listOf(order("2"))) }
}

/* ---------- Version B: faked ---------- */

class FakeOrderRepository(
    initial: List<Order> = emptyList(),
    private val remote: List<Order> = emptyList(),
) : OrderRepository {

    private val cache = MutableStateFlow(initial)
    var fetchCount = 0
        private set

    override fun observe(): Flow<List<Order>> = cache

    override suspend fun cached(): List<Order> = cache.value

    override suspend fun fetch(): List<Order> {
        fetchCount++
        return remote
    }

    override suspend fun replaceCache(orders: List<Order>) {
        cache.value = orders
    }
}

@Test
fun \`refresh replaces the cached orders\`() = runTest {
    val repository = FakeOrderRepository(
        initial = listOf(order("1")),
        remote = listOf(order("2")),
    )
    val viewModel = OrdersViewModel(repository)

    viewModel.refresh()

    assertEquals(listOf(order("2")), repository.cached())
}`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "Both tests pass today. Name a change to OrdersViewModel that Version B catches and Version A does not.",
        expert:
          "Calling `replaceCache` twice — say a retry that no longer guards itself. Version A's `coVerify` is satisfied by at least one matching call, so two passes silently. Version B's cache simply holds the final value, so a duplicate is invisible *unless* it wrote something different — but add `assertEquals(1, repository.fetchCache)` and the fake can answer questions the mock cannot.\n\nThe sharper example: a change that writes to the cache *before* fetching completes. Version A verifies the call happened with the right argument at some point; Version B's cache holds real state through the sequence, so an out-of-order write leaves observable evidence.",
        keywords: ["twice", "order", "state", "at least once", "evidence"],
      },
      {
        id: "p2",
        question:
          "Version A is 12 lines and Version B is 35. When is that trade a bad one?",
        expert:
          "When the fake is used once. A 25-line fake serving a single test is worse than a three-line stub.\n\nThe economics change on the second test: the mock setup is re-paid in full every time, while the fake is written once and reused across the whole suite, usually shrinking each test to three or four lines. By the fifth test the fake is far cheaper, and by then it also encodes the repository's real contract in one readable place.\n\nSo the honest answer is: write the stub first, and extract a fake at the point you find yourself re-stubbing the same three calls.",
        keywords: ["reuse", "once", "amortised", "second test", "stub"],
      },
      {
        id: "p3",
        question:
          "What does Version A's `coEvery { repository.cached() } returns listOf(order(\"1\"))` assert about the *repository's* behaviour? What if that is wrong?",
        expert:
          "Nothing — it asserts what the test author believed. If the real repository returns an empty list before the first fetch, or throws when the cache is cold, Version A still passes cheerfully, because the mock is a statement of belief rather than an observation.\n\nThat is the failure mode people mean by 'mocks test your assumptions': the test and the production code can disagree about the contract indefinitely, and nothing ever goes red. The fake at least forces the contract to be written down once, where a reviewer can see it and say 'that is not what Room does'.\n\nNeither catches a wrong belief on its own. That is what the repository's own tests, and integration tests, are for.",
        keywords: ["belief", "assumption", "contract", "disagree", "integration"],
      },
      {
        id: "p4",
        question:
          "The fake exposes `fetchCount`. Is that a state assertion or a verification in disguise — and does the distinction matter?",
        expert:
          "It is verification, honestly labelled. The distinction matters less than people claim: what makes `coVerify` fragile is not verification itself but verifying *every* interaction, which couples the test to the implementation's shape.\n\nA fake that counts one meaningful thing — network calls, because making two is a real bug — is verification scoped to something the user would notice. That is fine. A fake that recorded every method call in order would have reinvented the mock, badly.\n\nThe rule: assert outcomes by default, count interactions only where the count is itself part of the contract.",
        keywords: ["verification", "scoped", "contract", "count", "outcome"],
      },
    ],
    solution: {
      mentalModel:
        "A mock asserts that a conversation happened. A fake lets you assert what the conversation achieved. Most of the time you care about the achievement, and the times you genuinely care about the conversation — 'exactly one network call' — are specific enough to name.",
      whyItWorks: [
        "A fake holds real state, so sequences and duplicates leave evidence a call-verification cannot see.",
        "The contract is written once, in the fake, where a reviewer can check it against reality.",
        "Tests shrink as the suite grows, because setup is shared rather than repeated.",
      ],
      commonMistakes: [
        "Extracting a fake for one test. Write the stub, extract on the third repetition.",
        "Building a fake so configurable it needs its own tests — at which point it is a second implementation, not a test double.",
        "Treating `relaxed = true` as convenience. It converts every missing stub into a silent default, which is the opposite of what a test is for.",
      ],
      alternatives: [
        {
          title: "The real implementation",
          body: "For an in-memory Room database or a pure mapper, the real thing is often faster to set up than either double and tests the actual contract. Reach for a double when the dependency is slow, non-deterministic, or reaches the network.",
        },
      ],
      inProduction:
        "Suites that lean heavily on interaction verification tend to go red on every refactor, which trains the team to update tests reflexively rather than read them — and a suite nobody reads stops catching anything.",
      followUps: [
        "Write the fake for a repository in your codebase, and see how many existing tests shrink.",
        "Name a case in your codebase where verifying the call genuinely is the right assertion.",
      ],
    },
  },

  {
    id: "sr07",
    slug: "flaky-test-is-telling-you-something",
    title: "A Flaky Test Is Telling You Something",
    description:
      "It fails once in forty runs. The test is not the bug — usually.",
    difficulty: "Hard",
    format: "debugging",
    track: "Architecture",
    topics: ["testing", "coroutines", "flow"],
    stage: "predict",
    ownership: "improve",
    concepts: ["test-seams"],
    estimatedMinutes: 25,
    completedCount: 2700,
    introducedInWeek: 10,
    symptom:
      "This test passes locally every time and fails roughly once in forty CI runs, always on the final assertion, always reporting the loading state instead of the loaded one. Someone has added @Ignore twice and someone else has removed it twice.",
    brokenCode: `class SearchViewModelTest {

    @Test
    fun \`results appear after the query settles\`() = runTest {
        val repository = FakeSearchRepository(results = listOf(result("shoes")))
        val viewModel = SearchViewModel(repository)

        viewModel.onQueryChanged("shoes")
        advanceTimeBy(300)

        assertEquals(
            SearchState.Loaded(listOf(result("shoes"))),
            viewModel.state.value,
        )
    }
}

/* The code under test */

class SearchViewModel(
    private val repository: SearchRepository,
) : ViewModel() {

    private val query = MutableStateFlow("")

    val state: StateFlow<SearchState> =
        query
            .debounce(300.milliseconds)
            .filter { it.isNotBlank() }
            .mapLatest { q ->
                SearchState.Loaded(repository.search(q)) as SearchState
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = SearchState.Loading,
            )

    fun onQueryChanged(value: String) {
        query.value = value
    }
}`,
    debugHints: [
      {
        label: "Hint 1",
        body: "The test asserts on `state.value`. What does WhileSubscribed do when nothing is collecting?",
      },
      {
        label: "Hint 2",
        body: "`advanceTimeBy(300)` advances virtual time by exactly the debounce window. What does 'exactly' mean at a boundary — is the emission at 300 before or after the advance completes?",
      },
      {
        label: "Hint 3",
        body: "Two independent causes are in play here. One makes it fail always in principle and is masked by timing; the other makes it fail rarely. Find both before fixing either.",
      },
    ],
    rootCause:
      "Two faults, compounding.\n\nFirst, `SharingStarted.WhileSubscribed` means the upstream only runs while something collects. The test never collects — it reads `state.value` — so strictly speaking the pipeline should never start at all. It appears to work because `runTest` and `stateIn` happen to get the sharing coroutine scheduled in most runs, and does not when the scheduler interleaves differently. The test is depending on an accident.\n\nSecond, `advanceTimeBy(300)` advances to exactly the debounce boundary. Whether the debounced emission has been dispatched *and* the downstream `mapLatest` has completed by that instant depends on task ordering within the same virtual millisecond — which is precisely the kind of thing that varies between a warm local JVM and a loaded CI machine.\n\nThe flakiness is not noise. It is the test correctly reporting that the production pipeline only produces values when someone is listening, which is exactly the behaviour WhileSubscribed was chosen for. A test that asserts on a hot-flow value without subscribing is asserting something the production code never promised.",
    fixedCode: `@Test
fun \`results appear after the query settles\`() = runTest {
    val repository = FakeSearchRepository(results = listOf(result("shoes")))
    val viewModel = SearchViewModel(repository)

    // Collect, because that is what the production code requires in
    // order to produce anything. Turbine subscribes and then waits for
    // each emission rather than guessing when it arrived.
    viewModel.state.test {
        assertEquals(SearchState.Loading, awaitItem())

        viewModel.onQueryChanged("shoes")

        // Past the boundary, not exactly on it — the assertion is
        // "after the debounce window", and 301 says that honestly.
        advanceTimeBy(301)

        assertEquals(
            SearchState.Loaded(listOf(result("shoes"))),
            awaitItem(),
        )
        cancelAndIgnoreRemainingEvents()
    }
}`,
    productionImplications: [
      "The @Ignore war is the real cost: two people have now decided this test is worthless, and the next genuine regression it catches will be dismissed as 'that flaky one'.",
      "A flaky test that depends on task ordering in virtual time will fail more often as CI machines get busier — the failure rate is a function of your build queue, not your code.",
      "Asserting `.value` on a WhileSubscribed StateFlow is a pattern worth grepping for across the suite; wherever it appears, the same latent flake exists.",
      "Had the pipeline been genuinely broken for non-collectors, this test would have been the only warning — and it was rewritten as noise twice.",
    ],
    hints: [
      "Ask what the production code promises, then ask whether the test is holding it to that promise or a different one.",
    ],
    solution: {
      mentalModel:
        "Flakiness is a message about non-determinism that already exists in the system. The question is never 'how do I make this stop failing' — it is 'what is variable here, and did I mean it to be?' Sometimes the answer is that the test is wrong. It is never that the test is merely unlucky.",
      whyItWorks: [
        "Collecting the flow satisfies WhileSubscribed, so the pipeline runs for the reason it runs in production.",
        "awaitItem() waits for an emission instead of assuming one has arrived by a chosen instant.",
        "Advancing past the boundary rather than onto it removes the dependence on intra-millisecond task ordering.",
        "Asserting the initial Loading value documents the state machine rather than skipping past it.",
      ],
      commonMistakes: [
        "@Ignore, retry annotations, or a `Thread.sleep` — all three convert a signal into silence.",
        "Switching WhileSubscribed to Eagerly so the test passes. That changes production behaviour to suit a test, and gives up the battery saving the operator was chosen for.",
        "Fixing only the off-by-one and shipping, leaving the subscription fault to resurface under a different scheduler.",
      ],
      alternatives: [
        {
          title: "runCurrent() over advanceTimeBy()",
          body: "Where the test does not care about the delay itself, `advanceUntilIdle()` expresses 'let everything settle' without hard-coding a number that will drift when the debounce window changes.",
        },
      ],
      inProduction:
        "Quarantining flaky tests is the standard organisational response and the standard way real bugs reach production — the quarantine list becomes a place where signals go to be ignored.",
      followUps: [
        "How would you find every other test in the suite asserting on a WhileSubscribed `.value`?",
        "What would you say in the PR that removes the @Ignore, so it does not go back on next month?",
      ],
    },
  },

  {
    id: "sr08",
    slug: "testing-at-the-right-seam",
    title: "Test at the Right Seam",
    description:
      "The same behaviour can be tested at four levels. Pick the one that survives a refactor.",
    difficulty: "Medium",
    format: "coding",
    track: "Architecture",
    topics: ["testing", "architecture", "viewmodel"],
    stage: "implement",
    ownership: "implement",
    concepts: ["test-seams", "viewmodel", "feature-ownership"],
    estimatedMinutes: 25,
    completedCount: 2500,
    introducedInWeek: 10,
    prompt:
      "A requirement: when a search returns no results, the screen shows the empty state with the searched term, and an analytics event fires exactly once.\n\nThis could be tested against the private filtering function, the ViewModel, the whole screen via Compose UI test, or end to end. Write the test at the seam that gives the most confidence per unit of maintenance — and be able to say why the others are worse.",
    requirements: [
      "The test must fail if the empty state stops appearing",
      "It must fail if the analytics event fires twice, or not at all",
      "It must survive renaming private functions and restructuring internals",
      "It must run in milliseconds, without a device",
    ],
    constraints: [
      "No Robolectric",
      "Assume Turbine and a TestDispatcher rule are available",
    ],
    starterCode: `class SearchViewModelTest {

    @Test
    fun \`empty results show the empty state and report once\`() = runTest {
        // TODO: choose your seam and write the test
    }
}
`,
    solutionCode: `class SearchViewModelTest {

    /**
     * The ViewModel is the right seam here.
     *
     * It is the outermost point at which this behaviour is fully
     * decided — the state and the event are both produced here — and
     * the innermost point that does not depend on how the work is
     * split up internally. Everything below is implementation;
     * everything above adds a rendering layer that cannot make the
     * assertion any truer.
     */
    @Test
    fun \`empty results show the empty state and report once\`() = runTest {
        val analytics = RecordingAnalytics()
        val viewModel = SearchViewModel(
            repository = FakeSearchRepository(results = emptyList()),
            analytics = analytics,
        )

        viewModel.state.test {
            assertEquals(SearchState.Loading, awaitItem())

            viewModel.onQueryChanged("unobtainium")
            advanceUntilIdle()

            val state = awaitItem()
            assertEquals(SearchState.Empty(query = "unobtainium"), state)
            cancelAndIgnoreRemainingEvents()
        }

        // Exactly once — the count is part of the requirement, so it is
        // part of the assertion.
        assertEquals(
            listOf(AnalyticsEvent.SearchReturnedNothing("unobtainium")),
            analytics.recorded,
        )
    }
}

/** A recording fake, not a mock: it holds what happened and says so. */
class RecordingAnalytics : Analytics {
    private val _recorded = mutableListOf<AnalyticsEvent>()
    val recorded: List<AnalyticsEvent> get() = _recorded

    override fun track(event: AnalyticsEvent) {
        _recorded += event
    }
}`,
    tests: [
      {
        name: "empty results produce the empty state carrying the query",
        call: "onQueryChanged(\"unobtainium\") with an empty repository",
        expected: "SearchState.Empty(query = \"unobtainium\")",
      },
      {
        name: "the analytics event fires exactly once",
        call: "analytics.recorded",
        expected: "[SearchReturnedNothing(\"unobtainium\")]",
      },
      {
        name: "a duplicate emission fails the test",
        call: "ViewModel modified to track() twice",
        expected: "assertion fails — list has two entries",
      },
      {
        name: "renaming a private function does not fail the test",
        call: "rename the internal filter function",
        expected: "still passes",
      },
    ],
    hints: [
      "Ask where the behaviour is fully decided. Testing below that point tests half a decision.",
      "Ask what a refactor is allowed to change. A test that breaks on a rename is anchored too deep.",
      "'Exactly once' is a count, so something has to be counting.",
    ],
    solution: {
      mentalModel:
        "Choose the seam that is the outermost point where the behaviour is completely decided, and the innermost point that does not depend on internal structure. Above that line you pay for rendering you are not asserting; below it you test fragments of a decision.",
      whyItWorks: [
        "State and event are both produced in the ViewModel, so both halves of the requirement are observable at one seam.",
        "Nothing in the test names a private function, so internals can be restructured freely.",
        "A recording fake makes 'exactly once' an assertion about a list rather than a mock's call count.",
        "No device, no Robolectric, no view inflation — the suite stays fast enough that people run it.",
      ],
      commonMistakes: [
        "Testing the private filter function by making it internal. The test then pins the structure in place and fails on every refactor, which teaches the team that refactoring breaks tests.",
        "Reaching for a Compose UI test. It asserts the same thing far more slowly, and adds a second reason to fail — rendering — that has nothing to do with the requirement.",
        "Asserting the empty state and forgetting the event count. Half the requirement silently goes untested, and 'fires twice' is the more likely bug of the two.",
      ],
      alternatives: [
        {
          title: "A screenshot or UI test as well",
          body: "Worth having for the empty state's *appearance* — that the illustration renders and the text is not truncated. That is a different requirement from this one, and deserves its own test rather than being folded in here.",
        },
        {
          title: "End to end",
          body: "Justified for the one critical path through the app — usually checkout. Using it for every requirement produces a suite too slow to run on every commit, which is the same as not having it.",
        },
      ],
      complexity: {
        time: "milliseconds",
        space: "n/a",
        note: "Speed is a correctness property of a test suite: one nobody runs before pushing has no value, however thorough.",
      },
      inProduction:
        "Suites anchored to private functions are the main reason teams say 'we can't refactor, it'll break the tests' — which is the exact opposite of what the tests were bought for.",
      followUps: [
        "Where is the seam for a requirement that spans two ViewModels?",
        "Which tests in your codebase would fail if you renamed a private method today?",
      ],
    },
  },
];
