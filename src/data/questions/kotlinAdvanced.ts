import type { Question } from "@/lib/types";

/* Kotlin questions 16–30 — types, generics, and the machinery underneath. */

export const KOTLIN_ADVANCED_QUESTIONS: Question[] = [
  {
    id: "k16",
    slug: "generic-cache-with-bounds",
    title: "A Generic Cache With Bounds",
    description:
      "Write a small typed cache and decide exactly which type parameters need constraints.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["generics", "kotlin"],
    stage: "implement",
    ownership: "implement",
    concepts: ["generics-variance"],
    estimatedMinutes: 18,
    completedCount: 6100,
    introducedInWeek: 2,
    prompt:
      "Implement an LRU-ish cache keyed by anything, storing values that know their own freshness. The interesting part is the type signature, not the eviction.",
    requirements: [
      "`class Cache<K : Any, V : Expiring>(private val maxSize: Int)`",
      "`get(key)` returns null for a missing **or expired** entry",
      "`put(key, value)` evicts the least recently used entry when over capacity",
      "Reading an entry counts as use",
    ],
    relatedConcepts: ["Upper bounds", "LinkedHashMap access order", "Type parameter constraints"],
    starterCode: `interface Expiring {
    val expiresAtMillis: Long
}

class Cache<K : Any, V : Expiring>(private val maxSize: Int) {
    fun get(key: K, nowMillis: Long): V? = TODO()
    fun put(key: K, value: V) { TODO() }
}`,
    solutionCode: `class Cache<K : Any, V : Expiring>(private val maxSize: Int) {
    private val entries = LinkedHashMap<K, V>(16, 0.75f, /* accessOrder = */ true)

    fun get(key: K, nowMillis: Long): V? {
        val value = entries[key] ?: return null
        if (value.expiresAtMillis <= nowMillis) {
            entries.remove(key)
            return null
        }
        return value
    }

    fun put(key: K, value: V) {
        entries[key] = value
        while (entries.size > maxSize) {
            val oldest = entries.keys.first()
            entries.remove(oldest)
        }
    }
}`,
    tests: [
      { name: "returns stored value", call: `cache.put("a", Entry(100)); cache.get("a", 50)`, expected: `Entry(expiresAtMillis=100)` },
      { name: "expired reads as missing", call: `cache.get("a", 150)`, expected: `null` },
      { name: "evicts least recently used", call: `/* maxSize = 2, put a,b, get a, put c */ cache.get("b", 0)`, expected: `null`, hidden: true },
    ],
    hints: [
      "`LinkedHashMap`'s third constructor argument switches from insertion order to access order.",
      "`K : Any` rules out a nullable key — worth being explicit about.",
    ],
    solution: {
      mentalModel:
        "An upper bound is a promise about capability. `V : Expiring` means the cache can ask a value whether it is stale without knowing anything else about it — that is the whole reason the bound exists.",
      whyItWorks: [
        "Access-ordered `LinkedHashMap` moves an entry to the end on every `get`, so `keys.first()` is always the least recently used.",
        "Expiry is checked lazily on read, which avoids a background sweep.",
        "`K : Any` removes `null` from the key domain, so `entries[key] ?: return null` is unambiguous.",
      ],
      commonMistakes: [
        "Using `if` instead of `while` for eviction — fine for one insert at a time, wrong after a bulk load.",
        "Forgetting that the default `LinkedHashMap` is insertion-ordered, making \"LRU\" actually FIFO.",
        "Omitting `K : Any`, which lets a null key in and makes the `?:` mean two different things.",
      ],
      complexity: { time: "O(1) get and put", space: "O(maxSize)" },
      inProduction:
        "Nearly every in-memory image or response cache has this shape. In real Android code you would make it thread-safe and expose it behind an interface so tests can substitute a fake clock.",
      followUps: [
        "How would you make expiry testable without `System.currentTimeMillis()` inside the class?",
        "What changes if two threads call `put` concurrently?",
      ],
    },
  },
  {
    id: "k17",
    slug: "variance-out-in",
    title: "Variance: out, in and Why List Is Covariant",
    description: "Predict which assignments compile, and say what would break if they all did.",
    difficulty: "Hard",
    format: "quiz",
    track: "Kotlin",
    topics: ["generics"],
    stage: "predict",
    concepts: ["generics-variance"],
    estimatedMinutes: 10,
    completedCount: 4300,
    introducedInWeek: 2,
    quizStem: "Which of these compiles?",
    quizCode: `open class Animal
class Dog : Animal()

val dogs: List<Dog> = listOf(Dog())
val animals: List<Animal> = dogs              // (1)

val mutableDogs: MutableList<Dog> = mutableListOf()
val mutableAnimals: MutableList<Animal> = mutableDogs  // (2)`,
    choices: [
      {
        id: "a",
        body: "Both compile — Dog is an Animal.",
        correct: false,
        rationale:
          "(2) does not. If it did, you could write `mutableAnimals.add(Cat())` and then read a `Cat` out of a `MutableList<Dog>`. The compiler refuses precisely to prevent that.",
      },
      {
        id: "b",
        body: "(1) compiles, (2) does not.",
        correct: true,
        rationale:
          "`List<out E>` is covariant: `E` only ever comes *out*, so widening is safe. `MutableList<E>` is invariant because `E` also goes *in* via `add`, and a wider type there would let you corrupt the list.",
      },
      {
        id: "c",
        body: "Neither compiles without an explicit cast.",
        correct: false,
        rationale: "(1) needs no cast — the `out` on `List<out E>` is declaration-site variance and does exactly this job.",
      },
      {
        id: "d",
        body: "(2) compiles; (1) needs `@UnsafeVariance`.",
        correct: false,
        rationale: "Exactly backwards. `@UnsafeVariance` is an escape hatch used inside the stdlib for methods like `contains`, not something callers need.",
      },
    ],
    solution: {
      mentalModel:
        "`out` = producer, safe to widen. `in` = consumer, safe to narrow. A type that both produces and consumes its parameter must be invariant. Remember it as PECS: producer-extends, consumer-super.",
      whyItWorks: [
        "`List<out E>` declares that `E` appears only in return positions.",
        "`MutableList<E>` has `add(element: E)` — an `in` position — so covariance would be unsound.",
        "Use-site variance (`List<out Animal>` as a parameter type) gives the same guarantee for an invariant class at a single call site.",
      ],
      commonMistakes: [
        "Declaring repository interfaces invariant and then fighting the compiler when a `List<Dog>` will not pass.",
        "Assuming Java's arrays behave the same way — they are covariant and unsound, which is why `ArrayStoreException` exists.",
      ],
      inProduction:
        "This is why repositories expose `Flow<List<Item>>` and not `Flow<MutableList<Item>>`, and why `Flow<out T>` lets you treat a `Flow<Success>` as a `Flow<UiState>`.",
      followUps: [
        "What does `in` buy you on `Comparator<in T>`?",
        "Why does `contains` on `List<out E>` take `E` and not `Any?`?",
      ],
    },
  },
  {
    id: "k18",
    slug: "inline-reified-type",
    title: "reified: Recovering a Type at Runtime",
    description:
      "Write the JSON helper that people reach for, and understand why it must be inline.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["generics", "kotlin"],
    stage: "implement",
    ownership: "implement",
    concepts: ["inline-reified", "generics-variance", "navigation"],
    estimatedMinutes: 15,
    completedCount: 7400,
    introducedInWeek: 2,
    prompt:
      "Generic type arguments are erased on the JVM — inside `fun <T> parse(json: String): T` the type `T` does not exist at runtime. `reified` fixes this by inlining the function and substituting the real type at each call site. Write a filter that keeps only elements of a given type.",
    requirements: [
      "`inline fun <reified T> List<Any>.ofType(): List<T>`",
      "Preserve order",
      "Return type must be `List<T>`, not `List<Any>`",
    ],
    relatedConcepts: ["Type erasure", "inline", "reified", "filterIsInstance"],
    starterCode: `inline fun <reified T> List<Any>.ofType(): List<T> {
    TODO()
}`,
    solutionCode: `inline fun <reified T> List<Any>.ofType(): List<T> =
    mapNotNull { it as? T }

// The standard library already ships this:
// list.filterIsInstance<String>()`,
    tests: [
      { name: "keeps matching type", call: `listOf(1, "a", 2).ofType<String>()`, expected: `[a]` },
      { name: "preserves order", call: `listOf(1, "a", 2, "b").ofType<String>()`, expected: `[a, b]` },
      { name: "no matches", call: `listOf(1, 2).ofType<String>()`, expected: `[]`, hidden: true },
    ],
    hints: [
      "Without `reified`, `it as? T` produces an unchecked-cast warning and never actually tests anything.",
      "`reified` requires `inline` — the substitution happens by copying the body into the call site.",
    ],
    solution: {
      mentalModel:
        "`inline` copies the function body to the call site. Because the compiler knows the concrete type argument *there*, it can substitute it — that substituted type is what `reified` exposes. No reflection, no `Class<T>` parameter.",
      whyItWorks: [
        "At each call site `T` becomes a real class, so `is T` and `as? T` compile to genuine type checks.",
        "`mapNotNull` drops the nulls produced by failed safe casts, giving a correctly typed result.",
      ],
      commonMistakes: [
        "Trying `reified` without `inline` — a compile error, and the reason is the whole mechanism.",
        "Inlining large functions: every call site grows, which hurts code size and can be slower.",
        "Forgetting `filterIsInstance` already exists.",
      ],
      alternatives: [
        {
          title: "Pass the Class",
          body: "`fun <T> ofType(clazz: Class<T>)` works without inlining and is what Java-interop APIs do. Noisier at the call site, but keeps the function out of every caller's bytecode.",
        },
      ],
      inProduction:
        "`inline fun <reified T> Bundle.get(key: String)`, `Gson().fromJson<T>()`, `Retrofit` response types and Hilt's `hiltViewModel<T>()` all rely on this.",
      followUps: [
        "What does `noinline` do, and when do you need it?",
        "Why does `crossinline` exist?",
      ],
    },
  },
  {
    id: "k19",
    slug: "delegation-by-keyword",
    title: "Delegation With `by`",
    description: "Compose behaviour without inheritance, and see what the compiler generates.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["oop", "kotlin"],
    stage: "implement",
    ownership: "implement",
    concepts: ["composition", "repository", "interfaces"],
    estimatedMinutes: 14,
    completedCount: 5600,
    introducedInWeek: 2,
    prompt:
      "Wrap a repository so every call is logged, without reimplementing the interface by hand. Then answer the question that trips people up: does the logging apply to calls the delegate makes to itself?",
    requirements: [
      "Use class delegation (`by`) rather than writing each override",
      "Override only the method you want to instrument",
      "Keep the wrapper usable anywhere the interface is expected",
    ],
    relatedConcepts: ["Class delegation", "Decorator pattern", "Self-call semantics"],
    starterCode: `interface UserRepository {
    suspend fun load(id: String): User
    suspend fun refresh()
}

class LoggingUserRepository(
    private val delegate: UserRepository,
) : UserRepository /* by ??? */ {
    // TODO
}`,
    solutionCode: `class LoggingUserRepository(
    private val delegate: UserRepository,
) : UserRepository by delegate {

    override suspend fun load(id: String): User {
        log("load(", id, ")")
        return delegate.load(id)
    }
    // refresh() is forwarded automatically — and is NOT logged,
    // even if the delegate's own refresh() calls load().
}`,
    tests: [
      { name: "forwards unoverridden members", call: `LoggingUserRepository(fake).refresh()`, expected: `Unit` },
      { name: "instruments the override", call: `LoggingUserRepository(fake).load("1")`, expected: `User(id=1)` },
    ],
    hints: [
      "`by delegate` generates a forwarding override for every interface member you do not declare.",
      "The delegate holds no reference to your wrapper — think about what that means for internal calls.",
    ],
    solution: {
      mentalModel:
        "`by` is compile-time code generation, not proxying. The compiler writes `override fun x() = delegate.x()` for each member. The delegate has never heard of your subclass, so its internal calls go to itself.",
      whyItWorks: [
        "Members you declare win over the generated forwarders.",
        "The result is a true implementation of the interface, so it substitutes anywhere.",
      ],
      commonMistakes: [
        "Expecting an override to intercept calls the delegate makes internally — it will not. This is the same trap as decorating a class whose methods call each other.",
        "Delegating to a mutable property; the forwarders capture the constructor parameter, not later reassignments.",
      ],
      alternatives: [
        {
          title: "An interceptor at the call boundary",
          body: "For cross-cutting logging, an OkHttp interceptor or a single instrumented call site catches internal calls too, because it sits below them rather than above.",
        },
      ],
      inProduction:
        "Test fakes and feature-flagged wrappers use this constantly: `class OfflineFirstRepository(...) : Repository by remote` while overriding only the two methods that change.",
      followUps: ["How would you write this with a property delegate (`by lazy`, `by Delegates.observable`) instead?"],
    },
  },
  {
    id: "k20",
    slug: "operator-overloading-contract",
    title: "Operator Conventions Are Structural",
    description: "Kotlin resolves operators by name and shape, not by an interface.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin", "oop"],
    stage: "predict",
    concepts: ["interfaces"],
    estimatedMinutes: 6,
    completedCount: 8200,
    introducedInWeek: 2,
    quizStem: "Which is required for `money1 + money2` to compile?",
    quizCode: `data class Money(val minorUnits: Long, val currency: String)`,
    choices: [
      {
        id: "a",
        body: "`Money` must implement an `Addable` interface from the standard library.",
        correct: false,
        rationale: "There is no such interface. Operator resolution is structural: the right name, the right arity, and the `operator` modifier.",
      },
      {
        id: "b",
        body: "A function named `plus` marked `operator`, taking a `Money` and returning something.",
        correct: true,
        rationale:
          "`operator fun plus(other: Money): Money`. It can be a member or an extension, which is how you add operators to types you do not own.",
      },
      {
        id: "c",
        body: "`Money` must be a `data class`.",
        correct: false,
        rationale: "Irrelevant. `data` generates equals/hashCode/copy/componentN — nothing to do with operators.",
      },
      {
        id: "d",
        body: "The function must be named `plus` but the `operator` modifier is optional.",
        correct: false,
        rationale: "Without `operator` the function is callable as `a.plus(b)` but the `+` syntax is rejected. The modifier is the opt-in.",
      },
    ],
    solution: {
      mentalModel:
        "Kotlin's conventions are duck typing with a keyword. `plus`, `get`, `invoke`, `contains`, `compareTo`, `iterator`, `rangeTo`, `component1` — each maps to syntax if marked `operator`.",
      whyItWorks: [
        "Structural resolution means extensions can add operators to third-party types.",
        "The `operator` modifier keeps it explicit, so a method called `plus` by accident does not silently gain syntax.",
      ],
      commonMistakes: [
        "Overloading `+` on a type where addition is not obvious — operators should not surprise the reader.",
        "Forgetting that `+=` prefers `plusAssign` when it exists, which mutates rather than replaces.",
      ],
      followUps: ["Why is defining both `plus` and `plusAssign` on a mutable type an error?"],
    },
  },
  {
    id: "k21",
    slug: "string-building-cost",
    title: "Building Strings in a Loop",
    description: "Two implementations, identical output, very different allocation behaviour.",
    difficulty: "Easy",
    format: "code-reading",
    track: "Kotlin",
    topics: ["kotlin", "performance"],
    stage: "explain",
    concepts: ["collection-operators", "lazy-sequences"],
    estimatedMinutes: 10,
    completedCount: 6800,
    introducedInWeek: 2,
    readingCode: `// A
var out = ""
for (item in items) out += "\${item.name}, "

// B
val out = items.joinToString(", ") { it.name }`,
    readingPrompts: [
      {
        id: "p1",
        question: "How many String objects does A allocate for n items?",
        expert:
          "Roughly 2n. Strings are immutable, so each `+=` allocates a `StringBuilder`, appends both sides, and produces a new `String`. Total work is O(n²) in characters copied.",
        keywords: ["2n", "immutable", "quadratic", "n²"],
      },
      {
        id: "p2",
        question: "What does B do differently, and what does it also fix?",
        expert:
          "`joinToString` uses one `StringBuilder` for the whole operation: O(n) appends, one final `String`. It also fixes the trailing separator that A leaves dangling — a correctness bug, not just a performance one.",
        keywords: ["stringbuilder", "one", "separator", "trailing"],
      },
      {
        id: "p3",
        question: "Is A ever acceptable?",
        expert:
          "For a handful of items outside a hot path, yes — the JIT may even fuse adjacent concatenations. It becomes indefensible inside a loop over unbounded input, in a `LazyColumn` item body, or anywhere on the main thread. The deeper point is that B states intent; A states mechanism.",
        keywords: ["small", "hot path", "intent"],
      },
    ],
    solution: {
      mentalModel:
        "Immutable strings mean concatenation is copying. Any loop that concatenates is quadratic; reach for a builder or a stdlib join.",
      whyItWorks: [
        "`joinToString` accepts prefix, postfix, separator, limit and a transform — the four things hand-rolled loops usually get wrong.",
        "`buildString { }` is the general form when the logic is more than a transform.",
      ],
      commonMistakes: ["Manual separator trimming with `dropLast(2)`.", "Reaching for `StringBuilder` directly when `joinToString` says it."],
      complexity: { time: "A: O(n²) · B: O(n)", space: "A: O(n²) churn · B: O(n)" },
      followUps: ["When would `buildString` beat `joinToString`?"],
    },
  },
  {
    id: "k22",
    slug: "lazy-initialisation",
    title: "by lazy and Thread Safety",
    description: "Three modes, three guarantees. Pick one deliberately.",
    difficulty: "Medium",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin"],
    stage: "predict",
    concepts: ["delegation"],
    estimatedMinutes: 7,
    completedCount: 5900,
    introducedInWeek: 2,
    quizStem:
      "A `by lazy` property is read from two threads simultaneously on first access. With the default mode, what happens?",
    quizCode: `val parser by lazy { ExpensiveParser() }`,
    choices: [
      {
        id: "a",
        body: "Both threads build an instance; the second one wins.",
        correct: false,
        rationale: "That is `LazyThreadSafetyMode.PUBLICATION`, which allows concurrent computation but publishes the *first* result. It is not the default.",
      },
      {
        id: "b",
        body: "The initialiser runs once; the second thread blocks until it finishes.",
        correct: true,
        rationale:
          "The default is `SYNCHRONIZED`: double-checked locking on a lock object, so the initialiser runs exactly once and concurrent readers wait.",
      },
      {
        id: "c",
        body: "Undefined — `lazy` is not thread-safe unless you say so.",
        correct: false,
        rationale: "That describes `NONE`, which you opt into explicitly when you know access is confined to one thread.",
      },
      {
        id: "d",
        body: "It throws, because lazy properties cannot be read concurrently.",
        correct: false,
        rationale: "Nothing throws. Concurrency is exactly what the default mode is designed for.",
      },
    ],
    solution: {
      mentalModel:
        "`SYNCHRONIZED` (default): once, others wait. `PUBLICATION`: may run several times, first result wins. `NONE`: no synchronisation at all, cheapest, correct only on a single thread.",
      whyItWorks: [
        "Double-checked locking with a volatile field gives correctness with an uncontended fast path after initialisation.",
        "`NONE` removes even the volatile read, which is why UI-thread-confined properties often use it.",
      ],
      commonMistakes: [
        "Using `lazy` for something with side effects that must happen at a specific time.",
        "`lazy` on a property that depends on a constructor parameter assigned later — it captures at first read, not at construction.",
        "Reaching for `LazyThreadSafetyMode.NONE` everywhere as an optimisation without confirming confinement.",
      ],
      inProduction:
        "Android view binding, Retrofit service creation and heavy formatters are typical `by lazy` candidates. Anything created on the main thread and only used there is a fair case for `NONE`.",
      followUps: ["How does `lateinit var` differ, and what can it not do that `lazy` can?"],
    },
  },
  {
    id: "k23",
    slug: "exception-vs-result",
    title: "Exceptions or Result?",
    description:
      "Decide how failure crosses a layer boundary, and why runCatching is usually the wrong tool.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Kotlin",
    topics: ["kotlin", "architecture"],
    stage: "explain",
    concepts: ["layering"],
    estimatedMinutes: 14,
    completedCount: 5100,
    introducedInWeek: 3,
    readingCode: `suspend fun loadUser(id: String): Result<User> = runCatching {
    api.fetchUser(id).toDomain()
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "What does this catch that you almost certainly did not intend to catch?",
        expert:
          "`CancellationException`. `runCatching` catches `Throwable`, and coroutine cancellation is delivered as an exception. Swallowing it turns a cancelled coroutine into a 'failed' result and breaks structured concurrency — the parent thinks the child completed normally. It also catches `OutOfMemoryError` and every other `Error`.",
        keywords: ["cancellation", "throwable", "structured"],
      },
      {
        id: "p2",
        question: "What does `Result<User>` tell the caller about *why* it failed?",
        expert:
          "Only a `Throwable`, which forces the UI layer to inspect exception types — `is IOException`, `is HttpException` and a `when` on status codes. That pulls transport knowledge up into the presentation layer, which is exactly the coupling the repository was meant to absorb.",
        keywords: ["throwable", "type", "coupling", "sealed"],
      },
      {
        id: "p3",
        question: "What would you return instead?",
        expert:
          "A domain-specific sealed type: `sealed interface LoadUserResult { data class Success(val user: User); data object NotFound; data object Offline; data class Unexpected(val cause: Throwable) }`. The UI then maps exhaustively over outcomes it can act on, and the mapping from HTTP status to outcome lives once, in the data layer.",
        keywords: ["sealed", "domain", "exhaustive"],
      },
      {
        id: "p4",
        question: "If you keep `runCatching`, what is the minimum fix?",
        expert:
          "Rethrow cancellation: `.onFailure { if (it is CancellationException) throw it }`, or use a `catch` that targets `Exception` and rethrows `CancellationException` explicitly. Many codebases wrap this in a `suspendRunCatching` helper so nobody has to remember.",
        keywords: ["rethrow", "cancellationexception"],
      },
    ],
    solution: {
      mentalModel:
        "`Result` is a transport for 'something threw'. A domain outcome type is a statement about what can happen. Boundaries between layers deserve the second.",
      whyItWorks: [
        "Exhaustive `when` over a sealed outcome means a new failure mode breaks the build at every place that must handle it.",
        "Transport details stay in the layer that owns transport.",
      ],
      commonMistakes: [
        "`runCatching` in suspending code without rethrowing `CancellationException`.",
        "Returning `Result<T>` from a repository and doing `is IOException` checks inside a composable.",
      ],
      inProduction:
        "Google's own guidance moved this way: expose domain results from repositories, keep exceptions for genuinely exceptional programming errors.",
      followUps: [
        "Why does `Result` have no `catch`-like operator for specific types?",
        "Where should retry logic live in this design?",
      ],
    },
  },
  {
    id: "k24",
    slug: "kotlin-equality-identity",
    title: "== , equals and === ",
    description: "Predict four comparisons involving boxing and identity.",
    difficulty: "Medium",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin"],
    stage: "predict",
    concepts: ["equality"],
    estimatedMinutes: 8,
    completedCount: 7100,
    introducedInWeek: 1,
    quizStem: "Which line prints `false`?",
    quizCode: `val a: Int = 1000
val b: Int = 1000
val c: Int? = 1000
val d: Int? = 1000

println(a == b)    // 1
println(c == d)    // 2
println(c === d)   // 3
println(a == c)    // 4`,
    choices: [
      {
        id: "a",
        body: "Line 1",
        correct: false,
        rationale: "Both are primitive `int` on the JVM; `==` is a value comparison and is true.",
      },
      {
        id: "b",
        body: "Line 3",
        correct: true,
        rationale:
          "`Int?` boxes to `java.lang.Integer`. The Integer cache only covers −128..127, so 1000 produces two distinct objects and referential equality is false. `==` (line 2) still calls `equals` and is true.",
      },
      { id: "c", body: "Line 2", correct: false, rationale: "`==` compiles to a null-safe `equals` call, which compares values. True." },
      { id: "d", body: "Line 4", correct: false, rationale: "Mixed nullable/non-null comparison still goes through `equals`. True." },
    ],
    solution: {
      mentalModel:
        "`==` means `equals` (null-safe). `===` means 'the same object'. Nullable primitives box, and boxing is where identity stops matching intuition.",
      whyItWorks: [
        "`Int` maps to primitive `int` where it can; `Int?` must box because primitives cannot be null.",
        "`Integer.valueOf` caches a small range, so small values may be identical and large ones never are — an inconsistency worth knowing about, never worth relying on.",
      ],
      commonMistakes: [
        "Using `===` on boxed values as a fast path.",
        "Assuming this changes anything about `data class` equality — it does not; `==` is what you want there.",
      ],
      followUps: ["Where does this matter in Compose's `remember` and state equality checks?"],
    },
  },
  {
    id: "k25",
    slug: "inline-class-value-class",
    title: "value class: Type Safety Without Allocation",
    description: "Stop passing three Strings that mean different things.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["kotlin", "oop"],
    stage: "implement",
    ownership: "implement",
    concepts: ["inline-reified", "data-classes"],
    estimatedMinutes: 12,
    completedCount: 4700,
    introducedInWeek: 2,
    prompt:
      "A function signature `fun link(userId: String, postId: String, token: String)` is an invitation to pass arguments in the wrong order. Introduce value classes so the compiler catches it, and know when the wrapper actually gets allocated.",
    requirements: [
      "Define `UserId`, `PostId` and `AuthToken` as `@JvmInline value class`",
      "Each wraps a single `String`",
      "Swapping two arguments must fail to compile",
    ],
    relatedConcepts: ["value class", "Type erasure", "Boxing rules"],
    starterCode: `// TODO: define the three value classes

fun link(userId: UserId, postId: PostId, token: AuthToken): String = TODO()`,
    solutionCode: `@JvmInline value class UserId(val value: String)
@JvmInline value class PostId(val value: String)
@JvmInline value class AuthToken(val value: String)

fun link(userId: UserId, postId: PostId, token: AuthToken): String =
    "/u/\${userId.value}/p/\${postId.value}?t=\${token.value}"`,
    tests: [
      {
        name: "builds the link",
        call: `link(UserId("u1"), PostId("p2"), AuthToken("t3"))`,
        expected: `/u/u1/p/p2?t=t3`,
      },
      {
        name: "argument swap is a compile error",
        call: `link(PostId("p2"), UserId("u1"), AuthToken("t3"))`,
        expected: `compile error`,
        hidden: true,
      },
    ],
    hints: [
      "`@JvmInline value class` compiles away to the underlying type in most positions.",
      "Boxing returns when the value is used as a generic argument, a nullable, or an interface type.",
    ],
    solution: {
      mentalModel:
        "A value class is a compile-time distinction with (usually) no runtime cost. The wrapper exists in the type system and disappears in the bytecode — until something forces it to be an object.",
      whyItWorks: [
        "Distinct types make the three parameters non-interchangeable, so ordering mistakes are compile errors.",
        "In simple positions the compiler passes the underlying `String` directly — no allocation.",
      ],
      commonMistakes: [
        "Assuming zero allocation always: `List<UserId>`, `UserId?` and using it via an implemented interface all box.",
        "Adding a second property — a value class holds exactly one.",
        "Forgetting `@JvmInline`, which is required on the JVM target.",
      ],
      inProduction:
        "Widely used for ids, durations and units. `kotlin.time.Duration` is itself a value class, which is why it costs nothing over a `Long`.",
      followUps: [
        "What does mangling do to the JVM method name, and why does that matter for Java callers?",
        "When is a `typealias` sufficient instead? (When you want documentation, not safety — typealiases are interchangeable.)",
      ],
    },
  },
  {
    id: "k26",
    slug: "collection-operations-on-map",
    title: "Transforming a Map Without Losing Its Shape",
    description: "mapValues, filterKeys, and the operator that quietly gives you a List.",
    difficulty: "Easy",
    format: "coding",
    track: "Kotlin",
    topics: ["collections"],
    stage: "implement",
    ownership: "implement",
    concepts: ["collection-operators"],
    estimatedMinutes: 10,
    completedCount: 9300,
    introducedInWeek: 1,
    prompt:
      "Given `Map<String, List<Order>>` keyed by customer, produce `Map<String, Int>` of order counts — for customers with at least one non-cancelled order.",
    requirements: [
      "Return a `Map`, not a `List<Pair<..>>`",
      "Exclude cancelled orders from the count",
      "Exclude customers whose count would be zero",
    ],
    relatedConcepts: ["mapValues", "filterValues", "map on Map returns List"],
    starterCode: `data class Order(val id: String, val cancelled: Boolean)

fun activeCounts(byCustomer: Map<String, List<Order>>): Map<String, Int> {
    TODO()
}`,
    solutionCode: `fun activeCounts(byCustomer: Map<String, List<Order>>): Map<String, Int> =
    byCustomer
        .mapValues { (_, orders) -> orders.count { !it.cancelled } }
        .filterValues { it > 0 }`,
    tests: [
      {
        name: "counts active only",
        call: `activeCounts(mapOf("a" to listOf(Order("1", false), Order("2", true))))`,
        expected: `{a=1}`,
      },
      {
        name: "drops empty customers",
        call: `activeCounts(mapOf("a" to listOf(Order("1", true))))`,
        expected: `{}`,
      },
    ],
    hints: [
      "`map { }` on a `Map` gives you a `List` of whatever the lambda returns — probably not what you want here.",
      "`mapValues` keeps the keys and the Map shape.",
    ],
    solution: {
      mentalModel:
        "On a `Map`, `map` iterates entries and returns a `List`. `mapValues`, `mapKeys`, `filterKeys` and `filterValues` are the ones that keep you in Map-land.",
      whyItWorks: [
        "`mapValues` preserves keys and ordering characteristics of the source map.",
        "Filtering after counting is the only order that can know the count is zero.",
      ],
      commonMistakes: [
        "`.map { it.key to it.value.size }.toMap()` — works, allocates a list of pairs on the way.",
        "`mapKeys` with a non-injective transform, silently collapsing entries.",
      ],
      complexity: { time: "O(total orders)", space: "O(customers)" },
      followUps: ["What ordering guarantee does the returned map have, and where does it come from?"],
    },
  },
  {
    id: "k27",
    slug: "infix-and-dsl",
    title: "Reading a Kotlin DSL",
    description:
      "Work out what makes `install(ContentNegotiation) { json() }` legal Kotlin.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Kotlin",
    topics: ["kotlin", "generics"],
    stage: "explain",
    concepts: ["extension-functions"],
    estimatedMinutes: 12,
    completedCount: 4100,
    introducedInWeek: 2,
    readingCode: `fun buildCard(block: CardScope.() -> Unit): Card {
    val scope = CardScope()
    scope.block()
    return scope.build()
}

val card = buildCard {
    title = "Debounced Search"
    tag("Flow")
    tag("Android")
}`,
    readingPrompts: [
      {
        id: "p1",
        question: "What exactly is `CardScope.() -> Unit`?",
        expert:
          "A function type with a receiver. Inside the lambda, `this` is a `CardScope`, so `title = ...` is `this.title = ...` and `tag(...)` is `this.tag(...)`. It is the single feature that makes Kotlin DSLs read like configuration rather than code.",
        keywords: ["receiver", "this", "function type"],
      },
      {
        id: "p2",
        question: "Why is the lambda passed outside the parentheses?",
        expert:
          "Trailing lambda syntax: when the last parameter is a function type it may be moved outside the call. With no other arguments, the parentheses vanish entirely. Compose's entire API surface depends on this.",
        keywords: ["trailing", "last parameter"],
      },
      {
        id: "p3",
        question: "What goes wrong when these are nested, and what fixes it?",
        expert:
          "Nested builders stack receivers: inside a `row { column { ... } }`, both scopes are in scope, so a call meant for the outer one silently resolves in the inner one. `@DslMarker` on an annotation applied to the scope types makes the implicit outer receiver unavailable, turning those mistakes into compile errors.",
        keywords: ["dslmarker", "nested", "receiver", "scope"],
      },
      {
        id: "p4",
        question: "Why does the builder run the block before `build()` rather than after?",
        expert:
          "The block's job is to mutate the scope; `build()` then snapshots it into an immutable value. Doing it the other way round would produce a card that ignores its own configuration. The pattern — mutable builder, immutable product — is why the mutation is safe: it never escapes the function.",
        keywords: ["mutable", "immutable", "snapshot"],
      },
    ],
    solution: {
      mentalModel:
        "A Kotlin DSL is three ordinary features stacked: a function type with receiver, trailing lambda syntax and a mutable scope object that produces an immutable result.",
      whyItWorks: [
        "The receiver brings scope members into implicit scope without imports.",
        "Confining the mutable builder to one function keeps shared mutable state out of the result.",
      ],
      commonMistakes: ["Omitting `@DslMarker` and getting confusing cross-scope resolution.", "Letting the scope object escape the builder function."],
      inProduction: "Compose, Ktor, Gradle Kotlin DSL and Room's testing APIs all use this exact shape.",
      followUps: ["How would you make `title` required rather than defaulted?"],
    },
  },
  {
    id: "k28",
    slug: "iterator-and-ranges",
    title: "Ranges, Progressions and Off-by-One",
    description: "Four loops. Predict the last value each one visits.",
    difficulty: "Warmup",
    format: "quiz",
    track: "Kotlin",
    topics: ["kotlin"],
    stage: "predict",
    concepts: ["collection-operators"],
    estimatedMinutes: 5,
    completedCount: 15600,
    introducedInWeek: 1,
    quizStem: "Which loop visits the indices of `list` exactly once each, in order, with no risk of an index error?",
    quizCode: `// 1
for (i in 0..list.size)
// 2
for (i in 0 until list.size)
// 3
for (i in list.indices)
// 4
for (i in 0..list.lastIndex)`,
    choices: [
      {
        id: "a",
        body: "Only 3.",
        correct: false,
        rationale: "2, 3 and 4 are all correct and equivalent. `indices` is the clearest, but it is not the only safe form.",
      },
      {
        id: "b",
        body: "2, 3 and 4 — but 1 goes one past the end.",
        correct: true,
        rationale:
          "`..` is inclusive on both ends, so `0..list.size` visits `size`, which is out of bounds. `until` is half-open, `indices` is `0 until size`, and `lastIndex` is `size - 1`.",
      },
      { id: "c", body: "1 and 3 only.", correct: false, rationale: "1 is the one that throws." },
      { id: "d", body: "All four, because Kotlin ranges are clamped to the collection.", correct: false, rationale: "Ranges know nothing about the collection. Nothing is clamped; `list[size]` throws `IndexOutOfBoundsException`." },
    ],
    solution: {
      mentalModel: "`..` inclusive. `until` half-open. `indices` = `0 until size`. `lastIndex` = `size - 1`. `downTo` and `step` build progressions from the same parts.",
      whyItWorks: ["`indices` states intent and cannot be off by one.", "`..<` is the newer operator form of `until` and reads well in modern code."],
      commonMistakes: ["`0..size` in a loop.", "`for (i in list.size downTo 0)` when iterating backwards — should be `lastIndex downTo 0`."],
      followUps: ["When is `withIndex()` clearer than an index loop at all?"],
    },
  },
  {
    id: "k29",
    slug: "companion-object-vs-top-level",
    title: "companion object or Top-Level?",
    description: "Where a factory function belongs, and what each choice costs.",
    difficulty: "Easy",
    format: "quiz",
    track: "Kotlin",
    topics: ["oop", "kotlin"],
    stage: "explain",
    concepts: ["companion-objects"],
    estimatedMinutes: 6,
    completedCount: 6900,
    introducedInWeek: 2,
    quizStem:
      "You need a factory that builds a `UiState` from a domain model. Which placement is most defensible in Kotlin?",
    choices: [
      {
        id: "a",
        body: "A top-level function in the same file as `UiState`.",
        correct: true,
        rationale:
          "Kotlin has no requirement that functions live in a class. A top-level `fun UiState(user: User): UiState` or `fun User.toUiState()` is discoverable, testable and generates no extra class.",
      },
      {
        id: "b",
        body: "A `companion object` with a `create` function, because that is the Java convention.",
        correct: false,
        rationale:
          "It works, but a companion is a real object instance held by the class. Choosing it out of Java habit adds a class and an indirection for nothing. Choose it when you need `@JvmStatic` interop, a private constructor, or interface implementation.",
      },
      {
        id: "c",
        body: "An `object Factory` singleton.",
        correct: false,
        rationale: "A stateless singleton to hold one pure function is a class you have to name, import and test around, with no benefit.",
      },
      {
        id: "d",
        body: "A `static` method.",
        correct: false,
        rationale: "Kotlin has no `static`. The nearest equivalents are top-level declarations and `@JvmStatic` members of a companion.",
      },
    ],
    solution: {
      mentalModel:
        "Reach for top-level by default. Reach for a companion when you need something that only a class member can do: private-constructor access, Java static interop, or implementing an interface.",
      whyItWorks: ["Top-level functions compile to static methods on a file class — the cheapest option available.", "Extension functions keep mappers out of domain models entirely, preserving layer direction."],
      commonMistakes: ["Companion objects as a namespace habit, one per class.", "Putting constants in a companion when a top-level `const val` or an `enum` is clearer."],
      followUps: ["What does `const val` require, and why can it not live inside a plain class body?"],
    },
  },
  {
    id: "k30",
    slug: "tail-recursion-and-stack",
    title: "tailrec and the Stack",
    description: "Turn a recursive function into a loop without rewriting the logic.",
    difficulty: "Medium",
    format: "coding",
    track: "Kotlin",
    topics: ["kotlin", "dsa"],
    stage: "implement",
    ownership: "implement",
    concepts: ["flow"],
    estimatedMinutes: 12,
    completedCount: 3900,
    introducedInWeek: 3,
    prompt:
      "Walk a linked parent chain to the root. With deep hierarchies a naive recursion overflows the stack; `tailrec` makes the compiler emit a loop instead — but only if the recursive call is genuinely in tail position.",
    requirements: [
      "`tailrec fun root(node: Node): Node`",
      "Handle a node with no parent",
      "The recursive call must be the last operation",
    ],
    relatedConcepts: ["tailrec", "Stack frames", "Tail position"],
    starterCode: `data class Node(val id: String, val parent: Node?)

tailrec fun root(node: Node): Node {
    TODO()
}`,
    solutionCode: `tailrec fun root(node: Node): Node {
    val parent = node.parent ?: return node
    return root(parent)
}`,
    tests: [
      { name: "already root", call: `root(Node("a", null))`, expected: `Node(id=a, parent=null)` },
      { name: "walks to root", call: `root(Node("c", Node("b", Node("a", null))))`, expected: `Node(id=a, parent=null)` },
    ],
    hints: [
      "`return root(parent).also { log(it) }` is *not* tail position — something happens after the call returns.",
      "If the call is not in tail position the compiler reports a warning and leaves the recursion alone.",
    ],
    solution: {
      mentalModel:
        "Tail position means the recursive call's result is returned unchanged. When that holds, the current frame is dead at the moment of the call, so the compiler can reuse it — recursion becomes iteration with no source change.",
      whyItWorks: [
        "`tailrec` compiles the function body into a loop with parameter reassignment.",
        "Stack depth becomes O(1) regardless of chain length.",
      ],
      commonMistakes: [
        "Wrapping the recursive call in anything — `1 + f(x)`, `f(x).also { }`, a `try` block — which silently disables the optimisation.",
        "Ignoring the compiler warning that says the call is not in tail position.",
      ],
      complexity: { time: "O(depth)", space: "O(1) with tailrec, O(depth) without" },
      inProduction: "View hierarchy walks, navigation back-stack traversal and nested-comment threads are all real cases where depth is untrusted input.",
      followUps: ["Why can the JVM not do this automatically at runtime?"],
    },
  },
];
