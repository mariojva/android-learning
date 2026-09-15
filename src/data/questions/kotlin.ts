import type { Question } from "@/lib/types";

/* 15 of 30 Kotlin questions — language semantics and collections. */

export const KOTLIN_QUESTIONS: Question[] = [
  {
    id: "k01",
    slug: "list-vs-mutable-list",
    title: "List vs MutableList",
    description:
      "Decide what each declaration actually guarantees, then write the function that cannot betray its caller.",
    difficulty: "Warmup",
    format: "coding",
    track: "Kotlin",
    topics: ["kotlin", "collections"],
    estimatedMinutes: 10,
    completedCount: 24100,
    introducedInWeek: 1,
    prompt:
      "`List<T>` is a read-only *interface*, not an immutable collection. A `List` handed to you may be a `MutableList` underneath, held by someone who can still change it. Write a function that takes a list of names and returns a defensive, read-only copy with blanks removed.",
    requirements: [
      "Return type must be `List<String>`, not `MutableList<String>`",
      "Drop entries that are blank after trimming",
      "Trim the entries you keep",
      "The returned list must not change if the caller later mutates the input",
    ],
    examples: [
      {
        input: `cleanNames(mutableListOf(" Alex ", "", "Sam"))`,
        output: `["Alex", "Sam"]`,
      },
    ],
    constraints: ["Do not mutate the input", "No third-party libraries"],
    relatedConcepts: ["Read-only vs immutable", "Defensive copies", "Variance of List<out E>"],
    starterCode: `fun cleanNames(names: List<String>): List<String> {
    // Return a read-only copy with blanks removed and entries trimmed.
    TODO()
}`,
    solutionCode: `fun cleanNames(names: List<String>): List<String> =
    names
        .map(String::trim)
        .filter { it.isNotEmpty() }
        .toList()`,
    tests: [
      { name: "removes blanks", call: `cleanNames(listOf(" Alex ", "", "Sam"))`, expected: `[Alex, Sam]` },
      { name: "trims entries", call: `cleanNames(listOf("  Jordan  "))`, expected: `[Jordan]` },
      { name: "empty input", call: `cleanNames(emptyList())`, expected: `[]` },
      { name: "all blank", call: `cleanNames(listOf("", "   "))`, expected: `[]`, hidden: true },
    ],
    hints: [
      "`map` already produces a new list — the question is whether anything downstream can reach the original.",
      "`filter` and `map` both return a fresh `List`. Which operations would *not*?",
    ],
    solution: {
      mentalModel:
        "`List` describes what you are allowed to do, not what the object is. `listOf()` returns something you cannot mutate through that reference; it says nothing about other references to the same object. Treat an incoming `List` as a view, and return a value.",
      straightforward: {
        label: "Straightforward",
        code: `fun cleanNames(names: List<String>): List<String> {
    val result = mutableListOf<String>()
    for (name in names) {
        val trimmed = name.trim()
        if (trimmed.isNotEmpty()) result.add(trimmed)
    }
    return result
}`,
      },
      improved: {
        label: "Idiomatic",
        code: `fun cleanNames(names: List<String>): List<String> =
    names
        .map(String::trim)
        .filter { it.isNotEmpty() }`,
      },
      lineByLine: [
        { line: "names.map(String::trim)", note: "Produces a new list; the caller's list is untouched." },
        { line: ".filter { it.isNotEmpty() }", note: "Filtering after trimming is what makes \"   \" disappear. Reverse the order and it survives." },
      ],
      whyItWorks: [
        "`map` and `filter` are non-mutating: each returns a freshly allocated `ArrayList` typed as `List`.",
        "Because the returned object is new, later mutation of the input cannot reach it.",
        "The declared return type `List<String>` removes mutation from the caller's API surface, which is the actual contract you wanted.",
      ],
      commonMistakes: [
        "Returning `MutableList` because the implementation happened to use one — the type is the contract.",
        "Filtering before trimming, so whitespace-only entries survive.",
        "Reaching for `toMutableList()` and mutating in place, which quietly re-introduces shared state.",
      ],
      alternatives: [
        {
          title: "mapNotNull",
          body: "`names.mapNotNull { it.trim().takeIf(String::isNotEmpty) }` does both steps in one pass. One allocation fewer, slightly denser to read.",
        },
        {
          title: "kotlinx.collections.immutable",
          body: "`persistentListOf` gives a genuinely immutable structure with structural sharing. Worth it when the list crosses a threading boundary or feeds Compose stability.",
        },
      ],
      complexity: { time: "O(n)", space: "O(n)", note: "Two passes with the idiomatic form; one with mapNotNull." },
      inProduction:
        "Repositories return `List` for exactly this reason: the UI layer should not be able to add to the list it is rendering. In Compose it matters twice over — a `MutableList` parameter is an unstable type and will defeat skipping.",
      followUps: [
        "If the caller passes a `MutableList` and mutates it on another thread while you iterate, what happens?",
        "How would you express this so Compose treats the parameter as stable?",
      ],
    },
  },
  {
    id: "k02",
    slug: "val-does-not-mean-immutable",
    title: "val Does Not Mean Immutable",
    description:
      "Predict which of four statements compile, and explain what val actually freezes.",
    difficulty: "Warmup",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin"],
    estimatedMinutes: 6,
    completedCount: 31200,
    introducedInWeek: 1,
    quizStem: "Which statement is true of the code below?",
    quizCode: `val users = mutableListOf("Alex", "Sam")
users.add("Jordan")`,
    choices: [
      {
        id: "a",
        body: "It fails to compile — `users` is declared with `val`.",
        correct: false,
        rationale:
          "`val` forbids reassigning the *reference*. Calling a method on the object it points at is unaffected, so this compiles and runs.",
      },
      {
        id: "b",
        body: "It compiles. `val` prevents reassignment of the reference, not mutation of the object.",
        correct: true,
        rationale:
          "Exactly. `users = mutableListOf()` would be the compile error. `users.add(...)` mutates the object the reference points at, which `val` says nothing about.",
      },
      {
        id: "c",
        body: "It compiles, but `add` returns a new list rather than mutating this one.",
        correct: false,
        rationale:
          "`MutableList.add` mutates in place and returns `Boolean`. The non-mutating operators — `plus`, `map`, `filter` — are the ones that return new lists.",
      },
      {
        id: "d",
        body: "It compiles only because `users` was inferred as `MutableList`; with an explicit `List` type it would still compile.",
        correct: false,
        rationale:
          "The inference part is right, the conclusion is not. Declared as `val users: List<String>`, `add` is not on the interface and the call would not compile at all.",
      },
    ],
    solution: {
      mentalModel:
        "`val` is about the arrow, not the box. The arrow cannot be pointed somewhere else; the contents of the box are governed entirely by the box's own type.",
      whyItWorks: [
        "`val` compiles to a field with no setter — reassignment is the only thing removed.",
        "Mutability of the referenced object is a property of that object's type, which is why `List` vs `MutableList` is a separate decision.",
      ],
      commonMistakes: [
        "Assuming `val` deep-freezes the value, then being surprised by a shared collection changing.",
        "Declaring `val` collections as `MutableList` by habit, which leaks mutation into every consumer.",
      ],
      followUps: [
        "What does `val` guarantee about thread safety? (Nothing, beyond safe publication of the reference itself.)",
        "How does this interact with `data class` `copy()` and nested mutable fields?",
      ],
    },
  },
  {
    id: "k03",
    slug: "map-filter-pipeline",
    title: "Order a Transformation Pipeline",
    description:
      "Build a chain whose order is a decision rather than an accident — and say what it costs.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["collections"],
    estimatedMinutes: 12,
    completedCount: 19800,
    introducedInWeek: 1,
    prompt:
      "Given raw log lines, return the numeric codes of lines that represent errors, largest first. Every intermediate operator allocates a list — the order you choose decides how many elements each one carries.",
    requirements: [
      "Keep only lines starting with `ERROR`",
      "Extract the integer that follows `code=`",
      "Skip lines where the code is missing or not an integer",
      "Return codes sorted descending, no duplicates",
    ],
    examples: [
      {
        input: `listOf("ERROR code=500", "INFO code=200", "ERROR code=404", "ERROR code=abc")`,
        output: `[500, 404]`,
      },
    ],
    constraints: ["Single expression preferred", "Do not mutate the input"],
    relatedConcepts: ["mapNotNull", "toIntOrNull", "sortedDescending", "distinct"],
    starterCode: `fun errorCodes(lines: List<String>): List<Int> {
    TODO()
}`,
    solutionCode: `fun errorCodes(lines: List<String>): List<Int> =
    lines
        .filter { it.startsWith("ERROR") }
        .mapNotNull { line ->
            line.substringAfter("code=", "").trim().toIntOrNull()
        }
        .distinct()
        .sortedDescending()`,
    tests: [
      {
        name: "filters and parses",
        call: `errorCodes(listOf("ERROR code=500", "INFO code=200", "ERROR code=404"))`,
        expected: `[500, 404]`,
      },
      {
        name: "drops unparseable",
        call: `errorCodes(listOf("ERROR code=abc", "ERROR code=500"))`,
        expected: `[500]`,
      },
      {
        name: "deduplicates",
        call: `errorCodes(listOf("ERROR code=500", "ERROR code=500"))`,
        expected: `[500]`,
        hidden: true,
      },
    ],
    hints: [
      "`toIntOrNull()` gives you the failure case as `null` rather than an exception.",
      "`mapNotNull` collapses transform-and-drop into one pass.",
      "Filter first. Every element you drop early is one fewer allocation downstream.",
    ],
    solution: {
      mentalModel:
        "A chain of collection operators is a sequence of full materialisations. Each step allocates a list the size of its output, so the cheapest chains discard early and transform late.",
      improved: {
        label: "Idiomatic",
        code: `fun errorCodes(lines: List<String>): List<Int> =
    lines
        .filter { it.startsWith("ERROR") }
        .mapNotNull { it.substringAfter("code=", "").trim().toIntOrNull() }
        .distinct()
        .sortedDescending()`,
      },
      whyItWorks: [
        "`filter` first shrinks the working set before the more expensive parse runs.",
        "`mapNotNull` fuses \"transform\" and \"drop the failures\" — no nullable intermediate list.",
        "`distinct` preserves first-seen order, which is irrelevant here because `sortedDescending` follows.",
      ],
      commonMistakes: [
        "`map { ... }.filter { it != null }.map { it!! }` — three passes and a `!!` that `mapNotNull` removes.",
        "`toInt()` instead of `toIntOrNull()`, turning malformed input into a crash.",
        "Sorting before deduplicating, which sorts elements you are about to throw away.",
      ],
      alternatives: [
        {
          title: "Sequence",
          body: "`lines.asSequence()...toList()` fuses the operators into one pass with no intermediate lists. On a handful of log lines it is slower (setup cost); past a few thousand elements or with an expensive predicate it wins clearly.",
        },
      ],
      complexity: { time: "O(n log n)", space: "O(n)", note: "Dominated by the sort." },
      inProduction:
        "This is the shape of nearly every mapper between a DTO and a UI model: filter what the screen should not see, transform what remains, order it for display.",
      followUps: [
        "At what input size would you switch to a `Sequence`, and how would you find out?",
        "If the parse were expensive, would you still filter first? Why?",
      ],
    },
  },
  {
    id: "k04",
    slug: "associate-by-vs-map",
    title: "associateBy vs map",
    description:
      "Two operators, two different return types. Pick by the shape you need, not by familiarity.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["collections"],
    estimatedMinutes: 12,
    completedCount: 16400,
    introducedInWeek: 1,
    prompt:
      "You are given a list of users and a list of user ids that appeared in a feed. Return the users for those ids, in feed order, skipping ids you have no user for. Doing this with a nested search is O(n·m); doing it with an index is O(n+m).",
    requirements: [
      "Build a lookup keyed by user id",
      "Preserve the order of `feedIds`",
      "Skip ids with no matching user",
      "Do not use a nested loop or `find` inside a `map`",
    ],
    examples: [
      {
        input: `usersInFeedOrder(users, listOf(3, 1, 99))`,
        output: `[User(3), User(1)]`,
      },
    ],
    relatedConcepts: ["associateBy", "associate", "groupBy", "Map lookup cost"],
    starterCode: `data class User(val id: Int, val name: String)

fun usersInFeedOrder(users: List<User>, feedIds: List<Int>): List<User> {
    TODO()
}`,
    solutionCode: `data class User(val id: Int, val name: String)

fun usersInFeedOrder(users: List<User>, feedIds: List<Int>): List<User> {
    val byId: Map<Int, User> = users.associateBy { it.id }
    return feedIds.mapNotNull(byId::get)
}`,
    tests: [
      {
        name: "preserves feed order",
        call: `usersInFeedOrder(listOf(User(1,"A"), User(3,"C")), listOf(3, 1))`,
        expected: `[User(id=3, name=C), User(id=1, name=A)]`,
      },
      {
        name: "skips unknown ids",
        call: `usersInFeedOrder(listOf(User(1,"A")), listOf(1, 99))`,
        expected: `[User(id=1, name=A)]`,
      },
    ],
    hints: [
      "`associateBy { it.id }` gives `Map<Int, User>`; `map { it.id }` gives `List<Int>`. Which do you need to look things up?",
      "`mapNotNull` over the ids keeps feed order and drops misses in one step.",
    ],
    solution: {
      mentalModel:
        "`map` changes each element and keeps the shape (`List<A>` → `List<B>`). `associateBy` changes the shape entirely (`List<A>` → `Map<K, A>`). Reach for `associateBy` the moment you are about to search a list repeatedly.",
      whyItWorks: [
        "One pass builds the index; each lookup is then O(1) amortised.",
        "Iterating `feedIds` rather than `users` is what preserves feed order.",
        "`mapNotNull(byId::get)` reads as \"the users for these ids, where we have one\".",
      ],
      commonMistakes: [
        "`feedIds.map { id -> users.find { it.id == id } }` — quadratic, and the result is `List<User?>`.",
        "Using `associate { it.id to it }` where `associateBy { it.id }` says the same thing more plainly.",
        "Forgetting that duplicate keys mean **last one wins** — silent data loss if ids are not unique.",
      ],
      alternatives: [
        {
          title: "groupBy",
          body: "If ids are not unique, `groupBy { it.id }` gives `Map<Int, List<User>>` and makes the duplication visible instead of discarding it.",
        },
      ],
      complexity: { time: "O(n + m)", space: "O(n)" },
      inProduction:
        "Exactly how you join two endpoints client-side: fetch the feed and the authors separately, index the authors, then assemble in feed order.",
      followUps: [
        "What happens when two users share an id? Which operator makes that visible?",
        "How would you handle the case where a missing author should render a placeholder instead of vanishing?",
      ],
    },
  },
  {
    id: "k05",
    slug: "group-by-and-aggregate",
    title: "groupBy and Aggregate",
    description: "Group orders by customer, then reduce each group to a total.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["collections"],
    estimatedMinutes: 12,
    completedCount: 14200,
    introducedInWeek: 1,
    prompt:
      "Given a list of orders, return each customer's total spend, highest first. Grouping and aggregating in one pass is available in the standard library — find it.",
    requirements: [
      "Group by `customerId`",
      "Sum `amount` within each group",
      "Return `List<Pair<String, Double>>` sorted by total descending",
    ],
    relatedConcepts: ["groupBy", "groupingBy", "fold", "sumOf"],
    starterCode: `data class Order(val customerId: String, val amount: Double)

fun totalsByCustomer(orders: List<Order>): List<Pair<String, Double>> {
    TODO()
}`,
    solutionCode: `data class Order(val customerId: String, val amount: Double)

fun totalsByCustomer(orders: List<Order>): List<Pair<String, Double>> =
    orders
        .groupBy { it.customerId }
        .map { (id, group) -> id to group.sumOf { it.amount } }
        .sortedByDescending { it.second }`,
    tests: [
      {
        name: "sums per customer",
        call: `totalsByCustomer(listOf(Order("a", 10.0), Order("b", 5.0), Order("a", 2.0)))`,
        expected: `[(a, 12.0), (b, 5.0)]`,
      },
      { name: "empty", call: `totalsByCustomer(emptyList())`, expected: `[]` },
    ],
    hints: [
      "`groupBy` gives `Map<String, List<Order>>` — a list per key.",
      "`groupingBy { }.fold(0.0) { acc, o -> acc + o.amount }` avoids materialising those intermediate lists.",
    ],
    solution: {
      mentalModel:
        "`groupBy` materialises a list per key; `groupingBy` is lazy and folds as it goes. Use the first when you need the groups, the second when you only need the aggregate.",
      improved: {
        label: "Single pass",
        code: `fun totalsByCustomer(orders: List<Order>): List<Pair<String, Double>> =
    orders
        .groupingBy { it.customerId }
        .fold(0.0) { total, order -> total + order.amount }
        .toList()
        .sortedByDescending { it.second }`,
      },
      whyItWorks: [
        "`groupingBy` never allocates the per-key lists — it threads an accumulator through instead.",
        "`fold` supplies an initial value, so empty groups are impossible by construction.",
      ],
      commonMistakes: [
        "Using `reduce` and crashing on an empty group — `fold` has a seed, `reduce` does not.",
        "Summing `Double` money values at all; production code uses minor units in `Long` or `BigDecimal`.",
      ],
      complexity: { time: "O(n log k)", space: "O(k)", note: "k = number of customers; the log is the final sort." },
      inProduction:
        "Every summary row on a dashboard screen — spend per category, sessions per day — is this shape.",
      followUps: ["Why is `Double` the wrong type for money, and what would you use instead?"],
    },
  },
  {
    id: "k06",
    slug: "fold-vs-reduce",
    title: "fold vs reduce",
    description:
      "One of these throws on an empty list. Know which, and why the seed changes the type.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["collections"],
    estimatedMinutes: 6,
    completedCount: 12900,
    introducedInWeek: 1,
    quizStem: "Which statement about the two lines below is correct?",
    quizCode: `val a = items.fold(0) { acc, item -> acc + item.count }
val b = items.reduce { acc, item -> acc + item.count }`,
    choices: [
      {
        id: "a",
        body: "They are equivalent; `fold` is simply the older name.",
        correct: false,
        rationale:
          "They differ in two ways that matter: `reduce` throws `UnsupportedOperationException` on an empty collection, and it cannot change the accumulator type.",
      },
      {
        id: "b",
        body: "`b` does not compile, because `acc` is an `Item` and `acc + item.count` is not an `Item`.",
        correct: true,
        rationale:
          "`reduce` seeds the accumulator with the first *element*, so `acc` has the element type. Adding an `Int` to an `Item` is not defined, so this fails to compile. `fold`'s seed sets the accumulator type independently.",
      },
      {
        id: "c",
        body: "Both compile, but `b` returns `0` for an empty list.",
        correct: false,
        rationale:
          "`reduce` has no seed to return. On an empty collection it throws. `fold` returns its initial value.",
      },
      {
        id: "d",
        body: "`a` does not compile because `fold` requires the seed and elements to share a type.",
        correct: false,
        rationale:
          "The opposite is true — decoupling accumulator type from element type is the whole point of `fold`.",
      },
    ],
    solution: {
      mentalModel:
        "`fold` = (seed, combine). `reduce` = (combine), with the first element playing the seed. The seed buys you both a defined empty case and a free choice of accumulator type.",
      whyItWorks: [
        "`fold<R>(initial: R, operation: (R, T) -> R): R` — `R` is unconstrained by `T`.",
        "`reduce(operation: (S, T) -> S): S where S : T` — the accumulator must be a supertype of the element.",
      ],
      commonMistakes: [
        "`reduce` on a list that is usually non-empty, until the day it is not.",
        "Building a `String` with `fold(\"\")` when `joinToString` is right there.",
      ],
      followUps: [
        "When is `runningFold` more useful than `fold`?",
        "What does `reduceOrNull` change about the empty case?",
      ],
    },
  },
  {
    id: "k07",
    slug: "nullability-operators",
    title: "Choosing Between ?., ?:, !! and requireNotNull",
    description:
      "Four ways to handle a null. Each encodes a different claim about your program.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["kotlin"],
    estimatedMinutes: 12,
    completedCount: 17600,
    introducedInWeek: 1,
    prompt:
      "Render a display name from a profile whose fields are all optional. The rule: never crash, never show an empty string, and never lie about what was present.",
    requirements: [
      "Prefer `nickname`, then `firstName + lastName`, then `email` local part",
      "Fall back to `\"Anonymous\"` when nothing usable exists",
      "Treat blank strings as absent",
      "No `!!` anywhere",
    ],
    relatedConcepts: ["Elvis operator", "takeIf", "Safe calls", "Smart casts"],
    starterCode: `data class Profile(
    val nickname: String?,
    val firstName: String?,
    val lastName: String?,
    val email: String?,
)

fun displayName(profile: Profile): String {
    TODO()
}`,
    solutionCode: `fun displayName(profile: Profile): String {
    fun String?.usable(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

    profile.nickname.usable()?.let { return it }

    val first = profile.firstName.usable()
    val last = profile.lastName.usable()
    listOfNotNull(first, last)
        .takeIf { it.isNotEmpty() }
        ?.let { return it.joinToString(" ") }

    return profile.email.usable()?.substringBefore("@") ?: "Anonymous"
}`,
    tests: [
      {
        name: "prefers nickname",
        call: `displayName(Profile("ax", "Alex", "Kim", "a@b.c"))`,
        expected: `ax`,
      },
      {
        name: "blank nickname falls through",
        call: `displayName(Profile("  ", "Alex", null, "a@b.c"))`,
        expected: `Alex`,
      },
      {
        name: "email local part",
        call: `displayName(Profile(null, null, null, "alex@b.c"))`,
        expected: `alex`,
      },
      {
        name: "nothing usable",
        call: `displayName(Profile(null, null, null, null))`,
        expected: `Anonymous`,
        hidden: true,
      },
    ],
    hints: [
      "`takeIf` turns a predicate into a nullable — exactly what you want for \"blank means absent\".",
      "`listOfNotNull(a, b)` handles the \"first name only\" case without branching.",
    ],
    solution: {
      mentalModel:
        "Each null operator is a claim. `?.` says \"absence is expected here\". `?:` says \"here is the answer when absent\". `requireNotNull` says \"absence is a caller bug\". `!!` says \"absence is impossible and I accept a crash if I am wrong\" — which is almost never a claim worth making in UI code.",
      whyItWorks: [
        "Normalising blank to null once, at the edge, means the rest of the function reasons about one absence concept instead of two.",
        "`listOfNotNull` collapses the four name permutations into one code path.",
      ],
      commonMistakes: [
        "`firstName + \" \" + lastName` producing `\"Alex null\"`.",
        "Using `!!` after an `if (x != null)` check on a mutable property — smart cast is refused precisely because it could change.",
        "Treating `\"\"` and `null` as different states in the UI layer.",
      ],
      alternatives: [
        {
          title: "Model it away",
          body: "A `sealed interface DisplayName { Nickname, Full, EmailLocal, Anonymous }` makes the precedence explicit and testable, at the cost of more types.",
        },
      ],
      inProduction:
        "Name rendering is the canonical place where nullable API fields leak into the UI. Normalising at the mapper boundary keeps every composable downstream working with `String`, not `String?`.",
      followUps: [
        "Why can the compiler smart-cast a `val` but not a `var` property from another module?",
        "When *is* `!!` defensible?",
      ],
    },
  },
  {
    id: "k08",
    slug: "sealed-state-modelling",
    title: "Model State So Impossible States Cannot Exist",
    description:
      "Replace three independent flags with a type that cannot represent nonsense.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["oop", "kotlin"],
    estimatedMinutes: 18,
    completedCount: 13400,
    introducedInWeek: 1,
    prompt:
      "A screen holds `isLoading: Boolean`, `user: User?` and `error: String?`. That is eight combinations, of which three are meaningful. Replace it with a sealed hierarchy and write the reducer that maps a `Result` into it.",
    requirements: [
      "Define a `sealed interface UserUiState` with Loading, Success and Error",
      "`Success` carries a non-null user, `Error` a non-null message",
      "Write `fun reduce(result: Result<User>): UserUiState`",
      "The `when` over the state must be exhaustive without an `else`",
    ],
    relatedConcepts: ["Sealed interfaces", "data object", "Exhaustive when", "Algebraic data types"],
    starterCode: `sealed interface UserUiState {
    // TODO: Loading, Success(user), Error(message)
}

fun reduce(result: Result<User>): UserUiState = TODO()`,
    solutionCode: `data class User(val id: String, val name: String)

sealed interface UserUiState {
    data object Loading : UserUiState
    data class Success(val user: User) : UserUiState
    data class Error(val message: String) : UserUiState
}

fun reduce(result: Result<User>): UserUiState =
    result.fold(
        onSuccess = { UserUiState.Success(it) },
        onFailure = { UserUiState.Error(it.message ?: "Something went wrong") },
    )`,
    tests: [
      {
        name: "success",
        call: `reduce(Result.success(User("1", "Alex")))`,
        expected: `Success(user=User(id=1, name=Alex))`,
      },
      {
        name: "failure",
        call: `reduce(Result.failure(IOException("offline")))`,
        expected: `Error(message=offline)`,
      },
    ],
    hints: [
      "`data object` gives you a singleton with a useful `toString` — better than `object` for state you will log.",
      "Exhaustiveness is the payoff: adding a fourth state should break every `when` that must handle it.",
    ],
    solution: {
      mentalModel:
        "Three independent booleans/nullables describe 2×2×2 = 8 states. Your screen has 3. A sealed hierarchy makes the other 5 unrepresentable, so no test, no reviewer and no future edit can produce them.",
      whyItWorks: [
        "`sealed` restricts the permitted subtypes to this compilation unit, which is what makes `when` exhaustive without `else`.",
        "Non-null payloads mean the success branch never checks for null and the error branch never renders empty.",
        "Omitting `else` turns adding a state into a compile error at every consumer — a feature, not a nuisance.",
      ],
      commonMistakes: [
        "Keeping `isLoading` alongside the sealed type \"just for the spinner\", re-opening the door you closed.",
        "Adding `else -> Unit` to a `when` and losing exhaustiveness checking entirely.",
        "Putting `Loading` inside `Success` as a boolean to model refresh — model refresh explicitly instead.",
      ],
      alternatives: [
        {
          title: "Data class with a nested sealed content",
          body: "`data class ScreenState(val content: Content, val isRefreshing: Boolean, val banner: Banner?)` scales better when several orthogonal things can be true at once. Sealed-only hierarchies get awkward once refresh, pagination and errors coexist.",
        },
      ],
      inProduction:
        "This is the standard ViewModel state shape. The moment a screen needs \"showing data *and* refreshing *and* a stale-data banner\", move to the hybrid above rather than adding a `SuccessRefreshing` subtype.",
      followUps: [
        "How would you represent \"showing cached data while a refresh fails\"?",
        "Why `data object` rather than `object` for `Loading`?",
      ],
    },
  },
  {
    id: "k09",
    slug: "data-class-copy-trap",
    title: "The data class copy() Trap",
    description:
      "copy() is shallow. Find out what that means when a field is itself mutable.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Kotlin",
    topics: ["oop", "kotlin"],
    estimatedMinutes: 12,
    completedCount: 8900,
    introducedInWeek: 2,
    readingCode: `data class Cart(
    val id: String,
    val items: MutableList<Item>,
    val coupon: Coupon?,
)

fun applyCoupon(cart: Cart, coupon: Coupon): Cart =
    cart.copy(coupon = coupon)

// elsewhere
val updated = applyCoupon(cart, tenPercent)
updated.items.add(Item("extra"))`,
    readingPrompts: [
      {
        id: "p1",
        question: "After `applyCoupon`, how many `MutableList` instances exist?",
        expert:
          "One. `copy()` copies references field by field — it does not clone the list. `cart.items` and `updated.items` are the same object, so the `add` on the last line mutates both carts.",
        keywords: ["one", "same", "shallow", "reference"],
      },
      {
        id: "p2",
        question: "Does `cart == updated` still hold after the `add`? Why does that matter?",
        expert:
          "They are not equal — `coupon` differs — but the interesting failure is subtler. `data class` equality and `hashCode` include `items`. Mutating a list inside an object already used as a map key, or already emitted from a `StateFlow`, breaks the invariant those structures rely on. `StateFlow` in particular deduplicates with `equals`: mutate in place and emit, and the new value equals the old one, so collectors never see the change.",
        keywords: ["equals", "hashCode", "stateflow", "distinct"],
      },
      {
        id: "p3",
        question: "What would you change, and what does that cost?",
        expert:
          "Declare `items: List<Item>` and replace it with `copy(items = items + newItem)`. Cost: an O(n) allocation per change instead of an O(1) append. That is nearly always the right trade in UI state — the list is small, and you gain a value you can safely compare, cache, diff and hand to Compose. For genuinely large collections, reach for `kotlinx.collections.immutable`, which gives structural sharing.",
        keywords: ["list", "immutable", "copy", "allocation"],
      },
      {
        id: "p4",
        question: "How does this interact with Compose specifically?",
        expert:
          "`MutableList` is an unstable type to the Compose compiler, so any composable taking `Cart` as a parameter loses skippability and recomposes whenever its parent does. Switching to `List` does not fully fix it either — `List` is only *treated* as stable when the compiler can see it is not `MutableList` at the use site. `ImmutableList` or `@Immutable` on the class settles it.",
        keywords: ["stable", "skippable", "recompose", "immutable"],
      },
    ],
    solution: {
      mentalModel:
        "`copy()` gives you a new envelope with the same contents. Anything mutable inside remains shared, which quietly defeats every mechanism built on value equality — StateFlow deduplication, Compose skipping, map keys, and `distinctUntilChanged`.",
      whyItWorks: [
        "The generated `copy` assigns each property by reference; there is no deep-clone step.",
        "Value semantics only hold when every field also has value semantics.",
      ],
      commonMistakes: [
        "`MutableList` inside a `data class` used as UI state.",
        "Mutating then emitting the same instance from a `MutableStateFlow` and wondering why the UI never updates.",
      ],
      inProduction:
        "The canonical `StateFlow` bug: `_state.value.items.add(x)` followed by `_state.value = _state.value`. Same instance, `equals` returns true, no emission.",
      followUps: [
        "Why does `MutableStateFlow` deduplicate at all, and can you opt out?",
        "What does `@Immutable` promise the Compose compiler, and what happens if you lie?",
      ],
    },
  },
  {
    id: "k10",
    slug: "scope-functions",
    title: "Pick the Right Scope Function",
    description:
      "let, run, with, apply, also — chosen by return value and receiver, not by taste.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin"],
    estimatedMinutes: 8,
    completedCount: 21300,
    introducedInWeek: 2,
    quizStem:
      "You want to configure an object, log it, and end up with the object itself. Which chain is correct?",
    quizCode: `val request = Request()
    .???? { it.timeout = 30 }
    .???? { log("built ", it) }`,
    choices: [
      {
        id: "a",
        body: "`apply { timeout = 30 }` then `also { log(\"built \", it) }`",
        correct: true,
        rationale:
          "`apply` takes the object as receiver (`this`) and returns it — right for configuration. `also` takes it as argument (`it`) and returns it — right for side effects where naming the value reads better.",
      },
      {
        id: "b",
        body: "`let { it.timeout = 30 }` then `let { log(\"built \", it) }`",
        correct: false,
        rationale:
          "`let` returns the *lambda's* result. The first `let` returns `Unit` from the assignment, so the chain ends up with `Unit`, not a `Request`.",
      },
      {
        id: "c",
        body: "`run { timeout = 30 }` then `also { log(\"built \", it) }`",
        correct: false,
        rationale:
          "`run` also returns the lambda result, so the first call yields `Unit` and the chain breaks for the same reason as (b).",
      },
      {
        id: "d",
        body: "`with(this) { timeout = 30 }` then `apply { log(\"built \", this) }`",
        correct: false,
        rationale:
          "`with` is not an extension — it cannot appear in a call chain at all. `apply` for a pure side effect also misstates intent: `also` is the one that says \"I am not changing this object\".",
      },
    ],
    solution: {
      mentalModel:
        "Two axes decide it. **Returns the receiver**: `apply`, `also`. **Returns the lambda result**: `let`, `run`, `with`. **Receiver is `this`**: `apply`, `run`, `with`. **Receiver is `it`**: `let`, `also`.",
      whyItWorks: [
        "Configuration wants the object back → `apply`.",
        "Side effects want the object back and a readable name → `also`.",
        "Transformation wants the new value → `let` / `run`.",
        "Null-safe transformation is `?.let` — the idiom that makes `let` earn its keep.",
      ],
      commonMistakes: [
        "`apply` used for a transformation, silently returning the wrong thing.",
        "Nested `let`s shadowing `it` until nobody can tell which object is which — name the parameter.",
        "`?.let { }` used as an if-statement rather than to produce a value.",
      ],
      followUps: ["When does `takeIf`/`takeUnless` read better than any of the five?"],
    },
  },
  {
    id: "k11",
    slug: "extension-function-dispatch",
    title: "Extension Functions Are Statically Dispatched",
    description:
      "Predict the output. The answer is the single most-missed fact about extensions.",
    difficulty: "Medium",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin", "oop"],
    estimatedMinutes: 8,
    completedCount: 9700,
    introducedInWeek: 2,
    quizStem: "What does this print?",
    quizCode: `open class Animal
class Dog : Animal()

fun Animal.speak() = "generic"
fun Dog.speak() = "woof"

val pet: Animal = Dog()
println(pet.speak())`,
    choices: [
      {
        id: "a",
        body: `"woof" — the runtime type is Dog.`,
        correct: false,
        rationale:
          "That is how member functions behave. Extensions are resolved from the *declared* type at compile time; the runtime type never enters into it.",
      },
      {
        id: "b",
        body: `"generic" — resolution uses the declared type Animal.`,
        correct: true,
        rationale:
          "Extensions compile to static functions taking the receiver as the first parameter. The compiler sees `pet: Animal` and links `Animal.speak`. No virtual dispatch happens.",
      },
      { id: "c", body: "It does not compile — ambiguous overloads.", correct: false, rationale: "They are not ambiguous: different receiver types are different signatures, and the most specific applicable one for the declared type wins." },
      { id: "d", body: `"woof" only when compiled with -Xjvm-default=all.`, correct: false, rationale: "That flag concerns interface default methods on the JVM and has nothing to do with extension resolution." },
    ],
    solution: {
      mentalModel:
        "An extension is a static utility with nicer syntax. It does not add anything to the class, so it cannot participate in polymorphism.",
      whyItWorks: [
        "`fun Animal.speak()` compiles to roughly `static String speak(Animal receiver)`.",
        "Overload resolution happens at compile time against the static type of the expression.",
        "A member function always wins over an extension with the same signature — another static decision.",
      ],
      commonMistakes: [
        "Designing a polymorphic hierarchy out of extensions and being surprised by base-class behaviour.",
        "Shadowing a member with an extension and assuming the extension runs.",
      ],
      inProduction:
        "Extensions are excellent for mappers and helpers over types you do not own (`fun UserDto.toDomain()`), and a poor fit for behaviour that must vary by subtype.",
      followUps: ["What happens if a member function with the same signature is added later to the class?"],
    },
  },
  {
    id: "k12",
    slug: "sequence-vs-list",
    title: "When a Sequence Earns Its Keep",
    description:
      "Same operators, different evaluation. Work out what actually runs, and how many times.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Kotlin",
    topics: ["collections", "performance"],
    estimatedMinutes: 14,
    completedCount: 7800,
    introducedInWeek: 2,
    readingCode: `val first = items
    .map { expensive(it) }
    .filter { it.isValid }
    .first()

val second = items
    .asSequence()
    .map { expensive(it) }
    .filter { it.isValid }
    .first()`,
    readingPrompts: [
      {
        id: "p1",
        question: "For a list of 10,000 items where the first valid one is at index 3, how many times does `expensive` run in each version?",
        expert:
          "The first version runs it 10,000 times: `map` is eager and materialises the whole transformed list before `filter` sees anything. The second runs it 4 times — the sequence pulls one element through the whole chain at a time and stops the moment `first()` is satisfied.",
        keywords: ["10000", "4", "lazy", "eager"],
      },
      {
        id: "p2",
        question: "How many intermediate lists does each version allocate?",
        expert:
          "Eager: two — one from `map`, one from `filter`. Sequence: zero. Operators are fused into a single pass; only the terminal operation produces anything.",
        keywords: ["two", "zero", "allocation", "intermediate"],
      },
      {
        id: "p3",
        question: "Given that, why is `asSequence()` not the default everywhere?",
        expert:
          "Per-element overhead. Each stage is an iterator with a virtual call and, for lambdas that are not inlined into the loop, a megamorphic call site. On small collections — and almost every list in a UI is small — the eager version is faster and produces clearer stack traces. The rule of thumb: sequences win with large inputs, expensive per-element work, long chains, or a short-circuiting terminal like `first`/`any`/`take`.",
        keywords: ["overhead", "small", "iterator", "short-circuit"],
      },
      {
        id: "p4",
        question: "What is the trap when a sequence is consumed twice?",
        expert:
          "A `Sequence` from `asSequence()` on a collection is re-iterable, but one built from an iterator (`Iterator.asSequence()`, `generateSequence` over a stream) is single-use and throws `IllegalStateException` on a second terminal operation. Sequences are also not memoised: calling `first()` then `count()` runs `expensive` again for every element it touches.",
        keywords: ["once", "constrainOnce", "twice", "re-run"],
      },
    ],
    solution: {
      mentalModel:
        "A `List` chain is horizontal: every operator completes for all elements before the next begins. A `Sequence` chain is vertical: each element travels the whole chain before the next one starts.",
      whyItWorks: [
        "Vertical evaluation means a short-circuiting terminal can stop the entire pipeline early.",
        "No stage ever holds a full intermediate collection.",
      ],
      commonMistakes: [
        "Sprinkling `asSequence()` on three-element lists and calling it optimisation.",
        "Assuming a sequence caches its results.",
        "Using `sorted()` mid-sequence — it is a stateful operator that must buffer everything, discarding the benefit.",
      ],
      complexity: { time: "Same asymptotics", space: "O(1) vs O(n) intermediates" },
      inProduction:
        "Parsing a large local database cursor, or filtering a few thousand contacts, are real sequence cases. Mapping a 20-item feed page is not.",
      followUps: [
        "Which operators are stateful, and why do they break the laziness argument?",
        "How would you measure this rather than reason about it?",
      ],
    },
  },
  {
    id: "k13",
    slug: "flat-map-nested",
    title: "flatMap Over Nested Structures",
    description: "Flatten a two-level structure without losing the parent context.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["collections"],
    estimatedMinutes: 12,
    completedCount: 11200,
    introducedInWeek: 1,
    prompt:
      "Given playlists, each containing tracks, return every track paired with the name of the playlist it came from. The naive `map` gives you `List<List<...>>` — flatten it without losing which playlist each track belongs to.",
    requirements: [
      "Return `List<Pair<String, Track>>` where the first element is the playlist name",
      "Preserve playlist order, then track order",
      "Skip playlists with no tracks naturally (no special-casing)",
    ],
    relatedConcepts: ["flatMap", "flatten", "map + flatten"],
    starterCode: `data class Track(val id: String, val title: String)
data class Playlist(val name: String, val tracks: List<Track>)

fun allTracks(playlists: List<Playlist>): List<Pair<String, Track>> {
    TODO()
}`,
    solutionCode: `fun allTracks(playlists: List<Playlist>): List<Pair<String, Track>> =
    playlists.flatMap { playlist ->
        playlist.tracks.map { track -> playlist.name to track }
    }`,
    tests: [
      {
        name: "keeps playlist context",
        call: `allTracks(listOf(Playlist("Focus", listOf(Track("1","A")))))`,
        expected: `[(Focus, Track(id=1, title=A))]`,
      },
      {
        name: "empty playlist contributes nothing",
        call: `allTracks(listOf(Playlist("Empty", emptyList())))`,
        expected: `[]`,
      },
    ],
    hints: [
      "The inner `map` is where the parent is still in scope — use it.",
      "`flatMap` is `map` followed by `flatten`, fused.",
    ],
    solution: {
      mentalModel:
        "`flatMap` lets you produce zero, one or many outputs per input. The lambda still closes over the parent, so pairing is free — you only lose context if you flatten first and map second.",
      whyItWorks: [
        "The outer lambda has `playlist` in scope for the entire inner `map`.",
        "An empty inner list contributes nothing, so the empty case needs no branch.",
      ],
      commonMistakes: [
        "`playlists.map { it.tracks }.flatten()` — correct flattening, parent name gone.",
        "Building the result with a nested `for` loop and a `MutableList` when one expression says it.",
      ],
      complexity: { time: "O(total tracks)", space: "O(total tracks)" },
      followUps: ["How would you return a `Map<String, List<Track>>` instead, and when is that shape better?"],
    },
  },
  {
    id: "k14",
    slug: "destructuring-and-component",
    title: "Destructuring Is Positional",
    description:
      "Why reordering fields in a data class is a source-compatible change that breaks callers.",
    difficulty: "Medium",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin", "oop"],
    estimatedMinutes: 7,
    completedCount: 6400,
    introducedInWeek: 2,
    quizStem:
      "A `data class User(val id: String, val name: String)` is changed to `data class User(val name: String, val id: String)`. What happens to `val (id, name) = user` at a call site?",
    quizCode: `// before
data class User(val id: String, val name: String)
val (id, name) = user

// after
data class User(val name: String, val id: String)`,
    choices: [
      {
        id: "a",
        body: "A compile error — the names no longer line up.",
        correct: false,
        rationale:
          "Destructuring ignores names entirely. It calls `component1()`, `component2()` in order, so the code still compiles.",
      },
      {
        id: "b",
        body: "It compiles, and silently binds `id` to the name and `name` to the id.",
        correct: true,
        rationale:
          "Both properties are `String`, so the types still match and the compiler is content. The variables are now wrong, and only a runtime symptom will reveal it.",
      },
      {
        id: "c",
        body: "It compiles but produces a deprecation warning.",
        correct: false,
        rationale: "There is no warning. This is the well-known hazard of positional destructuring.",
      },
      {
        id: "d",
        body: "It fails at runtime with a ClassCastException.",
        correct: false,
        rationale: "No cast is involved — both components are `String`. Nothing throws; the data is simply swapped.",
      },
    ],
    solution: {
      mentalModel:
        "Destructuring is positional sugar over `componentN()`. Names in the pattern are labels for you, not for the compiler.",
      whyItWorks: [
        "`val (a, b) = x` desugars to `val a = x.component1(); val b = x.component2()`.",
        "Type-compatible reordering therefore passes every compile-time check.",
      ],
      commonMistakes: [
        "Destructuring wide data classes in production code rather than reading properties by name.",
        "Assuming a `data class` field reorder is a safe refactor.",
      ],
      inProduction:
        "Destructure `Map.Entry` and `Pair` freely; be wary of destructuring domain models with several same-typed fields. Some teams ban it beyond two components for exactly this reason.",
      followUps: ["Does the same hazard apply to named arguments? Why not?"],
    },
  },
  {
    id: "k15",
    slug: "equality-and-hash-in-sets",
    title: "Mutating a Key Inside a HashSet",
    description:
      "Find the element you just added. Explain why you cannot.",
    difficulty: "Medium",
    format: "debugging",
    track: "Kotlin",
    topics: ["kotlin", "collections"],
    estimatedMinutes: 14,
    completedCount: 5200,
    introducedInWeek: 2,
    symptom:
      "An item is added to a set, then a field on it is changed. `contains` now returns false for that very object — but iterating the set still finds it.",
    brokenCode: `class Tag(var label: String) {
    override fun equals(other: Any?) = other is Tag && other.label == label
    override fun hashCode() = label.hashCode()
}

val tags = hashSetOf(Tag("draft"))
val tag = tags.first()
tag.label = "published"

println(tags.contains(tag))   // false
println(tags.first() === tag) // true`,
    debugHints: [
      {
        label: "Hint 1",
        body: "A HashSet does not search linearly. What does it use to decide which bucket to look in?",
      },
      {
        label: "Hint 2",
        body: "`hashCode()` was called once, at insertion time. What has changed since?",
      },
      {
        label: "Hint 3",
        body: "The object is still in the set — in the bucket chosen by its *old* hash.",
      },
    ],
    rootCause:
      "`hashCode` is derived from a `var`. The set placed the element in the bucket for `hash(\"draft\")`. Mutating `label` changed the hash, so `contains` computes `hash(\"published\")`, looks in a different bucket and finds nothing. The element is stranded: reachable by iteration, unreachable by lookup, and now impossible to remove by `remove(tag)`.",
    fixedCode: `// Make the identity immutable.
data class Tag(val label: String)

val tags = hashSetOf(Tag("draft"))
// "Changing" a tag is replacing it:
val updated = tags.first().copy(label = "published")
tags.remove(Tag("draft"))
tags.add(updated)`,
    productionImplications: [
      "Any object used as a `Map` key or `Set` element must have a stable hash for as long as it is in there.",
      "The same rule underpins `StateFlow` deduplication and `distinctUntilChanged` — both compare values you may have mutated underneath them.",
      "`LazyColumn` keys have an analogous contract: a key that changes identity between recompositions loses scroll position and animation state.",
    ],
    solution: {
      mentalModel:
        "Hash-based collections index by value at insertion time. Mutating that value afterwards breaks the index, and nothing tells you.",
      whyItWorks: [
        "`val` properties in a `data class` give equality and hash that cannot drift.",
        "Replacement rather than mutation keeps every derived structure consistent.",
      ],
      commonMistakes: [
        "`var` fields inside classes that override `equals`/`hashCode`.",
        "Using a mutable domain object as a `Map` key because it was convenient.",
      ],
      followUps: [
        "What is the equivalent failure in a `TreeMap`, where ordering rather than hashing is the index?",
        "How does this bug appear in a Compose `LazyColumn` with unstable keys?",
      ],
    },
  },
];
