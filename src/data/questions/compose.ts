import type { Question } from "@/lib/types";

/* 15 Jetpack Compose questions. */

export const COMPOSE_QUESTIONS: Question[] = [
  {
    id: "cp01",
    slug: "state-hoisting",
    title: "Hoist State to the Right Level",
    description:
      "Make a composable stateless, then justify why the state stopped where it did.",
    difficulty: "Easy",
    format: "coding",
    track: "Compose",
    topics: ["compose"],
    stage: "implement",
    ownership: "implement",
    concepts: ["compose-state"],
    estimatedMinutes: 14,
    completedCount: 18300,
    introducedInWeek: 5,
    prompt:
      "A search field owns its own text. That makes it impossible to clear from outside, impossible to preview with a value, and impossible to test without launching it. Hoist the state — and stop at the level that actually needs it, not at the top.",
    requirements: [
      "The field takes `value: String` and `onValueChange: (String) -> Unit`",
      "It holds no state of its own",
      "A stateful wrapper keeps the simple call site available",
    ],
    relatedConcepts: ["State hoisting", "Unidirectional data flow", "Stateless composables"],
    starterCode: `@Composable
fun SearchField() {
    var text by remember { mutableStateOf("") }
    TextField(value = text, onValueChange = { text = it })
}`,
    solutionCode: `/** Stateless: testable, previewable, controllable. */
@Composable
fun SearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    TextField(value = value, onValueChange = onValueChange, modifier = modifier)
}

/** Stateful overload for call sites that genuinely own nothing else. */
@Composable
fun SearchField(modifier: Modifier = Modifier) {
    var text by rememberSaveable { mutableStateOf("") }
    SearchField(value = text, onValueChange = { text = it }, modifier = modifier)
}`,
    tests: [
      { name: "renders provided value", call: `SearchField(value = "kotlin", onValueChange = {})`, expected: `shows "kotlin"` },
      { name: "reports changes", call: `type "k"`, expected: `onValueChange("k")` },
    ],
    hints: [
      "Hoist to the lowest common ancestor of everything that reads or writes the state.",
      "Two overloads — stateless and stateful — is the standard library's own pattern.",
    ],
    solution: {
      mentalModel:
        "State flows down, events flow up. A composable that owns state it does not solely control is a composable nobody else can drive. Hoist to the lowest common owner — hoisting everything to the ViewModel is the opposite mistake.",
      whyItWorks: [
        "A stateless composable is a pure function of its parameters: trivially previewable and testable.",
        "`rememberSaveable` in the stateful overload survives configuration change and process death for free.",
        "Keeping both overloads means simple call sites stay simple.",
      ],
      commonMistakes: [
        "Hoisting every piece of state to the ViewModel, including scroll position and expand/collapse — transient UI state belongs in the UI.",
        "Forgetting the `modifier: Modifier = Modifier` parameter, which callers need for layout.",
        "`remember` instead of `rememberSaveable` for text the user typed.",
      ],
      inProduction:
        "Every Material component follows this: `Checkbox(checked, onCheckedChange)` is stateless, and you own the state.",
      followUps: [
        "Which state belongs in the ViewModel and which in the composable? What is your test for deciding?",
        "Why does the stateless overload come first in the file?",
      ],
    },
  },
  {
    id: "cp02",
    slug: "remember-vs-remembersaveable",
    title: "remember vs rememberSaveable",
    description: "Three survival scenarios. Predict what is left in each.",
    difficulty: "Easy",
    format: "quiz",
    track: "Compose",
    topics: ["compose", "lifecycle"],
    stage: "predict",
    concepts: ["compose-state"],
    estimatedMinutes: 8,
    completedCount: 16200,
    introducedInWeek: 5,
    quizStem:
      "A value stored in `remember { mutableStateOf(0) }` — which of these does it survive?",
    quizCode: `var count by remember { mutableStateOf(0) }`,
    choices: [
      {
        id: "a",
        body: "Recomposition only.",
        correct: true,
        rationale:
          "`remember` stores the value in the composition. Recomposition preserves it; a configuration change recreates the activity and the composition, so it is lost; process death takes everything.",
      },
      { id: "b", body: "Recomposition and configuration change.", correct: false, rationale: "That is `rememberSaveable`, which additionally writes to the saved instance state bundle." },
      { id: "c", body: "Recomposition, configuration change and process death.", correct: false, rationale: "`rememberSaveable` covers the first two and process death via `SavedStateHandle`'s bundle — but only for types the Saver can handle, and only up to the bundle size limit." },
      { id: "d", body: "Nothing — `remember` is only a performance hint.", correct: false, rationale: "It is a storage mechanism, not a hint. Without it, the initialiser would run on every recomposition." },
    ],
    solution: {
      mentalModel:
        "Three lifetimes: the composition (`remember`), the saved-state bundle (`rememberSaveable`), and the ViewModel (which survives configuration change but not process death unless it uses `SavedStateHandle`).",
      whyItWorks: [
        "`remember` keys storage to the composition's slot table.",
        "`rememberSaveable` additionally serialises through a `Saver` into the same bundle the platform restores.",
      ],
      commonMistakes: [
        "`remember` for text input — rotate and the user's typing is gone.",
        "`rememberSaveable` for a large list, hitting the `TransactionTooLargeException` limit.",
        "Assuming the ViewModel survives process death without `SavedStateHandle`.",
      ],
      followUps: ["How would you make a custom type saveable, and what does a `Saver` actually do?"],
    },
  },
  {
    id: "cp03",
    slug: "launchedeffect-keys",
    title: "LaunchedEffect Keys",
    description:
      "One key change too many restarts your work; one too few leaves it stale.",
    difficulty: "Medium",
    format: "debugging",
    track: "Compose",
    topics: ["compose", "coroutines"],
    stage: "predict",
    ownership: "improve",
    concepts: ["compose-effects"],
    estimatedMinutes: 16,
    completedCount: 9800,
    introducedInWeek: 6,
    symptom:
      "A detail screen re-fetches its data several times a second while the user scrolls a list above it. The network tab is a waterfall of identical requests.",
    brokenCode: `@Composable
fun DetailScreen(userId: String, viewModel: DetailViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state) {          // (!)
        viewModel.load(userId)
    }

    DetailContent(state)
}`,
    debugHints: [
      { label: "Hint 1", body: "What does LaunchedEffect do when its key changes? And what does `load` eventually change?" },
      { label: "Hint 2", body: "`state` is the key. `load` updates `state`. Follow the loop." },
      { label: "Hint 3", body: "The key should be the thing the effect *depends on*, not the thing it *produces*." },
    ],
    rootCause:
      "Keying on `state` creates a feedback loop: the effect loads, the load updates state, the new state is a different key, the effect cancels and restarts, which loads again. Any key that the effect itself influences will oscillate. The effect depends only on `userId`, so that is the only correct key.",
    fixedCode: `@Composable
fun DetailScreen(userId: String, viewModel: DetailViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(userId) {         // restarts only when the subject changes
        viewModel.load(userId)
    }

    DetailContent(state)
}

// Better still: no effect at all. Let the ViewModel take userId as a
// SavedStateHandle argument and expose state as a property, so there is
// nothing to trigger.`,
    productionImplications: [
      "Effect loops are a leading cause of runaway network usage in Compose screens.",
      "`LaunchedEffect(Unit)` runs once per entry into the composition — right for a genuine one-shot.",
      "The best effect is often no effect: state derived from constructor arguments needs no trigger.",
    ],
    solution: {
      mentalModel:
        "A `LaunchedEffect` key answers: 'what would make this work wrong if it changed?'. Never key on something the effect produces.",
      whyItWorks: [
        "Keying on `userId` restarts only when the subject genuinely changes.",
        "Cancellation on key change is automatic — the previous coroutine is cancelled before the new one starts.",
      ],
      commonMistakes: [
        "Keying on the whole state object or on a lambda parameter, which is a fresh instance each recomposition.",
        "Keying on `viewModel`, which is stable and therefore equivalent to `Unit` — accidentally correct, but by luck.",
        "Using `LaunchedEffect(Unit)` where the subject really can change, leaving stale data on navigation.",
      ],
      followUps: [
        "Why is `LaunchedEffect(lambda)` almost always wrong? (A lambda is a new object every recomposition unless remembered.)",
        "When would `rememberUpdatedState` be the right fix instead of changing the key?",
      ],
    },
  },
  {
    id: "cp04",
    slug: "derivedstateof",
    title: "derivedStateOf: Fewer Recompositions, Not Fewer Calculations",
    description: "Work out precisely what it saves, and when it saves nothing at all.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Compose",
    topics: ["compose", "performance"],
    stage: "explain",
    concepts: ["recomposition", "compose-state"],
    estimatedMinutes: 15,
    completedCount: 6700,
    introducedInWeek: 6,
    readingCode: `// A
val showButton = listState.firstVisibleItemIndex > 0

// B
val showButton by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 0 }
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "During a scroll from item 0 to item 20, how many recompositions does each version cause?",
        expert:
          "Version A recomposes on every change to `firstVisibleItemIndex` — around twenty, plus every intermediate read. Version B recomposes twice: once when the boolean flips false→true, and once if it flips back. The derived state only notifies readers when its *result* changes.",
        keywords: ["twenty", "two", "result", "changes"],
      },
      {
        id: "p2",
        question: "Does `derivedStateOf` avoid running the calculation?",
        expert:
          "No. The lambda runs whenever a state it reads changes. What it avoids is *propagating* the change when the result is equal to the previous one. The saving is in recomposition, not computation — which is why wrapping an expensive calculation in `derivedStateOf` for speed misunderstands it.",
        keywords: ["no", "still runs", "propagate", "recomposition"],
      },
      {
        id: "p3",
        question: "When does `derivedStateOf` cost more than it saves?",
        expert:
          "When the result changes as often as the inputs do — `derivedStateOf { items.map(::toRow) }` changes on every item change, so you have added a snapshot-state object and an equality check for nothing. The rule: use it when a frequently-changing input maps to a rarely-changing output.",
        keywords: ["same frequency", "no benefit", "overhead"],
      },
      {
        id: "p4",
        question: "Why must it be wrapped in `remember`, and what happens if you forget?",
        expert:
          "Without `remember` a new derived state object is created every recomposition, so the previous result is discarded and nothing is ever compared — you get the cost with none of the benefit. Note the key: `remember { derivedStateOf { } }` deliberately takes *no* keys, because the lambda tracks its own dependencies through snapshot reads.",
        keywords: ["remember", "recreated", "no keys", "snapshot"],
      },
    ],
    solution: {
      mentalModel:
        "`derivedStateOf` is an equality gate between a rapidly-changing state and its readers. Use it when many input values map to few output values.",
      whyItWorks: [
        "The snapshot system records which states the lambda read and re-runs it when they change.",
        "Readers are only invalidated when the new result differs from the old by `equals`.",
      ],
      commonMistakes: [
        "Omitting `remember`.",
        "Using it for expensive computation rather than for read-frequency reduction.",
        "Using it where a simple `remember(key) { }` would do — if the input changes rarely, keyed remember is cheaper and clearer.",
      ],
      inProduction: "Scroll-driven UI — a scroll-to-top button, a collapsing toolbar threshold, a 'load more' trigger — is the canonical case.",
      followUps: ["How would you verify the recomposition counts rather than trusting the reasoning?"],
    },
  },
  {
    id: "cp05",
    slug: "lazycolumn-keys",
    title: "LazyColumn Keys and Item Identity",
    description: "Remove an item from the middle and watch the wrong row animate.",
    difficulty: "Medium",
    format: "coding",
    track: "Compose",
    topics: ["compose", "performance"],
    stage: "implement",
    ownership: "implement",
    concepts: ["recomposition", "compose-stability"],
    estimatedMinutes: 12,
    completedCount: 11400,
    introducedInWeek: 5,
    prompt:
      "Without keys, a `LazyColumn` identifies items by index. Delete item 3 and every item below shifts up by one index — so the runtime believes item 4 *became* item 3, reusing its state and animating the wrong row.",
    requirements: [
      "Give each item a stable, unique key",
      "Declare a `contentType` where the list is heterogeneous",
      "Explain what state is preserved by the key",
    ],
    relatedConcepts: ["key", "contentType", "Item identity", "State preservation"],
    starterCode: `LazyColumn {
    items(messages) { message ->
        MessageRow(message)
    }
}`,
    solutionCode: `LazyColumn {
    items(
        items = messages,
        key = { it.id },
        contentType = { it.kind },   // helps the runtime reuse compatible slots
    ) { message ->
        MessageRow(message, modifier = Modifier.animateItem())
    }
}`,
    tests: [
      { name: "removal animates the right row", call: `remove(messages[3])`, expected: `row 3 exits` },
      { name: "state follows the item", call: `expand row 3, insert at 0`, expected: `row 3 still expanded` },
      { name: "scroll position survives reorder", call: `reorder`, expected: `anchored to keyed item` },
    ],
    hints: [
      "A key must be unique across the list and stable across recompositions — a database id, not `hashCode()` of a mutable object.",
      "`contentType` lets the runtime reuse a composition slot for items of the same shape, which matters in mixed lists.",
    ],
    solution: {
      mentalModel:
        "A key gives an item an identity independent of its position. With it, the runtime can say 'this item moved'. Without it, all it can say is 'position 3 changed'.",
      whyItWorks: [
        "Keys preserve `remember`ed state, scroll anchoring and animation targets across insertions and removals.",
        "`contentType` reduces recomposition cost in heterogeneous lists by matching reused slots to compatible content.",
      ],
      commonMistakes: [
        "Using the index as the key — identical to having no key.",
        "Non-unique keys, which throws at runtime.",
        "Keys derived from mutable fields, so an edit looks like a delete plus an insert.",
      ],
      complexity: { time: "O(visible items)", space: "O(visible items)" },
      inProduction: "Chat, feeds and any list with insertions at the top need this. It is also a prerequisite for `animateItem` to behave.",
      followUps: ["What exactly is preserved by a key — and what is not?"],
    },
  },
  {
    id: "cp06",
    slug: "stability-and-skipping",
    title: "Why This Composable Never Skips",
    description:
      "One parameter is unstable. Find it, and pick from the three ways to fix it.",
    difficulty: "Hard",
    format: "debugging",
    track: "Compose",
    topics: ["compose", "performance"],
    stage: "predict",
    ownership: "improve",
    concepts: ["compose-stability"],
    estimatedMinutes: 18,
    completedCount: 5900,
    introducedInWeek: 6,
    symptom:
      "`OrderSummary` recomposes whenever its parent does, even when nothing it displays has changed. Strong skipping is enabled, so it is skippable — it just never actually skips.",
    brokenCode: `data class Order(
    val id: String,
    val lines: List<OrderLine>,
    val placedAt: java.util.Date,
)

@Composable
fun OrderSummary(order: Order, onTap: () -> Unit) { ... }`,
    debugHints: [
      { label: "Hint 1", body: "Skippability requires every parameter to be a stable type. Go through them one at a time." },
      { label: "Hint 2", body: "`String` is stable. Lambdas are stable if remembered. What about the other two?" },
      { label: "Hint 3", body: "`List` is an interface the compiler cannot prove is not a `MutableList`. And `java.util.Date` is a mutable class from a module without Compose metadata." },
    ],
    rootCause:
      "Two unstable parameters. `List<OrderLine>` is an interface whose runtime implementation might be mutable, so the compiler treats it as unstable. `java.util.Date` is mutable and lives in a module the Compose compiler cannot infer stability for. One unstable parameter is enough to make the whole composable unskippable, so it recomposes with its parent every time.",
    fixedCode: `// 1. Use a type that is provably immutable.
data class Order(
    val id: String,
    val lines: ImmutableList<OrderLine>,   // kotlinx.collections.immutable
    val placedAtEpochMillis: Long,         // a value, not a mutable Date
)

// 2. Or promise stability yourself, if you can keep the promise.
@Immutable
data class Order(val id: String, val lines: List<OrderLine>, val placedAt: Date)

// 3. Or add the class's module to a stability configuration file:
//    stabilityConfigurationFile=compose_stability.conf
//    java.util.Date`,
    productionImplications: [
      "Unskippable composables high in the tree make everything below them recompose, which is how a list becomes janky without any single slow function.",
      "`@Immutable` is a promise the compiler cannot verify — break it and you get stale UI that is very hard to trace.",
      "Measure with the compiler metrics before changing types; the report names every unstable parameter.",
    ],
    solution: {
      mentalModel:
        "Skippability is all-or-nothing per composable. The compiler must prove that comparing parameters is meaningful; one type it cannot reason about disqualifies the function.",
      whyItWorks: [
        "`ImmutableList` is annotated stable, so equality comparison is trustworthy.",
        "Primitives and `String` are stable by definition.",
        "Remembered lambdas are stable; lambdas that capture unstable values are not.",
      ],
      commonMistakes: [
        "Annotating with `@Immutable` a class that in fact mutates — the UI then silently fails to update.",
        "Assuming `List` is stable because the instance happens to be immutable at runtime. Stability is a compile-time judgement.",
        "Optimising stability before measuring; most screens do not need it.",
      ],
      followUps: [
        "How do you enable the Compose compiler metrics and read the report?",
        "What is the difference between `@Stable` and `@Immutable`?",
      ],
    },
  },
  {
    id: "cp07",
    slug: "side-effect-selection",
    title: "Choose the Right Effect",
    description: "Four situations, four different effect APIs.",
    difficulty: "Medium",
    format: "quiz",
    track: "Compose",
    topics: ["compose"],
    stage: "explain",
    concepts: ["compose-effects"],
    estimatedMinutes: 9,
    completedCount: 8700,
    introducedInWeek: 6,
    quizStem:
      "You must register a listener when a composable enters the composition and unregister it when it leaves. Which API?",
    choices: [
      {
        id: "a",
        body: "`LaunchedEffect(Unit) { register(); ... }`",
        correct: false,
        rationale:
          "It runs the coroutine on entry, but there is no clean-up hook for a non-suspending unregister. Cancellation of the coroutine does not call your unregister function unless you write a `try/finally` — at which point `DisposableEffect` says it better.",
      },
      {
        id: "b",
        body: "`DisposableEffect(key) { register(); onDispose { unregister() } }`",
        correct: true,
        rationale:
          "`DisposableEffect` exists precisely for symmetric setup/teardown of non-suspending resources. `onDispose` runs when the key changes or the composable leaves the composition.",
      },
      { id: "c", body: "`SideEffect { register() }`", correct: false, rationale: "`SideEffect` runs after *every* successful recomposition and has no teardown — you would register dozens of times." },
      { id: "d", body: "`remember { register() }`", correct: false, rationale: "`remember` is for values, not effects, and has no disposal. Side effects in `remember` run during composition, which may be cancelled or re-run." },
    ],
    solution: {
      mentalModel:
        "`LaunchedEffect` — suspending work tied to keys. `DisposableEffect` — resources needing teardown. `SideEffect` — publish a value to non-Compose code after every recomposition. `rememberCoroutineScope` — launch work from a callback, not from composition.",
      whyItWorks: [
        "`onDispose` is guaranteed to run on key change and on leaving the composition.",
        "Effects run after composition succeeds, so they never observe a half-built tree.",
      ],
      commonMistakes: [
        "Calling `viewModel.load()` directly in the composable body — it runs on every recomposition.",
        "`rememberCoroutineScope` used where `LaunchedEffect` belongs; the scope is for event handlers.",
        "Forgetting that `DisposableEffect` requires an `onDispose` — it is a compile error, which is a kindness.",
      ],
      followUps: ["What does `rememberUpdatedState` solve, and why is it usually paired with `LaunchedEffect(Unit)`?"],
    },
  },
  {
    id: "cp08",
    slug: "collect-as-state-lifecycle",
    title: "collectAsState vs collectAsStateWithLifecycle",
    description: "One of these keeps collecting while the app is in the background.",
    difficulty: "Medium",
    format: "quiz",
    track: "Compose",
    topics: ["compose", "lifecycle", "flow"],
    stage: "predict",
    concepts: ["lifecycle"],
    estimatedMinutes: 7,
    completedCount: 12600,
    introducedInWeek: 5,
    quizStem:
      "The user presses Home. What is the difference in behaviour between the two?",
    quizCode: `val state by viewModel.state.collectAsState()
val state by viewModel.state.collectAsStateWithLifecycle()`,
    choices: [
      {
        id: "a",
        body: "None — the composition is not active, so neither collects.",
        correct: false,
        rationale:
          "The composition survives backgrounding. `collectAsState` keeps its collector alive, which is exactly the problem.",
      },
      {
        id: "b",
        body: "`collectAsState` keeps collecting; `collectAsStateWithLifecycle` stops at onStop and resumes at onStart.",
        correct: true,
        rationale:
          "The lifecycle-aware variant wraps collection in `repeatOnLifecycle`. That both stops needless work and lets `WhileSubscribed` in the ViewModel actually fire.",
      },
      { id: "c", body: "`collectAsStateWithLifecycle` throws if used outside an Activity.", correct: false, rationale: "It reads a `LifecycleOwner` from a composition local; in a normal Android app one is always present." },
      { id: "d", body: "They differ only in the initial value parameter.", correct: false, rationale: "Both take an initial value. The difference is lifecycle awareness." },
    ],
    solution: {
      mentalModel:
        "Collection is a subscription. A subscription should live exactly as long as the UI that needs it is visible.",
      whyItWorks: [
        "`repeatOnLifecycle(STARTED)` cancels and restarts collection around the visibility window.",
        "The subscriber count dropping is what triggers `SharingStarted.WhileSubscribed` upstream.",
      ],
      commonMistakes: [
        "Using `collectAsState` alongside `WhileSubscribed(5_000)` and wondering why the upstream never stops.",
        "Forgetting the `androidx.lifecycle:lifecycle-runtime-compose` dependency.",
      ],
      inProduction: "`collectAsStateWithLifecycle()` is the default recommendation on Android; `collectAsState` remains correct on other Compose targets.",
      followUps: ["Why is there no lifecycle-aware variant in the Compose multiplatform core?"],
    },
  },
  {
    id: "cp09",
    slug: "modifier-order",
    title: "Modifier Order Is Semantic",
    description: "Two chains, same modifiers, visibly different results.",
    difficulty: "Easy",
    format: "quiz",
    track: "Compose",
    topics: ["compose"],
    stage: "predict",
    concepts: ["recomposition"],
    estimatedMinutes: 6,
    completedCount: 14900,
    introducedInWeek: 5,
    quizStem: "How do these two differ?",
    quizCode: `Modifier.padding(16.dp).background(Red).clickable { }
Modifier.background(Red).padding(16.dp).clickable { }`,
    choices: [
      {
        id: "a",
        body: "The first paints red inside the padding; the second paints red including the padding, and its clickable area is smaller.",
        correct: true,
        rationale:
          "Modifiers apply outside-in for layout and inside-out for drawing. In the first, padding shrinks the area before the background is drawn. In the second, the background covers the full area, and the later `padding` shrinks what `clickable` receives.",
      },
      { id: "b", body: "No visual difference; order is a style preference.", correct: false, rationale: "Order is the composition of wrappers — it is semantic, and visibly so." },
      { id: "c", body: "The second does not compile.", correct: false, rationale: "Both are valid chains; `Modifier` methods return `Modifier`." },
      { id: "d", body: "Only the ripple differs; layout is identical.", correct: false, rationale: "Layout differs too: the background occupies different bounds in each case." },
    ],
    solution: {
      mentalModel:
        "Read a modifier chain as nested boxes, left to right from the outside in. Each element constrains what comes after it.",
      whyItWorks: [
        "`padding` before `background` reduces the drawing area; after it, it reduces only the content area.",
        "`clickable` captures the bounds it is handed at its position in the chain.",
      ],
      commonMistakes: [
        "`clickable` before `padding`, giving a touch target that does not match the visual one — an accessibility problem as much as a visual one.",
        "`size` after `padding` when you intended the padding to be inside the size.",
      ],
      followUps: ["Where should `clickable` sit if you want the ripple to fill the padded area?"],
    },
  },
  {
    id: "cp10",
    slug: "compose-recomposition-scope",
    title: "Reading State at the Right Level",
    description:
      "Move one read down the tree and cut recomposition scope dramatically.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Compose",
    topics: ["compose", "performance"],
    stage: "explain",
    concepts: ["recomposition"],
    estimatedMinutes: 14,
    completedCount: 5400,
    introducedInWeek: 6,
    readingCode: `// A
@Composable
fun Screen(state: ScreenState) {
    Column {
        Header(state.title)
        Counter(state.count)        // count changes 60 times a second
        ExpensiveChart(state.points)
    }
}

// B
@Composable
fun Screen(state: () -> ScreenState) {
    Column {
        Header(state().title)
        Counter(count = { state().count })
        ExpensiveChart(state().points)
    }
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "In A, what recomposes when only `count` changes?",
        expert:
          "If `ScreenState` is a data class being replaced wholesale, `Screen` itself recomposes. `Header` and `ExpensiveChart` are then re-invoked, and they skip only if their parameters are stable and equal. `ExpensiveChart` skipping depends on `points` being a stable type — if it is a plain `List`, it will not skip and the chart recomposes sixty times a second.",
        keywords: ["screen", "skip", "stable", "chart"],
      },
      {
        id: "p2",
        question: "What does the lambda in B actually change?",
        expert:
          "It defers the state *read* to the point of use. `Screen` no longer reads `state` during its own composition, so changing it does not invalidate `Screen`'s scope — only the scopes that actually call the lambda. This is 'deferred read' and it is the cheapest recomposition optimisation available, because it changes no types.",
        keywords: ["defer", "read", "scope", "invalidate"],
      },
      {
        id: "p3",
        question: "What is the cost of B?",
        expert:
          "Readability, mostly. A tree full of `() ->` parameters is harder to follow and to preview, and the lambdas must be stable or you have traded one problem for another. Apply it where measurement shows a hot path — animation values and scroll offsets are the classic cases — not as a default style.",
        keywords: ["readability", "measure", "animation"],
      },
      {
        id: "p4",
        question: "What would you try before reaching for B?",
        expert:
          "Split the state so the fast-changing part is its own parameter passed only to `Counter`; make `points` an `ImmutableList` so `ExpensiveChart` becomes skippable; and confirm with compiler metrics that the chart is actually recomposing. Those fixes preserve readability and often remove the problem entirely.",
        keywords: ["split", "immutable", "metrics"],
      },
    ],
    solution: {
      mentalModel:
        "The recomposition scope is the nearest enclosing composable function that *reads* the state. Push reads downward and scopes get smaller.",
      whyItWorks: [
        "Snapshot state records reads per composition scope; an unread state cannot invalidate that scope.",
        "Lambda parameters move the read into the callee's scope.",
      ],
      commonMistakes: ["Deferring reads everywhere without measuring.", "Passing an unstable lambda, which defeats the purpose."],
      inProduction: "`Modifier.offset { }` and `graphicsLayer { }` exist exactly to defer reads out of composition into layout and draw.",
      followUps: ["What are the three phases of a Compose frame, and which one does `offset { }` move work into?"],
    },
  },
  {
    id: "cp11",
    slug: "compose-navigation-state",
    title: "Where Does Navigation State Live?",
    description: "Model a back stack that survives process death.",
    difficulty: "Medium",
    format: "coding",
    track: "Compose",
    topics: ["compose", "lifecycle", "architecture"],
    stage: "implement",
    ownership: "implement",
    concepts: ["navigation", "compose-state", "config-change"],
    estimatedMinutes: 16,
    completedCount: 6200,
    introducedInWeek: 7,
    prompt:
      "A screen holds a selected item id in `remember`. After the process is killed in the background and restored, the user is back at the list with their selection gone. Fix it, and say which of the three storage layers you chose and why.",
    requirements: [
      "Selection survives process death",
      "No parcelable larger than a few kilobytes in saved state",
      "The ViewModel must be able to read the selection",
    ],
    relatedConcepts: ["SavedStateHandle", "rememberSaveable", "Navigation arguments"],
    starterCode: `@Composable
fun ListScreen() {
    var selectedId by remember { mutableStateOf<String?>(null) }
    ...
}`,
    solutionCode: `class ListViewModel(
    private val savedState: SavedStateHandle,
) : ViewModel() {

    val selectedId: StateFlow<String?> =
        savedState.getStateFlow("selectedId", null)

    fun select(id: String?) { savedState["selectedId"] = id }
}

// Better still, when the selection is a destination: make it a navigation
// argument. The back stack is already saved and restored for you.
composable("detail/{id}") { entry -> DetailScreen(entry.arguments!!.getString("id")!!) }`,
    tests: [
      { name: "survives process death", call: `kill and restore`, expected: `selection restored` },
      { name: "survives rotation", call: `rotate`, expected: `selection restored` },
    ],
    hints: [
      "`SavedStateHandle` writes into the same bundle the platform restores, so it survives process death.",
      "If the selection *is* the current screen, navigation already stores it.",
    ],
    solution: {
      mentalModel:
        "Three layers, three lifetimes: composition (`remember`), saved state (`rememberSaveable` / `SavedStateHandle`), and persistent storage (DataStore / Room). Pick the shortest one that satisfies the requirement.",
      whyItWorks: [
        "`SavedStateHandle.getStateFlow` gives an observable value that is automatically saved.",
        "Navigation arguments live in the back stack, which the framework saves and restores.",
      ],
      commonMistakes: [
        "Putting large objects in saved state and hitting `TransactionTooLargeException` — store ids and re-read.",
        "Duplicating the same value in `rememberSaveable` and `SavedStateHandle`, so they can disagree.",
        "Treating process death as rare. On low-memory devices it is routine, and testing it requires 'Don't keep activities'.",
      ],
      followUps: ["How would you test process-death restoration in an instrumented test?"],
    },
  },
  {
    id: "cp12",
    slug: "compose-text-field-state-loop",
    title: "The Text Field That Fights the User",
    description: "Characters vanish while typing quickly. Diagnose the loop.",
    difficulty: "Medium",
    format: "debugging",
    track: "Compose",
    topics: ["compose", "flow", "viewmodel"],
    stage: "predict",
    ownership: "improve",
    concepts: ["compose-state", "recomposition", "udf"],
    estimatedMinutes: 15,
    completedCount: 7100,
    introducedInWeek: 6,
    symptom:
      "Typing quickly, characters occasionally disappear or the cursor jumps to the end mid-word. Typing slowly works perfectly.",
    brokenCode: `@Composable
fun SearchBar(viewModel: SearchViewModel) {
    val query by viewModel.query.collectAsStateWithLifecycle()

    TextField(
        value = query,
        onValueChange = viewModel::onQueryChange,   // hops to the ViewModel and back
    )
}`,
    debugHints: [
      { label: "Hint 1", body: "The value shown is not the value the user typed — it is whatever came back. How long does that round trip take?" },
      { label: "Hint 2", body: "Keystroke → onQueryChange → StateFlow emit → recomposition → TextField value. What arrives in the meantime?" },
      { label: "Hint 3", body: "`TextField(value: String)` carries no selection information, so every update resets the cursor." },
    ],
    rootCause:
      "The field's displayed value round-trips through a StateFlow. That trip is asynchronous, so a keystroke arriving during it is applied to a value that is already stale, and the older value overwrites the newer. Separately, the `String`-based `TextField` overload has no cursor information, so every externally-driven update moves the caret to the end.",
    fixedCode: `// 1. Keep the text where it is typed; send it onward without owning it there.
@Composable
fun SearchBar(viewModel: SearchViewModel) {
    val state = rememberTextFieldState()

    LaunchedEffect(state) {
        snapshotFlow { state.text.toString() }
            .debounce(300)
            .collect(viewModel::onQueryChange)
    }

    TextField(state = state)     // BasicTextField2-style API, owns its own editing state
}

// 2. If you must hoist, use the TextFieldValue overload so selection
//    travels with the text:
var value by remember { mutableStateOf(TextFieldValue("")) }
TextField(value = value, onValueChange = { value = it; viewModel.onQueryChange(it.text) })`,
    productionImplications: [
      "Text input is the one place where the strict unidirectional round trip through a ViewModel causes real user-visible harm.",
      "The current Compose text field APIs own their editing state deliberately, for exactly this reason.",
      "Debouncing on the way *out* keeps the field responsive while still limiting downstream work.",
    ],
    solution: {
      mentalModel:
        "Editing state is not application state. Let the field own the text; tell the ViewModel about it as an event, not as a source of truth.",
      whyItWorks: [
        "Local state updates synchronously, so no keystroke can be overwritten by a stale value.",
        "`snapshotFlow` turns the local state into a flow without making the ViewModel the owner.",
      ],
      commonMistakes: [
        "Hoisting text to the ViewModel 'for consistency' and shipping a field that drops characters on slow devices.",
        "Using the `String` overload when the cursor position matters.",
      ],
      followUps: ["When *is* it right for the ViewModel to own text? (Validation-driven transforms — and then use `TextFieldValue`.)"],
    },
  },
  {
    id: "cp13",
    slug: "compose-preview-and-testing",
    title: "Make a Screen Previewable",
    description: "If it cannot be previewed, it probably cannot be tested either.",
    difficulty: "Easy",
    format: "coding",
    track: "Compose",
    topics: ["compose", "testing"],
    stage: "implement",
    ownership: "implement",
    concepts: ["viewmodel"],
    estimatedMinutes: 12,
    completedCount: 8900,
    introducedInWeek: 5,
    prompt:
      "A screen composable takes a ViewModel, so it cannot be previewed and cannot be tested without one. Split it into the standard two-layer shape.",
    requirements: [
      "A stateful route composable that takes the ViewModel",
      "A stateless content composable that takes state and callbacks",
      "Previews for loading, success and error",
    ],
    relatedConcepts: ["Route/Screen split", "PreviewParameter", "Testability"],
    starterCode: `@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    // ...everything inline
}`,
    solutionCode: `@Composable
fun ProfileRoute(viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    ProfileScreen(state = state, onRetry = viewModel::retry)
}

@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) { /* pure function of state */ }

@Preview
@Composable
private fun ProfilePreview(
    @PreviewParameter(ProfileStateProvider::class) state: ProfileUiState,
) {
    AcademyTheme { ProfileScreen(state = state, onRetry = {}) }
}`,
    tests: [
      { name: "previews render", call: `all three states`, expected: `no ViewModel required` },
      { name: "screen test drives state directly", call: `setContent { ProfileScreen(Error("x"), {}) }`, expected: `error shown` },
    ],
    hints: [
      "The route is the only place allowed to know about the ViewModel.",
      "`@PreviewParameter` with a provider gives you every state from one preview function.",
    ],
    solution: {
      mentalModel:
        "Route = wiring. Screen = rendering. Only the route knows where state comes from, so only the route is hard to test — and it contains nothing worth testing.",
      whyItWorks: [
        "A stateless screen is a pure function: same state, same tree, every time.",
        "Previews double as a visual test suite for states that are awkward to reach at runtime.",
      ],
      commonMistakes: [
        "Passing the ViewModel down into child composables.",
        "Writing one preview for the happy path only — the error state is the one nobody has ever looked at.",
      ],
      followUps: ["How would you screenshot-test these previews in CI?"],
    },
  },
  {
    id: "cp14",
    slug: "compose-animation-basics",
    title: "animate*AsState and Interruption",
    description: "What happens when the target changes mid-animation.",
    difficulty: "Medium",
    format: "quiz",
    track: "Compose",
    topics: ["compose"],
    stage: "explain",
    concepts: ["recomposition", "compose-state"],
    estimatedMinutes: 7,
    completedCount: 7400,
    introducedInWeek: 6,
    quizStem:
      "An `animateFloatAsState` is animating from 0f to 1f. Halfway through, the target changes to 0f. What happens?",
    choices: [
      {
        id: "a",
        body: "It jumps to 1f, then animates to 0f.",
        correct: false,
        rationale: "Nothing jumps. Jumping is exactly what the animation system is designed to prevent.",
      },
      {
        id: "b",
        body: "It retargets from its current value and velocity toward 0f.",
        correct: true,
        rationale:
          "The animation is interruptible: it continues from wherever it is, preserving velocity with spring specs. That is why gesture-driven UI built on it feels natural rather than stepped.",
      },
      { id: "c", body: "It completes to 1f before starting the new animation.", correct: false, rationale: "That would introduce latency proportional to the animation duration — the opposite of responsive." },
      { id: "d", body: "It throws, because the target changed during an animation.", correct: false, rationale: "Changing the target is the normal way to drive these animations." },
    ],
    solution: {
      mentalModel:
        "`animate*AsState` is a state holder that continuously chases a target. It has no notion of 'an animation in progress' that could be interrupted incorrectly.",
      whyItWorks: [
        "Spring specs carry velocity across retargeting, which is what makes the motion feel physical.",
        "The composable reads a value that simply changes each frame — no animation lifecycle to manage.",
      ],
      commonMistakes: [
        "Reaching for `Animatable` and manual coroutines when the declarative API already handles interruption.",
        "Animating a value in composition when `graphicsLayer` would keep the work out of the composition phase.",
      ],
      followUps: ["When do you actually need `Animatable` rather than `animate*AsState`?"],
    },
  },
  {
    id: "cp15",
    slug: "compose-list-performance",
    title: "A Feed That Drops Frames",
    description:
      "Four candidate causes. Work out which one the evidence supports.",
    difficulty: "Hard",
    format: "code-reading",
    track: "Compose",
    topics: ["compose", "performance"],
    stage: "explain",
    concepts: ["compose-stability", "recomposition"],
    estimatedMinutes: 18,
    completedCount: 4200,
    introducedInWeek: 11,
    readingCode: `@Composable
fun Feed(posts: List<Post>, onLike: (String) -> Unit) {
    val formatter = SimpleDateFormat("HH:mm", Locale.getDefault())

    LazyColumn {
        items(posts) { post ->
            PostRow(
                post = post,
                time = formatter.format(post.date),
                onLike = { onLike(post.id) },
            )
        }
    }
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "How often is the `SimpleDateFormat` constructed, and why does that matter?",
        expert:
          "Once per recomposition of `Feed` — and `SimpleDateFormat` construction is genuinely expensive, parsing a pattern and loading locale data. It should be `remember { }`ed, or hoisted out entirely. It is also not thread-safe, which is a separate hazard.",
        keywords: ["every recomposition", "remember", "expensive"],
      },
      {
        id: "p2",
        question: "What is wrong with `onLike = { onLike(post.id) }`?",
        expert:
          "A new lambda instance per item per recomposition. Because it captures `post.id`, the compiler cannot treat it as a stable constant, so `PostRow` never skips. Passing `onLike` down unchanged and calling it with the id inside `PostRow` — or remembering the lambda keyed on the id — fixes it.",
        keywords: ["lambda", "new instance", "unstable", "skip"],
      },
      {
        id: "p3",
        question: "Two further problems are visible. Name them.",
        expert:
          "First, `items(posts)` has no `key`, so item identity is positional — state and animations attach to the wrong rows on insert. Second, `posts: List<Post>` is an unstable parameter type, so `Feed` itself is unskippable and recomposes with its parent.",
        keywords: ["key", "unstable", "list"],
      },
      {
        id: "p4",
        question: "Which one would you fix first, and how would you know you were right?",
        expert:
          "Measure first. Run a Macrobenchmark scroll with `FrameTimingMetric` and check the compiler metrics report. In most feeds the formatter allocation and the missing key dominate, but the point is that all four are hypotheses until the trace says otherwise. Fixing four things at once tells you nothing about which mattered.",
        keywords: ["measure", "benchmark", "metrics", "one at a time"],
      },
    ],
    solution: {
      mentalModel:
        "List jank is nearly always one of: work done in composition that should be remembered, unstable parameters defeating skipping, missing keys, or heavy work in the item body.",
      whyItWorks: [
        "`remember` moves construction out of the recomposition path.",
        "Stable parameters and keys let the runtime do the skipping it was designed to do.",
      ],
      commonMistakes: ["Optimising without measuring.", "Fixing everything at once and learning nothing."],
      complexity: { time: "Per-frame budget is 16ms at 60Hz, 8ms at 120Hz", space: "Allocation churn drives GC pauses" },
      followUps: ["What does `Modifier.graphicsLayer` move out of composition, and when does that help?"],
    },
  },
];
