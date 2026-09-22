import type { GlossaryEntry } from "@/lib/types";

/* ------------------------------------------------------------------
   The glossary.

   Written for an engineer who ships features in an existing codebase and
   was never told why the layers are there — because in a real codebase
   they are simply already present, and nobody explains a decision that
   was made before you arrived.

   So every entry answers three questions in order, and the order matters:

     what    — in plain words, no other jargon
     why     — the problem that forces it to exist
     breaks  — what concretely goes wrong if you delete it

   A definition that stops at `what` is the reason "mirrors the server's
   schema exactly" teaches nobody anything. The `breaks` field is the test:
   if nothing breaks when you remove a layer, that layer is ceremony, which
   is what `overkillWhen` is for.

   Examples are deliberately from a different domain per entry. The idea is
   supposed to travel — if every example is the same app, you learn that
   app rather than the concept.
   ------------------------------------------------------------------ */

export const GLOSSARY: GlossaryEntry[] = [
  /* ---------------------------------------------------------------- */
  {
    id: "api",
    term: "API",
    expansion: "Application Programming Interface — here, a web endpoint",
    what: [
      "A URL you can send a request to, which sends data back — almost always JSON text over HTTP.",
      "It is someone else's program, running on someone else's machine, that has agreed to answer certain questions. `GET /v1/episodes?show=42` is a question. The JSON that comes back is the answer.",
    ],
    why: [
      "Your app cannot hold everyone's data. A podcast app cannot ship every episode of every show inside the APK — the data lives on a server and the app asks for the slice it needs.",
      "The server is also the only place a fact can be authoritative. Two phones and a web client all asking the same endpoint get the same answer; a copy baked into the app goes stale the moment anything changes.",
    ],
    breaks:
      "Nothing breaks — this one is not a layer you can remove, it is the boundary itself. It is in the list because everything downstream exists to cope with the fact that you do not control what comes out of it.",
    example: {
      label: "What comes back is text, not objects",
      language: "text",
      code: `GET https://api.podcasts.example/v1/episodes?show=42

200 OK
[
  { "ep_id": "e_881", "ttl": "Why bridges fall down",
    "dur_s": 3180, "pub_at": 1710000000, "listened": null }
]`,
    },
    related: ["dto"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "dto",
    term: "DTO",
    expansion: "Data Transfer Object",
    what: [
      "A Kotlin class shaped *exactly* like the JSON the server sends — awkward field names, nullable everything, timestamps as numbers. All of it.",
      "Its only job is to catch what comes off the wire. It is not meant to be pleasant to use, and it should not travel deeper into your app than the layer that maps it.",
    ],
    why: [
      "The server's JSON and your app's idea of the thing are two different things, and — this is the part that matters — they change for different reasons. The server changes when the backend team ships. Your model changes when your feature changes.",
      "A DTO is the seam between those two rates of change. It absorbs the server's decisions so they do not leak into the rest of your app.",
    ],
    breaks:
      "The backend renames `usr_nm` to `user_name`. Without a DTO, the class that caught that field is the same class your whole app uses — so the rename touches forty files across every screen. With a DTO, it touches two: the DTO field, and the one function that maps DTO to your model.",
    example: {
      label: "The wire shape, and the shape you actually want",
      language: "kotlin",
      code: `// What the server sends. Ugly on purpose — this is not yours to design.
@Serializable
data class UserDto(
    @SerialName("usr_nm") val userName: String?,   // nullable: might be absent
    @SerialName("created_ts") val createdTs: Long?, // epoch seconds
    @SerialName("is_prem") val isPrem: Int?,        // 1 or 0, not a Boolean
)

// What your app wants to think in. Non-null, real types, your names.
data class User(
    val name: String,
    val joined: LocalDate,
    val isPremium: Boolean,
)

// The one place the two meet. When the server changes, you change this.
fun UserDto.toUser() = User(
    name = userName ?: "Unknown",
    joined = createdTs?.let { LocalDate.ofEpochDay(it / 86_400) } ?: LocalDate.now(),
    isPremium = isPrem == 1,
)`,
    },
    overkillWhen:
      "You own both ends and the payload is two stable fields. A DTO that is field-for-field identical to your model, forever, is a file you maintain for nothing.",
    related: ["api", "domain-model", "mapper"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "mapper",
    term: "Mapper",
    what: [
      "A plain function that turns one shape into another — `DtoType.toDomain()`, `Domain.toUiModel()`. Usually an extension function, usually a handful of lines, no class required.",
      "It is where all the small decisions live: what a missing name falls back to, how a timestamp becomes a date, which of the server's fields you simply ignore.",
    ],
    why: [
      "Those decisions have to happen somewhere. If there is no mapper, they end up scattered — a null check in one composable, a different fallback in another, a date format in a third.",
      "Collected into one function, they become reviewable and testable. A mapper is the easiest thing in an Android codebase to unit test: data in, data out, no Android framework, no coroutines, no mocks.",
    ],
    breaks:
      "Two screens show the same user with different fallbacks — one says 'Unknown merchant', the other shows an empty string — because each composable made up its own answer to the same missing field.",
    example: {
      label: "Fitness app: one place decides what a missing value means",
      language: "kotlin",
      code: `fun WorkoutDto.toWorkout() = Workout(
    // The watch omits heart rate when the strap is loose. That is not an
    // error, and it is not zero — it is genuinely unknown, so the type says so.
    averageHeartRate = avgHr?.takeIf { it > 0 },
    // The server sends metres; this app is a running app and thinks in km.
    distanceKm = distanceM / 1000.0,
    // An unrecognised activity type from a newer app version must not crash
    // an older client, so the unknown case is modelled rather than thrown.
    activity = Activity.from(activityCode) ?: Activity.Other,
)`,
    },
    related: ["dto", "domain-model"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "repository",
    term: "Repository",
    what: [
      "The one class that answers 'where does this data come from?' — network, local database, memory cache, or some combination — so that nobody else has to ask.",
      "From the outside it offers questions, not mechanics: `observeCart()`, `refresh()`. The caller does not learn whether an answer came from the network or from disk, because that is exactly the detail it should not depend on.",
    ],
    why: [
      "'Where does this come from' is a question whose answer changes constantly — you add offline support, you add a cache, you switch from polling to sockets. If that answer is written into your ViewModels, every one of those changes is a change to every screen.",
      "It is also the only honest place to decide precedence when two sources disagree, which on a real app they will: the phone has been offline for an hour and the server has newer prices.",
    ],
    breaks:
      "You add offline support. Without a repository, every ViewModel that loaded anything now needs to know about the database, the network, which to try first, and what to do when the cached copy is stale. That logic gets copy-pasted per screen and drifts, and the app starts showing different staleness rules on different tabs.",
    example: {
      label: "E-commerce: the database is the source of truth, the network refreshes it",
      language: "kotlin",
      code: `class CartRepository(
    private val api: CartApi,
    private val dao: CartDao,
) {
    // Callers observe the database, never the network. So a failed refresh
    // shows the last known cart instead of an empty screen, and a successful
    // one updates every observer without anybody subscribing to the request.
    fun observeCart(): Flow<Cart> =
        dao.observeCart().map { it.toCart() }

    suspend fun refresh(): Result<Unit> = runCatching {
        dao.replaceAll(api.fetchCart().items.map { it.toEntity() })
    }
}`,
    },
    overkillWhen:
      "One screen, one endpoint, no cache, no offline story. A repository that only forwards a single call to Retrofit is a file that adds a hop and explains nothing.",
    related: ["dto", "domain-model", "single-source-of-truth"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "domain-model",
    term: "Domain model",
    what: [
      "A class that describes what the thing *means* in your product, in the language your team actually uses when talking about the feature — not the language the server happens to use.",
      "It is where rules live that are true regardless of what any screen is showing: a subscription is active if today falls before its end date; a message is unread if it has no read timestamp.",
    ],
    why: [
      "The server sends facts. Your product has meaning. `end_date: 1710000000` is a fact; 'this subscription has lapsed' is the meaning, and the whole app needs the same answer to it.",
      "If that rule is not written down in one place, it gets re-derived — slightly differently — everywhere it is needed, which is how a billing screen and a settings screen end up disagreeing about whether someone is a subscriber.",
    ],
    breaks:
      "The rule for 'is this subscription active' gets rewritten in three screens. Someone adds a grace period in two of them. Now the paywall and the settings badge disagree, and the bug report says 'it says I'm subscribed but it won't let me watch'.",
    example: {
      label: "Streaming service: the meaning lives with the data",
      language: "kotlin",
      code: `data class Subscription(
    val plan: Plan,
    val endsAt: Instant,
    val cancelledAt: Instant?,
) {
    // One definition of "active", used by the paywall, the settings badge
    // and the download button alike. Change the grace period here and every
    // screen changes with it.
    fun isActive(now: Instant = Instant.now()): Boolean =
        now.isBefore(endsAt.plus(GRACE))

    val willRenew: Boolean get() = cancelledAt == null

    companion object { private val GRACE: Duration = Duration.ofDays(3) }
}`,
    },
    overkillWhen:
      "The data has no rules attached — a list of country names for a picker means nothing beyond what it already says. A domain model identical to the DTO minus the annotations is just a second DTO.",
    related: ["dto", "ui-state"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "viewmodel",
    term: "ViewModel",
    what: [
      "An object that holds a screen's state and outlives the screen itself. Android destroys and recreates your Activity or Fragment on a rotation, a theme change, a language change — the ViewModel survives all of them.",
      "It also gives you `viewModelScope`: a coroutine scope that is cancelled automatically when the screen goes away for good, so work does not keep running for a screen nobody is looking at.",
    ],
    why: [
      "Android will recreate your UI out from under you, at moments you do not choose, for reasons that have nothing to do with your feature. Anything held by the UI object dies with it.",
      "Before ViewModels, surviving that meant `onSaveInstanceState` and a Bundle — which only holds small, parcelable things, and turns 'keep this list on screen' into a serialisation problem.",
    ],
    breaks:
      "Rotate the phone and the screen refetches. The user watches a spinner again, you spend another network call, and anything they had typed or scrolled to is gone. Do it during a checkout and you can charge someone twice.",
    example: {
      label: "Chat app: state outlives the screen, work is scoped to it",
      language: "kotlin",
      code: `class ChatViewModel(
    private val repo: MessageRepository,
) : ViewModel() {

    // Survives rotation: the list is not refetched, the draft is not lost.
    val messages: StateFlow<List<Message>> =
        repo.observeThread(threadId)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun send(text: String) {
        // viewModelScope, not GlobalScope: if the user leaves the chat for
        // good this is cancelled, rather than outliving the screen forever.
        viewModelScope.launch { repo.send(threadId, text) }
    }
}`,
    },
    related: ["ui-state", "repository"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "ui-state",
    term: "UiState",
    what: [
      "A single value that describes everything on the screen right now — usually a data class, often a sealed hierarchy — with the work already done.",
      "Already done is the important half: text pre-formatted, dates already strings, decisions already made. The composable reads values; it does not compute them.",
    ],
    why: [
      "A screen described by several loose fields can express combinations that make no sense. `isLoading` plus a nullable `user` plus a nullable `error` is eight combinations, of which three are meaningful and five are bugs waiting to happen.",
      "The second reason is performance. Anything you compute inside a composable is recomputed on every recomposition, and recomposition happens far more often than people expect.",
    ],
    breaks:
      "A spinner draws on top of loaded content because two flags were both true, and nobody could say which should win — since nothing in the type system ever forced anyone to decide.",
    example: {
      label: "Weather app: formatting happens once, not per recomposition",
      language: "kotlin",
      code: `// Every value is ready to draw. No formatters, no null checks, no
// arithmetic left for the composable to redo on every frame.
sealed interface ForecastUiState {
    data object Loading : ForecastUiState
    data class Ready(
        val temperature: String,      // "18°" — not 18.34, not a Float
        val summary: String,          // already localised
        val updatedLabel: String,     // "updated 3 min ago"
        val canRefresh: Boolean,      // the decision, not the inputs
    ) : ForecastUiState
    data class Failed(val message: String, val canRetry: Boolean) : ForecastUiState
}`,
    },
    related: ["viewmodel", "compose", "domain-model"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "compose",
    term: "Compose",
    expansion: "Jetpack Compose — the declarative UI toolkit",
    what: [
      "You write functions that describe what the screen should look like for a given state. You do not hold on to views and mutate them; when the state changes, Compose calls your function again and works out what actually changed on screen.",
      "Calling your function again is called *recomposition*, and it happens often — far more often than 'when the data loads'.",
    ],
    why: [
      "The older approach meant keeping UI objects around and updating them by hand, which means every piece of state exists twice: once in your data, once in the widget. Those two copies drift, and the drift is the bug.",
      "Describing the screen as a function of state means there is only one copy. The screen cannot disagree with the data, because the screen is derived from it.",
    ],
    breaks:
      "Nothing — it is the destination, not a layer you can skip. It earns its place in the list because everything upstream exists to hand it one ready-to-draw value, and because recomposition is what makes that 'ready' matter.",
    example: {
      label: "Podcast player: draw the state, decide nothing",
      language: "kotlin",
      code: `@Composable
fun PlayerBar(state: PlayerUiState, onPlayPause: () -> Unit) {
    when (state) {
        // No else branch, deliberately: adding a state should break the
        // build here, because this is a place that must decide what to draw.
        PlayerUiState.Idle -> Spacer(Modifier.height(0.dp))
        is PlayerUiState.Playing -> Row {
            Text(state.episodeTitle)       // already truncated upstream
            Text(state.remainingLabel)     // already "12 min left"
            IconButton(onClick = onPlayPause) { Icon(state.icon, null) }
        }
    }
}`,
    },
    related: ["ui-state"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "single-source-of-truth",
    term: "Single source of truth",
    what: [
      "A rule, not a class: for any given fact, exactly one place owns the current answer, and everything else reads from it rather than keeping a copy.",
      "In practice it usually means the database owns the data and the network updates the database, rather than the network answering screens directly.",
    ],
    why: [
      "Two copies of the same fact will disagree eventually. Not might — will, the first time one updates and the other does not.",
      "It also removes a whole category of question from your code. 'Is this list stale?' has no answer when three components each hold their own list, and an obvious one when there is only ever a single list.",
    ],
    breaks:
      "The user favourites an album on the detail screen, goes back, and the list still shows it unfavourited — because the list is holding its own copy from the last time it loaded, and nothing told it anything changed.",
    example: {
      label: "Music app: write through the owner, never around it",
      language: "kotlin",
      code: `// Wrong: the network answer goes straight to the caller, so the copy on
// disk and the copy on screen immediately disagree.
suspend fun favourite(id: String): Album = api.favourite(id)

// Right: the database is the owner. Everyone observing it — the list, the
// detail screen, the widget — updates from one write, together.
suspend fun favourite(id: String) {
    val updated = api.favourite(id)
    dao.upsert(updated.toEntity())
}`,
    },
    related: ["repository"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "read-only-vs-immutable",
    term: "Read-only vs immutable",
    what: [
      "`List` is a read-only *interface*, not an immutable collection. It means 'through this reference, you cannot add or remove' — it does not mean 'nobody can change this'.",
      "`val` is the same distinction one level up: it fixes the reference, not the object the reference points at.",
    ],
    why: [
      "Kotlin gives you a way to say 'this code will not modify the collection' without paying to copy it. That is a useful promise, and it is a promise about *this reference*, not about the data.",
      "The confusion is not a beginner mistake — it is a genuine language design point, and reading the types as guarantees they do not make is how people ship bugs while believing the compiler had their back.",
    ],
    breaks:
      "You hand a `List<Item>` to another component believing it is frozen. The `MutableList` you cast it from is still held elsewhere, gets an item added, and your component's copy changes underneath it — no compile error, no exception, just a view that silently disagrees with itself.",
    example: {
      label: "Settings: the same object behind two references",
      language: "kotlin",
      code: `val mutable = mutableListOf("wifi", "bluetooth")
val readOnly: List<String> = mutable   // NOT a copy — the same object

mutable.add("nfc")
println(readOnly)        // [wifi, bluetooth, nfc] — it changed

// The val did not help: it fixes which object we point at, nothing more.
// A real guarantee costs a copy:
val frozen = mutable.toList()
mutable.add("gps")
println(frozen)          // [wifi, bluetooth, nfc] — genuinely unaffected`,
    },
    related: ["ui-state"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "lazy-evaluation",
    term: "Lazy evaluation",
    expansion: "Sequence, and why the chain order matters",
    what: [
      "A `List` chain does every step for the whole collection before starting the next one — `map` builds a full list, then `filter` walks that list and builds another.",
      "A `Sequence` pulls one element all the way through the chain before touching the next, and builds nothing in between. Nothing happens at all until something asks for a result.",
    ],
    why: [
      "On a thousand items with four operators, the eager version allocates four throwaway lists of a thousand. The lazy one allocates the result and nothing else.",
      "It also lets a chain stop early. `first { }` on a sequence stops at the first match; on a list it has already computed every element before looking at any of them.",
    ],
    breaks:
      "Nothing breaks correctness — both produce the same answer. What you lose is the ability to work on something large without the intermediate copies, and the ability to stop early. On a short list, `Sequence` is the slower choice, because setting it up costs more than the copies it saves.",
    example: {
      label: "Log search: stop at the first match instead of transforming everything",
      language: "kotlin",
      code: `// Eager: parses all 50,000 lines, then searches the parsed list.
val firstError = lines
    .map { parse(it) }          // 50,000 parses, one new list
    .first { it.isError }       // stops here, but the work is already done

// Lazy: parses until it finds one, then stops. Often a handful of parses.
val firstErrorLazily = lines
    .asSequence()
    .map { parse(it) }
    .first { it.isError }

// The ordering rule falls out of this: filter before you map, so the
// expensive step runs on fewer elements.`,
    },
    overkillWhen:
      "Short collections, or a single operator. `asSequence()` on a ten-item list with one `map` is slower than the list version and harder to read.",
  },

  /* ---------------------------------------------------------------- */
  {
    id: "sealed-types",
    term: "Sealed types",
    expansion: "sealed interface / sealed class",
    what: [
      "A type where the complete set of subtypes is fixed at compile time and the compiler knows all of them.",
      "That knowledge is the feature: a `when` over a sealed type needs no `else`, and adding a new subtype turns every `when` that does not handle it into a compile error.",
    ],
    why: [
      "Most 'impossible' states are only impossible by convention. Three independent fields — a loading flag, a nullable result, a nullable error — is eight combinations, of which three make sense and five are bugs nobody can construct a compiler error for.",
      "A sealed type makes the five unrepresentable. Not discouraged, not caught in review — unrepresentable, so no future edit can produce them.",
    ],
    breaks:
      "Someone adds a fourth case — an offline state, a partial result — and every screen that switches on the old shape silently falls into its `else` branch and draws the wrong thing. With a sealed type that edit does not compile until each site has decided what to do.",
    example: {
      label: "Payments: the failure modes are part of the type",
      language: "kotlin",
      code: `sealed interface PaymentResult {
    data class Approved(val receiptId: String) : PaymentResult
    data class Declined(val reason: DeclineReason) : PaymentResult
    // Genuinely different from Declined: the money may yet move, so the
    // UI must not say "failed" and must not let them pay twice.
    data class Pending(val checkAfter: Instant) : PaymentResult
    data object NetworkLost : PaymentResult
}

// No else. Add a fifth case and every caller stops compiling — which is
// exactly what you want on the screen that takes someone's money.
when (result) {
    is PaymentResult.Approved -> showReceipt(result.receiptId)
    is PaymentResult.Declined -> showDecline(result.reason)
    is PaymentResult.Pending -> showPendingNotice(result.checkAfter)
    PaymentResult.NetworkLost -> showRetry()
}`,
    },
    overkillWhen:
      "Once a screen needs content *and* a refresh flag *and* a banner, pure sealed states start multiplying — `SuccessRefreshing`, `SuccessWithBanner`. That is the signal to go hybrid: a data class holding a sealed content field plus the orthogonal flags.",
    related: ["ui-state"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "recomposition",
    term: "Recomposition",
    what: [
      "Compose calling your composable function again because something it read has changed, then working out what actually needs to be redrawn.",
      "It happens far more often than 'when the data loads' — on animation frames, on scroll, on a parent recomposing. Assume it can happen on any frame.",
    ],
    why: [
      "It is how a declarative UI stays honest. You never update a widget by hand, so the screen cannot drift out of sync with the data; it is re-derived from it instead.",
      "The cost is that your function body is not run-once setup code. Anything you do in it, you do repeatedly.",
    ],
    breaks:
      "Work placed directly in a composable body runs on every recomposition. A date formatter constructed inline, a list sorted inline, a `Random` call — these silently run dozens of times a second, and the `Random` one also changes what is on screen every frame.",
    example: {
      label: "Social feed: the same work, run once vs run per frame",
      language: "kotlin",
      code: `@Composable
fun PostRow(post: Post) {
    // Wrong: a new formatter every recomposition, and a re-parse with it.
    val formatter = DateTimeFormatter.ofPattern("d MMM")
    Text(formatter.format(post.createdAt))

    // Better: tie the work to the input it depends on.
    val label = remember(post.createdAt) { formatter.format(post.createdAt) }
    Text(label)

    // Best for this app: it was already a string before it got here, so
    // the screen does no formatting at all.
    Text(post.createdLabel)
}`,
    },
    related: ["compose", "compose-stability", "ui-state"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "compose-stability",
    term: "Stability",
    expansion: "which comparison Compose uses to decide whether to skip",
    what: [
      "A type is *stable* when Compose can trust two things: that it will be told when the value changes, and that `equals` is a reliable way to ask whether it did.",
      "Since Kotlin 2.0.20, strong skipping is on by default, and it changed what stability decides. Every restartable composable is now skippable, whether or not its parameters are stable. What stability now decides is *how a parameter is compared*: stable ones by `equals`, unstable ones by instance identity (`===`).",
    ],
    why: [
      "Skipping is the performance story of Compose: a screen that cannot skip redraws subtrees that did not change, and that is where dropped frames come from.",
      "Because an unstable parameter is compared by identity, a value that is *equal but newly allocated* does not skip. That makes the real question where a value comes from, not only what type it is — a list rebuilt in the caller on every recomposition is a new instance every time.",
    ],
    breaks:
      "A row composable takes a `List`, and the caller passes `items.filter { it.visible }`. That allocates a new list on every recomposition, so the identity check fails every time and the row recomposes on every scroll frame — even though the contents are identical and the composable is perfectly skippable. It reads as 'Compose is slow' rather than as an allocation in the wrong place.",
    example: {
      label: "Shopping list: the type is not the problem, the allocation is",
      language: "kotlin",
      code: `// Skippable under strong skipping — but items is compared by identity,
// because List is unstable.
@Composable
fun Items(items: List<Item>) { /* ... */ }

// The caller decides whether it actually skips.
@Composable
fun Screen(all: List<Item>) {
    // Wrong: a new list every recomposition, so identity never matches.
    Items(all.filter { it.visible })

    // Right: the same instance while the input is unchanged.
    val visible = remember(all) { all.filter { it.visible } }
    Items(visible)
}

// Marking a type stable restores equals-comparison, so an equal-but-new
// instance still skips. Useful when you cannot control the allocation.
@Immutable
data class CartSummary(val lineCount: Int, val totalLabel: String)`,
    },
    overkillWhen:
      "A screen with a handful of composables and no list. Stability work is for things that recompose often — feeds, animations, anything inside a scroll — not for a settings page that changes twice a minute.",
    related: ["recomposition", "ui-state", "read-only-vs-immutable"],
  },

  /* ---------------------------------------------------------------- */
  {
    id: "flow",
    term: "Flow",
    expansion: "and the cold / hot distinction",
    what: [
      "A stream of values over time that you can suspend on — conceptually a sequence whose next element may not have arrived yet.",
      "*Cold* means the work starts when someone collects, and starts again for each collector. *Hot* means it is already running whether or not anyone is listening, and collectors join what is in progress.",
    ],
    why: [
      "Some data is not a single answer. A database query that must reflect later writes, a location feed, a countdown — modelling those as `suspend fun` returning one value means polling.",
      "Cold is the right default because it ties work to demand: nobody watching, nothing running. Hot exists for things that genuinely are shared — one location listener for five screens, not five listeners.",
    ],
    breaks:
      "Treating a cold flow as though it were shared. Two collectors on a cold flow means the upstream runs twice: two network calls, two database queries, two of whatever else was in the chain. This is the most common flow bug there is, and it looks like a mysterious duplicate request rather than a flow problem.",
    example: {
      label: "Live scores: one upstream, many watchers",
      language: "kotlin",
      code: `// Cold: each collector re-runs the whole chain from the top.
val scores: Flow<Score> = flow {
    while (true) { emit(api.fetchScore()); delay(5_000) }
}
// Two screens collecting this = two polling loops, two sets of requests.

// Hot, and shared: one upstream, however many collectors.
val scores: StateFlow<Score> = flow { /* as above */ }
    .stateIn(
        scope = viewModelScope,
        // Keep running for 5s after the last collector leaves, so a
        // rotation does not tear down and restart the upstream.
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = Score.Unknown,
    )`,
    },
    related: ["viewmodel", "repository"],
  },
];

const BY_ID = new Map(GLOSSARY.map((entry) => [entry.id, entry]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}
