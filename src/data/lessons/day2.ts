import type { Lesson } from "@/lib/types";

/**
 * Day 2 — the runtime facts every Android architecture decision is
 * downstream of.
 *
 * Deliberately not a tour of lifecycle callbacks. The callbacks are easy to
 * look up and nearly useless on their own; what is hard, and what actually
 * decides how you structure an app, is knowing *who owns the lifetime of
 * what*. Once you can say which of your objects the system can destroy
 * without asking, ViewModel, SavedStateHandle, repositories and
 * offline-first stop being patterns you follow and become the only sensible
 * answers to a problem you can see.
 *
 * Every factual claim here is quoted from developer.android.com — the
 * sources are listed in claude/content-verification-log.md.
 */
export const DAY_2: Lesson = {
  id: "day-2",
  slug: "day-2",
  dayNumber: 2,
  moduleId: "m04",
  title: "Why Android Architecture Looks Like This",
  subtitle: "Day 2 · Module 04 — Android Runtime & Lifecycle",
  goal:
    "Understand who owns the lifetime of your objects, so that every state-holding decision becomes a consequence of that rather than a convention.",
  concepts: [
    "the system owns the process",
    "configuration change",
    "process death",
    "lifecycle states",
    "ViewModelStoreOwner",
    "SavedStateHandle",
    "state durability tiers",
    "viewModelScope",
    "Context leaks",
  ],
  totalMinutes: 120,
  sections: [
    /* --------------------------------------------------------------- */
    {
      id: "warmup",
      title: "Warm-up",
      kicker: "Commit to an answer before you read on",
      startMinute: 0,
      endMinute: 10,
      blocks: [
        {
          id: "w-intro",
          kind: "prose",
          body: [
            "A user is halfway through filling in a form. They have typed an email address, picked a date, and scrolled down. Then they rotate the phone.",
            "Before reading on, answer properly: what happens to that screen? Not what *should* happen — what the system actually does, by default, with no code from you.",
          ],
        },
        {
          id: "w-explain",
          kind: "explain",
          question:
            "The user rotates the phone mid-form. What does the system do to your Activity, and what happens to the text they had typed?",
          keywords: ["destroy", "recreate", "onCreate", "configuration"],
          answer:
            "The system **destroys your Activity and builds a new one**. Not pauses it, not notifies it — destroys it. In the documentation's own words: \"the system destroys the activity by default when such a configuration change occurs, wiping away any UI state stored in the activity instance.\" It then \"immediately creates a new activity instance and then calls `onCreate` on that new instance in the new configuration.\"\n\nThe typed email survives only because the `EditText` has an id and the view system saves it for you. Anything you held in a field on the Activity — a loaded user, a selected date, a scroll position you tracked yourself — is gone, because the object holding it no longer exists.\n\nIf that sounds like an odd default, hold the objection. By the end of this lesson it should look like the only workable one.",
        },
        {
          id: "w-quiz",
          kind: "quiz",
          question:
            "Your app is in the background. The system is short on memory. What does it kill?",
          choices: [
            {
              id: "a",
              body: "The Activity, calling onDestroy so you can clean up.",
              correct: false,
              rationale:
                "This is the mental model most people carry, and it is the one worth replacing today. The documentation is blunt: \"The system never kills an activity directly to free up memory.\" Activities are not the unit of reclamation.",
            },
            {
              id: "b",
              body: "The whole process — your Activity and everything else in it.",
              correct: true,
              rationale:
                "Correct, and the consequences run all the way through this lesson. \"Instead, it kills the process the activity runs in, destroying not only the activity but everything else running in the process as well.\" Your singletons, your in-memory cache, your ViewModels — all of it, at once, with no callback you can rely on.",
            },
            {
              id: "c",
              body: "Nothing — Android suspends background apps rather than killing them.",
              correct: false,
              rationale:
                "Suspension is part of the story (a stopped app does not get CPU), but reclamation is real and routine. A phone with several heavy apps open kills backgrounded processes constantly. Your app being gone when the user returns is the normal case, not an edge case.",
            },
          ],
        },
        {
          id: "w-teach",
          kind: "callout",
          tone: "insight",
          title: "The sentence the rest of the lesson hangs on",
          body: [
            "You do not own the lifetime of your objects. The system does.",
            "It can destroy your Activity because the screen rotated, and it can destroy your **entire process** because another app needed the memory.",
            "Every architectural convention you have been told to follow — [[viewmodel|ViewModel]], SavedStateHandle, repositories, a database as the source of truth — exists to answer one question: *what do you do about state when the thing holding it can be deleted at any moment?*",
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "two-resets",
      title: "Two resets that are not the same thing",
      kicker: "The distinction most Android bugs live in",
      startMinute: 10,
      endMinute: 35,
      blocks: [
        {
          id: "l-intro",
          kind: "prose",
          body: [
            "There are two completely different events that both look, to a user, like \"the screen started over\". Almost every confusing state bug in an Android app comes from treating them as one.",
            "They differ in what is destroyed, what is preserved, and how long the gap is.",
          ],
        },
        {
          id: "l-config",
          kind: "pipeline",
          title: "A configuration change — rotation, dark mode, a resized window",
          stages: [
            { label: "Activity running", caption: "your instance, your fields" },
            { label: "onPause → onStop → onDestroy", caption: "all three run" },
            { label: "new Activity instance", caption: "a different object" },
            { label: "onCreate(savedInstanceState)", caption: "in the new configuration" },
            { label: "Process never died", caption: "ViewModels still in memory" },
          ],
          body: [
            "The Activity object is replaced. The **process is not** — which is the whole reason ViewModel can work at all. Your ViewModel was never inside the Activity; it was held by something that outlives it.",
            "This happens in milliseconds, dozens of times in a normal session, and the user perceives it as nothing at all.",
          ],
        },
        {
          id: "l-death",
          kind: "pipeline",
          title: "Process death — the system reclaiming memory",
          stages: [
            { label: "App goes to background", caption: "user switches away" },
            { label: "System needs memory", caption: "another app, a camera, a game" },
            { label: "Process killed", caption: "no reliable callback" },
            { label: "User returns, maybe hours later", caption: "taps your icon or recents" },
            { label: "Brand new process", caption: "onCreate(savedInstanceState != null)" },
          ],
          body: [
            "Everything in memory is gone: ViewModels, singletons, that `object AppCache` someone added, the Retrofit client, all of it. The process is rebuilt from nothing.",
            "The user does not experience this as a restart. They expect to land back where they were — which is exactly the expectation your architecture has to meet.",
          ],
        },
        {
          id: "l-compare",
          kind: "compare",
          title: "The same user gesture, two different situations",
          compare: [
            {
              label: "Rotation",
              code: `Activity destroyed      yes
Process destroyed       no
ViewModel survives      yes
Gap in time             milliseconds`,
              verdict:
                "Frequent, fast, and fully covered by holding state outside the Activity. This is the case ViewModel exists for.",
            },
            {
              label: "Process death",
              code: `Activity destroyed      yes
Process destroyed       yes
ViewModel survives      no
Gap in time             minutes to days`,
              verdict:
                "Rarer, slower, and ViewModel does nothing for it. This is the case SavedStateHandle and persistent storage exist for.",
            },
          ],
        },
        {
          id: "l-why",
          kind: "callout",
          tone: "why",
          title: "Why testing on your own phone hides this",
          body: [
            "A developer phone has plenty of RAM and one app being actively used. Process death almost never happens to you.",
            "It happens constantly to a user on a three-year-old midrange device with a messaging app, a browser and a camera in the background — and it is the reason a feature that works perfectly on your desk gets bug reports about \"losing my place\".",
            "Developer Options → **Don't keep activities** simulates the Activity half. To simulate the real thing, background the app and use `adb shell am kill <package>`, which kills the process the way the system does — without the graceful shutdown that `Force stop` performs.",
          ],
        },
        {
          id: "l-predict",
          kind: "predict",
          title: "Read the flag",
          code: {
            language: "kotlin",
            code: `override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val fresh = savedInstanceState == null
}`,
          },
          question:
            "The user opened your app, backgrounded it, the system killed the process, and they returned. Is `fresh` true or false?",
          expected: "false",
          answer:
            "`false`. The system saved a state bundle before killing the process and hands it back on the way in, which is precisely how you tell a genuinely new start from a restoration.\n\nThat single null check is the most useful signal in the whole Activity API, and almost nobody reads it: `savedInstanceState == null` means *the user is starting something*, and non-null means *the user is continuing something*.",
        },
        {
          id: "l-explain",
          kind: "explain",
          question:
            "Why is it a reasonable design for the system to destroy your Activity on rotation, rather than just telling you the configuration changed?",
          keywords: ["resources", "layout", "configuration", "qualifiers"],
          answer:
            "Because almost everything the Activity built is configuration-dependent. A different orientation, locale, density, theme or window size can select a different layout, different strings, different dimensions, different drawables — resolved from resource qualifiers when the Activity was created.\n\nRebuilding is a simple, uniform rule that is correct for every one of those. Notifying you instead would make *you* responsible for re-resolving every resource you had already used, in every Activity you ever write, and the failure mode would be a screen that is subtly half-old.\n\nThe cost of that rule is that Activity-held state disappears. Android's answer is not to weaken the rule — it is to give you somewhere else to put the state. That somewhere is the next three sections.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "drills",
      title: "Drills",
      kicker: "Say the answer before you read it",
      startMinute: 35,
      endMinute: 50,
      blocks: [
        {
          id: "d-intro",
          kind: "prose",
          body: [
            "Four events. For each one, say out loud what is destroyed and what survives. These are the exact cases an interviewer probes, and more usefully, the exact cases your users hit.",
          ],
        },
        {
          id: "d-rotate",
          kind: "explain",
          question:
            "The user rotates the phone. What is destroyed, and what survives?",
          keywords: ["activity", "viewmodel", "process"],
          answer:
            "**Destroyed:** the Activity instance and everything held in its fields.\n\n**Survives:** the process, so your ViewModel, your singletons, your in-memory caches — and anything the view system or `rememberSaveable` wrote into the state bundle.\n\nThis is the cheapest case, and the one ViewModel handles completely on its own.",
        },
        {
          id: "d-kill",
          kind: "explain",
          question:
            "The app is backgrounded and the system kills the process for memory. The user returns. What is destroyed, and what survives?",
          keywords: ["process", "viewmodel", "saved state", "disk"],
          answer:
            "**Destroyed:** everything in memory. The process is gone, so the ViewModel is gone with it — this is the case people wrongly expect ViewModel to cover.\n\n**Survives:** the saved state bundle, which the system wrote before killing you and hands back to `onCreate`, and anything you had written to disk or a database.\n\nNote what that means in practice: the ViewModel is reconstructed from scratch, so whatever it needs to rebuild the screen has to be reachable from saved state or storage. If it is only reachable from a network call, the user watches a spinner where they expected their screen.",
        },
        {
          id: "d-swipe",
          kind: "explain",
          question:
            "The user swipes your app away from the recents screen. They open it again. What survives?",
          keywords: ["dismissal", "disk", "saved state"],
          answer:
            "**Only what is on disk.** A user-initiated dismissal is treated as *finishing*, not as an interruption — the documented behaviour is that saved state does **not** survive \"user complete screen dismissal\", alongside ViewModel not surviving it.\n\nThe reasoning is about intent. The system killing you for memory is something the user did not ask for, so restoring their place is the right thing to do. Swiping the app away is the user saying they are done, so restoring would be the app ignoring them.\n\nThis is also why `rememberSaveable` has the same caveat in Compose: it \"won't retain state if the activity is completely dismissed by the user.\"",
        },
        {
          id: "d-back",
          kind: "explain",
          question:
            "The user presses back to leave your screen, then navigates into it again. Does the ViewModel survive?",
          keywords: ["finish", "onCleared", "ViewModelStoreOwner"],
          answer:
            "**No — and this is the one people get wrong in the other direction.** Back finishes the Activity (or pops the back stack entry) permanently. That destroys the `ViewModelStoreOwner`, so the ViewModel is cleared and `onCleared()` runs.\n\nThe test worth memorising: a ViewModel survives destruction the system did **for its own reasons**, and does not survive destruction the **user asked for**. Rotation is the system's doing; back is the user's.\n\nIt is also the answer to \"why did my ViewModel keep stale data\" — if it did, the owner did not actually go away, which usually means you scoped it to the Activity when you meant to scope it to the screen.",
        },
        {
          id: "d-callout",
          kind: "callout",
          tone: "warning",
          title: "The trap in the middle",
          body: [
            "Process death sits in a gap that neither habit covers: it is **not** a configuration change, so ViewModel does not help — and it is **not** a user dismissal, so the user still expects their place back.",
            "Code that handles only rotation looks correct forever on a developer's desk and quietly fails for real users.",
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "durability",
      title: "The three tiers of state durability",
      kicker: "The mental model to keep",
      startMinute: 50,
      endMinute: 70,
      blocks: [
        {
          id: "t-intro",
          kind: "prose",
          body: [
            "Here is the model that replaces memorising APIs. There are exactly three places state can live, they differ only in **what kills them**, and choosing between them is a matter of asking how long a particular piece of state needs to outlive.",
            "This table is from the documentation, not a summary of it — it is worth being able to reproduce from memory.",
          ],
        },
        {
          id: "t-table",
          kind: "code",
          title: "What survives what",
          code: {
            language: "text",
            code: `                                 ViewModel   Saved state   Persistent storage

Configuration change               yes          yes              yes
System-initiated process death     no           yes              yes
User dismissal / finish()          no           no               yes`,
          },
        },
        {
          id: "t-read",
          kind: "prose",
          body: [
            "Read it as three concentric rings rather than three products. Each tier survives strictly more than the one before it, and costs strictly more to use.",
            "**ViewModel** is memory in the same process, so it is free, fast, and holds anything — whole objects, flows, jobs in flight. It buys you exactly one thing: surviving Activity recreation.",
            "**Saved state** is a `Bundle` the system serialises and holds outside your process, so it survives your process dying. That is why it is restricted: the guidance is to \"store only primitive types and simple, small objects such as `String`\", and not \"large amounts of data, such as bitmaps, nor complex data structures that require lengthy serialization\".",
            "**Persistent storage** — a database, DataStore, files — survives everything, including the user wiping the app from recents and the device rebooting. It costs an I/O boundary and a schema you have to maintain.",
          ],
        },
        {
          id: "t-rule",
          kind: "callout",
          tone: "insight",
          title: "The decision rule",
          body: [
            "Saved state holds **identity**, not data. The documented advice is to store \"a minimal amount of data necessary, such as an ID, to recreate the data\".",
            "So: the selected order's **id** goes in saved state; the order itself goes in the database. The search **query string** goes in saved state; the results do not.",
            "That division is not a storage optimisation — it is the [[single-source-of-truth|single source of truth]] principle applied to time. Two copies of the order means two things that can disagree; an id plus a lookup cannot.",
          ],
        },
        {
          id: "t-compare",
          kind: "compare",
          title: "The same screen, decided two ways",
          compare: [
            {
              label: "Everything in the ViewModel",
              code: `class OrderViewModel : ViewModel() {
    private val _state = MutableStateFlow(OrderUiState())
    val state = _state.asStateFlow()

    fun select(id: String) { /* fetch, then update */ }
}`,
              verdict:
                "Correct through rotation, wrong after process death: the selected id is gone, so the screen comes back empty and the user has lost their place.",
            },
            {
              label: "Identity in saved state",
              code: `class OrderViewModel(
    private val saved: SavedStateHandle,
    repository: OrderRepository,
) : ViewModel() {
    private val selectedId = saved.getStateFlow<String?>(KEY_ID, null)

    val state = selectedId
        .flatMapLatest { id -> repository.observeOrder(id) }
        .map(::toUiState)

    fun select(id: String) { saved[KEY_ID] = id }
}`,
              verdict:
                "The id outlives the process; the order is read back from the repository. Nothing is stored twice, and restoration is the same code path as a normal selection.",
            },
          ],
        },
        {
          id: "t-why",
          kind: "callout",
          tone: "why",
          title: "Why this is the architecture, not a trick",
          body: [
            "Look at what the second version does: it never restores anything. There is no `if (restoring)` branch, no special path, no `onRestoreInstanceState`.",
            "Restoration became *the ordinary flow running with a value that happened to come from the system*. A single derived pipeline — id in, state out — is correct on first open, after rotation, and after process death, because all three simply supply the id differently.",
            "That is the payoff of derived-rather-than-stored, and it is why unidirectional data flow keeps being the answer. Every branch you remove is a branch that cannot be wrong in one of the three cases.",
          ],
        },
        {
          id: "t-explain",
          kind: "explain",
          question:
            "Saved state is the only tier with a documented size restriction. Why would the system impose one, when a database has no such limit?",
          keywords: ["process", "system", "serialise", "memory"],
          answer:
            "Because it is not your memory. Saved state has to survive your process dying, which means the system holds it *outside* your process — and it holds one of these for every app the user has backgrounded.\n\nSo the cost is borne by the system and multiplied across apps, which is why the guidance is to store \"only primitive types and simple, small objects\" and explicitly not bitmaps or anything needing \"lengthy serialization\". It also has to be written at a moment when the system is already under pressure and deciding what to kill — the worst possible time to ask it to serialise a large object graph.\n\nA database is yours, on your disk, written when you choose. Different owner, different constraint. Noticing *who owns the resource* explains most platform restrictions that otherwise look arbitrary.",
        },
        {
          id: "t-quiz",
          kind: "quiz",
          question:
            "A screen shows a list of photos and the user's scroll position. Where does the scroll position belong?",
          choices: [
            {
              id: "a",
              body: "Persistent storage, so it survives everything.",
              correct: false,
              rationale:
                "It survives too much. Coming back to a week-old scroll position is not thoughtful, it is disorienting — and you have taken on a write on every scroll for the privilege. Durability beyond what the state means is a cost, not a safety margin.",
            },
            {
              id: "b",
              body: "Saved state — it is small, and losing it on dismissal is correct.",
              correct: true,
              rationale:
                "Right on both counts. It is an integer or a small key, so it fits the size guidance; and its meaning is \"where this session was\", so a user who dismissed the app *should* get a fresh start. The durability tier matches the lifetime of the meaning.",
            },
            {
              id: "c",
              body: "The ViewModel, like the rest of the screen state.",
              correct: false,
              rationale:
                "Fine for rotation, lost on process death — which is exactly the case where the user most notices, since they have been away long enough to have expectations about returning. ViewModel alone is the answer only when losing the state after a kill is genuinely acceptable.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "viewmodel",
      title: "What a ViewModel actually is",
      kicker: "Scope, not magic",
      startMinute: 70,
      endMinute: 85,
      blocks: [
        {
          id: "v-intro",
          kind: "prose",
          body: [
            "A ViewModel is not a special kind of object. It is an ordinary object held by someone else — and that someone else is the entire feature.",
            "The documented rule is one sentence: \"A ViewModel remains in memory until the `ViewModelStoreOwner` to which it is scoped disappears.\" Everything people describe as ViewModel magic follows from that and nothing more.",
          ],
        },
        {
          id: "v-pipeline",
          kind: "pipeline",
          title: "Where it actually lives",
          stages: [
            { label: "ViewModelStoreOwner", caption: "Activity, Fragment, or NavBackStackEntry" },
            { label: "holds a ViewModelStore", caption: "a map of key to ViewModel" },
            { label: "which holds your ViewModel", caption: "an ordinary object" },
            { label: "Activity recreated", caption: "the store is handed to the new one" },
            { label: "Owner finished", caption: "store cleared, onCleared() runs" },
          ],
          body: [
            "That fourth stage is the whole trick. On a configuration change the framework passes the existing `ViewModelStore` to the new Activity instead of building a new one, so the same ViewModel object is found again — no serialisation, no restoration, because it never went anywhere.",
            "And that is also why process death defeats it completely: the store was only ever a field in memory, and the memory is gone.",
          ],
        },
        {
          id: "v-scope",
          kind: "callout",
          tone: "insight",
          title: "Choosing the owner is the real decision",
          body: [
            "Scope to the **Activity** and the ViewModel lives as long as the whole screen stack in it — which is how two fragments share one, and how stale data outlives the screen that made it.",
            "Scope to a **NavBackStackEntry** and it lives exactly as long as that destination is on the back stack, which is usually what \"this screen's state\" actually means.",
            "Picking the owner is picking a lifetime. It is the one decision about a ViewModel that has architectural consequences, and it is the one most often made by copying whatever the neighbouring file did.",
          ],
        },
        {
          id: "v-owner-explain",
          kind: "explain",
          question:
            "Two fragments in one Activity both call the Activity-scoped ViewModel. The user finishes with the first fragment and moves to the second. What state does the second one see, and is that what you wanted?",
          keywords: ["scope", "owner", "lifetime", "stale"],
          answer:
            "It sees everything the first fragment left behind, because the ViewModel is owned by the Activity and the Activity never went away.\n\nWhen you meant \"share this between the two\", that is the feature. When you meant \"this screen's state\", it is a bug that presents as stale data on second entry — a filter still applied, a previous search's results, an error banner from a screen the user has left.\n\nThe fix is not to clear state on navigation, which is a manual lifetime you now have to maintain. It is to pick an owner whose lifetime already matches the meaning: a NavBackStackEntry for per-screen state, the Activity only for state that genuinely belongs to the whole Activity.",
        },
        {
          id: "v-scope-code",
          kind: "code",
          title: "viewModelScope, and why cancellation is free",
          code: {
            language: "kotlin",
            code: `class OrderViewModel(
    private val repository: OrderRepository,
) : ViewModel() {

    fun refresh() {
        viewModelScope.launch {
            repository.refreshOrders()
        }
    }
}`,
          },
        },
        {
          id: "v-scope-prose",
          kind: "prose",
          body: [
            "\"Any coroutine launched in this scope is automatically canceled if the `ViewModel` is cleared.\" That is the documented behaviour, and it is the reason you almost never write cancellation logic by hand.",
            "Read it as structured concurrency wearing an Android hat: the work is a child of the thing that wanted it, so when that thing goes away the work goes away too. A refresh triggered by a screen the user has already left cannot come back and write into a dead object, because it was cancelled the moment the screen was finished.",
            "The failure mode this prevents is worth naming, because it is what you get without it: a network call completing after its screen is gone, then either leaking the memory it captured or crashing on a view that no longer exists.",
          ],
        },
        {
          id: "v-leak",
          kind: "compare",
          title: "The one rule about what a ViewModel may hold",
          compare: [
            {
              label: "Leaks",
              code: `class ProfileViewModel(
    private val context: Context,
) : ViewModel() {
    fun label() = context.getString(R.string.title)
}`,
              verdict:
                "If that Context is an Activity, the ViewModel outlives it on every rotation and keeps it alive — a whole destroyed screen, retained. Twenty rotations, twenty leaked Activities.",
            },
            {
              label: "Safe",
              code: `class ProfileViewModel(
    private val repository: ProfileRepository,
) : ViewModel() {
    val state = repository.observeProfile().map(::toUiState)
}`,
              verdict:
                "Holds only things with a lifetime at least as long as its own. Text resolution moves to the UI layer, which is where a Context legitimately lives.",
            },
          ],
        },
        {
          id: "v-leak-why",
          kind: "callout",
          tone: "warning",
          title: "Why this rule exists, stated as a general principle",
          body: [
            "The documentation puts it as: ViewModels \"can potentially live longer than the `ViewModelStoreOwner`\", so they \"shouldn't hold any references of lifecycle-related APIs such as the `Context` or `Resources` to prevent memory leaks.\"",
            "The general form is worth more than the specific rule: **an object must never hold a reference to something with a shorter lifetime than its own.** Every memory leak you will ever debug on Android is a violation of that one sentence.",
            "ViewModel holding an Activity is the common case. A singleton holding a Fragment, a long-lived listener holding a View, a static map keyed by Context — same sentence, different costume.",
          ],
        },
        {
          id: "v-leak-quiz",
          kind: "quiz",
          question:
            "Your ViewModel needs a string from resources. Which option is sound?",
          choices: [
            {
              id: "a",
              body: "Inject the Application context — it lives as long as the process.",
              correct: true,
              rationale:
                "Sound, because it satisfies the rule: the Application context outlives the ViewModel, so nothing short-lived is being retained. It is the standard escape hatch, and it is safe precisely because of the lifetime, not because it is a special API.",
            },
            {
              id: "b",
              body: "Pass the Activity context into the constructor and null it out in onCleared().",
              correct: false,
              rationale:
                "This is a manual lifetime you now have to get right on every path, and onCleared() does not run on process death anyway. More to the point, the ViewModel outlives the Activity on every rotation — so the leak exists during the window before you clear it, which is the window that matters.",
            },
            {
              id: "c",
              body: "Emit a resource id in the UI state and resolve it in the composable.",
              correct: true,
              rationale:
                "Also sound, and usually better. The ViewModel holds no Context at all, the resolution happens where a Context legitimately lives, and the state becomes trivially testable — you assert on an id rather than on a device's current locale.",
            },
            {
              id: "d",
              body: "Use a static reference to the Activity set in onCreate.",
              correct: false,
              rationale:
                "The same violation with a longer lifetime: a static field outlives the process's every Activity, so it retains a destroyed screen indefinitely. Global mutable state and lifecycle objects are the worst possible combination.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "code-reading",
      title: "Read the lifetimes",
      kicker: "Four objects, four different answers",
      startMinute: 85,
      endMinute: 95,
      blocks: [
        {
          id: "r-code",
          kind: "code",
          title: "A screen, in full",
          code: {
            language: "kotlin",
            code: `object SessionCache {
    var lastQuery: String? = null
}

class SearchViewModel(
    private val saved: SavedStateHandle,
    private val repository: SearchRepository,
) : ViewModel() {

    private var attempts = 0

    val query = saved.getStateFlow(KEY_QUERY, "")

    val results = query
        .debounce(300)
        .flatMapLatest { q -> repository.search(q) }
        .stateIn(viewModelScope, WhileSubscribed(5_000), emptyList())

    fun onQueryChanged(value: String) {
        attempts++
        SessionCache.lastQuery = value
        saved[KEY_QUERY] = value
    }
}`,
          },
        },
        {
          id: "r-q1",
          kind: "explain",
          question:
            "The user types a query, backgrounds the app, the system kills the process, and they return. Which of the four stored values — SessionCache.lastQuery, attempts, query, results — still has its value?",
          keywords: ["saved", "process", "memory"],
          answer:
            "Only **`query`**, because it lives in the `SavedStateHandle` and that is held outside your process.\n\n`SessionCache.lastQuery` is a field on a singleton: memory, gone. `attempts` is a field on the ViewModel: memory, gone. `results` is a `StateFlow` built at construction time: the flow object is gone, and the new one starts at `emptyList()`.\n\nThe important part is what happens next. Because `results` is *derived from* `query`, restoring the query re-runs the search on its own. Nobody restores the results — they are recomputed. That is the same derived-not-stored move as the order screen, and it is why the screen comes back correct without a single line of restoration code.",
        },
        {
          id: "r-q2",
          kind: "explain",
          question:
            "What is `SessionCache` actually doing in this file, and what would go wrong if a feature relied on it?",
          keywords: ["singleton", "process", "source of truth"],
          answer:
            "It is a second copy of a value that already has a home, with a worse lifetime than the original.\n\nTwo specific failures. First, it dies with the process while `saved` does not, so after a kill the two disagree — and any code that trusts `SessionCache` reads a null that the real state does not have. Second, it is global mutable state with no owner, so nothing clears it when the screen goes away; the next screen sees the previous one's query.\n\nThe general rule it breaks is the one from Day 1: nothing is stored twice. A `object { var }` in an Android app is almost always a durability mistake wearing a convenience costume — it looks like a cache and behaves like a fourth, undocumented tier of state that survives navigation but not process death, which is a lifetime nothing in your app actually wants.",
        },
        {
          id: "r-q3",
          kind: "explain",
          question:
            "Why is `attempts` harmless here, when SessionCache is not?",
          keywords: ["lifetime", "owner", "scope"],
          answer:
            "Because its lifetime is honest. `attempts` is owned by the ViewModel and dies with it, and nothing outside the ViewModel can read it — so there is no second reader to disagree with, and no moment where it outlives its meaning.\n\nThis is the distinction worth taking away: the problem was never \"mutable state is bad\". It is *state whose lifetime does not match what it means*. A counter that means \"attempts in this ViewModel's life\" is correct as a field. A query that means \"what the user is searching for\" is not, because the user's intent outlives the ViewModel.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "implement",
      title: "Implementation challenge",
      kicker: "Decide where each piece of state belongs",
      startMinute: 95,
      endMinute: 105,
      blocks: [
        {
          id: "i-intro",
          kind: "prose",
          body: [
            "One screen, several pieces of state, three tiers to choose from. Open the editor, make the calls, and be ready to justify each one — the justification is the part being assessed, not the syntax.",
          ],
        },
        {
          id: "i-challenge",
          kind: "implement",
          title: "Who owns this state?",
          questionSlug: "state-ownership",
          body: [
            "For each piece of state, place it in the tier whose lifetime matches its meaning, and say what specifically breaks if it were placed one tier lower.",
          ],
        },
        {
          id: "i-after",
          kind: "explain",
          question:
            "After finishing: which piece was hardest to place, and what made it ambiguous?",
          keywords: ["lifetime", "meaning", "process death"],
          answer:
            "The ambiguous ones are almost always the pieces whose *meaning* is unclear rather than whose mechanics are.\n\nA draft message is the classic example. If it means \"what the user is in the middle of writing\", it deserves disk — losing it to a background kill is the failure users complain about loudest. If it means \"a transient edit to be discarded on leaving\", saved state is right. The API choice is trivial; the product decision underneath it is the real work.\n\nWhen you cannot place a piece of state, the useful question is not \"which API?\" but \"what would the user expect if they came back to this in an hour?\"",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "interview",
      title: "Saying it out loud",
      kicker: "The same understanding, under questioning",
      startMinute: 105,
      endMinute: 120,
      blocks: [
        {
          id: "x-intro",
          kind: "prose",
          body: [
            "These come up in almost every Android interview, and they are also the questions a senior engineer asks in code review. The difference between a weak and a strong answer is never the API name — it is whether you reach for the lifetime underneath it.",
          ],
        },
        {
          id: "x-q1",
          kind: "explain",
          question:
            "\"Why does ViewModel exist?\" — answer in three sentences, without using the word 'rotation'.",
          keywords: ["lifetime", "owner", "recreated", "process"],
          answer:
            "A strong answer: *\"The system recreates UI controllers for reasons that have nothing to do with the state they were showing, so state kept in them is lost for reasons the user cannot see. ViewModel is an object scoped to the feature rather than to the controller, so it survives the controller being rebuilt. It does not survive the process dying, which is the boundary of what it is for.\"*\n\nWhat makes that strong is that it names the problem before the solution, and names the limit without being asked. Reciting \"it survives configuration changes\" answers a smaller question and invites the follow-up you have not prepared for.",
        },
        {
          id: "x-q2",
          kind: "quiz",
          question:
            "An interviewer says: \"We already have a ViewModel, so why do we need SavedStateHandle?\" What is the strongest reply?",
          choices: [
            {
              id: "a",
              body: "SavedStateHandle is the modern replacement — ViewModel state is the old way.",
              correct: false,
              rationale:
                "Wrong, and it signals memorised chronology rather than understanding. They are not alternatives at all; SavedStateHandle is accessed *from inside* a ViewModel, and they cover different failures.",
            },
            {
              id: "b",
              body: "Because ViewModel dies with the process, and a user returning after a background kill still expects their place back.",
              correct: true,
              rationale:
                "This is the answer. It names the specific case ViewModel does not cover, and — crucially — it names the *user-visible* consequence rather than just the mechanic. The natural follow-up, \"so what do you put in it?\", you have already prepared: identity, not data.",
            },
            {
              id: "c",
              body: "Because SavedStateHandle is faster to read than a database.",
              correct: false,
              rationale:
                "Performance is not the axis these sit on. Choosing a state tier is about lifetime; if you pick on speed you will put things in saved state that do not belong there, which the size guidance exists to prevent.",
            },
          ],
        },
        {
          id: "x-q3",
          kind: "explain",
          question:
            "\"Our app loses the user's place when they come back after a while. Where would you look?\"",
          keywords: ["process death", "saved state", "identity", "derive"],
          answer:
            "Say the diagnosis before the fix: *\"'After a while' points at process death rather than a configuration change, so I would first confirm it reproduces with the process actually killed — `adb shell am kill` on a backgrounded app, not just a rotation.\"*\n\nThen the shape of the fix: find the piece of identity the screen is rebuilt from — a selected id, a query, a tab, a step number — and check whether it is held anywhere that outlives the process. Usually it is in the ViewModel and nowhere else.\n\nThen the thing that separates a senior answer: *\"I would restore the identity and let the existing pipeline recompute the rest, rather than adding a restoration path.\"* A second code path that only runs after a kill is a path nobody exercises and everybody breaks.",
        },
        {
          id: "x-challenge",
          kind: "implement",
          title: "The leak that only shows up after twenty rotations",
          questionSlug: "memory-leak-context",
          body: [
            "One more, and it is the practical form of the rule from the last section. Find what is holding what, and say which lifetime is longer.",
          ],
        },
        {
          id: "x-close",
          kind: "callout",
          tone: "insight",
          title: "What to carry into Day 3",
          body: [
            "You do not own the lifetime of your objects — the system destroys your Activity for its own reasons and your process for another app's.",
            "There are three durability tiers, and choosing between them is matching a lifetime to a **meaning**, not picking an API.",
            "Identity goes in the durable tier; data is derived from it. Restoration then stops being a special path and becomes the ordinary one running from a different starting value.",
            "An object must never hold a reference to something shorter-lived than itself.",
            "Everything ahead — repositories, offline-first, [[single-source-of-truth|single source of truth]], unidirectional data flow — is these four sentences applied at larger scale.",
          ],
        },
      ],
    },
  ],
};
