import type { Question } from "@/lib/types";

/* ------------------------------------------------------------------
   Six pull requests to review.

   Reviewing is the senior skill that is hardest to practise alone: you
   need someone else's code, written the way people actually write it —
   plausibly, with good intentions, passing CI. Each of these was
   written to be *approvable at a glance*. The faults are the kind that
   survive a skim and surface three weeks later in a crash report.

   The set is deliberately calibrated. Two are request-changes, two are
   comment, one is approve. A reviewer who blocks all six has learned
   the wrong lesson.
   ------------------------------------------------------------------ */

export const CODE_REVIEW_QUESTIONS: Question[] = [
  /* --------------------------------------------------------------- */
  {
    id: "cr01",
    slug: "review-export-scope",
    title: "Review: Export a Report",
    description:
      "A small feature PR that compiles, works when you test it by hand, and leaks.",
    difficulty: "Medium",
    format: "code-review",
    track: "Architecture",
    topics: ["coroutines", "viewmodel", "architecture"],
    estimatedMinutes: 20,
    completedCount: 4200,
    introducedInWeek: 3,
    review: {
      prTitle: "Add report export with share sheet",
      author: "a teammate, two years in",
      description: [
        "Adds an export button to the report screen. Tapping it writes the report to a file and hands the URI to the share sheet.",
        "Export runs on IO because writing a large PDF was janking the UI. Tested on a Pixel 6 with a 40-page report — takes about 3 seconds and the spinner behaves.",
      ],
      filesChanged: ["ui/share/ShareViewModel.kt"],
      context: [
        "The team's other ViewModels all use viewModelScope.",
        "ShareState is a sealed interface: Idle, Working, Ready, Failed.",
        "The share screen can be dismissed while the export is running.",
      ],
    },
    reviewCode: `class ShareViewModel(
    private val repository: ReportRepository,
    private val exporter: ReportExporter,
) : ViewModel() {

    private val _state = MutableStateFlow<ShareState>(ShareState.Idle)
    val state: StateFlow<ShareState> = _state

    private val exportScope = CoroutineScope(Dispatchers.IO)

    fun export(reportId: String) {
        _state.value = ShareState.Working
        exportScope.launch {
            val report = repository.report(reportId)
            val file = exporter.write(report)
            _state.value = ShareState.Ready(file)
        }
    }

    fun retry(reportId: String) {
        export(reportId)
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 6,
        severity: "praise",
        summary: "Sealed state rather than three booleans",
        detail:
          "Idle / Working / Ready / Failed cannot represent 'ready and failed at once', which is the whole reason to model it this way. Worth saying out loud so it keeps happening.",
        keywords: ["sealed", "impossible"],
      },
      {
        id: "f2",
        line: 7,
        severity: "nit",
        summary: "Expose with asStateFlow()",
        detail:
          "`_state` is handed out as a StateFlow, but the runtime object is still mutable. A caller who casts it back can write to your state from the UI layer. `.asStateFlow()` closes that off and costs nothing.",
        keywords: ["asStateFlow", "mutable"],
      },
      {
        id: "f3",
        line: 9,
        severity: "blocking",
        summary: "This scope is never cancelled",
        detail:
          "A CoroutineScope created by hand outlives the ViewModel unless someone cancels it, and nothing here does. Dismiss the screen mid-export and the write keeps running, holding the repository, the exporter and the ViewModel itself alive until it finishes.\n\nviewModelScope exists precisely for this and is cancelled in onCleared for you. If the work genuinely must outlive the screen, it belongs in WorkManager, not in a field.",
        keywords: ["cancel", "viewModelScope", "leak", "onCleared"],
      },
      {
        id: "f4",
        line: 15,
        severity: "blocking",
        summary: "No failure path — Working is terminal",
        detail:
          "`exporter.write` throws on a full disk, a revoked permission, or a malformed report. Nothing catches it, so the coroutine dies, `_state` stays on Working, and the user watches a spinner forever with no way out.\n\nShareState.Failed is declared and never reached. A state you defined but never enter is a sign the error path was never written.",
        keywords: ["catch", "throw", "Failed", "spinner"],
      },
      {
        id: "f5",
        line: 21,
        severity: "should-fix",
        summary: "Retry stacks a second export on the first",
        detail:
          "Nothing cancels the in-flight job, so two exports now race to write `_state`. The slower one wins, which means retrying can hand the user the *older* file. Keep the Job in a field and cancel it, or guard on the current state.",
        keywords: ["cancel", "race", "job", "concurrent"],
      },
    ],
    reviewVerdict: {
      decision: "request-changes",
      rationale:
        "The unmanaged scope and the missing failure path are both defects the author cannot see from the happy path they tested. Neither is hard to fix, which is exactly why they are worth blocking on — this is the cheapest moment the fix will ever be.",
    },
    solution: {
      mentalModel:
        "Review structural questions before stylistic ones: who owns this work, what cancels it, and what happens when it fails. A PR that answers those three is usually fine; one that answers none is usually broken in a way testing by hand will not reveal.",
      improved: {
        label: "What the author should land instead",
        language: "kotlin",
        code: `class ShareViewModel(
    private val repository: ReportRepository,
    private val exporter: ReportExporter,
) : ViewModel() {

    private val _state = MutableStateFlow<ShareState>(ShareState.Idle)
    val state: StateFlow<ShareState> = _state.asStateFlow()

    private var exportJob: Job? = null

    fun export(reportId: String) {
        exportJob?.cancel()
        exportJob = viewModelScope.launch {
            _state.value = ShareState.Working
            runCatching {
                withContext(Dispatchers.IO) {
                    exporter.write(repository.report(reportId))
                }
            }
                .onSuccess { _state.value = ShareState.Ready(it) }
                .onFailure {
                    if (it is CancellationException) throw it
                    _state.value = ShareState.Failed(it.toUserMessage())
                }
        }
    }
}`,
      },
      whyItWorks: [
        "viewModelScope ties the export to the screen that asked for it — dismissal cancels the write rather than leaking it.",
        "withContext moves only the blocking call off the main thread; the scope stays owned by the ViewModel.",
        "Cancelling the previous job makes retry mean retry, rather than 'start a second one and hope'.",
        "Rethrowing CancellationException keeps cancellation from being reported to the user as a failure.",
      ],
      commonMistakes: [
        "Reviewing the diff line by line without asking who cancels the work — the most expensive bug here is invisible at the statement level.",
        "Accepting 'I tested it on my device' as covering the failure path. The happy path is the one the author already checked.",
        "Marking the asStateFlow() point as blocking. It is a nit, and calling it blocking costs you the authority to block on line 9.",
      ],
      alternatives: [
        {
          title: "Let the repository own the dispatcher",
          body: "If ReportExporter is already main-safe, the withContext belongs inside it rather than at the call site, and the ViewModel simply launches. Main-safety is a property of the function, not of the caller.",
        },
        {
          title: "Genuinely long exports",
          body: "If a 40-page PDF becomes a 400-page one, this stops being ViewModel work at all — a WorkManager job survives process death and gives you a progress notification for free.",
        },
      ],
      inProduction:
        "The hand-rolled CoroutineScope in a ViewModel is one of the most common leaks in shipped Android code, precisely because it works perfectly in every manual test.",
      followUps: [
        "What would you expect to see in LeakCanary after dismissing the screen mid-export?",
        "If the export must survive the screen, where does it belong, and who tells the user it finished?",
      ],
    },
  },

  /* --------------------------------------------------------------- */
  {
    id: "cr02",
    slug: "review-tests-that-cannot-fail",
    title: "Review: Tests for the Cart",
    description:
      "Three tests, all green, all passing for reasons unrelated to the code under test.",
    difficulty: "Hard",
    format: "code-review",
    track: "Architecture",
    topics: ["testing", "viewmodel", "flow"],
    estimatedMinutes: 22,
    completedCount: 3100,
    introducedInWeek: 10,
    review: {
      prTitle: "Add unit tests for CartViewModel",
      author: "a teammate clearing a coverage gate",
      description: [
        "Adds coverage for CartViewModel ahead of the release. Coverage on the module goes from 34% to 71%.",
        "All three tests pass locally and in CI.",
      ],
      filesChanged: ["cart/CartViewModelTest.kt"],
      context: [
        "CartState is a data class exposed as a StateFlow with an initial empty value.",
        "The team has a TestDispatcher rule available but it is not used here.",
        "A previous bug shipped where remove() silently did nothing for the last item in the cart.",
      ],
    },
    reviewCode: `class CartViewModelTest {

    private val repository = mockk<CartRepository>(relaxed = true)

    @Test
    fun \`adding an item updates the total\`() = runTest {
        val viewModel = CartViewModel(repository)

        viewModel.add(Item(id = "a", priceCents = 250))

        assertTrue(viewModel.state.value.totalCents >= 0)
    }

    @Test
    fun \`removing an item emits a new state\`() = runTest {
        val viewModel = CartViewModel(repository)
        val states = mutableListOf<CartState>()

        viewModel.state.onEach { states.add(it) }.launchIn(this)
        viewModel.remove("a")

        assertTrue(states.isNotEmpty())
    }

    @Test
    fun \`checkout calls the repository\`() = runTest {
        val viewModel = CartViewModel(repository)

        viewModel.checkout()

        coVerify { repository.checkout(any()) }
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 3,
        severity: "should-fix",
        summary: "A relaxed mock turns missing stubs into silent defaults",
        detail:
          "`relaxed = true` means every un-stubbed call returns a zero value instead of failing. The test cannot tell you whether the ViewModel called the right thing, because calling the wrong thing also returns something plausible.\n\nA hand-written fake with real behaviour fails loudly when the ViewModel asks for something it has not been set up for, which is the feedback you actually want.",
        keywords: ["relaxed", "fake", "stub", "default"],
      },
      {
        id: "f2",
        line: 11,
        severity: "blocking",
        summary: "This assertion cannot fail",
        detail:
          "`totalCents >= 0` is true for an empty cart, for the correct total of 250, and for a wrong total of 9999. The test passes if `add` does nothing at all.\n\nThe name promises 'updates the total'. Assert the total: assertEquals(250, viewModel.state.value.totalCents).",
        keywords: ["assertEquals", "cannot fail", "always true", "250"],
      },
      {
        id: "f3",
        line: 22,
        severity: "blocking",
        summary: "StateFlow always replays — this is true before remove() runs",
        detail:
          "Collecting a StateFlow immediately delivers its current value, so `states` contains the initial state the moment the collector starts. `isNotEmpty()` is satisfied by that replay alone.\n\nThis is the test that was supposed to catch the bug where remove() did nothing for the last item — and it would have passed straight through it. Assert on the *contents* of the emission, and use Turbine so you are not racing a collector you started by hand.",
        keywords: ["replay", "initial", "Turbine", "isNotEmpty"],
      },
      {
        id: "f4",
        line: 19,
        severity: "should-fix",
        summary: "launchIn(this) races the assertion",
        detail:
          "The collector is launched into the test scope but nothing guarantees it has run before the assertion on line 22. With the standard test dispatcher it happens to work; change the dispatcher and this becomes flaky in CI at 2am. Turbine's `test { }` makes the ordering explicit.",
        keywords: ["flaky", "dispatcher", "Turbine", "race"],
      },
      {
        id: "f5",
        line: 31,
        severity: "should-fix",
        summary: "Verifying a call instead of an outcome",
        detail:
          "`coVerify` asserts that checkout was called, not that checkout worked. This test passes if the ViewModel charges the customer twice, or charges the wrong cart, or leaves the UI on a spinner afterwards.\n\nAssert the state the user would see. Verification is a reasonable supplement when the effect is genuinely invisible, but it is a poor primary assertion.",
        keywords: ["outcome", "state", "coVerify", "implementation"],
      },
    ],
    reviewVerdict: {
      decision: "request-changes",
      rationale:
        "Coverage went up and the ability to detect a regression did not. Two of the three assertions are true independent of the code under test, and one of them is guarding the exact bug that already shipped once. Tests that cannot fail are worse than no tests, because they are read as evidence.",
    },
    solution: {
      mentalModel:
        "The only question worth asking of a test is: what change to the production code would make this go red? If you cannot name one, the test is documentation at best and a false signal at worst.",
      improved: {
        label: "The middle test, rewritten",
        language: "kotlin",
        code: `@Test
fun \`removing the last item empties the cart\`() = runTest {
    val repository = FakeCartRepository(items = listOf(item("a")))
    val viewModel = CartViewModel(repository)

    viewModel.state.test {
        assertEquals(1, awaitItem().items.size)

        viewModel.remove("a")

        val after = awaitItem()
        assertEquals(emptyList(), after.items)
        assertEquals(0, after.totalCents)
    }
}`,
      },
      whyItWorks: [
        "It names the case that actually broke — the last item — rather than the mechanism.",
        "awaitItem() forces the emission to arrive before the assertion instead of hoping the scheduler cooperated.",
        "Asserting the contents means the test fails if remove() silently does nothing, which is the whole point.",
        "A fake with real items means the ViewModel is exercised against something that behaves, not something that returns zeroes.",
      ],
      commonMistakes: [
        "Treating a coverage number as a measure of safety. Coverage tells you a line executed, not that anyone checked the result.",
        "Asserting `isNotEmpty()`, `>= 0`, `!= null` — the family of assertions that are satisfied by almost any behaviour.",
        "Reaching for a mock when a fake would be shorter and would fail honestly.",
      ],
      alternatives: [
        {
          title: "Keep the verification, add the assertion",
          body: "coVerify is not forbidden. It earns its place for effects with no observable result — analytics, logging. The rule is that it supplements a state assertion rather than replacing one.",
        },
      ],
      inProduction:
        "Coverage gates reliably produce this exact PR. The gate measures what is easy to measure, and a test that touches every line while asserting nothing satisfies it perfectly.",
      followUps: [
        "For each of these three tests, name the production change that should turn it red.",
        "When is a mock genuinely the better tool than a fake?",
      ],
    },
  },

  /* --------------------------------------------------------------- */
  {
    id: "cr03",
    slug: "review-premature-base-viewmodel",
    title: "Review: A BaseViewModel for One Screen",
    description:
      "Nothing here is broken. The question is whether the team should live with it.",
    difficulty: "Medium",
    format: "code-review",
    track: "Architecture",
    topics: ["architecture", "viewmodel", "coroutines"],
    estimatedMinutes: 18,
    completedCount: 3800,
    introducedInWeek: 7,
    review: {
      prTitle: "Introduce BaseViewModel<S, E, A> and migrate ProfileViewModel",
      author: "a teammate who has just read an MVI article",
      description: [
        "Adds a shared MVI base class so every screen gets state, effects and a reducer for free, then migrates ProfileViewModel onto it as the first adopter.",
        "Follow-up PRs will migrate the other eleven ViewModels.",
      ],
      filesChanged: ["core/ui/BaseViewModel.kt", "profile/ProfileViewModel.kt"],
      context: [
        "The codebase has twelve ViewModels, none of which currently share a base class.",
        "Two of those twelve have no events at all — they render a static list.",
        "ProfileEffect exists but is not yet emitted anywhere.",
      ],
    },
    reviewCode: `abstract class BaseViewModel<S : Any, E : Any, A : Any>(
    initialState: S,
) : ViewModel() {

    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<S> = _state.asStateFlow()

    private val _effects = Channel<E>(Channel.BUFFERED)
    val effects: Flow<E> = _effects.receiveAsFlow()

    protected abstract fun reduce(current: S, action: A): S

    fun dispatch(action: A) {
        _state.update { reduce(it, action) }
    }

    protected fun emit(effect: E) {
        _effects.trySend(effect)
    }
}

class ProfileViewModel(
    private val repository: ProfileRepository,
) : BaseViewModel<ProfileState, ProfileEffect, ProfileAction>(ProfileState.Loading) {

    override fun reduce(current: ProfileState, action: ProfileAction): ProfileState =
        when (action) {
            is ProfileAction.Loaded -> ProfileState.Ready(action.profile)
            is ProfileAction.Failed -> ProfileState.Error(action.message)
        }

    fun load() {
        viewModelScope.launch {
            runCatching { repository.profile() }
                .onSuccess { dispatch(ProfileAction.Loaded(it)) }
                .onFailure { dispatch(ProfileAction.Failed(it.message.orEmpty())) }
        }
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 1,
        throughLine: 3,
        severity: "should-fix",
        summary: "Three type parameters, one caller",
        detail:
          "This is an abstraction with a single adopter and eleven hypothetical ones. Two of those eleven have no events, so they will be forced to declare an effect type they never emit — which is how `object Nothing : Effect` placeholders end up in a codebase.\n\nThe honest version of this PR is to write ProfileViewModel plainly, write the next two screens plainly, and extract the base class once you can see what the three of them actually share. Extracting from three real cases produces a different — and smaller — abstraction than designing for twelve imagined ones.",
        keywords: ["premature", "one caller", "extract", "duplication"],
      },
      {
        id: "f2",
        line: 13,
        severity: "nit",
        summary: "dispatch is public on the base",
        detail:
          "Anything holding the ViewModel can push an arbitrary action, including the UI reaching past `load()` to dispatch `Loaded` directly. Making it protected and exposing intent-named functions keeps the surface honest.",
        keywords: ["public", "protected", "surface"],
      },
      {
        id: "f3",
        line: 18,
        severity: "should-fix",
        summary: "trySend drops effects silently",
        detail:
          "`trySend` returns a result that is being discarded. When the buffer fills — a burst of navigation effects while the screen is backgrounded and nothing is collecting — the 65th effect vanishes with no error and no log.\n\nFor navigation and one-shot messages that is a lost user action. Either use `send` from a coroutine so it suspends, or handle the failed ChannelResult deliberately.",
        keywords: ["trySend", "dropped", "buffer", "ChannelResult"],
      },
      {
        id: "f4",
        line: 26,
        severity: "praise",
        summary: "Exhaustive when over a sealed action",
        detail:
          "Because `reduce` is an expression over a sealed type, adding a new ProfileAction breaks the build here rather than falling through silently at runtime. That is the version of this pattern worth keeping whatever happens to the base class.",
        keywords: ["exhaustive", "sealed", "compiler"],
      },
      {
        id: "f5",
        line: 34,
        severity: "should-fix",
        summary: "runCatching swallows CancellationException",
        detail:
          "`runCatching` catches Throwable, and that includes the CancellationException thrown when viewModelScope is cancelled. Navigate away mid-load and the failure branch runs on a dying ViewModel, dispatching an Error state for what was simply a user leaving.\n\nRethrow it: `.onFailure { if (it is CancellationException) throw it; ... }` — or catch the specific exceptions the repository actually raises.",
        keywords: ["CancellationException", "rethrow", "runCatching", "cancel"],
      },
      {
        id: "f6",
        line: 36,
        severity: "nit",
        summary: "A raw exception message reaches the user",
        detail:
          "`it.message.orEmpty()` puts whatever the HTTP client said into the UI — sometimes a URL, sometimes an empty string, occasionally a stack frame. Map to a typed error the UI can phrase itself.",
        keywords: ["message", "user-facing", "map"],
      },
    ],
    reviewVerdict: {
      decision: "comment",
      rationale:
        "Nothing here ships a defect, and blocking a teammate's design enthusiasm tends to cost more than the abstraction does. Say plainly that you would rather see three real cases before a base class, flag the dropped effects and the swallowed cancellation, and let the author decide. If they land it anyway, the follow-up migration PRs are the natural place to revisit it — with evidence.",
    },
    solution: {
      mentalModel:
        "Abstractions are cheap to add and expensive to remove, so the burden of proof sits with the person adding one. 'Three real cases' is not a law, but it is a better trigger than 'I can imagine twelve'.",
      whyItWorks: [
        "Duplication is visible and local; a wrong abstraction is invisible and global.",
        "Extracting later gives you the actual shared shape rather than the predicted one.",
        "A base class imposes its vocabulary on every future screen, including the ones that do not fit.",
      ],
      commonMistakes: [
        "Blocking a PR over a design preference. State the preference, give the reason, and let the author own the call — otherwise review becomes a negotiation nobody wants to enter.",
        "Missing the cancellation bug because the design argument was more interesting. The reducer debate is a matter of taste; line 34 is a defect.",
        "Assuming `trySend` is the safe version of `send`. It is the non-suspending version, which is a different thing.",
      ],
      alternatives: [
        {
          title: "A helper rather than a base class",
          body: "Most of what this provides is a state holder and an effect channel. Both can be a small class the ViewModel *has* rather than a class it *is* — composition keeps screens that need neither from paying for them.",
        },
      ],
      inProduction:
        "Every Android codebase over three years old contains a BaseViewModel that two screens fight against. They are rarely removed, because removing one touches every screen at once.",
      followUps: [
        "What would you need to see in the next two screens to change your mind and accept the base class?",
        "How would you phrase the design comment so the author does not read it as a veto?",
      ],
    },
  },

  /* --------------------------------------------------------------- */
  {
    id: "cr04",
    slug: "review-room-migration",
    title: "Review: A Room Migration",
    description:
      "A schema change on a financial app. Two lines here lose user data.",
    difficulty: "Hard",
    format: "code-review",
    track: "Architecture",
    topics: ["room", "architecture", "testing"],
    estimatedMinutes: 20,
    completedCount: 2900,
    introducedInWeek: 9,
    review: {
      prTitle: "Add transaction categories (schema v7)",
      author: "a teammate shipping a requested feature",
      description: [
        "Adds a category column to transactions so the new spending breakdown has something to group by.",
        "Also removes pending_sync, which was replaced by WorkManager in the last release and is no longer written to.",
        "Migration tested by installing the previous release, upgrading, and checking the transaction list still renders.",
      ],
      filesChanged: ["data/db/LedgerDatabase.kt"],
      context: [
        "This is a banking app. Transactions created offline are queued until the device reconnects.",
        "pending_sync is no longer *written* by the current release, but rows written by older releases are still read from it at startup.",
        "The team ships to a slow-updating user base; two-version-old installs are common.",
      ],
    },
    reviewCode: `@Database(
    entities = [AccountEntity::class, TransactionEntity::class],
    version = 7,
    exportSchema = false,
)
abstract class LedgerDatabase : RoomDatabase() {

    abstract fun accounts(): AccountDao

    companion object {

        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE transactions ADD COLUMN category TEXT NOT NULL DEFAULT ''")
                db.execSQL("DROP TABLE pending_sync")
            }
        }

        fun build(context: Context): LedgerDatabase =
            Room.databaseBuilder(context, LedgerDatabase::class.java, "ledger.db")
                .addMigrations(MIGRATION_6_7)
                .fallbackToDestructiveMigration()
                .build()
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 4,
        severity: "should-fix",
        summary: "exportSchema = false makes migrations untestable",
        detail:
          "Without the exported schema JSON checked into the repository, Room cannot run a MigrationTestHelper test, and no reviewer can diff what the schema actually became. On a database holding financial records this is the cheapest safety net available and it is switched off.",
        keywords: ["exportSchema", "MigrationTestHelper", "schema", "test"],
      },
      {
        id: "f2",
        line: 14,
        severity: "should-fix",
        summary: "NOT NULL DEFAULT '' erases a distinction",
        detail:
          "Every existing transaction now has a category of empty string, which is indistinguishable from a transaction the user deliberately left uncategorised. A nullable column keeps 'never categorised' and 'categorised as nothing' apart — and you cannot recover the difference later once it is gone.",
        keywords: ["nullable", "default", "empty string", "distinction"],
      },
      {
        id: "f3",
        line: 15,
        severity: "blocking",
        summary: "DROP TABLE destroys unsynced financial records",
        detail:
          "pending_sync holds transactions that by definition have not reached the server. Dropping it deletes the only copy. A user who created transactions offline on the old release, then updated, loses them silently — no error, no crash, just money that never existed.\n\nThe description says the table is no longer written; the context says older releases still wrote to it and it is still read at startup. Drain it into the new mechanism first, and drop the table a release later once telemetry says it is empty.",
        keywords: ["DROP TABLE", "unsynced", "data loss", "drain", "offline"],
      },
      {
        id: "f4",
        line: 22,
        severity: "blocking",
        summary: "fallbackToDestructiveMigration in a shipped build",
        detail:
          "This says: if any migration path is missing, delete the database and start empty. It turns a loud, fixable crash into silent total data loss — on a banking app, every local record the user has.\n\nIt is also what makes the two-version-old installs in the context dangerous: there is no 5→7 path here, so those users get wiped rather than an error anybody would notice. Remove it, and let a missing migration fail in QA where it belongs.",
        keywords: ["fallbackToDestructiveMigration", "wipe", "data loss", "crash"],
      },
      {
        id: "f5",
        line: 3,
        severity: "nit",
        summary: "Version bumped with no migration test alongside",
        detail:
          "Every version bump in this file should arrive with a test that opens v6, migrates, and asserts the data survived. Manual verification on one device is not the same claim.",
        keywords: ["migration test", "version"],
      },
    ],
    reviewVerdict: {
      decision: "request-changes",
      rationale:
        "Two separate paths to silent data loss on an app holding people's money. Both are one line. The author tested the upgrade on a device with no pending rows, which is exactly why neither showed up — the failure is invisible to the person best placed to find it, which is what makes review worth doing at all.",
    },
    solution: {
      mentalModel:
        "Migrations are the one part of an Android app with no undo. Everything else can be fixed in the next release; a dropped table is gone from the user's device forever. Review them as if the rollback plan is 'there isn't one', because there isn't.",
      improved: {
        label: "The migration that can be shipped",
        language: "kotlin",
        code: `private val MIGRATION_6_7 = object : Migration(6, 7) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "ALTER TABLE transactions ADD COLUMN category TEXT DEFAULT NULL"
        )
        // pending_sync is drained by SyncWorker on first launch after
        // upgrade; the table is dropped in MIGRATION_7_8, a release later,
        // once telemetry shows it empty in the field.
    }
}

fun build(context: Context): LedgerDatabase =
    Room.databaseBuilder(context, LedgerDatabase::class.java, "ledger.db")
        .addMigrations(MIGRATION_5_6, MIGRATION_6_7)
        .build()`,
      },
      whyItWorks: [
        "A nullable category preserves the difference between 'not yet categorised' and 'deliberately blank'.",
        "Draining before dropping means the rows reach the server before their only copy is deleted.",
        "Removing the destructive fallback converts silent data loss into a crash that QA will find in an afternoon.",
        "Splitting the drop into a later migration gives you a release in which to discover you were wrong.",
      ],
      commonMistakes: [
        "Reading `fallbackToDestructiveMigration` as a safety net. It is the opposite: it guarantees the worst outcome rather than the loudest one.",
        "Trusting 'the table is no longer used' without checking which releases still write to it.",
        "Testing an upgrade on a device whose database is in the happy state — empty queues hide exactly the rows that matter.",
      ],
      alternatives: [
        {
          title: "fallbackToDestructiveMigrationFrom",
          body: "If some ancient version genuinely cannot be migrated, name it explicitly. Scoping the destruction to versions you have decided to abandon is a decision; the blanket version is an accident waiting for a missing migration.",
        },
      ],
      inProduction:
        "Destructive fallback is in more shipped apps than anyone admits, usually added during development to stop the 'no migration found' crash and never removed before release.",
      followUps: [
        "What telemetry would tell you it is safe to drop pending_sync next release?",
        "How would you migrate a user who skipped two versions, and how would you know they exist?",
      ],
    },
  },

  /* --------------------------------------------------------------- */
  {
    id: "cr05",
    slug: "review-compose-recomposition",
    title: "Review: An Order Screen in Compose",
    description:
      "Correct, readable, and it will drop frames on a list of forty. Where is the line?",
    difficulty: "Medium",
    format: "code-review",
    track: "Compose",
    topics: ["compose", "performance"],
    estimatedMinutes: 18,
    completedCount: 4600,
    introducedInWeek: 6,
    review: {
      prTitle: "Order screen: itemised list with running total",
      author: "a teammate new to Compose",
      description: [
        "Renders the order with a header, the item list, and a running total that updates as items are toggled.",
        "Works correctly — toggling updates the total immediately. Happy to follow up on performance if it becomes an issue.",
      ],
      filesChanged: ["order/OrderScreen.kt"],
      context: [
        "Real orders run to about forty items; the largest seen in production is a little over three hundred.",
        "OrderFormatter is a plain class with no equals — it wraps a currency code and a NumberFormat.",
        "Toggling an item updates state.items and state.totalText together.",
      ],
    },
    reviewCode: `@Composable
fun OrderScreen(viewModel: OrderViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        OrderHeader(
            title = state.title,
            subtitle = "\${state.items.size} items",
        )

        LazyColumn {
            items(state.items) { item ->
                OrderRow(
                    item = item,
                    onToggle = { viewModel.toggle(item.id) },
                    formatter = OrderFormatter(state.currency),
                )
            }
        }

        Text(
            text = state.totalText,
            style = MaterialTheme.typography.titleLarge,
        )
    }
}

@Composable
private fun OrderRow(
    item: OrderItem,
    onToggle: () -> Unit,
    formatter: OrderFormatter,
) {
    Row {
        Checkbox(checked = item.selected, onCheckedChange = { onToggle() })
        Text(text = formatter.format(item.priceCents))
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 3,
        severity: "praise",
        summary: "collectAsStateWithLifecycle, not collectAsState",
        detail:
          "Collection stops when the screen leaves the foreground rather than continuing to process emissions behind a backgrounded app. It is the correct default and plenty of PRs get it wrong.",
        keywords: ["collectAsStateWithLifecycle", "lifecycle"],
      },
      {
        id: "f2",
        line: 8,
        severity: "should-fix",
        summary: "The header recomposes on every list change",
        detail:
          "`state.items.size` is read inside OrderScreen's scope, so any change to `items` — including a toggle that does not change the count — invalidates the header along with everything else in this Column.\n\nReading narrowly is the whole performance model in Compose: pass `itemCount: Int` and the header skips unless the number itself changed.",
        keywords: ["recompose", "scope", "read", "skip"],
      },
      {
        id: "f3",
        line: 12,
        severity: "should-fix",
        summary: "items() with no key",
        detail:
          "Without a key, LazyColumn identifies items positionally. Insert at the top and every row below shifts identity: animations run from the wrong place and any per-row remembered state follows the wrong item. `items(state.items, key = { it.id })` fixes both.",
        keywords: ["key", "identity", "position", "remember"],
      },
      {
        id: "f4",
        line: 16,
        severity: "should-fix",
        summary: "A new formatter per row, per recomposition",
        detail:
          "Two costs in one line. OrderFormatter is allocated for every row on every pass — and because it has no `equals`, Compose compares instances, finds them different, and cannot skip OrderRow even when the item is unchanged.\n\nHoist it: `val formatter = remember(state.currency) { OrderFormatter(state.currency) }`. Better still, format in the ViewModel and pass a String, which is stable by construction.",
        keywords: ["remember", "stable", "skip", "allocation", "equals"],
      },
      {
        id: "f5",
        line: 35,
        severity: "nit",
        summary: "onCheckedChange discards its argument",
        detail:
          "`{ onToggle() }` throws away the Boolean the Checkbox just computed and re-derives it in the ViewModel. Harmless here, but passing the value through is clearer about who owns the decision.",
        keywords: ["boolean", "argument"],
      },
    ],
    reviewVerdict: {
      decision: "comment",
      rationale:
        "The screen is correct and will look fine on the author's test order. None of this is a defect, and 'happy to follow up on performance' is a reasonable position for a feature PR — but the missing key is a correctness-adjacent bug the moment anything animates, and the formatter is a two-line fix. Say all four, mark none blocking, and let them land it.",
    },
    solution: {
      mentalModel:
        "Compose performance is not a tuning exercise; it is a consequence of two things — how narrowly you read state, and whether your parameters are stable enough to let the runtime skip. Review for those two and most of the tuning never becomes necessary.",
      whyItWorks: [
        "Reading a value inside a smaller composable confines the invalidation to that composable.",
        "A stable key gives the runtime item identity, so a reorder moves rows instead of rebuilding them.",
        "Stable parameters let the compiler generate a skip check; one unstable parameter disables it for the whole function.",
      ],
      commonMistakes: [
        "Blocking a feature PR over recomposition counts nobody has measured. Layout Inspector's recomposition counts turn this from an argument into a number.",
        "Adding `@Stable` to silence the compiler rather than fixing the equality it was complaining about.",
        "Assuming a lambda capture is the expensive part. The unstable formatter on the line above costs far more.",
      ],
      alternatives: [
        {
          title: "Format in the ViewModel",
          body: "If the row only ever renders a formatted string, the formatter does not belong in the composition at all. A pre-formatted String in the UI model is stable, testable, and removes the question entirely.",
        },
      ],
      inProduction:
        "Three hundred items is where this stops being theoretical. At forty the author is right that it looks fine, which is why 'it works on my order' and 'it works' diverge here.",
      followUps: [
        "Which of these four would you still raise if the list were capped at five items?",
        "How would you demonstrate the cost to the author rather than asserting it?",
      ],
    },
  },

  /* --------------------------------------------------------------- */
  {
    id: "cr06",
    slug: "review-token-refresh-approve",
    title: "Review: Single-Flight Token Refresh",
    description:
      "A fix for a real bug, written carefully. Practise approving something.",
    difficulty: "Medium",
    format: "code-review",
    track: "Architecture",
    topics: ["coroutines", "networking", "architecture", "testing"],
    estimatedMinutes: 15,
    completedCount: 5100,
    introducedInWeek: 8,
    review: {
      prTitle: "Fix: three parallel requests triggering three token refreshes",
      author: "a teammate fixing a reported bug",
      description: [
        "On cold start we fire three requests at once. All three see an expired token, all three refresh, and the last two get 401s because the first refresh rotated the token out from under them.",
        "This serialises refresh behind a mutex and re-checks inside the lock, so concurrent callers wait for the first refresh and then reuse its result.",
        "Added tests for the concurrent case and for the leeway boundary.",
      ],
      filesChanged: ["data/auth/SessionRepository.kt", "data/auth/SessionRepositoryTest.kt"],
      context: [
        "The bug it fixes is a real, reported crash loop affecting cold starts on slow connections.",
        "Clock is the team's existing injectable clock abstraction.",
        "The team has no convention yet for what happens when a refresh token itself is rejected.",
      ],
    },
    reviewCode: `class SessionRepository(
    private val api: AuthApi,
    private val store: TokenStore,
    private val clock: Clock,
) {

    private val refreshMutex = Mutex()

    suspend fun accessToken(): String {
        val current = store.read()
        if (current != null && current.expiresAt > clock.now() + LEEWAY) {
            return current.value
        }
        return refreshMutex.withLock {
            val latest = store.read()
            if (latest != null && latest.expiresAt > clock.now() + LEEWAY) {
                return@withLock latest.value
            }
            val refreshed = api.refresh(store.refreshToken())
            store.write(refreshed)
            refreshed.value
        }
    }

    private companion object {
        val LEEWAY = 30.seconds
    }
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 4,
        severity: "praise",
        summary: "Clock injected rather than read from the system",
        detail:
          "Expiry logic is the classic thing that ends up tested with Thread.sleep. An injected Clock makes the leeway boundary a unit test that runs in a millisecond, which is why the tests in this PR could exist at all.",
        keywords: ["clock", "inject", "testable"],
      },
      {
        id: "f2",
        line: 7,
        severity: "praise",
        summary: "Mutex, not synchronized",
        detail:
          "A Mutex suspends the waiting coroutines; `synchronized` would block the underlying threads, and on Dispatchers.IO that is three threads parked waiting for a network call. The right primitive, chosen deliberately.",
        keywords: ["Mutex", "suspend", "block", "thread"],
      },
      {
        id: "f3",
        line: 15,
        throughLine: 18,
        severity: "praise",
        summary: "The double-check inside the lock is the actual fix",
        detail:
          "Without the re-read, all three callers would still refresh — they would simply do it one at a time. Re-reading inside the lock is what turns serialisation into single-flight, and it is the part most implementations of this get wrong.",
        keywords: ["double-check", "single-flight", "re-read", "inside the lock"],
      },
      {
        id: "f4",
        line: 11,
        severity: "nit",
        summary: "The validity condition appears twice",
        detail:
          "Lines 11 and 16 are the same expression. A private `fun Token?.isFresh(now: Instant)` would name the concept and remove the chance of the two drifting apart later. Genuinely a preference — say it once and move on.",
        keywords: ["duplicate", "extract", "helper"],
      },
      {
        id: "f5",
        line: 19,
        severity: "should-fix",
        summary: "What happens when the refresh token itself is rejected?",
        detail:
          "If `api.refresh` returns 401 the exception propagates to all waiting callers, which is correct — but the dead refresh token stays in the store, so the next cold start repeats the whole dance and fails the same way.\n\nThe context says the team has no convention here yet, which makes this a conversation rather than a defect in this PR. Worth an issue: on a rejected refresh token, clear the store so the app routes to login.",
        keywords: ["401", "clear", "login", "follow-up"],
      },
    ],
    reviewVerdict: {
      decision: "approve",
      rationale:
        "It fixes a reported crash loop, the mechanism is right, the tests cover the case that broke, and the one open question is a team decision nobody has made yet. Approving with comments is the correct outcome.\n\nThe reviewer's failure mode here is manufacturing an objection because approving feels like not doing the job. A review that says 'this is right, and here is why, and here is the one thing to open an issue for' is a full review. Holding a correct fix for a design conversation the team has not had yet costs a release and teaches people to route around you.",
    },
    solution: {
      mentalModel:
        "Approval is a reviewing skill, not the absence of one. The question is never 'can I find something?' — you always can. It is 'is main better with this than without it, and is anything here worse than what it replaces?'",
      whyItWorks: [
        "The fast path takes no lock at all: a valid token returns without contention.",
        "The mutex bounds concurrency to one refresh; the re-check makes the other callers reuse it rather than repeat it.",
        "Leeway avoids the race where a token is valid when checked and expired when the request lands.",
        "Cancellation still works — a caller cancelled while waiting on the mutex simply stops waiting.",
      ],
      commonMistakes: [
        "Serialising without the double-check. Three refreshes in a queue is still three refreshes.",
        "Reaching for `synchronized` and blocking IO threads on a network call.",
        "Converting every open question into a blocking comment. Severity is information; spending it on everything leaves you unable to signal the thing that actually matters.",
      ],
      alternatives: [
        {
          title: "A shared Deferred",
          body: "Storing an in-flight `Deferred<Token>` and having later callers await the same one achieves single-flight without a mutex. Equivalent in effect; slightly harder to reason about cancellation, since cancelling the first caller must not cancel the refresh for everyone else.",
        },
        {
          title: "An OkHttp Authenticator",
          body: "Moving refresh into an Authenticator handles the 401 retry at the transport layer for every call site at once, rather than requiring each to ask for a token first.",
        },
      ],
      inProduction:
        "The thundering-herd refresh is one of the most common bugs in mobile auth, and it only appears under concurrency on a slow connection — which is why it reaches production and not QA.",
      followUps: [
        "Write the follow-up issue for the rejected-refresh-token case in two sentences.",
        "How would you test that three concurrent callers produce exactly one call to api.refresh?",
      ],
    },
  },
];
