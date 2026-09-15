import type { Lesson } from "@/lib/types";

export const DAY_1: Lesson = {
  id: "day-1",
  slug: "day-1",
  dayNumber: 1,
  moduleId: "m01",
  title: "Kotlin Collections + UI State + Data Flow",
  subtitle: "Day 1 · Module 01 — Kotlin Foundations",
  goal:
    "Understand how Kotlin transforms data, and how that data becomes Android UI state.",
  concepts: [
    "List vs MutableList",
    "val vs var",
    "map",
    "filter",
    "mapNotNull",
    "associateBy",
    "groupBy",
    "firstOrNull",
    "nullability",
  ],
  totalMinutes: 120,
  sections: [
    /* ------------------------------------------------------------- */
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
            "Two declarations. They look almost identical and they are not. Before reading anything else, say out loud what the difference is — including what each one prevents.",
          ],
        },
        {
          id: "w-code",
          kind: "code",
          code: {
            language: "kotlin",
            code: `val a = listOf(1, 2, 3)
val b = mutableListOf(1, 2, 3)`,
          },
        },
        {
          id: "w-explain",
          kind: "explain",
          question:
            "What is the difference between a and b? Be specific about what each one prevents, and what neither of them prevents.",
          answer:
            "`a` is a `List<Int>` — a read-only *interface*. Through that reference you cannot add, remove or set. `b` is a `MutableList<Int>`, which adds those operations.\n\nThe part most people miss: read-only is not immutable. `listOf` happens to return an implementation nobody else can mutate, but a `List` parameter you receive may well be a `MutableList` held by someone else. And `val` on either one prevents only reassignment of the reference — it says nothing at all about the contents.",
        },
        {
          id: "w-code-2",
          kind: "code",
          title: "Now this one",
          code: {
            language: "kotlin",
            code: `val users = mutableListOf("Alex", "Sam")
users.add("Jordan")`,
          },
        },
        {
          id: "w-quiz",
          kind: "quiz",
          question: "Does this compile?",
          choices: [
            {
              id: "a",
              body: "No — `users` is a `val`.",
              correct: false,
              rationale:
                "This is the intuition almost everyone arrives with, and it is the one worth dismantling today. `val` forbids `users = somethingElse`. It has nothing to say about calling a method on the object.",
            },
            {
              id: "b",
              body: "Yes — `val` fixes the reference, not the object.",
              correct: true,
              rationale:
                "Correct. `users` will always point at the same list. That list is a `MutableList`, so it can change. Two separate decisions, made in two separate places.",
            },
            {
              id: "c",
              body: "Yes, but `add` returns a new list.",
              correct: false,
              rationale:
                "`MutableList.add` mutates in place and returns `Boolean`. The operators that return new lists — `plus`, `map`, `filter` — are the non-mutating ones.",
            },
          ],
        },
        {
          id: "w-teach",
          kind: "callout",
          tone: "insight",
          title: "The sentence to remember",
          body: [
            "`val` means the reference cannot be reassigned.",
            "It does **not** mean the referenced object is immutable.",
            "Mutability is a property of the type on the right-hand side. Immutability is a property you have to choose.",
          ],
        },
        {
          id: "w-diagram",
          kind: "mutation",
          title: "What actually happened",
          steps: [
            { label: "Before users.add(\"Jordan\")", items: ["Alex", "Sam"] },
            { label: "After users.add(\"Jordan\")", items: ["Alex", "Sam", "Jordan"] },
          ],
          body: [
            "The arrow labelled `users` never moved. The box it points at grew. `val` guards the arrow; the type of the box guards the contents.",
          ],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "learn",
      title: "Learn",
      kicker: "Transformations and the shapes they produce",
      startMinute: 10,
      endMinute: 35,
      blocks: [
        {
          id: "l-intro",
          kind: "prose",
          body: [
            "Every collection operator answers one question: what shape comes out? Choose by the shape you need, and most of these decisions stop being a matter of taste.",
            "Start with the two you already know, and predict before you run.",
          ],
        },
        {
          id: "l-predict",
          kind: "predict",
          title: "Predict the result",
          code: {
            language: "kotlin",
            code: `val numbers = listOf(1, 2, 3, 4, 5)

val result = numbers
    .filter { it % 2 == 0 }
    .map { it * 10 }`,
          },
          question: "What is in `result`? Write it exactly.",
          expected: "[20, 40]",
          answer:
            "`[20, 40]`. `filter` keeps 2 and 4; `map` multiplies each by ten. Two operators, two new lists, and `numbers` is untouched throughout.",
        },
        {
          id: "l-pipeline",
          kind: "pipeline",
          title: "The chain, one stage at a time",
          stages: [
            { label: "[1, 2, 3, 4, 5]", caption: "source" },
            { label: "filter { it % 2 == 0 }", caption: "keeps evens" },
            { label: "[2, 4]", caption: "a new list" },
            { label: "map { it * 10 }", caption: "transforms each" },
            { label: "[20, 40]", caption: "another new list" },
          ],
          body: [
            "Each stage materialises a complete list before the next one begins. Two intermediate allocations here — irrelevant for five elements, and worth knowing about for fifty thousand.",
            "This is also why order matters: filtering first means `map` runs twice instead of five times.",
          ],
        },
        {
          id: "l-order",
          kind: "compare",
          title: "Order is a decision",
          compare: [
            {
              label: "filter, then map",
              code: `numbers
    .filter { it % 2 == 0 }
    .map { expensive(it) }`,
              verdict:
                "`expensive` runs twice. Discard early; transform what survives.",
            },
            {
              label: "map, then filter",
              code: `numbers
    .map { expensive(it) }
    .filter { it.isEven }`,
              verdict:
                "`expensive` runs five times and three results are thrown away. Sometimes unavoidable — but it should be a choice, not an accident.",
            },
          ],
        },
        {
          id: "l-mapnotnull",
          kind: "code",
          title: "mapNotNull — transform and drop in one pass",
          code: {
            language: "kotlin",
            code: `val raw = listOf("1", "two", "3")

// Three passes, and a !! you should not have to write.
val a = raw.map { it.toIntOrNull() }.filter { it != null }.map { it!! }

// One pass, no !!, and the type is List<Int> rather than List<Int?>.
val b = raw.mapNotNull { it.toIntOrNull() }   // [1, 3]`,
          },
          body: [
            "`mapNotNull` exists because 'transform, and drop the ones that failed' is a single idea. Writing it as three operators forces a nullable intermediate type and invites `!!`.",
          ],
        },
        {
          id: "l-shapes",
          kind: "compare",
          title: "associateBy vs map — the shape is the whole point",
          compare: [
            {
              label: "map",
              code: `users.map { it.name }

List<User>
    ↓
List<String>`,
              verdict:
                "Same shape, different element type. Use it when you want a list of something derived.",
            },
            {
              label: "associateBy",
              code: `users.associateBy { it.id }

List<User>
    ↓
Map<Int, User>`,
              verdict:
                "Different shape entirely — an index. Use it the moment you are about to search a list more than once.",
            },
          ],
        },
        {
          id: "l-associate-why",
          kind: "callout",
          tone: "why",
          title: "Why this matters more than it looks",
          body: [
            "`feedIds.map { id -> users.find { it.id == id } }` is quadratic and returns `List<User?>`.",
            "`users.associateBy { it.id }` once, then `feedIds.mapNotNull(byId::get)`, is linear and returns `List<User>`.",
            "Same output on ten items. On a thousand, one of them is a bug report about scrolling.",
            "One caveat to keep in mind: duplicate keys mean last-one-wins, silently. When ids might repeat, `groupBy` makes the duplication visible instead of discarding it.",
          ],
        },
        {
          id: "l-groupby",
          kind: "code",
          title: "groupBy — one key, many values",
          code: {
            language: "kotlin",
            code: `val byStatus: Map<Status, List<Order>> = orders.groupBy { it.status }

// Aggregating? Skip the intermediate lists entirely:
val totals: Map<String, Double> = orders
    .groupingBy { it.customerId }
    .fold(0.0) { sum, order -> sum + order.amount }`,
          },
          body: [
            "`groupBy` materialises a list per key. `groupingBy` is lazy and folds as it goes. Reach for the first when you need the groups themselves, the second when you only want the aggregate.",
          ],
        },
        {
          id: "l-firstornull",
          kind: "code",
          title: "firstOrNull — absence as a value, not an exception",
          code: {
            language: "kotlin",
            code: `val admin = users.firstOrNull { it.isAdmin }   // User?
val name = admin?.name ?: "No admin assigned"

// first { } throws NoSuchElementException when nothing matches.
// Use it only where absence genuinely is a programming error.`,
          },
        },
        {
          id: "l-summary",
          kind: "callout",
          tone: "insight",
          title: "The rule for today",
          body: [
            "Pick the operator whose **return type** is the shape you need, then order the chain so the cheapest filters run first.",
            "If you cannot say what type comes out of each stage, you do not yet understand the chain — and neither will the next reader.",
          ],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "drills",
      title: "Kotlin Drills",
      kicker: "Short, sharp, no partial credit",
      startMinute: 35,
      endMinute: 50,
      blocks: [
        {
          id: "d-1",
          kind: "predict",
          title: "Drill 1",
          code: {
            language: "kotlin",
            code: `listOf("a", "bb", "ccc").associateBy { it.length }`,
          },
          question: "What is the resulting value?",
          expected: "{1=a, 2=bb, 3=ccc}",
          answer:
            "`{1=a, 2=bb, 3=ccc}` — a `Map<Int, String>` keyed by length. Note what would happen with `listOf(\"a\", \"b\")`: both have length 1, so the map holds `{1=b}`. Last one wins, silently.",
        },
        {
          id: "d-2",
          kind: "predict",
          title: "Drill 2",
          code: {
            language: "kotlin",
            code: `listOf(1, 2, 3)
    .flatMap { listOf(it, it * 10) }`,
          },
          question: "What comes out?",
          expected: "[1, 10, 2, 20, 3, 30]",
          answer:
            "`[1, 10, 2, 20, 3, 30]`. `flatMap` lets each input produce any number of outputs and flattens one level. `map` here would have given you `List<List<Int>>`.",
        },
        {
          id: "d-3",
          kind: "predict",
          title: "Drill 3",
          code: {
            language: "kotlin",
            code: `val names = listOf("Alex", null, "Sam", null)
names.mapNotNull { it?.uppercase() }`,
          },
          question: "Result?",
          expected: "[ALEX, SAM]",
          answer:
            "`[ALEX, SAM]`. The safe call yields null for null entries, and `mapNotNull` drops them. The result type is `List<String>`, not `List<String?>` — which is the real payoff.",
        },
        {
          id: "d-4",
          kind: "predict",
          title: "Drill 4",
          code: {
            language: "kotlin",
            code: `listOf(1, 2, 3, 4).fold(0) { acc, n -> acc + n }`,
          },
          question: "Result? And what would `reduce` do differently on an empty list?",
          expected: "10",
          answer:
            "`10`. `fold` has a seed, so an empty list returns `0`. `reduce` seeds from the first element, so on an empty list it throws `UnsupportedOperationException` — and it cannot change the accumulator type.",
        },
        {
          id: "d-5",
          kind: "explain",
          title: "Drill 5",
          question:
            "`users.map { it.name }` and `users.associateBy { it.name }` both involve names. When would you reach for each, and what could go wrong with the second?",
          answer:
            "`map` when you want a list of names to display or join. `associateBy` when you need to look users up *by* name repeatedly — it builds an index, turning repeated O(n) searches into O(1) lookups.\n\nThe hazard with `associateBy { it.name }` is that names are not unique. Duplicate keys silently overwrite, so two users called Alex become one entry and you lose data with no error. Key by something actually unique, or use `groupBy` and handle the collision deliberately.",
          keywords: ["index", "lookup", "duplicate", "unique", "overwrite"],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "mental-model",
      title: "Android Mental Model",
      kicker: "Where the data goes once it arrives",
      startMinute: 50,
      endMinute: 70,
      blocks: [
        {
          id: "m-intro",
          kind: "prose",
          body: [
            "Everything you just practised exists in Android for one reason: data arrives in the shape a server chose, and it has to reach the screen in the shape the screen needs. Every arrow below is a transformation you now know how to write.",
          ],
        },
        {
          id: "m-pipeline",
          kind: "pipeline",
          title: "The pipeline",
          stages: [
            { label: "API", caption: "JSON over HTTP" },
            { label: "DTO", caption: "mirrors the server's schema exactly" },
            { label: "Repository", caption: "decides where data comes from" },
            { label: "Domain Model", caption: "what the feature means" },
            { label: "ViewModel", caption: "owns screen state" },
            { label: "UiState", caption: "exactly what the screen renders" },
            { label: "Compose", caption: "draws it" },
          ],
        },
        {
          id: "m-question",
          kind: "explain",
          title: "The question of the day",
          question:
            "Why shouldn't Compose necessarily consume the API DTO directly?",
          answer:
            "Four reasons, in increasing order of importance.\n\n**1. Nullability.** DTO fields are nullable because the server might omit them. Pushing that to the UI means every composable handles `String?` and decides what a missing merchant looks like — in several places, differently.\n\n**2. Shape.** The DTO carries fields the screen does not need and lacks fields it does — a formatted amount, a display name, a relative timestamp. Computing those inside a composable means recomputing them on every recomposition.\n\n**3. Coupling.** If the composable reads `response.merchant`, a server rename to `merchant_name` becomes a UI change. The mapper is the shock absorber: rename it in one place and everything downstream is unaffected.\n\n**4. Stability.** In Compose, parameter types decide whether a composable can skip recomposition. A DTO full of nullable fields and plain `List`s is unlikely to be stable. A purpose-built UI model can be.\n\nThe honest counterpoint: on a settings toggle with one boolean, three models is ceremony. The rule is that the layers exist when they have separate reasons to change — not because a diagram says so.",
          keywords: ["nullability", "coupling", "shape", "stability", "rename"],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "ui-state",
      title: "UI State",
      kicker: "Make impossible states impossible",
      startMinute: 70,
      endMinute: 85,
      blocks: [
        {
          id: "u-compare",
          kind: "compare",
          title: "Two ways to describe one screen",
          compare: [
            {
              label: "Three independent fields",
              code: `var isLoading: Boolean
var user: User?
var error: String?`,
              verdict:
                "2 × 2 × 2 = 8 combinations. Three are meaningful. The other five are bugs waiting for a reviewer to miss them.",
            },
            {
              label: "A sealed hierarchy",
              code: `sealed interface UserUiState {
    data object Loading : UserUiState
    data class Success(val user: UserUiModel) : UserUiState
    data class Error(val message: String) : UserUiState
}`,
              verdict:
                "Three states. The other five cannot be constructed, so no test, no reviewer and no future edit can produce them.",
            },
          ],
        },
        {
          id: "u-impossible",
          kind: "callout",
          tone: "warning",
          title: "The five impossible states",
          body: [
            "`isLoading = true` **and** `user != null` — showing a spinner over data. Which wins?",
            "`isLoading = true` **and** `error != null` — loading and failed at once.",
            "`user != null` **and** `error != null` — succeeded and failed at once.",
            "All three set. All three null — a blank screen with no explanation.",
            "Each one is a real crash or a real blank screen that someone has shipped. The sealed type removes them at compile time rather than at review time.",
          ],
        },
        {
          id: "u-code",
          kind: "code",
          title: "Consuming it",
          code: {
            language: "kotlin",
            code: `@Composable
fun UserScreen(state: UserUiState) {
    when (state) {                       // exhaustive — no else branch
        UserUiState.Loading -> LoadingSpinner()
        is UserUiState.Success -> UserCard(state.user)
        is UserUiState.Error -> ErrorMessage(state.message, onRetry = ...)
    }
}`,
          },
          body: [
            "No `else`. That is deliberate: adding a fourth state should break the build here, because this is a place that must decide what to draw.",
          ],
        },
        {
          id: "u-nuance",
          kind: "callout",
          tone: "why",
          title: "Where the pure sealed version stops working",
          body: [
            "As soon as a screen must show data *and* refresh *and* a stale-data banner, states start multiplying: `SuccessRefreshing`, `SuccessWithError`, and so on.",
            "At that point move to a hybrid — `data class ScreenState(val content: Content, val isRefreshing: Boolean, val banner: Banner?)` — where the sealed part models what is on screen and the flags model orthogonal facts.",
            "Knowing when to leave a pattern is worth more than knowing the pattern.",
          ],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "code-reading",
      title: "Code Reading",
      kicker: "Read it the way you would read it in a review",
      startMinute: 85,
      endMinute: 95,
      blocks: [
        {
          id: "cr-code",
          kind: "code",
          title: "Production mapper",
          code: {
            language: "kotlin",
            code: `fun List<TransactionResponse>.toUiModels(): List<TransactionUiModel> =
    asSequence()
        .filterNot { it.pending }
        .filter { it.amount != 0.0 }
        .sortedByDescending { it.amount }
        .map { response ->
            TransactionUiModel(
                id = response.id,
                merchantName = response.merchant ?: "Unknown merchant",
                amountText = currencyFormatter.format(response.amount),
            )
        }
        .toList()`,
          },
        },
        {
          id: "cr-q1",
          kind: "explain",
          question: "Why is this an extension function rather than a method on a mapper class?",
          answer:
            "Because it needs no state, and because the dependency direction stays correct: `TransactionResponse` knows nothing about `TransactionUiModel`, and the extension lives in the layer that knows about both. It also reads as `responses.toUiModels()` at the call site, which is what it means.\n\nThe counter-argument is injectability — a class can be replaced in tests and can take a locale-aware formatter as a constructor parameter. Here the formatter is a captured top-level value, which is exactly the weakness of this version.",
          keywords: ["stateless", "dependency", "injectable", "extension"],
        },
        {
          id: "cr-q2",
          kind: "explain",
          question:
            "It uses `asSequence()`. Is that a good decision on a list of thirty transactions?",
          answer:
            "Almost certainly not. A sequence adds per-element iterator overhead and wins only with large inputs, expensive per-element work, or a short-circuiting terminal like `first()`. There is none of that here.\n\nWorse, `sortedByDescending` is a *stateful* operator: it must buffer every element before it can emit anything, which discards the laziness the sequence was added for. This is a sequence that costs more than the list version and buys nothing.",
          keywords: ["overhead", "small", "sorted", "stateful", "buffer"],
        },
        {
          id: "cr-q3",
          kind: "explain",
          question: "What breaks if `sortedByDescending` is moved after `map`?",
          answer:
            "It becomes wrong, not just slower. After `map`, the amount is a formatted `String`, so sorting compares text: `\"$9.00\"` sorts after `\"$50.00\"` because `'9' > '5'`. The list would be ordered plausibly enough that nobody notices until a customer does.\n\nThis is the general rule: sort on the value, format for display, and never reverse the two.",
          keywords: ["string", "lexicographic", "wrong", "format"],
        },
        {
          id: "cr-q4",
          kind: "explain",
          question: "What would you change before approving this?",
          answer:
            "Three things. Drop `asSequence()`/`toList()` — they cost and give nothing here. Inject the formatter rather than capturing a top-level one, so locale is testable and the mapper is pure. And question `Double` for money: floating point plus currency is a defect waiting for a rounding boundary, so minor units in a `Long` or a `BigDecimal` belongs on the list.\n\nThe filtering and ordering, though, are exactly right — and that is the part most reviews get wrong.",
          keywords: ["sequence", "inject", "double", "money"],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "implement",
      title: "Implementation Challenge",
      kicker: "Write it, then justify every line",
      startMinute: 95,
      endMinute: 105,
      blocks: [
        {
          id: "i-intro",
          kind: "prose",
          body: [
            "Everything from the last ninety minutes, in one function. Open the editor, write it, run the tests — then come back and answer the question underneath, which is the part that actually matters.",
          ],
        },
        {
          id: "i-challenge",
          kind: "implement",
          title: "Map transactions for display",
          questionSlug: "dto-to-ui-model",
          body: [
            "Remove pending transactions. Remove zero-amount transactions. Use \"Unknown merchant\" where the merchant is null. Sort highest amount first. Do not mutate the input.",
          ],
        },
        {
          id: "i-justify",
          kind: "explain",
          question:
            "Why did you choose that order of collection operations? Which swaps would merely be slower, and which would be incorrect?",
          answer:
            "**Slower but correct:** swapping the two filters. Both are cheap boolean tests, so the order barely matters — though putting the cheapest predicate first is a reasonable habit.\n\n**Incorrect:** sorting after mapping. Once the amount is a formatted string, sorting is lexicographic and the order is wrong. Also incorrect in effect: mapping before filtering, which allocates UI models for rows that are then discarded — correct output, wasted work, and on a large list a measurable one.\n\nThe underlying principle: discard early, transform late, and never sort on a value you have already turned into text.",
          keywords: ["filter first", "sort before map", "lexicographic", "allocate"],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: "interview",
      title: "Interview Problem",
      kicker: "The space–time trade, made explicit",
      startMinute: 105,
      endMinute: 120,
      blocks: [
        {
          id: "iv-intro",
          kind: "prose",
          body: [
            "Fifteen minutes. Brute force first — out loud, without apology — then improve it and say precisely what you traded.",
          ],
        },
        {
          id: "iv-signature",
          kind: "code",
          title: "Contains Duplicate",
          code: {
            language: "kotlin",
            code: `fun containsDuplicate(nums: IntArray): Boolean`,
          },
        },
        {
          id: "iv-brute",
          kind: "compare",
          title: "Two approaches",
          compare: [
            {
              label: "Brute force",
              code: `for (i in nums.indices)
    for (j in i + 1 until nums.size)
        if (nums[i] == nums[j]) return true
return false`,
              verdict: "O(n²) time, O(1) space. Correct. Say it first — it shows you can start.",
            },
            {
              label: "HashSet",
              code: `val seen = HashSet<Int>(nums.size)
for (n in nums) if (!seen.add(n)) return true
return false`,
              verdict: "O(n) time, O(n) space. The trade is linear memory to remove a nested loop.",
            },
          ],
        },
        {
          id: "iv-insight",
          kind: "callout",
          tone: "insight",
          title: "The move being made",
          body: [
            "Brute force asks \"is this equal to anything else?\" n times.",
            "Hashing rewrites the question as \"have I seen this before?\", which a set answers in constant time.",
            "Repeated search becoming membership is one of the three or four substitutions that account for most interview problems.",
          ],
        },
        {
          id: "iv-challenge",
          kind: "implement",
          title: "Solve it",
          questionSlug: "contains-duplicate",
        },
        {
          id: "iv-followup",
          kind: "explain",
          question:
            "Time complexity? Space complexity? What trade-off are you making, and when would you refuse it?",
          answer:
            "O(n) time, O(n) space. The trade is linear extra memory in exchange for removing a nested loop.\n\nYou would refuse it when memory is the binding constraint — a very large array on a device with little headroom. Then sorting in place and scanning adjacent pairs gives O(n log n) time with O(1) extra space, at the cost of mutating the input.\n\nWorth adding: the hash set's O(1) is *expected*, not worst case. Under adversarial input all keys can collide and operations degrade to O(n). It almost never matters in practice, and naming it shows you know what the average-case claim rests on.",
          keywords: ["o(n)", "space", "trade", "sort", "expected", "worst case"],
        },
        {
          id: "iv-close",
          kind: "callout",
          tone: "insight",
          title: "Day 1 complete",
          body: [
            "You can now say what `val` guarantees, choose an operator by its return type, order a chain deliberately, explain why a DTO should not reach a composable, and model state so impossible combinations cannot be built.",
            "Tomorrow: sealed hierarchies in depth, and the first ViewModel.",
          ],
        },
      ],
    },
  ],
};

export const LESSONS: Lesson[] = [DAY_1];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
