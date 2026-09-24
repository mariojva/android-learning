import type { Lesson } from "@/lib/types";

/**
 * Module 01, Lesson 2 — modelling values and deciding what "the same"
 * means.
 *
 * Closes three of the five concepts Lesson 1 left: data classes, equality
 * and sealed types. They belong in one lesson because they are one idea
 * seen from three sides — a data class is a value, equality is the rule
 * for when two values are the same, and a sealed hierarchy is a value that
 * can be one of a fixed set of shapes.
 *
 * It is also the prerequisite Module 02 assumes, which was the gap that
 * prompted writing it.
 *
 * Every language claim is quoted from kotlinlang.org; sources are in
 * claude/content-verification-log.md.
 */
export const DAY_4: Lesson = {
  id: "day-4",
  slug: "day-4",
  dayNumber: 4,
  moduleId: "m01",
  title: "Values, Identity and Impossible States",
  subtitle: "Module 01 · Lesson 2 — Kotlin Foundations",
  goal:
    "Model data so that two things are the same when you mean them to be, and so that nonsense cannot be constructed at all.",
  concepts: ["data-classes", "equality", "sealed-types"],
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
          title: "Two classes, one difference",
          code: {
            language: "kotlin",
            code: `class Point(val x: Int, val y: Int)
data class Pixel(val x: Int, val y: Int)

fun main() {
    println(Point(1, 2) == Point(1, 2))
    println(Pixel(1, 2) == Pixel(1, 2))
}`,
          },
        },
        {
          id: "w-predict",
          kind: "predict",
          question: "What does this print? Two lines, exactly.",
          expected: "false true",
          answer:
            "`false`, then `true`.\n\n\"Non-data classes (those not declared with the `data` modifier) do not override the `equals()` function by default. Instead, non-data classes implement referential equality behavior inherited from the `Any` class.\" So `Point(1, 2) == Point(1, 2)` is asking whether two separately allocated objects are the *same object*, and they are not.\n\n`data` changes that: a data class overrides `equals()`, so two pixels with the same coordinates are equal. That one keyword decides whether your type behaves like a **value** — something defined by its contents — or like an **identity** — something defined by being itself.",
        },
        {
          id: "w-teach",
          kind: "callout",
          tone: "insight",
          title: "The question underneath",
          body: [
            "Before writing any class, answer this: **if I make two of these with identical contents, are they the same thing?**",
            "A colour, a coordinate, a money amount, a user id — yes. Two of them with the same contents are interchangeable, and they are values.",
            "A user session, a database connection, a running download — no. Two with identical fields are still two different things, and they have identity.",
            "`data` is how you say \"this is a value\". Getting it wrong is not a style error; it changes what `==`, `contains`, `distinct` and every `Set` and `Map` in your program do with the type.",
          ],
        },
        {
          id: "w-quiz",
          kind: "quiz",
          question:
            "Which of these should NOT be a data class?",
          choices: [
            {
              id: "a",
              body: "data class Money(val amount: BigDecimal, val currency: String)",
              correct: false,
              rationale:
                "A value in the purest sense. Two amounts of £5 are interchangeable, and you want `==` to say so. Exactly what data classes are for.",
            },
            {
              id: "b",
              body: "data class DownloadJob(val id: String, var bytesWritten: Long)",
              correct: true,
              rationale:
                "This one. It has identity — two jobs with the same id are the same job, not two equal values — and worse, it is mutable. A `var` inside a data class means its `hashCode` changes over time, which quietly breaks any `Set` or `Map` holding it. You will see exactly how in the drills.",
            },
            {
              id: "c",
              body: "data class UserId(val value: String)",
              correct: false,
              rationale:
                "A good use, and a useful habit: wrapping an id in a type stops you passing a `String` order id where a `String` user id was wanted. Two `UserId`s with the same string are the same id.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "data-classes",
      title: "What `data` actually generates",
      kicker: "And the two lines in the documentation that cause the bugs",
      startMinute: 10,
      endMinute: 34,
      blocks: [
        {
          id: "d-intro",
          kind: "prose",
          body: [
            "`data` generates `equals()`, `hashCode()`, `toString()`, `copy()` and the `componentN()` functions used by destructuring. Nothing surprising so far. The surprises are in *which properties* it uses and *how deep* the copy goes.",
          ],
        },
        {
          id: "d-primary",
          kind: "code",
          title: "Where the properties live matters",
          code: {
            language: "kotlin",
            code: `data class Person(val name: String) {
    var age: Int = 0
}

fun main() {
    val a = Person("Alex").apply { age = 30 }
    val b = Person("Alex").apply { age = 41 }
    println(a == b)
    println(a)
}`,
          },
        },
        {
          id: "d-primary-predict",
          kind: "predict",
          question: "What do the two lines print?",
          expected: "true Person(name=Alex)",
          answer:
            "`true`, then `Person(name=Alex)`.\n\n\"The compiler only uses the properties defined inside the primary constructor for the automatically generated functions. To exclude a property from the generated implementations, declare it inside the class body.\"\n\n`age` is in the body, so it is invisible to `equals`, `hashCode`, `toString` and `copy`. Two people of different ages compare equal, and `toString` does not mention age at all — which is a genuinely useful tool when a property is a cache or a derived value, and a genuinely nasty bug when it is real state somebody assumed was compared.",
        },
        {
          id: "d-shallow",
          kind: "compare",
          title: "`copy()` is shallow, and shallow means shared",
          compare: [
            {
              label: "What people expect",
              code: `val original = Order(items = mutableListOf("a"))
val duplicate = original.copy()

duplicate.items.add("b")
// original.items == ["a"]     <- expected`,
              verdict:
                "The intuition is that copying an object copies what is inside it. It does not.",
            },
            {
              label: "What happens",
              code: `val original = Order(items = mutableListOf("a"))
val duplicate = original.copy()

duplicate.items.add("b")
// original.items == ["a", "b"] <- actual
// original.items === duplicate.items`,
              verdict:
                "One list, two references to it. \"The `copy()` function creates a shallow copy of the instance... As a result, references to other objects are shared.\"",
            },
          ],
        },
        {
          id: "d-shallow-callout",
          kind: "callout",
          tone: "warning",
          title: "Why this is a state bug, not a trivia question",
          body: [
            "In an Android app this shows up as a UI that will not update. You `copy()` the state, mutate the list inside it, and emit — and because the list is the same object, a `StateFlow` comparing old to new sees two **equal** states and skips the emission. The screen does not change and nothing has thrown.",
            "The fix is the Day 1 rule rather than a deeper copy: hold a read-only `List`, and produce a new one (`items + newItem`) instead of mutating. A value type whose insides can be mutated is not really a value.",
          ],
        },
        {
          id: "d-explain",
          kind: "explain",
          question:
            "When would you deliberately put a property in the body rather than the primary constructor?",
          keywords: ["derived", "cache", "identity", "equals"],
          answer:
            "When the property is **not part of what the value is** — when two instances differing only in it should still count as the same thing.\n\nDerived values are the clearest case: a `displayName` computed from first and last, a memoised formatting result, a lazily built index. Including them in `equals` would be at best redundant and at worst wrong, because two equal values could compute them at different times.\n\nThe test is the warm-up question again: if two instances differ only in this property, are they the same thing? If yes, it belongs in the body. If no, it belongs in the primary constructor — and if you cannot answer, that is usually a sign the class is holding two different ideas and wants splitting.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "equality",
      title: "Same value, same object, same bucket",
      kicker: "Three different questions",
      startMinute: 34,
      endMinute: 58,
      blocks: [
        {
          id: "e-intro",
          kind: "prose",
          body: [
            "`==` in Kotlin is not a comparison operator so much as a piece of syntax that expands into a method call. Knowing the expansion answers most questions about it at once.",
            "\"By convention, an expression like `a == b` is translated to: `a?.equals(b) ?: (b === null)`. If `a` is not `null`, it calls the `equals(Any?)` function. Otherwise (`a` is `null`), it checks that `b` is referentially equal to `null`.\"",
          ],
        },
        {
          id: "e-pipeline",
          kind: "pipeline",
          title: "What the compiler does with `a == b`",
          stages: [
            { label: "a == b", caption: "what you wrote" },
            { label: "a?.equals(b)", caption: "a call, not a comparison" },
            { label: "?: (b === null)", caption: "null == null is true" },
            { label: "your equals()", caption: "or Any's, which is identity" },
          ],
          body: [
            "Two consequences fall out immediately. `==` is null-safe in Kotlin — no `NullPointerException`, and `null == null` is `true` — which is why you almost never need `Objects.equals` habits carried over from Java.",
            "And `==` does whatever `equals` does. On a class that has not overridden it, `equals` is `Any`'s, which compares references — so `==` and `===` give the same answer, and the distinction people teach as \"== for value, === for reference\" is only true when someone has written the `equals`.",
          ],
        },
        {
          id: "e-hash",
          kind: "prose",
          body: [
            "The third question is the one that causes real outages: **which bucket does this go in?** `HashSet` and `HashMap` find an object by its hash first, and only then compare with `equals`. That is why the documentation pairs them: \"When overriding the equals() function, you should also override the hashCode() function to keep consistency between equality and hashing.\"",
            "A data class does both for you, correctly, from the primary constructor properties. Which makes the following failure the more surprising when you meet it.",
          ],
        },
        {
          id: "e-mutate",
          kind: "code",
          title: "A key that changes its mind",
          code: {
            language: "kotlin",
            code: `data class Tag(var label: String)

fun main() {
    val tag = Tag("draft")
    val tags = hashSetOf(tag)

    tag.label = "published"

    println(tags.contains(tag))
    println(tags.first() === tag)
}`,
          },
        },
        {
          id: "e-mutate-predict",
          kind: "predict",
          question: "What do the two lines print?",
          expected: "false true",
          answer:
            "`false`, then `true`. The set does not contain the tag, and the set's only element *is* the tag.\n\nWhen `tag` went in, the set computed its hash from `\"draft\"` and filed it in that bucket. Changing `label` changed what `hashCode()` returns, but nothing moved the object — so `contains` computes the new hash, looks in the new bucket, and finds nothing there.\n\nThe object is still in the set. It is simply unreachable by lookup, and it will stay unreachable until the label changes back. Nothing throws, and iteration still shows it, which is exactly why this is so hard to spot: every debug print says the element is there.",
        },
        {
          id: "e-rule",
          kind: "callout",
          tone: "insight",
          title: "The rule this gives you",
          body: [
            "**Anything used as a key must be immutable** — every property in the primary constructor a `val`, holding types that are themselves values.",
            "A `data class` with a `var` in its primary constructor is the shape to watch for. It generates a `hashCode` that changes over the object's life, which is a contradiction in terms: a hash is supposed to be a fingerprint.",
            "This is the same sentence as Day 1's `val` lesson, arriving from the other end. There it was \"read-only is not immutable\"; here it is what that distinction costs you when a collection is relying on it.",
          ],
        },
        {
          id: "e-quiz",
          kind: "quiz",
          question:
            "`data class Money(val amount: Double, val currency: String)`. What is wrong with it?",
          choices: [
            {
              id: "a",
              body: "Nothing — both properties are vals in the primary constructor.",
              correct: false,
              rationale:
                "The mutability is right, and that is the trap: this one looks correct by the rule you just learned. The problem is one level down, in the type.",
            },
            {
              id: "b",
              body: "Double cannot represent decimal amounts exactly, so equality is unreliable.",
              correct: true,
              rationale:
                "Correct. `0.1 + 0.2` is not `0.3` in binary floating point, so two amounts that should be equal can compare unequal — and the generated `equals` and `hashCode` inherit that. Money wants `BigDecimal`, or an integer count of minor units. The lesson generalises: a data class is only as well-behaved as the types inside it.",
            },
            {
              id: "c",
              body: "currency should be an enum rather than a String.",
              correct: false,
              rationale:
                "A fair design improvement — it would stop `\"GBP\"` and `\"gbp\"` being different currencies — but it does not break equality the way the amount does. Worth doing second.",
            },
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "sealed",
      title: "Making impossible states impossible",
      kicker: "The idea Module 02 will assume you have",
      startMinute: 58,
      endMinute: 82,
      blocks: [
        {
          id: "s-intro",
          kind: "prose",
          body: [
            "Here is a screen state as it is usually written first. Count the states it can represent.",
          ],
        },
        {
          id: "s-bad",
          kind: "code",
          code: {
            language: "kotlin",
            code: `data class ProfileUiState(
    val isLoading: Boolean = false,
    val profile: Profile? = null,
    val error: String? = null,
)`,
          },
        },
        {
          id: "s-explain",
          kind: "explain",
          question:
            "How many distinct states can that type represent, and how many of them are meaningful?",
          keywords: ["eight", "combinations", "impossible", "meaningful"],
          answer:
            "Two booleans' worth of nullable fields: `2 × 2 × 2 = **eight** combinations. Three of them are the ones you meant — loading, loaded, failed.\n\nThe other five are nonsense that the type permits: loading **and** holding an error; a profile **and** an error at the same time; nothing at all, which renders as a blank screen with no explanation; loading while already showing a profile (arguably meaningful, but only if you decided so deliberately).\n\nEvery one of those five has to be prevented by hand, in every place that writes the state and every place that reads it. That is not a discipline problem you can solve with care — it is a modelling problem, and the type is generating the work.",
        },
        {
          id: "s-good",
          kind: "code",
          title: "The same screen, three states and no others",
          code: {
            language: "kotlin",
            code: `sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Ready(val profile: Profile) : ProfileUiState
    data class Failed(val message: String) : ProfileUiState
}`,
          },
        },
        {
          id: "s-good-prose",
          kind: "prose",
          body: [
            "Three states, and the other five cannot be written down. `Ready` cannot exist without a profile, because the compiler will not construct it without one. There is no state that is both loading and failed, because there is no such constructor.",
            "Hold that as one option rather than the answer — Android's own architecture guidance reaches for a different shape, and the comparison two blocks down is worth more than either version on its own.",
            "Note `data object` rather than plain `object` for `Loading`: \"By marking an object declaration with the `data` modifier, you can instruct the compiler to return the actual name of the object when calling `toString()`, the same way it works for data classes\", along with a proper `equals`/`hashCode`. Without it a log line reads like `ProfileUiState$Loading@4f2a1b`, which tells you nothing.",
          ],
        },
        {
          id: "s-exhaustive",
          kind: "compare",
          title: "What sealing buys at the consuming end",
          compare: [
            {
              label: "Over the flag bag",
              code: `when {
    state.isLoading -> Spinner()
    state.error != null -> Error(state.error)
    state.profile != null -> Content(state.profile)
    else -> {}          // the five impossible states
}`,
              verdict:
                "The `else` is where the impossible states go to be silently ignored, and it renders nothing. Order matters too: swap the first two branches and a failed reload shows a spinner forever.",
            },
            {
              label: "Over the sealed type",
              code: `when (state) {
    Loading      -> Spinner()
    is Ready     -> Content(state.profile)
    is Failed    -> Error(state.message)
}`,
              verdict:
                "No `else` and no ordering hazard. \"The `when` expression, used with a sealed class, allows the Kotlin compiler to check exhaustively that all possible cases are covered.\" Add a fourth state and this stops compiling — which is the point.",
            },
          ],
        },
        {
          id: "s-where",
          kind: "callout",
          tone: "why",
          title: "Why the compiler is allowed to promise this",
          body: [
            "\"Direct subclasses of sealed classes and interfaces must be declared in the same package.\"",
            "That restriction is what makes exhaustiveness possible at all: the compiler can only know it has seen every case if nobody outside can add one. The rule is not a limitation on sealed types — it is the thing sealed types are buying.",
            "Which tells you when *not* to seal: if the set genuinely should be open to additions from elsewhere, you want an interface, and the `when` should become polymorphism. Seal a set when adding to it should mean visiting the code that handles it.",
          ],
        },
        {
          id: "s-sources",
          kind: "compare",
          title: "Where the two sources disagree — read this before you apply it",
          compare: [
            {
              label: "kotlinlang.org",
              code: `sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Ready(val profile: Profile) : ProfileUiState
    data class Failed(val message: String) : ProfileUiState
}`,
              verdict:
                "\"The `when` expression, used with a sealed class, allows the Kotlin compiler to check exhaustively that all possible cases are covered.\" The language's argument is representability: illegal combinations cannot be written.",
            },
            {
              label: "developer.android.com",
              code: `data class NewsUiState(
    val isSignedIn: Boolean = false,
    val isPremium: Boolean = false,
    val newsItems: List<NewsItemUiState> = listOf(),
    val userMessages: List<Message> = listOf(),
)`,
              verdict:
                "The UI layer guide's worked example is a data class of flags and lists, and neither it nor the state-holders page mentions sealed types at all. Its argument is consistency: \"Use a single UI state object to handle states that are related to each other. This leads to fewer inconsistencies.\"",
            },
          ],
        },
        {
          id: "s-sources-resolve",
          kind: "callout",
          tone: "why",
          title: "They are answering different questions",
          body: [
            "Android's advice is aimed at a different mistake — exposing state as **several separate streams**, where \"you might end up in a situation where one was updated and the other was not\". Both sources agree on one state object, from one stream. They differ only on what that object's *shape* should be, and the Android guide simply does not take a position on it.",
            "The deciding question is whether your states are genuinely **mutually exclusive**. A one-shot load is: you are loading, or you have it, or it failed. A screen that refreshes is not — you want content **and** a spinner, or content **and** an error banner, and disjoint sealed cases force you to repeat the content field in each case. That duplication is the real cost Android's shape avoids.",
            "So: sealed when the cases exclude each other, a data class when they overlap, and for the common middle ground a data class holding a sealed field — `data class Ui(val content: Content, val banner: Banner?)` — which keeps exhaustiveness where it helps without pretending a refresh is a separate universe.",
            "What is **not** defensible either way is three independent booleans for three exclusive states. Both sources would call that a bug; they would just describe it differently.",
          ],
        },
        {
          id: "s-smart",
          kind: "callout",
          tone: "insight",
          title: "The bit that feels like magic and is not",
          body: [
            "Inside `is Ready -> Content(state.profile)`, `state.profile` is a `Profile` rather than a `Profile?`, with no cast and no `!!`.",
            "That is smart casting: the compiler knows the branch only runs when `state` is a `Ready`, and `Ready.profile` is non-null by construction. The nullability disappeared because the *modelling* removed it, not because you asserted it away.",
            "This is the whole return on the exercise. Good types do not just document intent — they delete the defensive code you would otherwise write.",
          ],
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "drills",
      title: "Drills",
      kicker: "Say the answer before you read it",
      startMinute: 82,
      endMinute: 94,
      blocks: [
        {
          id: "dr-1",
          kind: "explain",
          question:
            "Your sealed UI state has a `Ready` case. The screen also needs to show a \"refreshing\" spinner over content it already has. How do you model it?",
          keywords: ["Ready", "field", "state", "combination"],
          answer:
            "Not as a fourth top-level state. `Refreshing` as a sibling of `Ready` loses the profile you are already showing, and you end up copying data between states.\n\nPut it inside the state where it is meaningful: `data class Ready(val profile: Profile, val refreshing: Boolean = false)`. Now \"refreshing\" only exists where there is something to refresh, which is exactly the constraint you wanted — and it is still impossible to be refreshing while failed.\n\nThe general move: when a flag is only meaningful in one state, it is a property **of** that state, not a state of its own. Sealing is not about having the fewest cases; it is about making the illegal combinations unwritable.",
        },
        {
          id: "dr-2",
          kind: "explain",
          question:
            "Two `Ready` states hold profiles with the same id but different `lastSeenAt`. Should they be equal?",
          keywords: ["value", "identity", "recomposition", "emit"],
          answer:
            "It depends on what you use equality *for*, and in a UI the answer is usually \"they should differ\" — because that is what makes the screen update.\n\nIf `Profile` is a data class including `lastSeenAt`, the two states are unequal, a `StateFlow` emits, and the UI recomposes. If you excluded `lastSeenAt` from the primary constructor, the two are equal, the emission is skipped, and the screen keeps showing the old timestamp.\n\nSo \"which properties count\" is not a philosophical question about identity — it is a direct decision about when your UI redraws. Worth knowing before you move a property into the class body to tidy up a `toString`.",
        },
        {
          id: "dr-3",
          kind: "explain",
          question:
            "When is a plain `object` better than a `data object` for a sealed case?",
          keywords: ["toString", "equals", "singleton"],
          answer:
            "Rarely enough that `data object` is the better default for state hierarchies.\n\nA plain `object` is already a singleton, so `==` on it works — there is only one instance, so referential equality is structural equality. What you lose is `toString`, which prints the mangled class name instead of `Loading`, and that is exactly what you want in logs, test failures and `println` debugging.\n\nThe case for plain `object` is when the declaration is not a value at all — a registry, a coordinator, something with behaviour rather than a case in a set. Marking that `data` would suggest it is a value, which it is not.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "implement",
      title: "Implementation challenge",
      kicker: "Replace three flags with a type",
      startMinute: 94,
      endMinute: 107,
      blocks: [
        {
          id: "im-intro",
          kind: "prose",
          body: [
            "Take the flag bag and make the impossible states unwritable. Then come back for the question underneath, which is the one that transfers.",
          ],
        },
        {
          id: "im-challenge",
          kind: "implement",
          title: "Model state so impossible states cannot exist",
          questionSlug: "sealed-state-modelling",
          body: [
            "Replace three independent flags with a type that cannot represent nonsense, and make the consuming `when` exhaustive without an `else`.",
          ],
        },
        {
          id: "im-after",
          kind: "explain",
          question:
            "After finishing: which combination was hardest to give up, and what did that tell you?",
          keywords: ["combination", "meaningful", "product", "decision"],
          answer:
            "Usually it is a combination that turns out to be a real product question nobody had answered — most often \"loading while content is shown\".\n\nThat is the useful part of this exercise. Modelling forces the question into the open: is a refresh over existing content a different state, a property of `Ready`, or something the screen should not do? The flag-bag version let you avoid deciding, and the cost of avoiding it was five illegal states and an `else` branch that rendered nothing.\n\nWhen a type feels hard to model, the difficulty is nearly always an unmade decision rather than a missing language feature.",
        },
      ],
    },

    /* --------------------------------------------------------------- */
    {
      id: "interview",
      title: "Saying it out loud",
      kicker: "And one bug to find",
      startMinute: 107,
      endMinute: 120,
      blocks: [
        {
          id: "v-q1",
          kind: "explain",
          question:
            "\"What's the difference between == and === in Kotlin?\" — give the answer that earns a follow-up rather than closing the topic.",
          keywords: ["equals", "translated", "null", "override"],
          answer:
            "The recitable answer is \"`==` is structural, `===` is referential\". The better one says what `==` actually is: *\"`a == b` compiles to `a?.equals(b) ?: (b === null)`, so it is a null-safe call to `equals`. What it does therefore depends entirely on whether the type overrode `equals` — a data class did, a plain class did not, and for a plain class `==` and `===` give the same answer.\"*\n\nThat version explains the warm-up's `false`/`true` without needing to memorise it, and it leads naturally to the interesting follow-up about `hashCode` and collections.",
        },
        {
          id: "v-quiz",
          kind: "quiz",
          question:
            "\"Why do you prefer sealed types for UI state?\" Which answer is strongest?",
          choices: [
            {
              id: "a",
              body: "It's type-safe and the compiler checks exhaustiveness.",
              correct: false,
              rationale:
                "True, and it is what everyone says. It describes the mechanism without naming what it prevents, so it invites \"and what goes wrong without it?\" — which you should have said first.",
            },
            {
              id: "b",
              body: "Three booleans and nullables give eight combinations for three real states; sealing deletes the other five.",
              correct: true,
              rationale:
                "This is the answer, because it is arithmetic rather than opinion. It names the cost concretely, and the exhaustive `when` follows naturally as the second benefit rather than being the whole argument.",
            },
            {
              id: "c",
              body: "It's the standard pattern in modern Android architecture.",
              correct: false,
              rationale:
                "An appeal to convention, and it collapses if the interviewer asks why the convention exists — or simply disagrees with it. A reason you can derive beats a reason you can cite.",
            },
          ],
        },
        {
          id: "v-challenge",
          kind: "implement",
          title: "Mutating a key inside a HashSet",
          questionSlug: "equality-and-hash-in-sets",
          body: [
            "The drill from the equality section, as a bug in code you have to find. The element is in the set and the set cannot find it.",
          ],
        },
        {
          id: "v-close",
          kind: "callout",
          tone: "insight",
          title: "What to carry into the next lesson",
          body: [
            "Ask of every class: **two of these with identical contents — same thing, or two things?** That answer decides `data`.",
            "`data` generates from the **primary constructor only**, and `copy()` is **shallow** — so a mutable collection inside a copied value is one collection with two owners.",
            "`a == b` is `a?.equals(b) ?: (b === null)`. It does whatever `equals` does, which on a plain class is identity.",
            "A key must be immutable, or the collection holding it loses track of it without ever throwing.",
            "Count the combinations your type allows against the ones you meant. The difference is work you would otherwise do by hand, forever.",
            "Next: when work actually happens — laziness, sequences, and who is allowed to construct things.",
          ],
        },
      ],
    },
  ],
};
