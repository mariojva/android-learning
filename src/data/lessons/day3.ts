import type { Lesson } from "@/lib/types";

/**
 * Day 3 — m02, OOP & Kotlin Abstraction.
 *
 * The module's outcomes are about design, not syntax: split a class that has
 * acquired five responsibilities, argue composition over inheritance on a
 * concrete case, follow the line from interface to dependency inversion to
 * testability. So the lesson is organised around one question — *which way
 * does the dependency point?* — and treats Kotlin's abstraction features as
 * answers to it rather than as a tour of keywords.
 *
 * Every language claim is quoted from kotlinlang.org; sources are in
 * claude/content-verification-log.md.
 */
export const DAY_3: Lesson = {
  id: "day-3",
  slug: "day-3",
  dayNumber: 3,
  moduleId: "m02",
  title: "Which Way the Dependency Points",
  subtitle: "Day 3 · Module 02 — OOP & Kotlin Abstraction",
  goal:
    "Know which abstraction a problem actually calls for, and be able to say what each one buys and what it costs.",
  concepts: ["interfaces", "composition", "dependency-inversion", "delegation"],
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
            "Here is a class of the kind that exists in every codebase. Read it, then say what is wrong with it — in one sentence, without using the words \"clean\", \"messy\" or \"SOLID\".",
          ],
        },
        {
          id: "w-code",
          kind: "code",
          code: {
            language: "kotlin",
            code: `class ProfileManager(private val context: Context) {

    fun loadProfile(id: String): Profile {
        val json = URL("https://api.example.com/users/" + id).readText()
        val profile = Json.decodeFromString<Profile>(json)
        context.getSharedPreferences("cache", 0)
            .edit().putString(id, json).apply()
        Log.d("ProfileManager", "loaded " + id)
        return profile
    }

    fun displayName(p: Profile): String =
        if (p.nickname != null) p.nickname else p.firstName + " " + p.lastName
}`,
          },
        },
        {
          id: "w-explain",
          kind: "explain",
          question:
            "What is actually wrong here? Be specific — name the problem in terms of what would make you edit this file.",
          keywords: ["reason", "change", "responsibilit", "test", "network"],
          answer:
            "The useful formulation is not \"it does too much\". It is that **this file has five unrelated reasons to be edited**: the API host changes, the JSON shape changes, the caching strategy changes, the logging changes, or the product decides how a name is displayed.\n\nFive reasons to change means five different people, at five different times, editing the same file — and every one of them risks breaking the other four. That is the cost, and it is concrete. \"It violates single responsibility\" names the rule; \"a copy change to `displayName` can break profile loading in review\" names the consequence.\n\nSecond, quieter cost: you cannot test `displayName` — a pure string function — without a `Context` and a network. The untestability is not a separate problem. It is the same problem, seen from a different angle.",
        },
        {
          id: "w-quiz",
          kind: "quiz",
          question:
            "Which split would you make first?",
          choices: [
            {
              id: "a",
              body: "Extract an interface for ProfileManager so it can be mocked.",
              correct: false,
              rationale:
                "This is the reflex, and it fixes nothing. An interface over a class that still does five things gives you a five-method mock and the same file with the same five reasons to change. The abstraction has to follow the split, not replace it.",
            },
            {
              id: "b",
              body: "Move displayName out — it shares no reason to change with the rest.",
              correct: true,
              rationale:
                "The cheapest correct move, and the one that teaches the method. `displayName` is a pure function of a Profile: no Context, no network, no cache. It leaves as a function or an extension and becomes trivially testable, and the remaining class gets smaller without any new indirection.",
            },
            {
              id: "c",
              body: "Split it into ProfileManager, ProfileHelper and ProfileUtils.",
              correct: false,
              rationale:
                "Three files, the same five reasons to change, and now they are spread out. A name ending in Helper, Util or Manager is usually a sign that the split was made by size rather than by reason — which is why those names accumulate.",
            },
          ],
        },
        {
          id: "w-teach",
          kind: "callout",
          tone: "insight",
          title: "The definition worth carrying",
          body: [
            "A **responsibility is a reason to change** — not a task, not a method, not a number of lines.",
            "Two pieces of code belong together when they change for the same reason and apart when they do not. That test is answerable about real code; \"does this class do one thing?\" is not.",
            "Everything else today — interfaces, composition, delegation, sealed types — is machinery for putting the things that change together in the same place, and keeping everything else out.",
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "inheritance",
      title: "Why inheritance is the expensive option",
      kicker: "And why Kotlin makes you ask for it",
      startMinute: 10,
      endMinute: 32,
      blocks: [
        {
          id: "i-intro",
          kind: "prose",
          body: [
            "Kotlin makes a statement about this in its defaults, and it is worth reading as a design opinion rather than as a syntax rule.",
            "\"By default, Kotlin classes are final – they can't be inherited. To make a class inheritable, mark it with the `open` keyword.\" The same applies to members: \"If there is no `open` modifier on a function, like `Shape.fill()`, declaring a method with the same signature in a subclass is not allowed, either with `override` or without it.\"",
            "Java made everything inheritable and let you opt out with `final`. Kotlin inverted it. That inversion is an argument, and the argument is worth understanding before you reach for `open`.",
          ],
        },
        {
          id: "i-why",
          kind: "callout",
          tone: "why",
          title: "What you are agreeing to when you write `open`",
          body: [
            "A subclass does not depend on what your class *does*. It depends on **how your class does it** — which method calls which, in what order, and what state each one leaves behind.",
            "So the moment a class is open, its internal call order is part of its public contract. Refactoring `save()` to stop calling `validate()` internally is a private change that breaks a subclass you have never read.",
            "That is the fragile base class problem, and it is not a style objection. It is a real constraint on what you can change later, accepted at the moment you type one keyword.",
          ],
        },
        {
          id: "i-compare",
          kind: "compare",
          title: "The same reuse, two ways",
          compare: [
            {
              label: "Inheritance",
              code: `open class Repository {
    open fun load(id: String): Data { /* ... */ }
}

class CachingRepository : Repository() {
    override fun load(id: String): Data {
        return cache[id] ?: super.load(id).also { cache[id] = it }
    }
}`,
              verdict:
                "Couples you to Repository's internals forever. If `load` starts calling a new protected method, or stops, the subclass silently changes behaviour — and you cannot cache a Repository you did not write, or one that is final.",
            },
            {
              label: "Composition",
              code: `class CachingRepository(
    private val delegate: Repository,
) : Repository {
    override fun load(id: String): Data =
        cache[id] ?: delegate.load(id).also { cache[id] = it }
}`,
              verdict:
                "Depends only on the interface. Works with any implementation, including a fake in a test, and Repository's author can rewrite its internals freely. The cost is one field and one line of forwarding per method.",
            },
          ],
        },
        {
          id: "i-delegation",
          kind: "prose",
          body: [
            "That \"one line of forwarding per method\" is the honest cost of composition, and it is what makes people reach for inheritance instead on a ten-method interface. Kotlin removes it.",
            "\"The `by`-clause in the supertype list for `Derived` indicates that `b` will be stored internally in objects of `Derived` and the compiler will generate all the methods of `Base` that forward to `b`.\"",
          ],
        },
        {
          id: "i-delegation-code",
          kind: "code",
          title: "Forwarding, written by the compiler",
          code: {
            language: "kotlin",
            code: `class CachingRepository(
    private val delegate: Repository,
) : Repository by delegate {

    // Only the one method you actually want to change.
    override fun load(id: String): Data =
        cache[id] ?: delegate.load(id).also { cache[id] = it }
}`,
          },
        },
        {
          id: "i-delegation-trap",
          kind: "callout",
          tone: "warning",
          title: "The trap in `by`, straight from the documentation",
          body: [
            "\"Note, however, that members overridden in this way do not get called from the members of the delegate object, which can only access its own implementations of the interface members.\"",
            "In plain terms: your override is invisible to the delegate. If `delegate.refresh()` internally calls `load()`, it calls **its own** `load`, not your caching one — so a cache that looks correct is bypassed by every path that goes through the delegate.",
            "This is not a quirk. It follows from what `by` actually is: two separate objects with generated forwarding, not one object with a modified method table. Inheritance would have given you the override; that is precisely the coupling you traded away.",
          ],
        },
        {
          id: "i-predict",
          kind: "predict",
          title: "Read the mechanism",
          code: {
            language: "kotlin",
            code: `interface Base {
    val message: String
    fun print()
}

class BaseImpl(x: Int) : Base {
    override val message = "BaseImpl"
    override fun print() = println(message)
}

class Derived(b: Base) : Base by b {
    override val message = "Derived"
}

fun main() {
    Derived(BaseImpl(10)).print()
}`,
          },
          question: "What does this print? Write it exactly.",
          expected: "BaseImpl",
          answer:
            "`BaseImpl`. `print()` was not overridden, so it forwards to the delegate — and the delegate's `print()` reads the delegate's own `message`. `Derived.message` exists and is reachable (`derived.message` gives \"Derived\"), but nothing inside `BaseImpl` can see it.\n\nIf you predicted \"Derived\", you were applying inheritance's rules to something that is not inheritance. That substitution is the single most common misreading of `by`, and it produces bugs that look impossible until you remember there are two objects here, not one.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "drills",
      title: "Drills",
      kicker: "Say the answer before you read it",
      startMinute: 32,
      endMinute: 44,
      blocks: [
        {
          id: "d-intro",
          kind: "prose",
          body: [
            "Three judgements, of the kind you make in review without noticing. For each, say what you would do and — more importantly — what it costs.",
          ],
        },
        {
          id: "d-one-impl",
          kind: "explain",
          question:
            "A colleague adds `interface AnalyticsTracker` with exactly one implementation, and no plan for a second. Is that worth doing?",
          keywords: ["test", "dependency", "direction", "cost"],
          answer:
            "It depends entirely on whether anything gains by not knowing the implementation — and \"a test\" is a legitimate answer to that.\n\n**Worth it** when the concrete class drags in something a test cannot have: a network client, a Context, a third-party SDK that must not fire in CI. The second implementation is the fake, and it exists on day one. That is not speculative design; it is a real second caller.\n\n**Not worth it** when the class is already pure and cheap to construct. An interface over a string formatter buys nothing and costs a layer of indirection on every read: you look up the call, land on the interface, and have to go find the implementation anyway.\n\nThe question to ask is never \"might we need another implementation one day?\" — the honest answer is almost always no. It is \"does anyone here need to *not know* which implementation this is?\"",
        },
        {
          id: "d-open",
          kind: "explain",
          question:
            "You need to change the behaviour of a class you own, for one caller. What do you reach for, in what order?",
          keywords: ["parameter", "composition", "interface", "open"],
          answer:
            "In roughly this order, cheapest first:\n\n1. **A parameter.** If the difference is a value, it is a value. A boolean flag is often mocked for, but for two call sites it beats a type hierarchy.\n2. **Composition** — wrap it, forward with `by`, override the one thing. No change to the original class at all, which means no risk to its other callers.\n3. **An interface plus a second implementation**, when the two behaviours are genuinely peers rather than one being a variation of the other.\n4. **`open`**, last, and only when the subclass genuinely is a specialisation you intend to support — because from then on your internal call order is a public contract.\n\nMost real cases stop at 1 or 2. Reaching for 4 first is how a class acquires subclasses that make it unchangeable.",
        },
        {
          id: "d-data-class",
          kind: "explain",
          question:
            "A `data class` has a property declared in the class body rather than the primary constructor. What changes?",
          keywords: ["equals", "hashCode", "copy", "primary constructor"],
          answer:
            "It stops participating in everything the compiler generates. \"The compiler only uses the properties defined inside the primary constructor for the automatically generated functions. To exclude a property from the generated implementations, declare it inside the class body.\"\n\nSo two instances differing only in that property are `equals`, hash the same, and `copy()` will not carry it across. That is sometimes exactly what you want — a cached derived value should not affect identity. It is a bug when the property is real state someone assumed was compared.\n\nWorth pairing with the other half: \"The `copy()` function creates a shallow copy of the instance. In other words, it doesn't copy components recursively. As a result, references to other objects are shared.\" A `copy()` of an object holding a `MutableList` gives you a second object sharing one list, and mutating either is visible through both.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "direction",
      title: "Dependency inversion, without the slogan",
      kicker: "The idea the whole module is for",
      startMinute: 44,
      endMinute: 66,
      blocks: [
        {
          id: "x-intro",
          kind: "prose",
          body: [
            "\"Depend on abstractions, not concretions\" is true and almost useless, because it does not say what changes. Here is the version that does.",
            "Every dependency is an arrow: A uses B, so A knows about B, and a change to B can force a change to A. Architecture is mostly the business of deciding which way those arrows point — and the useful move is that **an interface lets you point an arrow the opposite way from the call**.",
          ],
        },
        {
          id: "x-pipeline",
          kind: "pipeline",
          title: "Before: the arrow follows the call",
          stages: [
            { label: "ViewModel", caption: "wants a profile" },
            { label: "knows about →", caption: "imports it directly" },
            { label: "RetrofitProfileApi", caption: "a concrete HTTP client" },
            { label: "which knows about →", caption: "" },
            { label: "OkHttp, JSON, the API's shape", caption: "" },
          ],
          body: [
            "The ViewModel now transitively depends on your HTTP stack. Change the client, change the serialiser, change the endpoint's JSON — the ViewModel is in the blast radius, and it cannot be constructed in a test without all of it.",
          ],
        },
        {
          id: "x-pipeline-2",
          kind: "pipeline",
          title: "After: the arrow is reversed",
          stages: [
            { label: "ViewModel", caption: "wants a profile" },
            { label: "knows about →", caption: "" },
            { label: "ProfileRepository", caption: "an interface it owns" },
            { label: "← implemented by", caption: "the arrow now points inward" },
            { label: "RetrofitProfileRepository", caption: "knows the interface; the interface knows nothing of it" },
          ],
          body: [
            "The call still goes outward — the ViewModel still ends up hitting the network. The **dependency** goes inward: the implementation knows about the interface, and the interface knows nothing about Retrofit.",
            "That is the whole inversion. Not \"add an interface\", but *whose definition of the contract wins*. The consumer's, not the provider's.",
          ],
        },
        {
          id: "x-owner",
          kind: "callout",
          tone: "insight",
          title: "The test that makes this concrete",
          body: [
            "Ask: **if the API returned XML tomorrow, which files change?**",
            "In the first version, the ViewModel's imports are wrong and its error handling is written against an HTTP exception. In the second, one class changes and nothing above it notices.",
            "Testability falls out of this rather than being the goal. A ViewModel that depends on an interface it defined can be tested with a twelve-line fake, and you did not add the interface \"for testing\" — you added it so the ViewModel would stop knowing about Retrofit. The test got easy as a side effect, which is the order these things actually happen in.",
          ],
        },
        {
          id: "x-overkill",
          kind: "callout",
          tone: "warning",
          title: "Where this stops paying",
          body: [
            "Inversion costs a layer of indirection and a file, and it pays when the two sides change at different rates or for different reasons.",
            "Between a ViewModel and a network client, that is obviously true. Between two classes in the same feature, written by the same person, released together and changing together, it is not — there you have added a file and bought nothing.",
            "A codebase where every class has an interface has not applied the principle; it has applied the syntax and skipped the judgement.",
          ],
        },
        {
          id: "x-quiz",
          kind: "quiz",
          question:
            "Where should `interface ProfileRepository` be declared?",
          choices: [
            {
              id: "a",
              body: "In the data layer, next to its Retrofit implementation.",
              correct: false,
              rationale:
                "This is the common arrangement and it quietly undoes the inversion. If the interface lives with the implementation and changes when it does, the domain still depends on the data layer's decisions — you have added a file without moving the arrow.",
            },
            {
              id: "b",
              body: "In the layer that consumes it, which the data layer then depends on.",
              correct: true,
              rationale:
                "Correct, and it is the part people skip. The consumer defines the contract it needs; the implementation reaches inward to satisfy it. That is what makes the data layer replaceable — and what makes a module boundary enforceable rather than aspirational.",
            },
            {
              id: "c",
              body: "In a shared module both can see, so neither depends on the other.",
              correct: false,
              rationale:
                "Tempting, and it does break the direct coupling — but a shared \"common\" module tends to become a junk drawer that everything depends on, which is the dependency problem again at a larger scale. Prefer the consumer owning it; reach for a shared module only when several unrelated consumers genuinely need the same contract.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "closed-sets",
      title: "When you want to prevent extension",
      kicker: "sealed, and the opposite problem",
      startMinute: 66,
      endMinute: 80,
      blocks: [
        {
          id: "s-intro",
          kind: "prose",
          body: [
            "Everything so far has been about keeping things open — open to a second implementation, open to replacement. Sometimes the valuable property is the exact opposite: knowing that the set is **closed**, and that nobody can add to it.",
            "\"Direct subclasses of sealed classes and interfaces must be declared in the same package.\" That restriction is the feature. Because the compiler can see every case, it can check that you handled them: \"The `when` expression, used with a sealed class, allows the Kotlin compiler to check exhaustively that all possible cases are covered. In such cases, you don't need to add an `else` clause.\"",
          ],
        },
        {
          id: "s-compare",
          kind: "compare",
          title: "Open set or closed set",
          compare: [
            {
              label: "interface — open",
              code: `interface PaymentMethod {
    fun charge(amount: Money): Result
}`,
              verdict:
                "Anyone can add a new payment method without touching existing code. Right when new cases are expected and each one is self-contained — adding Apple Pay should not mean editing a `when`.",
            },
            {
              label: "sealed — closed",
              code: `sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val items: List<Item>) : LoadState
    data class Failed(val reason: String) : LoadState
}`,
              verdict:
                "Nobody can add a state from outside — and every `when` over it becomes a compile-time checklist. Add a fourth state and the compiler shows you every place that must now handle it.",
            },
          ],
        },
        {
          id: "s-callout",
          kind: "callout",
          tone: "insight",
          title: "The choice, in one question",
          body: [
            "**Does adding a case mean visiting the existing code?** If yes, seal it and let the compiler do the visiting. If no, leave it open.",
            "UI state is the clearest \"yes\": a new state almost always needs handling everywhere the old ones were handled, and an `else` branch that silently renders nothing is exactly the bug sealing prevents.",
            "Note the inversion of the earlier lesson — here you *want* the coupling. Exhaustiveness is the compiler forcing every consumer to acknowledge a change. That is a feature when the consumers are yours and a burden when they are not, which is why sealing a public API surface is usually wrong.",
          ],
        },
        {
          id: "s-explain",
          kind: "explain",
          question:
            "Why does `else` in a `when` over a sealed type deserve suspicion, even when it compiles?",
          keywords: ["exhaustive", "new case", "silent", "compiler"],
          answer:
            "Because it converts a compile error into a silent wrong answer, and does it at the exact moment you most need the error.\n\nWith no `else`, adding a fourth `LoadState` breaks the build everywhere the set is matched — which is a list of the places that need your attention, handed to you for free. With `else`, everything still compiles and the new state quietly takes whichever branch you wrote for \"anything else\", usually the empty one.\n\nYou have not saved four lines; you have traded a checklist for a bug that reproduces only once the new state actually occurs. The one legitimate `else` is when you truly mean \"every remaining case is the same\" — and even then it is worth writing the remaining cases out, because the compiler stops protecting you the moment you do not.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "implement",
      title: "Implementation challenge",
      kicker: "Composition with the forwarding written for you",
      startMinute: 80,
      endMinute: 95,
      blocks: [
        {
          id: "im-intro",
          kind: "prose",
          body: [
            "Wrap an implementation, change one behaviour, forward the rest. Then come back and answer the question underneath, which is the part that transfers.",
          ],
        },
        {
          id: "im-challenge",
          kind: "implement",
          title: "Delegation with `by`",
          questionSlug: "delegation-by-keyword",
          body: [
            "Add behaviour to an existing implementation without inheriting from it, and without hand-writing a forwarding method for every member of the interface.",
          ],
        },
        {
          id: "im-after",
          kind: "explain",
          question:
            "After finishing: where would your wrapper's override be bypassed, and how would you notice?",
          keywords: ["delegate", "internal", "forward", "own implementation"],
          answer:
            "Anywhere the delegate calls the overridden member from inside one of its own methods. The delegate \"can only access its own implementations of the interface members\", so an internal call reaches its version, not yours.\n\nHow you notice is the uncomfortable part: usually not from a test, because a test calls your wrapper's method directly and it works. You notice from behaviour that is right on the path you thought about and wrong on a path that goes through the delegate — a cache that hits when you call `load` and misses when you call `refresh`.\n\nThe defence is to know the delegate's internals, which is exactly the coupling composition was supposed to avoid. When you need overrides that the delegate honours internally, `by` is the wrong tool — you want an interface the delegate depends on, or the behaviour moved outside it entirely.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "interview",
      title: "Saying it out loud",
      kicker: "The same judgement, under questioning",
      startMinute: 95,
      endMinute: 120,
      blocks: [
        {
          id: "v-intro",
          kind: "prose",
          body: [
            "Design questions are rarely looking for a definition. They are looking for whether you can name a cost — which is the thing that separates someone who has read about abstraction from someone who has maintained it.",
          ],
        },
        {
          id: "v-q1",
          kind: "explain",
          question:
            "\"Composition over inheritance\" — why? Answer without using the words flexible, reusable or maintainable.",
          keywords: ["internal", "contract", "change", "couple"],
          answer:
            "A strong answer names the mechanism: *\"A subclass depends on how the parent does its job, not just on what it does — which method calls which, and in what order. So once a class has subclasses, its internals are frozen: a private-looking refactor can break code I have never read. Composition depends only on the published contract, so the thing I am reusing stays free to change.\"*\n\nThen the cost, unprompted, because that is what makes it a judgement rather than a slogan: *\"It costs forwarding, which Kotlin's `by` mostly removes — with the caveat that the delegate does not call my overrides.\"*\n\nNaming the caveat is what signals you have actually used it.",
        },
        {
          id: "v-q2",
          kind: "quiz",
          question:
            "\"Why did you put the repository interface in the domain layer rather than next to the implementation?\"",
          choices: [
            {
              id: "a",
              body: "So the implementation can be swapped out later if we change backends.",
              correct: false,
              rationale:
                "Weak, because it is speculative and usually untrue — most apps never swap backends. It also invites the fair follow-up \"and have you?\", which you cannot answer well.",
            },
            {
              id: "b",
              body: "So the dependency points inward: the data layer knows the domain's contract, not the reverse.",
              correct: true,
              rationale:
                "This is the answer, because it describes what is true today rather than what might happen. The natural follow-up — \"what does that buy you?\" — has a concrete answer: a change to the API's shape stops at one class, and the domain is constructible in a test without a network.",
            },
            {
              id: "c",
              body: "Because it is what Clean Architecture prescribes.",
              correct: false,
              rationale:
                "Naming the source is not giving the reason, and it goes badly if the interviewer disagrees with the source — you have nothing left to say. A rule you can derive is worth more than a rule you can cite.",
            },
          ],
        },
        {
          id: "v-challenge",
          kind: "implement",
          title: "Who constructs this?",
          questionSlug: "who-constructs-this",
          body: [
            "The practical form of everything above: follow the arrows and say who is allowed to know about whom.",
          ],
        },
        {
          id: "v-close",
          kind: "callout",
          tone: "insight",
          title: "What to carry into Day 4",
          body: [
            "A responsibility is a **reason to change**, and code belongs together when it changes for the same reason.",
            "Inheritance buys reuse by making a class's internals into a public contract. Composition buys it by depending only on what is published — and `by` removes most of its cost, at the price of overrides the delegate cannot see.",
            "Dependency inversion is not \"add an interface\". It is deciding **whose definition of the contract wins**, and pointing the arrow the other way from the call.",
            "Seal a hierarchy when adding a case should mean visiting existing code, and leave it open when it should not.",
            "Every one of these is the same trade, stated differently: what are you willing to let this piece of code know about?",
          ],
        },
      ],
    },
  ],
};
