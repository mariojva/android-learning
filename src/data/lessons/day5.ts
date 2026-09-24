import type { Lesson } from "@/lib/types";

/**
 * Module 01, Lesson 3 — when work happens, and who is allowed to make things.
 *
 * Closes the last two concepts in m01: lazy-sequences and
 * companion-objects. They pair because both are about *time*: a sequence
 * defers computation until something asks for it, `by lazy` defers
 * initialisation until first read, and an object declaration is itself
 * initialised on first access. Construction belongs in the same lesson
 * because "who makes this, and when" is the other half of the question.
 *
 * Every language claim is quoted from kotlinlang.org; sources are in
 * claude/content-verification-log.md.
 */
export const DAY_5: Lesson = {
  id: "day-5",
  slug: "day-5",
  dayNumber: 5,
  moduleId: "m01",
  title: "When the Work Actually Happens",
  subtitle: "Module 01 · Lesson 3 — Kotlin Foundations",
  goal:
    "Know at which moment each line of your code runs, and choose deliberately between doing work now and doing it when someone asks.",
  concepts: ["lazy-sequences", "companion-objects"],
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
          id: "w-code",
          kind: "code",
          title: "Two chains, one difference",
          code: {
            language: "kotlin",
            code: `val words = listOf("alpha", "beta", "gamma", "delta")

val a = words
    .map { println("map " + it); it.length }
    .first { it > 4 }

val b = words.asSequence()
    .map { println("map " + it); it.length }
    .first { it > 4 }`,
          },
        },
        {
          id: "w-predict",
          kind: "predict",
          question:
            "How many times does each chain print? Answer as two numbers.",
          expected: "4 1",
          answer:
            "**Four** for the list, **one** for the sequence.\n\n\"When the processing of an `Iterable` includes multiple steps, they are executed eagerly: each processing step completes and returns its result – an intermediate collection.\" So `map` runs over all four words, builds a list of four lengths, and only then does `first` look at it — and stops at the first, having already paid for all four.\n\nThe sequence does the opposite: \"`Sequence` performs all the processing steps one-by-one for every single element.\" It takes `\"alpha\"`, maps it to 5, asks `first` whether 5 > 4, gets yes, and stops. The other three words are never mapped at all.",
        },
        {
          id: "w-teach",
          kind: "callout",
          tone: "insight",
          title: "The distinction to hold",
          body: [
            "A `List` chain asks **\"what is every intermediate result?\"** and answers it step by step, across the whole collection.",
            "A `Sequence` chain asks **\"what does the consumer need?\"** and pulls exactly that much through, element by element.",
            "Neither is faster in general. The list wins on small data because it has no per-element machinery; the sequence wins when the work is expensive, the collection is large, or — as here — the consumer stops early.",
          ],
        },
        {
          id: "w-quiz",
          kind: "quiz",
          question:
            "Which of these is the strongest reason to reach for `asSequence()`?",
          choices: [
            {
              id: "a",
              body: "The collection has thousands of elements.",
              correct: false,
              rationale:
                "Necessary but not sufficient. Size alone with one cheap operation can still be slower as a sequence — the per-element overhead is real and you have added it for no saving.",
            },
            {
              id: "b",
              body: "Several chained steps, and the consumer may not need all of it.",
              correct: true,
              rationale:
                "This is where it pays twice: no intermediate collections are built, and early termination means later elements are never processed at all. The documentation's own framing is that sequences \"let you avoid building results of intermediate steps\".",
            },
            {
              id: "c",
              body: "It reads better and is the more modern API.",
              correct: false,
              rationale:
                "It is neither more modern nor generally more readable — `asSequence()` and a terminal operation are extra ceremony. The explicit warning in the docs is that \"the lazy nature of sequences adds some overhead which may be significant when processing smaller collections or doing simpler computations\".",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "sequences",
      title: "Laziness, and what it costs",
      kicker: "Element-at-a-time versus step-at-a-time",
      startMinute: 10,
      endMinute: 34,
      blocks: [
        {
          id: "q-pipeline-list",
          kind: "pipeline",
          title: "List: each step finishes before the next begins",
          stages: [
            { label: "[a, b, c, d]", caption: "source" },
            { label: "map", caption: "runs 4 times" },
            { label: "[1, 2, 3, 4]", caption: "an intermediate list" },
            { label: "filter", caption: "runs 4 times" },
            { label: "[2, 4]", caption: "another list" },
          ],
          body: [
            "Two allocations, eight operations, and both are paid in full before the consumer sees anything. For four elements that is irrelevant. For forty thousand, with a parse or a regex inside the `map`, it is the whole cost of the screen.",
          ],
        },
        {
          id: "q-pipeline-seq",
          kind: "pipeline",
          title: "Sequence: each element walks the whole chain",
          stages: [
            { label: "a", caption: "one element" },
            { label: "map → filter", caption: "both steps, on a alone" },
            { label: "b", caption: "then the next" },
            { label: "map → filter", caption: "and so on" },
            { label: "stops when asked", caption: "or when the consumer is satisfied" },
          ],
          body: [
            "No intermediate lists exist at any point — there is nowhere for them to be. That is the memory saving, and it is why a sequence can process something larger than memory, or something infinite.",
            "The cost is a function call or two per element per step. Real, small, and worth it only when the work inside dwarfs it.",
          ],
        },
        {
          id: "q-terminal",
          kind: "prose",
          body: [
            "A sequence does nothing until a **terminal** operation asks it to. `map`, `filter` and `take` are intermediate — they describe work. `toList`, `first`, `count`, `sum` and `forEach` are terminal — they demand it.",
            "\"Multistep processing of sequences is executed lazily when possible: actual computing happens only when the result of the whole processing chain is requested.\"",
            "Which gives the mistake worth knowing about in advance.",
          ],
        },
        {
          id: "q-trap",
          kind: "code",
          title: "The chain that does nothing",
          code: {
            language: "kotlin",
            code: `fun warmCaches(ids: List<String>) {
    ids.asSequence()
        .map { load(it) }
        .filter { it.isStale }
}`,
          },
        },
        {
          id: "q-trap-explain",
          kind: "explain",
          question:
            "What does `warmCaches` do, and how would you notice in production?",
          keywords: ["terminal", "nothing", "lazy", "never runs"],
          answer:
            "It does **nothing at all**. There is no terminal operation, so `load` is never called for any id — the function builds a description of some work and throws it away.\n\nAs a `List` chain the same code would have worked, wastefully but correctly. Adding `asSequence()` as an optimisation silently turned a working function into a no-op.\n\nHow you notice is the unpleasant part: nothing throws, nothing logs, and the compiler is satisfied — the chain is a valid expression whose value is discarded. You notice because a cache is always cold, days later, and the function that fills it looks correct. The habit that prevents it: a sequence chain should always end somewhere you can point at.",
        },
        {
          id: "q-quiz",
          kind: "quiz",
          question:
            "Which chain over a 50,000-row list benefits most from `asSequence()`?",
          choices: [
            {
              id: "a",
              body: ".map { it.id }.toSet()",
              correct: false,
              rationale:
                "One cheap step and a terminal that consumes everything. There is one intermediate list to save and no early exit, so you are paying per-element overhead for very little. Measure before assuming it helps.",
            },
            {
              id: "b",
              body: ".map { parse(it) }.filter { it.valid }.take(20)",
              correct: true,
              rationale:
                "Both wins at once. `take(20)` means roughly twenty parses instead of fifty thousand, and the two intermediate lists are never built. This is the shape sequences exist for — expensive work, several steps, a consumer that stops early.",
            },
            {
              id: "c",
              body: ".sortedBy { it.name }.map { it.title }",
              correct: false,
              rationale:
                "`sortedBy` cannot be lazy — it has to see every element before it can emit the first one. A sort in the middle of a chain collapses the sequence back to a full materialisation, so the laziness buys nothing before it and little after.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "lazy",
      title: "`by lazy`, and the cost of the guarantee",
      kicker: "The same idea applied to a single value",
      startMinute: 34,
      endMinute: 54,
      blocks: [
        {
          id: "l-intro",
          kind: "prose",
          body: [
            "A sequence defers work over many elements. `by lazy` defers it for exactly one value.",
            "\"`lazy()` is a function that takes a lambda and returns an instance of `Lazy<T>`, which can serve as a delegate for implementing a lazy property. The first call to `get()` executes the lambda passed to `lazy()` and remembers the result. Subsequent calls to `get()` simply return the remembered result.\"",
          ],
        },
        {
          id: "l-code",
          kind: "code",
          title: "Three ways to initialise the same property",
          code: {
            language: "kotlin",
            code: `class Screen {
    // Built when Screen is constructed, always.
    val formatterA = expensiveFormatter()

    // Built on first read, then remembered.
    val formatterB by lazy { expensiveFormatter() }

    // Built on every read.
    val formatterC get() = expensiveFormatter()
}`,
          },
        },
        {
          id: "l-predict",
          kind: "explain",
          question:
            "For a property that is expensive to build and read on only some code paths, which of the three is right — and what does the wrong choice cost?",
          keywords: ["lazy", "once", "every read", "construction"],
          answer:
            "`by lazy`, and the other two fail in opposite directions.\n\n`formatterA` pays the cost on **every** construction of `Screen`, including the paths that never touch it. On Android that lands in `onCreate`, where it is a frame you cannot get back.\n\n`formatterC` is the sneaky one: `get()` has no backing field, so it rebuilds on **every single read**. A property that looks like a value and is really a function call — in a loop or a composable, that is the whole performance bug.\n\n`by lazy` runs once, at first read, and remembers. The cost is one wrapper object and a synchronised check per access, which is nearly always the right trade for something expensive.",
        },
        {
          id: "l-threads",
          kind: "callout",
          tone: "why",
          title: "What the default is protecting you from",
          body: [
            "\"By default, the evaluation of lazy properties is synchronized: the value is computed only in one thread, but all threads will see the same value.\"",
            "That matters because the failure it prevents is not a crash. Without synchronisation two threads can both find the property uninitialised, both run the lambda, and each keep a different instance — so you end up with two \"singleton\" caches, and writes to one are invisible to the other.",
            "The two escape hatches exist for real cases. `LazyThreadSafetyMode.PUBLICATION` allows multiple threads to run the initialiser, with the first result winning — fine when the value is cheap and interchangeable. `NONE` drops the guarantees entirely: \"If you're sure that the initialization will always happen in the same thread as the one where you use the property.\" On a property only ever touched from the main thread that is free performance, and a genuine bug the day someone reads it from a coroutine on `Dispatchers.IO`.",
          ],
        },
        {
          id: "l-quiz",
          kind: "quiz",
          question:
            "Where does `LazyThreadSafetyMode.NONE` stop being safe?",
          choices: [
            {
              id: "a",
              body: "As soon as the class is used on more than one screen.",
              correct: false,
              rationale:
                "Screens are not threads. Many screens on the main thread are still one thread, and the mode is fine.",
            },
            {
              id: "b",
              body: "The moment any read can happen off the thread that first initialised it.",
              correct: true,
              rationale:
                "Correct, and it is easy to reach by accident: a repository property read from a `viewModelScope.launch(Dispatchers.IO)` is now being touched from a different thread. The failure is not a crash but two instances, which is far harder to diagnose than a crash would be.",
            },
            {
              id: "c",
              body: "Never — lazy is always safe, the modes only affect speed.",
              correct: false,
              rationale:
                "The modes are precisely about safety. `NONE` \"doesn't incur any thread-safety guarantees and related overhead\" — you are buying the speed by giving up the guarantee.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "construction",
      title: "Who is allowed to make one",
      kicker: "Objects, companions, and the factory you already use",
      startMinute: 54,
      endMinute: 78,
      blocks: [
        {
          id: "c-intro",
          kind: "prose",
          body: [
            "The other half of \"when does this happen\" is \"who made it\". Kotlin has no `static`, and the thing people reach for instead behaves differently in a way worth knowing.",
            "\"Although members of companion objects in Kotlin look like static members from other languages, they are actually instance members of the companion object, meaning they belong to the object itself.\"",
            "So a companion object is a real object — a singleton held by the class — and its members are its members, not the class's. On the JVM you can get genuine statics with `@JvmStatic` when Java interop needs them.",
          ],
        },
        {
          id: "c-lazy-init",
          kind: "callout",
          tone: "insight",
          title: "And it is lazy too",
          body: [
            "\"Object declarations are initialized lazily, when accessed for the first time\", and \"the initialization of an object declaration is thread-safe and done on first access.\"",
            "Which means an `object` is `by lazy` with a language keyword: nothing runs until something touches it, and the runtime handles the thread safety.",
            "It also means the cost of a heavy `object` is not paid at startup — it is paid at whatever unpredictable moment first reads it, which is usually worse. A singleton that opens a database in its initialiser will do so on whichever thread happens to mention it first.",
          ],
        },
        {
          id: "c-compare",
          kind: "compare",
          title: "companion object or a top-level function?",
          compare: [
            {
              label: "Companion",
              code: `class Money private constructor(val minor: Long) {
    companion object {
        fun fromPounds(p: Double) = Money((p * 100).toLong())
    }
}`,
              verdict:
                "Right when it belongs to the type — a factory that guards a private constructor, a constant that is part of the type's contract. `Money.fromPounds(…)` reads as the type making one of itself.",
            },
            {
              label: "Top-level",
              code: `fun formatMoney(m: Money): String = "..."`,
              verdict:
                "Right when it merely operates on the type. It needs no access to internals, it does not belong to `Money`, and putting it in a companion adds a layer and a name for nothing.",
            },
          ],
        },
        {
          id: "c-explain",
          kind: "explain",
          question:
            "Why does making a constructor private and exposing a factory buy you anything, when the factory just calls the constructor?",
          keywords: ["invariant", "validate", "control", "change"],
          answer:
            "Because a constructor can only return a new instance of exactly that class, and a factory can do anything.\n\nIt can **validate** and refuse — returning a `Result`, or throwing with a message better than a failed `require` deep in a constructor. It can **cache**, returning the same instance for the same input. It can return a **subtype**, which is how a sealed hierarchy gets a single entry point. And it can **change later** without touching a single call site, because callers never named the constructor.\n\nThe cost is one indirection and one more name, so it is not a default — it pays when the type has an invariant worth protecting. A `Money` that must never hold a fractional penny, or a `UserId` that must be non-blank, are the shape.",
        },
        {
          id: "c-sources",
          kind: "callout",
          tone: "warning",
          title: "Where the two sources diverge: singletons",
          body: [
            "Kotlin gives you `object` as a first-class singleton, initialised lazily and thread-safely, and treats it as an ordinary tool. Android's guidance treats the *pattern* with suspicion.",
            "On the service locator — a global object handing out dependencies, which is what an `object` usually grows into — the dependency injection guide is explicit: \"The collection of dependencies required by a service locator makes code harder to test because all the tests have to interact with the same global service locator\", and \"dependencies are encoded in the class implementation, not in the API surface. As a result, it's harder to know what a class needs from the outside.\"",
            "Its recommendation is constructor injection, with \"Hilt is Jetpack's recommended library for dependency injection in Android.\"",
            "The two are not in conflict once you separate the mechanism from the use. `object` is a fine way to hold something genuinely global and stateless — a formatter, a constant table, a pure helper. It is a poor way to hold your app's dependency graph, because then every test shares one mutable world. Kotlin is telling you the singleton is cheap; Android is telling you what it costs at the scale of an app.",
          ],
        },
        {
          id: "c-warn",
          kind: "callout",
          tone: "warning",
          title: "The Android-specific version of getting this wrong",
          body: [
            "An `object` holding anything with a shorter life than the process is the leak from Module 04's rule, arriving early: `object Session { var activity: Activity? = null }` keeps a destroyed screen alive for the life of the app.",
            "And because object initialisation is lazy and thread-safe but the object's **contents** are not, a `var` inside one is shared mutable state with no synchronisation and no owner. Every screen can write it and none clears it.",
            "The Day 2 test applies unchanged: an object must never hold a reference to something shorter-lived than itself.",
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "drills",
      title: "Drills",
      kicker: "Say the answer before you read it",
      startMinute: 78,
      endMinute: 92,
      blocks: [
        {
          id: "dr-1",
          kind: "explain",
          question:
            "A ViewModel has `val repo by lazy { Repository(db) }`. What is wrong with that, beyond the laziness?",
          keywords: ["inject", "construct", "test", "dependency"],
          answer:
            "The laziness is the least of it: the ViewModel is **constructing its own dependency**, which is the arrow pointing the wrong way from Module 02.\n\n`by lazy` makes it look like a performance decision, so it slips through review — but the ViewModel now knows how to build a `Repository`, needs a `db` to do it, and cannot be tested with a fake. Deferring the construction does not change who is doing the constructing.\n\nThe fix is a constructor parameter, and the laziness usually becomes unnecessary once something else owns the lifetime. `by lazy` is for deferring **your own** expensive work, not for hiding a dependency you should have been given.",
        },
        {
          id: "dr-2",
          kind: "explain",
          question:
            "`generateSequence { readNextLine() }` produces an infinite sequence. Why is that not a bug?",
          keywords: ["terminal", "pull", "consumer", "take"],
          answer:
            "Because nothing in a sequence runs until something pulls, so \"infinite\" costs nothing to describe. The consumer decides how much exists — `take(100)`, or a `first { }` that stops as soon as it is satisfied.\n\nThis is the clearest demonstration that a sequence is a *description* of work rather than the work. A `List` cannot be infinite because building it is the point; a `Sequence` can, because building it is deferred to whoever asks.\n\nThe bug is only ever at the consuming end — a terminal operation with no bound (`toList()` on an infinite sequence) hangs, and it hangs silently.",
        },
        {
          id: "dr-3",
          kind: "explain",
          question:
            "You move a heavy computation from the constructor into `by lazy` and the startup jank disappears. What have you actually done?",
          keywords: ["moved", "first read", "deferred", "still happens"],
          answer:
            "**Moved it**, not removed it. The work still happens in full, at whatever moment something first reads the property — which is now less predictable, not less expensive.\n\nSometimes that is a real win: if the property is read on only one of five code paths, four users never pay. If it is read immediately by the screen that constructed the object, you have moved a frame drop from construction to first render and gained nothing but a harder profile to read.\n\nSo the question to ask is not \"is this expensive?\" but **\"is this always needed?\"** Lazy pays when the answer is no. When the answer is yes, the real fix is making the work cheaper or moving it off the main thread.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "implement",
      title: "Implementation challenge",
      kicker: "Decide whether laziness earns its keep",
      startMinute: 92,
      endMinute: 106,
      blocks: [
        {
          id: "im-intro",
          kind: "prose",
          body: [
            "Read the chain, decide whether a sequence helps, and be able to say why in terms of steps and consumers rather than collection size.",
          ],
        },
        {
          id: "im-challenge",
          kind: "implement",
          title: "When a sequence earns its keep",
          questionSlug: "sequence-vs-list",
          body: [
            "Work out which of these chains a sequence improves, which it leaves unchanged, and which it makes worse.",
          ],
        },
        {
          id: "im-after",
          kind: "explain",
          question:
            "After finishing: what single property of a chain best predicts whether a sequence helps?",
          keywords: ["early", "terminal", "steps", "consume"],
          answer:
            "**Whether the consumer needs all of it.** That one property predicts more than collection size or step count.\n\nA chain ending in `toList()` or `sum()` consumes everything, so the only saving is the intermediate collections — real, but modest. A chain ending in `first`, `take`, `any`, `find` or `none` can stop early, and then the saving is all the work never done, which can be most of it.\n\nSize and expense are multipliers on that saving rather than the reason for it. Which is why \"the list is big\" is the wrong instinct and \"the consumer stops early\" is the right one.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "interview",
      title: "Saying it out loud",
      kicker: "And the end of Module 01",
      startMinute: 106,
      endMinute: 120,
      blocks: [
        {
          id: "v-q1",
          kind: "explain",
          question:
            "\"When would you use a Sequence instead of a List?\" Answer in a way that shows you have measured rather than read.",
          keywords: ["steps", "early", "intermediate", "overhead"],
          answer:
            "*\"When there are several chained steps and the consumer may not need all of it. Then you save both the intermediate collections and the work on elements nobody looks at — a `take(20)` after an expensive `map` over fifty thousand rows does twenty maps instead of fifty thousand.\"*\n\nThen the part that shows judgement, unprompted: *\"For one cheap step, or a terminal that consumes everything anyway, a list is usually faster — laziness has per-element overhead, and the docs say so directly. And a `sortedBy` in the middle collapses the laziness, because it has to see everything before it can emit anything.\"*\n\nNaming where it does **not** help is what separates this from a recited rule.",
        },
        {
          id: "v-challenge",
          kind: "implement",
          title: "companion object or top-level?",
          questionSlug: "companion-object-vs-top-level",
          body: [
            "The construction question in its practical form: does this function belong to the type, or merely operate on it?",
          ],
        },
        {
          id: "v-close",
          kind: "callout",
          tone: "insight",
          title: "Module 01 complete",
          body: [
            "You can now say what `val` guarantees and what it does not; choose a collection operator by its return type; say whether two instances are the same thing and make the answer true; count the states a type allows against the states you meant; and say at which moment each line of your code runs.",
            "Laziness is one idea in three costumes — a sequence defers work per element, `by lazy` defers one value, an `object` defers its own initialisation. All three trade predictable cost for unneeded work avoided, and all three move *when* something fails.",
            "Next, Module 02 asks the question this one has been circling: given that you can model a value correctly, **who should be allowed to know about it?**",
          ],
        },
      ],
    },
  ],
};
