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
            "**First, two misreadings worth clearing up**, because a right idea attached to a wrong fact will not stick.\n\nThe profile id is **not** obtained from the `Context` — it arrives as a parameter: `fun loadProfile(id: String)`. Whoever calls the function supplies it. `context` is used for exactly one thing here, reaching `SharedPreferences` to cache the JSON. If your answer said the Context was needed to get the id, it described a problem this code does not have.\n\nAnd the problem is not that the class is *long*. It is fifteen lines. Length is a symptom people reach for when they can feel something is wrong and cannot yet name it.\n\n**If you noticed the `Context` at all, keep that** — an Android framework type sitting in a class that is otherwise about networking and strings is a real observation. The reason attached to it was just wrong. It comes back at the end.\n\n**What the question was steering you towards.** It bans \"clean\", \"messy\" and \"SOLID\" because those are labels, and a label tells you a rule was broken without telling you what it costs. It asks for the cost — and it hands you the method in the wording: *what future events would force someone to open this file?* List them. One item means the file is fine. Five means you have your answer.\n\n**Line by line, who would change this?**\n\n· `URL(\"https://api.example.com/users/\" + id).readText()` — the API host, the path, auth headers, timeouts, retries. **Backend team.**\n· `Json.decodeFromString<Profile>(json)` — the JSON shape, a renamed field, new nesting. **Backend team.**\n· `getSharedPreferences(...)` — move to DataStore, add expiry, encrypt it. **Platform team.**\n· `Log.d(...)` — swap to Timber, strip the PII, add analytics. **Platform team.**\n· `displayName` — \"surname first in Japan\", \"only verified nicknames\". **Your product manager.**\n\nFive lines, five unrelated futures, three different owners.\n\n**Now the specific Tuesday.** Your PM asks for a one-word copy change in `displayName`. You open the file that also performs the network call. Your pull request now touches profile loading, so the reviewer has to be someone who understands the networking — for a copy tweak. Meanwhile another engineer is mid-way through moving the cache to DataStore in the same file, and you get a merge conflict over work unrelated to yours. And if your change is wrong, it is wrong in the file every profile load in the app goes through.\n\n**The same problem from the test file.** `displayName` is a pure function: a `Profile` in, a `String` out. No network, no Android. The most testable thing imaginable — except you cannot call it without a `ProfileManager`, and you cannot build one without a `Context`. So testing pure string logic now needs Robolectric or a mocked framework class.\n\nThere is your instinct, vindicated with the right reasoning: the trouble with the `Context` is not where the id comes from, it is that a dependency needed by **one line of one function** is now required by everything in the class. Same problem, felt from the test file instead of the source file.\n\n**The sentence that earns a strong grade:** *\"This file has five independent reasons to change — the API host, the JSON schema, the caching mechanism, the logging library and the product's name-formatting rule — so five unrelated people edit the same file, and a copy change can break profile loading.\"*\n\n**The method, for the next question of this shape:**\n1. Go line by line and write down who would change this line, and why.\n2. Count the distinct answers.\n3. If it is more than one, say what happens when two of those people show up in the same week.\n\nThat works without ever saying \"SOLID\".",
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
                "The assumption underneath this: *the problem is that it is hard to test, so make it mockable.* Untestability is a symptom here, not the disease.\n\nWhat it costs: you now have `ProfileManager` and `ProfileManagerImpl`, both still doing five things, and a five-method mock to maintain. The PM's copy change still lands in the file that performs the network call — you have added a layer and moved nothing. Abstraction follows a split; it cannot replace one.",
            },
            {
              id: "b",
              body: "Move displayName out — it shares no reason to change with the rest.",
              correct: true,
              rationale:
                "Right, and it is the cheapest possible move — one cut, no new abstraction. `displayName` is a pure function of a `Profile`: no Context, no network, no cache, and nothing else in the class calls it. It leaves as a top-level function or an extension, and its test becomes three lines with no framework.\n\nThe follow-up worth having ready: *\"and then what?\"* Next you would pull the network call behind an interface, because that is the seam a test needs. But notice the order — the free split first, the one that needs a design decision second.",
            },
            {
              id: "c",
              body: "Split it into ProfileManager, ProfileHelper and ProfileUtils.",
              correct: false,
              rationale:
                "The assumption: *the class is too big, so cut it into smaller pieces.* Size is the symptom people reach for when they can feel something is wrong and cannot yet name it.\n\nWhat it costs: the same five reasons to change, now spread across three files, so the PM's copy change might land in any of them and you have to read all three to find out which. That is why `Helper`, `Util` and `Manager` accumulate — a name that describes nothing is what you get when the split was made by line count rather than by reason.",
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
            "`BaseImpl`.\n\n**If you predicted \"Derived\", here is the exact line that settles it:** `class Derived(b: Base) : Base by b`. That `b` is a *separate object*, constructed before `Derived` and handed to it. `print()` was not overridden, so `Derived.print()` forwards to `b.print()` — and `BaseImpl.print()` reads `BaseImpl.message`, because that is the only `message` in scope where it was compiled.\n\n**The instinct behind that prediction was right, though.** You reasoned \"a subclass overrides a member, so the parent's methods call the override\" — and for inheritance that is exactly correct. The mistake is not the reasoning, it is applying it to something that is not inheritance. `Derived` is not a subclass of `BaseImpl`; it is a different object holding one.\n\n**What the documentation says, and what it means.** \"Members overridden in this way do not get called from the members of the delegate object, which can only access its own implementations of the interface members.\" Two objects, generated forwarding, no shared method table.\n\n**The specific Tuesday.** You wrap a repository with `by` to add caching, overriding `load`. A month later someone reports that the cache works when the screen opens and never works on pull-to-refresh. You read your wrapper a dozen times and it is correct. The reason is that `refresh()` — which you did not override — calls the delegate's own `load`, not yours. Your override is invisible from inside the delegate, and no test of your wrapper catches it because a test calls `load` directly.\n\n**Say it back as:** *\"`by` generates forwarding between two objects, so an override is visible to my callers but not to the delegate's own internals.\"*\n\n**The method, for the next `by` you read:**\n1. Ask how many objects exist. With `by`, it is always two.\n2. Ask what the delegate calls internally — those calls never reach your overrides.\n3. If you need the delegate to honour your override, `by` is the wrong tool; you want the behaviour outside it, or an interface the delegate itself depends on.",
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
            "**The two answers people give, and why both miss.**\n\n*\"No — YAGNI, you only have one implementation.\"* This treats the interface as a bet on a second production implementation, which is a bet you will usually lose. But it ignores that a test double **is** a second implementation, and it exists on day one rather than hypothetically.\n\n*\"Yes — always code to an interface.\"* This is a rule with no cost attached, so it produces a codebase where every class has an `Impl` twin and reading any call means two hops to find the code.\n\n**The question the wording is actually asking.** Not \"might we need another implementation one day?\" — the honest answer is almost always no. It is: **does anything here need to *not know* which implementation this is?**\n\n**Worked against a real tracker.** `AnalyticsTracker` wraps a vendor SDK that fires network calls on construction. A ViewModel test that touches it now needs the SDK initialised, or it throws. So something does need to not know: the test. The second implementation is the fake, and it is real.\n\nNow the same question for a `PriceFormatter` that takes a `BigDecimal` and returns a `String`. Constructing it is free, it has no side effects, and a test can use the real one. Nothing needs to not know. An interface here buys nothing and costs a hop on every read.\n\n**The specific Tuesday for getting it wrong in the expensive direction.** You are new to a codebase, tracking down why a total is wrong. You click through to `PriceCalculator`, land on an interface with one method and no code, search the project for implementations, find `PriceCalculatorImpl`, and read it. You do that four more times before you reach the bug. Every one of those hops was sold as flexibility that nobody used.\n\n**Say it back as:** *\"An interface is worth it when a caller genuinely must not know the implementation — and a test that cannot construct the real thing counts. Otherwise it is a hop with nothing on the other side.\"*\n\n**The method:**\n1. Name who must not know which implementation it is. If you cannot name anyone, including a test, stop.\n2. Ask what the concrete class drags in — network, Context, a vendor SDK, a clock.\n3. If it drags in nothing, use the class.",
        },
        {
          id: "d-open",
          kind: "explain",
          question:
            "You need to change the behaviour of a class you own, for one caller. What do you reach for, in what order?",
          keywords: ["parameter", "composition", "interface", "open"],
          answer:
            "**The assumption behind the usual answer.** Most people reach straight for `open` plus a subclass, because inheritance is the reuse mechanism taught first and it feels like the *designed* way to vary behaviour. It is the most expensive option on the list, and it is reversible only by touching every subclass you have never read.\n\n**And the instinct behind reaching for it is sound.** Wanting a subclass usually means you have correctly noticed that two things share most of their behaviour and differ in one place. That observation is right; it is the *mechanism* you reached for that is expensive. Hold it — every option below is a different way to express the same correct observation.\n\n**The order, cheapest first:**\n\n1. **A parameter.** If the difference is a value, it is a value. `SearchBar(showClearButton = false)` beats a `SearchBarWithoutClear`. People skip this because a boolean parameter feels unsophisticated — which is not a cost.\n2. **Composition.** Wrap it, forward with `by`, override the one thing. The original class does not change at all, so none of its other callers are at risk.\n3. **An interface plus a second implementation**, when the two behaviours are genuine peers rather than one being a tweak of the other.\n4. **`open`**, last, and only when the subclass really is a specialisation you intend to support forever.\n\n**What step 4 actually signs you up for.** Once a class is open and subclassed, its *internal call order* is public. `save()` calling `validate()` internally is no longer an implementation detail — someone overrode `validate()` and depends on `save()` calling it. You cannot refactor that without breaking code you may not own.\n\n**The specific Tuesday.** Six months on, you want `save()` to batch writes, which means it stops calling `validate()` per item. Tests pass. Two weeks later a different team reports that their validation stopped running — they had overridden `validate()` in a subclass you did not know existed. Your private refactor was a breaking change and nothing told you.\n\n**The second angle: the test file.** An open class with a subclass means testing the *subclass* exercises the parent's code too, so a failure could be in either, and neither test is isolated. Composition gives you two objects you can test separately.\n\n**Say it back as:** *\"Parameter, then composition, then an interface, then `open` — because `open` is the only one that turns my internals into someone else's contract.\"*\n\n**The method:**\n1. Ask whether the difference is a value. If yes, it is a parameter.\n2. Ask whether you can wrap rather than extend. With `by`, this is usually two lines.\n3. Only reach for `open` when you intend to support subclasses as a feature — and then treat the call order as published.",
        },
        {
          id: "d-data-class",
          kind: "explain",
          question:
            "A `data class` has a property declared in the class body rather than the primary constructor. What changes?",
          keywords: ["equals", "hashCode", "copy", "primary constructor"],
          answer:
            "**The misreading to clear first.** People often answer that the property is \"private\" or \"not part of the class\". It is neither — it is fully public, readable, writable, and inherited normally. What changes is only what the **compiler generates**.\n\n\"The compiler only uses the properties defined inside the primary constructor for the automatically generated functions. To exclude a property from the generated implementations, declare it inside the class body.\"\n\n**So, concretely, for `data class Person(val name: String) { var age: Int = 0 }`:** two `Person`s named Alex with different ages are `equals`, hash identically, and `copy()` drops the age. `toString()` prints `Person(name=Alex)` and never mentions age.\n\n**The instinct that makes this feel wrong is correct.** It *is* surprising that a public property is invisible to `equals`. Hold onto the surprise — it is the reason this causes bugs rather than being a neat trick.\n\n**The specific Tuesday.** A `Person` in a `StateFlow` gains an `age` in the class body during a refactor, to keep it out of a noisy `toString`. The user edits their age, the ViewModel emits the new `Person`, and `StateFlow` compares it to the previous one — equal, because `age` is not compared. The emission is skipped. The screen shows the old age, nothing throws, and the bug reproduces only for that one field.\n\n**The other half, same shape.** \"The `copy()` function creates a shallow copy of the instance... As a result, references to other objects are shared.\" A `copy()` of an object holding a `MutableList` gives two objects and **one list** — so mutating through the copy changes the original, and the same skipped-emission bug appears from the other direction.\n\n**When body placement is right:** genuinely derived or cached values, where two instances differing only in it really are the same thing. That is the test, and it is the same one from the warm-up: if two of these differ only here, are they the same thing?\n\n**Say it back as:** *\"Only primary-constructor properties feed `equals`, `hashCode`, `toString` and `copy`, so a body property is invisible to comparison — and `copy()` is shallow, so anything mutable inside is shared.\"*\n\n**The method:**\n1. Read the primary constructor. That list *is* the identity of the value.\n2. For anything in the body, ask whether two instances differing only in it are the same thing. If no, it is in the wrong place.\n3. For anything mutable inside, assume `copy()` shares it.",
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
                "The assumption: *the interface belongs with the thing that implements it, because that is where it is used.* Reasonable, and it is what most codebases do.\n\nWhat it costs: the interface now changes when the implementation does. The API adds pagination, the Retrofit class needs a `page` parameter, so the interface grows one — and every consumer in the domain layer changes for a reason that came from the network. The arrow never moved; you added a file and kept the coupling.\n\nThe tell is in version control: if the interface and its implementation are always in the same commit, the interface is not a boundary.",
            },
            {
              id: "b",
              body: "In the layer that consumes it, which the data layer then depends on.",
              correct: true,
              rationale:
                "Right, and this is the half people skip — they add the interface and leave it next to the implementation, which is the option above.\n\nWhy it works: the consumer writes down what it needs, in its own vocabulary, and the data layer reaches inward to satisfy it. Now the API adding pagination is a change to one class, because the domain never asked for pages.\n\nThe follow-up to have ready is *\"what does that actually buy you?\"* — and the answer is concrete rather than architectural: a change to the API's shape stops at one file, and the ViewModel is constructible in a test with a twelve-line fake and no network.",
            },
            {
              id: "c",
              body: "In a shared module both can see, so neither depends on the other.",
              correct: false,
              rationale:
                "The assumption: *if neither side owns it, neither side is coupled.* It does break the direct dependency, which is why it is tempting.\n\nWhat it costs: `common` accumulates. It starts with one interface, gains a model, then a utility, and within a year every module depends on it — so every module rebuilds when any of them changes, and you have recreated the coupling at a larger scale with a worse name. The Gradle build time is usually how you find out.\n\nIt is the right answer only when several genuinely unrelated consumers need the same contract, which is rarer than it sounds.",
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
            "**The misreading to clear first.** `else` in a `when` over a sealed type is not a compile error and never was — the code is valid, it runs, and review passes it. That is precisely the problem, and if your answer was about it being disallowed, the objection is subtler than that.\n\n**What `else` actually costs you.** \"The `when` expression, used with a sealed class, allows the Kotlin compiler to check exhaustively that all possible cases are covered. In such cases, you don't need to add an `else` clause.\" Exhaustiveness is a *service*: add a fourth state and every `when` missing it stops compiling, handing you the list of places that need attention. Writing `else` cancels the service. The build stays green and the new state silently takes the branch you wrote for \"anything else\" — usually the empty one.\n\n**You have not saved four lines.** You have converted a compile error into a bug that only appears once the new state actually occurs in production.\n\n**The specific Tuesday.** Someone adds `Unauthorized` to `LoadState` to handle an expired token. Everything compiles, tests pass, it ships. Users with expired sessions see a blank screen with no error and no spinner, because `else -> {}` swallowed it. The person who added the state never knew your screen existed — and exhaustiveness is exactly the mechanism that would have told them.\n\n**The instinct is right; the target is wrong.** Writing `else` is defensive programming — handle the case you did not anticipate — and that is a good habit nearly everywhere. It fails here for one specific reason: over a sealed type there *is* no unanticipated case. The whole point of sealing was to make the set knowable, so defending against the unknown is defending against something you already eliminated, and the defence costs you the warning.\n\n**The one legitimate `else`.** When you genuinely mean \"every remaining case is handled the same way\" *and* the set is not yours to change. Over a sealed type you own, write the cases out — the compiler stops protecting you the moment you do not.\n\n**Say it back as:** *\"`else` trades a compile-time checklist for a silent wrong branch, and it does it at exactly the moment I most need the error.\"*\n\n**The method:**\n1. When you type `else` over a sealed type, ask what you want to happen when a fifth case is added.\n2. If the answer is \"I want to be told\", delete the `else` and write the cases.\n3. If the answer is genuinely \"nothing\", leave a comment saying so, because the next reader cannot tell the difference.",
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
            "**The answer people give first** is a language one — \"I could not work out how to express it\" or \"the nesting got awkward\". That is almost never what is happening.\n\n**What is actually happening.** The combination that resists modelling is the one where nobody has decided what the product should do. \"Loading while content is shown\" is the usual candidate: is a refresh a different state, a property of `Ready`, or something the screen should not offer at all? The flag-bag version let you avoid deciding — three booleans quietly permit every answer at once — and the cost of not deciding was five illegal states plus an `else` branch rendering nothing.\n\n**The instinct that it is a modelling problem is right.** It just points one layer further down than it feels like it does: the type is hard to write because the requirement is undecided, not because Kotlin is missing a feature.\n\n**The specific Tuesday.** You ship the sealed version with `Refreshing` as a fourth case. QA files a bug: pull-to-refresh blanks the screen. It does, because `Refreshing` has no `profile` field and the `when` renders the loading branch. The fix is not a language trick — it is answering the question you skipped, which is that refreshing is a property of already having content: `data class Ready(val profile: Profile, val refreshing: Boolean = false)`.\n\n**The general form.** When a flag is only meaningful inside one state, it is a property **of** that state, not a state of its own. Sealing is not about having the fewest cases; it is about making the illegal combinations unwritable.\n\n**Say it back as:** *\"The combination I could not model was the one nobody had decided on — the type was surfacing a product question, not a language limitation.\"*\n\n**The method:**\n1. List every combination the current type allows.\n2. For each, ask whether it is meaningful. If you cannot answer, that is a product decision, not a modelling one.\n3. Put a flag inside the state where it is meaningful, rather than beside it.",
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
            "**The answer that gets you a follow-up you cannot handle** is the recited one: \"composition is more flexible and maintainable\". Both banned words, and neither names a mechanism — so the interviewer asks \"flexible how?\" and you have nothing left.\n\n**The second-tier answer** is \"inheritance is tight coupling\". True, and still a label. Coupling to *what*, exactly?\n\n**The mechanism, which is what earns the question.** *\"A subclass depends on how the parent does its job, not just what it does — which method calls which, and in what order. So the moment a class has subclasses, its internals are frozen: a private-looking refactor can break code I have never read. Composition depends only on the published contract, so the thing I am reusing stays free to change.\"*\n\n**Then the cost, unprompted, because that is what separates judgement from recitation.** *\"It costs forwarding, which Kotlin's `by` mostly removes — with the caveat that the delegate does not call my overrides.\"*\n\nNaming that caveat is the strongest signal in the whole answer. It is the thing you only know from having been bitten by it, and it is the same fact the `Derived`/`BaseImpl` prediction earlier in this lesson was teaching.\n\n**Why it is worth rehearsing rather than improvising.** The question is asked in almost every Android interview, and the difference between the recited and the mechanical version is about fifteen seconds of preparation.\n\n**The method, for any \"why prefer X over Y\" question:**\n1. Name the mechanism — what does Y actually depend on that X does not?\n2. Name the consequence in terms of what you can change later.\n3. Name X's cost, before you are asked.",
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
                "The assumption: *an abstraction is justified by a future change.* It is the most common justification given for interfaces and it is usually a bluff.\n\nWhat it costs in the room: the interviewer asks \"and have you swapped one?\", you say no, and the abstraction now looks like cargo cult. Worse, it is an argument about a hypothetical, so there is no way to make it concrete — you cannot point at anything the decision has already bought.",
            },
            {
              id: "b",
              body: "So the dependency points inward: the data layer knows the domain's contract, not the reverse.",
              correct: true,
              rationale:
                "Right, and what makes it strong is the tense: it describes something true **today** rather than a change that might happen.\n\nThe follow-up is \"what does that buy you?\", and you have two concrete answers ready: a change to the API's shape stops at one class instead of rippling into the ViewModel, and the domain is constructible in a test with a small fake and no network. Both are things you can point at in the current codebase.\n\nThe deeper signal you are sending: you understand that inversion is about *whose definition of the contract wins*, not about having added a file.",
            },
            {
              id: "c",
              body: "Because it is what Clean Architecture prescribes.",
              correct: false,
              rationale:
                "The assumption: *citing a respected source is as good as having a reason.* It feels safe, which is why people reach for it under pressure.\n\nWhat it costs: if the interviewer disagrees with Clean Architecture — and plenty of senior Android engineers do, at least in its full form — the conversation is over and you have nothing to fall back on. You have also signalled that you follow the pattern rather than understand it, which is the exact thing the question is probing.\n\nA rule you can derive survives someone disagreeing with its source.",
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
