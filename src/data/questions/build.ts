import type { Question } from "@/lib/types";

/* ------------------------------------------------------------------
   Gradle, the build, and what happens between a push and a user.

   The framing throughout is "you are handed a pipeline you did not
   write". That is the real situation: almost nobody sets up an Android
   build from scratch, and almost everybody has to reason about one that
   is already there and occasionally broken.

   So these questions are about reading — a build file, an error, a
   workflow — rather than about authoring from a blank page.
   ------------------------------------------------------------------ */

export const BUILD_QUESTIONS: Question[] = [
  {
    id: "bd01",
    slug: "what-happens-when-you-click-run",
    title: "What Happens When You Click Run",
    description:
      "Source to installed app. Name the stages before naming the tools.",
    difficulty: "Easy",
    format: "quiz",
    track: "Android",
    topics: ["gradle"],
    stage: "explain",
    concepts: ["gradle-build"],
    estimatedMinutes: 8,
    introducedInWeek: 12,
    quizStem:
      "Which ordering describes what actually happens between pressing Run and the app appearing on a device?",
    choices: [
      {
        id: "a",
        body: "Gradle configures the project, compiles Kotlin to JVM bytecode, converts that to DEX, packages it with resources into an APK, signs it, installs it.",
        correct: true,
        rationale:
          "That is the shape. The step people forget is DEX: Android does not run JVM bytecode, so there is always a conversion between compilation and packaging, and it is often where build time actually goes.",
      },
      {
        id: "b",
        body: "Gradle compiles Kotlin straight to DEX, then signs and installs it.",
        correct: false,
        rationale:
          "Kotlin compiles to JVM bytecode first; D8 then converts it to DEX. Collapsing those hides the step that dominates incremental build time on large modules.",
      },
      {
        id: "c",
        body: "Android Studio compiles the code directly and Gradle only resolves dependencies.",
        correct: false,
        rationale:
          "The IDE delegates the whole build to Gradle. Believing otherwise makes command-line and CI builds behave inexplicably differently from what you see in the IDE.",
      },
      {
        id: "d",
        body: "Resources are compiled after packaging, so that they can be swapped without a rebuild.",
        correct: false,
        rationale:
          "Resources are processed and given generated ids before packaging — that is where R comes from. Nothing gets swapped in post-hoc.",
      },
    ],
    solution: {
      mentalModel:
        "Configure, compile, dex, package, sign, install. Every Gradle task you will ever stare at in a CI log belongs to one of those stages, and knowing which one narrows a failure enormously.",
      whyItWorks: [
        "The JVM-bytecode-to-DEX step exists because Android's runtime is not a JVM, which is also why some Java library features need desugaring.",
        "Signing is a real stage, not a formality: an unsigned APK will not install, which is why a release pipeline needs key material.",
      ],
      commonMistakes: [
        "Treating the build as one opaque step, which makes every slow build equally mysterious.",
        "Assuming the IDE and CI do different things — they run the same Gradle tasks, which is why 'works in Studio' is rarely the real difference.",
      ],
      followUps: [
        "Run your own build with --scan or --profile. Which stage actually takes the time?",
      ],
    },
  },

  {
    id: "bd02",
    slug: "read-a-build-file",
    title: "Read a Build File You Did Not Write",
    description:
      "Every block in a module's build.gradle.kts, and what would break without it.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Android",
    topics: ["gradle"],
    stage: "explain",
    concepts: ["gradle-build"],
    estimatedMinutes: 18,
    introducedInWeek: 12,
    readingCode: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.app"
    compileSdk = 36

    buildFeatures {
        // AGP 8.0 flipped this default to false: without it there is no
        // generated BuildConfig at all, and buildConfigField has nothing
        // to write into.
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 142
        versionName = "3.4.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(project(":core:data"))
    ksp(libs.hilt.compiler)
    testImplementation(libs.junit)
}`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "compileSdk is 36, minSdk is 26, targetSdk is 36. Explain what each one actually controls — they are routinely confused.",
        expert:
          "compileSdk is what you compile against: which APIs exist as far as the compiler is concerned. minSdk is the oldest device that may install the app, so it decides which APIs need a version check before you call them. targetSdk is a declaration that you have tested against that version's behaviour changes — the platform applies new behaviours to apps targeting it and preserves old behaviours for apps that do not. Raising compileSdk is usually routine; raising targetSdk is the one that changes runtime behaviour and needs testing.",
        keywords: ["compile against", "oldest device", "behaviour", "version check", "tested"],
      },
      {
        id: "p1b",
        question:
          "There is a buildFeatures block turning buildConfig on. What happens without it, and why is it there at all?",
        expert:
          "Without it there is no generated BuildConfig class, so every reference to BuildConfig.API_URL or BuildConfig.DEBUG fails to resolve — and the error names the reference rather than the missing feature, which is why it puzzles people. AGP 8.0 changed the default to false so that projects which never use BuildConfig do not pay to generate it. It is opt-in now rather than automatic.",
        keywords: ["not generated", "unresolved", "AGP 8", "opt in", "default false"],
      },
      {
        id: "p2",
        question:
          "What does applicationIdSuffix on debug buy you, and why is it worth a line in the build file?",
        expert:
          "It gives the debug build a different package identity, so a debug and a release build can sit on one device at the same time rather than replacing each other. That matters for comparing behaviour side by side and for not destroying your production-account state every time you run from the IDE. The cost is that anything keyed on the application id — deep links, some OAuth redirect registrations, push registration — needs the debug variant registered too.",
        keywords: ["side by side", "both installed", "separate", "deep link", "oauth"],
      },
      {
        id: "p3",
        question:
          "isMinifyEnabled is true on release and absent on debug. Name one benefit and one concrete risk.",
        expert:
          "The benefit is that R8 strips unused code and shrinks the app, and obfuscates names on the way. The risk is that anything reached reflectively rather than by a call — serialization of model classes, some DI or JSON libraries, anything named in a manifest or XML — can be removed or renamed, and it fails only in release. That is why crash reports from release need mapping files to be readable, and why 'works in debug, crashes in release' is nearly always a keep-rule problem.",
        keywords: ["shrink", "obfuscate", "reflection", "keep rule", "mapping", "release only"],
      },
      {
        id: "p4",
        question:
          "Three dependency configurations appear: implementation, ksp, testImplementation. What is each doing?",
        expert:
          "implementation puts the library on the compile and runtime classpath for this module, but does not expose it to modules that depend on this one — that containment is what keeps build graphs from becoming fully connected. ksp registers an annotation processor that generates code at build time, which is how Hilt produces its factories. testImplementation is only on the classpath for unit tests, so JUnit never ships inside the app.",
        keywords: ["classpath", "not exposed", "transitive", "generate", "test only"],
      },
      {
        id: "p5",
        question:
          "project(\":core:data\") is a dependency on another module in the same repo. What does splitting modules cost and buy?",
        expert:
          "It buys parallelism and incrementality — independent modules build in parallel, and a change inside one need not recompile the others — plus enforced boundaries, because a module can only use what it declares. It costs configuration overhead per module and a real risk of over-splitting: a graph of forty tiny modules can build slower than eight sensible ones and is harder to navigate. The win comes from the dependency graph being shallow and wide, not from module count.",
        keywords: ["parallel", "incremental", "boundary", "overhead", "over-split"],
      },
    ],
    solution: {
      mentalModel:
        "A build file is a set of declarations about identity, compatibility, packaging and classpath. Read each block by asking which of those four it is doing, and what would go wrong if it were absent.",
      whyItWorks: [
        "Version catalogs (the libs. references) keep versions in one file, so upgrades are a single edit rather than a search.",
        "Build types let one codebase produce meaningfully different artefacts without conditionals in application code.",
      ],
      commonMistakes: [
        "Confusing targetSdk with minSdk, then wondering why a behaviour change reached users.",
        "Using api where implementation would do, which leaks a dependency to every consumer and slows incremental builds.",
      ],
      followUps: [
        "Open your own app module's build file. Is there a block you could not explain to a new joiner?",
      ],
    },
  },

  {
    id: "bd03",
    slug: "build-types-flavours-variants",
    title: "Build Types, Flavours and Variants",
    description:
      "Two axes that multiply. Know which one you actually need.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["gradle"],
    stage: "explain",
    concepts: ["gradle-build"],
    estimatedMinutes: 8,
    introducedInWeek: 12,
    quizStem:
      "An app has build types debug and release, and product flavours free and paid. What exists, and what is the distinction being drawn?",
    choices: [
      {
        id: "a",
        body: "Four variants. Build types vary how the same product is built; flavours vary which product it is.",
        correct: true,
        rationale:
          "Types and flavours are independent axes and Gradle produces their product — freeDebug, freeRelease, paidDebug, paidRelease. The distinction is the useful part: debug versus release is the same app built differently, free versus paid is a different app.",
      },
      {
        id: "b",
        body: "Two variants, because flavours replace build types.",
        correct: false,
        rationale:
          "They compose rather than replace. Missing that is how people end up unable to produce a release build of one flavour.",
      },
      {
        id: "c",
        body: "Four variants, but flavours only change resources, not code.",
        correct: false,
        rationale:
          "Flavours can carry their own source sets as well as resources, so a flavour can genuinely have different implementations — which is both the power and the maintenance cost.",
      },
      {
        id: "d",
        body: "Four variants, and each needs its own signing config.",
        correct: false,
        rationale:
          "Signing is configured per build type by default. Flavours can override it, but nothing requires four configs.",
      },
    ],
    solution: {
      mentalModel:
        "Build type answers 'how is this built' — debuggable, minified, signed with what. Flavour answers 'which product is this'. Variants are the product of the two, which is why adding a third flavour to two types is six things to build and test.",
      whyItWorks: [
        "Flavour source sets let genuinely different behaviour live in separate directories rather than in runtime conditionals.",
        "Keeping the axes distinct stops 'staging' being modelled as a flavour when it is really a build type with a different endpoint.",
      ],
      commonMistakes: [
        "Modelling environments as flavours, which multiplies the matrix and makes the CI build everything.",
        "Forgetting that variant count multiplies, so CI time grows faster than the number of things you added.",
      ],
      followUps: [
        "How many variants does your app produce, and does CI build all of them on every PR?",
      ],
    },
  },

  {
    id: "bd04",
    slug: "implementation-versus-api",
    title: "implementation or api",
    description:
      "One keyword decides how much of your build recompiles.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["gradle"],
    stage: "predict",
    concepts: ["gradle-build"],
    estimatedMinutes: 9,
    introducedInWeek: 12,
    quizCode: `// in :core:network
dependencies {
    api(libs.retrofit)
    implementation(libs.okhttp)
}

// in :feature:profile
dependencies {
    implementation(project(":core:network"))
}`,
    quizStem:
      "Which is true of :feature:profile, given these declarations?",
    choices: [
      {
        id: "a",
        body: "It can reference Retrofit types directly but not OkHttp types, and a change to Retrofit's version can force it to recompile.",
        correct: true,
        rationale:
          "api exposes a dependency to consumers, implementation hides it. That is exactly why api is the slower choice: exposing a type puts it in consumers' compile classpath, so changes ripple outward.",
      },
      {
        id: "b",
        body: "It can reference both, because transitive dependencies are always available at compile time.",
        correct: false,
        rationale:
          "That was true of the old compile configuration, and removing it is precisely how Gradle made incremental builds workable.",
      },
      {
        id: "c",
        body: "It can reference neither, because it only depends on the module.",
        correct: false,
        rationale:
          "api exists to make exactly this possible — it is how a module deliberately republishes a type that appears in its own public signatures.",
      },
      {
        id: "d",
        body: "It can reference both, but only at runtime.",
        correct: false,
        rationale:
          "Both are present at runtime; the distinction being drawn is about the compile classpath.",
      },
    ],
    solution: {
      mentalModel:
        "Ask whether the dependency appears in this module's public signatures. If a return type or parameter is a Retrofit type, consumers need it and api is honest. If it is used only inside, implementation contains the blast radius.",
      whyItWorks: [
        "Hiding a dependency means a version bump recompiles one module instead of everything downstream of it.",
        "It also enforces a boundary: a feature module cannot quietly start using OkHttp because it happened to be transitively present.",
      ],
      commonMistakes: [
        "Using api by default because it makes compile errors go away, which reconnects the build graph and slows every future build.",
        "Using implementation for a type that genuinely appears in your public API, producing confusing errors in consumers.",
      ],
      followUps: [
        "How many api declarations are in your codebase, and does each one have a type in a public signature?",
      ],
    },
  },

  {
    id: "bd05",
    slug: "the-build-got-slow",
    title: "The Build Got Slow",
    description:
      "Every build is slow, including the ones that change nothing. Find why.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["gradle", "performance"],
    stage: "predict",
    ownership: "improve",
    concepts: ["gradle-build", "debugging-method"],
    estimatedMinutes: 20,
    introducedInWeek: 12,
    symptom:
      "Incremental builds took about 20 seconds last month and now take over two minutes — even when nothing has changed and the task graph reports everything up to date. CI is slow too.",
    brokenCode: `// app/build.gradle.kts

// Runs at configuration time — on every build, before any task executes.
val gitSha = providers.exec {
    commandLine("git", "rev-parse", "HEAD")
}.standardOutput.asText.get().trim()

val buildTime = System.currentTimeMillis()

android {
    buildFeatures { buildConfig = true }   // off by default since AGP 8.0

    defaultConfig {
        buildConfigField("String", "GIT_SHA", "\\"$gitSha\\"")
        buildConfigField("long", "BUILD_TIME", "\${buildTime}L")
    }
}`,
    debugHints: [
      {
        label: "Separate the two phases",
        body: "Gradle configures every build, then executes tasks. 'Everything up to date' refers only to execution — configuration still ran.",
      },
      {
        label: "Look at what changes every time",
        body: "BUILD_TIME is different on every single build. Ask what depends on BuildConfig.",
      },
      {
        label: "Follow the invalidation",
        body: "If a generated source file changes on every build, nothing downstream of it can ever be considered up to date.",
      },
    ],
    rootCause:
      "Two separate faults that compound. First, BUILD_TIME embeds a timestamp that differs on every build, so BuildConfig is regenerated every time and every task that consumes it — compilation, dexing, packaging — is invalidated. No incremental build can ever hit the cache. Second, the git call runs at configuration time, so it executes on every invocation including ones that do no work, and it is not modelled as an input so Gradle cannot cache around it.",
    fixedCode: `// A value that changes every build defeats every cache downstream.
// If the build time is genuinely needed, confine it to release builds
// where a full rebuild is happening anyway.
val gitSha = providers.exec {
    commandLine("git", "rev-parse", "HEAD")
}.standardOutput.asText.map { it.trim() }   // a lazy provider, not a call

android {
    buildFeatures { buildConfig = true }

    defaultConfig {
        // Stable between builds unless the commit actually changes.
        buildConfigField("String", "GIT_SHA", "\\"\${gitSha.get()}\\"")
    }
    buildTypes {
        release {
            buildConfigField("long", "BUILD_TIME", "\${System.currentTimeMillis()}L")
        }
    }
}`,
    productionImplications: [
      "This is one of the most common self-inflicted build regressions, and it is invisible in code review because the line looks harmless.",
      "The same shape appears with any non-deterministic build input: a random id, a timestamp, an environment variable that varies per machine.",
      "It also defeats the remote build cache in CI, so the cost multiplies across the team rather than landing on one developer.",
    ],
    solution: {
      mentalModel:
        "Gradle's incrementality is a chain of input-output relationships. Any input that changes every build breaks the chain at that point, and everything downstream rebuilds. Ask of every generated value: does this change when nothing changed?",
      whyItWorks: [
        "Lazy providers let Gradle defer work until something genuinely needs the value, rather than at configuration time on every invocation.",
        "Confining volatile values to release builds keeps day-to-day incremental builds cacheable.",
      ],
      commonMistakes: [
        "Diagnosing by task execution alone, when the time is being spent in configuration.",
        "Adding --offline or disabling the cache to 'fix' it, which hides the cause.",
      ],
      followUps: [
        "Run your build twice with no changes. If the second is not near-instant, what is invalidating it?",
      ],
    },
  },

  {
    id: "bd06",
    slug: "read-a-ci-workflow",
    title: "Read a Pipeline You Did Not Write",
    description:
      "Every step in a CI workflow, and what its absence would let through.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Android",
    topics: ["ci-cd", "gradle"],
    stage: "explain",
    concepts: ["pipeline", "gradle-build"],
    estimatedMinutes: 18,
    introducedInWeek: 12,
    readingCode: `name: PR

on:
  pull_request:
    branches: [main]

concurrency:
  group: pr-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 17

      - uses: gradle/actions/setup-gradle@v6
        with:
          cache-read-only: \${{ github.ref != 'refs/heads/main' }}

      - run: ./gradlew lintDebug detekt

      - run: ./gradlew testDebugUnitTest

      - run: ./gradlew assembleDebug

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: reports
          path: '**/build/reports/**'`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "What does the concurrency block do, and why would a team add it?",
        expert:
          "It cancels an in-flight run for the same ref when a new commit is pushed. Without it, pushing three times in quick succession runs three full pipelines, two of which are testing code nobody will merge — wasting runner time and delaying everyone's feedback. It is a cost and latency measure, not a correctness one.",
        keywords: ["cancel", "superseded", "cost", "runner", "queue"],
      },
      {
        id: "p2",
        question:
          "cache-read-only is true for branches and false for main. Explain the reasoning.",
        expert:
          "Only the default branch writes to the shared build cache; feature branches read it. Gradle's own guidance is exactly this — read-only is 'typical for feature branches so only the default branch updates the cache' — because every branch writing would produce redundant, competing cache entries. It also happens to stop a branch with broken state from polluting what everyone else depends on. Either way PRs still get the benefit of work the default branch has already done.",
        keywords: ["default branch", "redundant", "read", "write", "shared"],
      },
      {
        id: "p3",
        question:
          "Three Gradle invocations run in sequence. What would change if they were one command, and what would change if they ran as parallel jobs?",
        expert:
          "As one command, Gradle could schedule the work itself and share a single configuration phase, which is usually faster — at the cost of a less legible log, since a failure is attributed to a task rather than a named step. As parallel jobs, feedback arrives sooner for whichever fails first and the steps are isolated, but each job pays checkout, JDK setup and cache warming again, so total machine time rises. It is a wall-clock versus cost trade, and small repos usually take the single command.",
        keywords: ["configuration", "parallel", "wall clock", "cost", "isolation", "setup"],
      },
      {
        id: "p4",
        question:
          "The artifact upload has if: failure(). Why that condition, and what is it for?",
        expert:
          "It only uploads reports when something failed, which is the only time anyone reads them. Lint, detekt and test reports are HTML that a CI log cannot show, so without this you get 'a test failed' and no way to see which assertion without reproducing locally. Uploading unconditionally would cost storage on every green run for files nobody opens.",
        keywords: ["reports", "diagnose", "html", "only on failure", "storage"],
      },
      {
        id: "p5",
        question:
          "assembleDebug runs but the APK is never uploaded. Is that a mistake?",
        expert:
          "Not necessarily. On a PR, assembling proves the build is not broken — which lint and unit tests do not, since they can pass on code that fails to package. The artefact itself has no consumer here, because nothing installs a PR build. If the team wanted device tests or distribution to testers, that would be a reason to upload it; as written, the step is a check rather than a producer.",
        keywords: ["proves", "packaging", "no consumer", "distribution", "check"],
      },
    ],
    solution: {
      mentalModel:
        "Read a pipeline as a series of claims about what must be true to merge. Each step either establishes a claim or produces something a later step needs, and a step that does neither should be deleted.",
      whyItWorks: [
        "Pinning the JDK removes the most common source of 'works on my machine'.",
        "Uploading reports only on failure puts diagnostics exactly where they are needed and nowhere else.",
      ],
      commonMistakes: [
        "Running everything on every push with no concurrency control, then wondering why the queue is long.",
        "Letting any branch write the shared cache.",
      ],
      followUps: [
        "In your own pipeline, which step has never once caught a real problem?",
      ],
    },
  },

  {
    id: "bd07",
    slug: "what-blocks-a-merge",
    title: "What Should Block a Merge",
    description:
      "A pipeline's required checks are a statement about what the team considers broken.",
    difficulty: "Medium",
    format: "quiz",
    track: "Android",
    topics: ["ci-cd", "git"],
    stage: "reason",
    ownership: "design",
    concepts: ["pipeline", "code-review"],
    estimatedMinutes: 10,
    introducedInWeek: 12,
    quizStem:
      "A team's PR pipeline takes 25 minutes and people have started merging without waiting. Which response is strongest?",
    choices: [
      {
        id: "a",
        body: "Split the checks: a fast required set that must pass to merge, and slower suites that run after merge or nightly, with a clear owner for failures.",
        correct: true,
        rationale:
          "It treats the real problem, which is that feedback slower than a developer's attention span gets routed around. Tiering by speed keeps the merge gate credible, and naming an owner for the slow suite is what stops it rotting.",
      },
      {
        id: "b",
        body: "Make all 25 minutes of checks required and enforce branch protection so nobody can merge early.",
        correct: false,
        rationale:
          "Enforcing a gate people are already avoiding treats the symptom. It may be the right end state, but not before the feedback loop is fast enough to be tolerable.",
      },
      {
        id: "c",
        body: "Remove the slowest checks, since a suite nobody waits for provides no value.",
        correct: false,
        rationale:
          "It correctly spots that an ignored check is worthless, then throws away the coverage instead of moving it. Deleting an integration suite because it is slow is how regressions get to production.",
      },
      {
        id: "d",
        body: "Run the full suite only on main, and fix failures as they appear.",
        correct: false,
        rationale:
          "This is 'detect breakage after it is shared'. It can be a deliberate choice for very slow suites, but as the whole answer it moves the cost onto whoever next pulls main.",
      },
    ],
    solution: {
      mentalModel:
        "Required checks are a contract: this is what we consider broken. The contract only holds if it is fast enough to respect, so speed is a correctness property of a pipeline, not a nicety.",
      whyItWorks: [
        "Tiering matches cost to risk: compile and unit tests catch most regressions in minutes.",
        "An owner for the slow tier is what distinguishes a deferred check from an abandoned one.",
      ],
      commonMistakes: [
        "Adding checks without ever removing one, until the gate is slow enough that people route around it.",
        "Keeping a flaky test required, which teaches the whole team that red does not mean broken.",
      ],
      followUps: [
        "What is the longest your team would tolerate waiting — and what fits inside it?",
      ],
    },
  },

  {
    id: "bd08",
    slug: "green-locally-red-in-ci",
    title: "Green Locally, Red in CI",
    description:
      "The same commit, two results. The difference is always an input you did not declare.",
    difficulty: "Hard",
    format: "debugging",
    track: "Android",
    topics: ["ci-cd", "testing"],
    stage: "predict",
    ownership: "improve",
    concepts: ["pipeline", "debugging-method", "test-seams"],
    estimatedMinutes: 20,
    introducedInWeek: 12,
    symptom:
      "One test passes on every developer machine and fails on CI roughly half the time. Re-running the job sometimes makes it pass. The code under test has not changed in months.",
    brokenCode: `class InvoiceFormatterTest {

    @Test
    fun \`formats the due date\`() {
        val invoice = Invoice(
            dueAt = Instant.parse("2026-03-01T00:00:00Z"),
            amountPence = 125_00,
        )

        val text = InvoiceFormatter().format(invoice)

        // Passes in London, fails on a runner set to UTC-5, where the
        // same instant is still the 28th of February locally.
        assertEquals("Due 1 Mar · £125.00", text)
    }
}`,
    debugHints: [
      {
        label: "What differs between the machines",
        body: "The code is identical, so the difference is environment. List what a formatter can read from its environment.",
      },
      {
        label: "Why only half the time",
        body: "Ask what else varies — runner images are not identical, and the test may only straddle a boundary for some of them.",
      },
      {
        label: "Name the undeclared input",
        body: "The test depends on a value it never supplies. Supplying it is the fix.",
      },
    ],
    rootCause:
      "The test depends on the machine's default time zone and locale, which it never declares. Formatting an Instant for display requires a zone, and the formatter is picking up the system default — London locally, something else on the runner. The instant is near midnight UTC, so in a negative-offset zone it falls on the previous day. The currency symbol has the same problem through the default locale. It is not flakiness in any real sense: it is a hidden input that happens to vary.",
    fixedCode: `class InvoiceFormatterTest {

    // The zone and locale are inputs, so the test supplies them rather
    // than inheriting whatever the machine happens to be set to.
    private val formatter = InvoiceFormatter(
        zone = ZoneId.of("Europe/London"),
        locale = Locale.UK,
    )

    @Test
    fun \`formats the due date\`() {
        val invoice = Invoice(
            dueAt = Instant.parse("2026-03-01T00:00:00Z"),
            amountPence = 125_00,
        )

        assertEquals("Due 1 Mar · £125.00", formatter.format(invoice))
    }

    @Test
    fun \`renders the previous day in a negative offset zone\`() {
        val newYork = InvoiceFormatter(ZoneId.of("America/New_York"), Locale.UK)
        val invoice = Invoice(Instant.parse("2026-03-01T00:00:00Z"), 125_00)

        // Now a real behaviour, asserted on purpose rather than by accident.
        assertEquals("Due 28 Feb · £125.00", newYork.format(invoice))
    }
}`,
    productionImplications: [
      "The same hidden input exists in the app: a user in a different zone sees a different date for the same instant, which is a real bug in invoices, deadlines and streaks.",
      "Tolerating an intermittently red job trains the team to re-run rather than read, which is how genuine failures get re-run too.",
      "Pinning zone and locale on the CI runner would hide it rather than fix it, and the production bug would remain.",
    ],
    solution: {
      mentalModel:
        "A test that behaves differently on two machines has an undeclared input. Time zone, locale, file system ordering, network, clock and available cores are the usual suspects. The fix is to make it a parameter, not to pin the environment.",
      whyItWorks: [
        "Injecting the zone turns a hidden dependency into a visible one, and the second test then covers behaviour that was previously accidental.",
        "The production code gains the same seam, so the app can be tested in the zones its users actually live in.",
      ],
      commonMistakes: [
        "Setting a default time zone globally in test setup, which fixes the symptom and leaves the app's own dependency on the default untouched.",
        "Marking the test as flaky and retrying it.",
      ],
      followUps: [
        "Which of your tests would fail if the runner were set to Pacific/Auckland?",
      ],
    },
  },

  {
    id: "bd09",
    slug: "secrets-and-signing",
    title: "Secrets, Signing and What Ships",
    description:
      "A release pipeline needs key material. Getting that wrong is unrecoverable.",
    difficulty: "Hard",
    format: "quiz",
    track: "Android",
    topics: ["ci-cd", "gradle", "observability"],
    stage: "reason",
    ownership: "design",
    concepts: ["pipeline", "gradle-build"],
    estimatedMinutes: 10,
    introducedInWeek: 12,
    quizStem:
      "A release workflow needs the upload keystore and an API key. Which arrangement is soundest?",
    choices: [
      {
        id: "a",
        body: "Both held as CI secrets, injected as environment variables at build time, referenced from the build file, and never written to a file the build might archive.",
        correct: true,
        rationale:
          "Secrets stay out of the repository and out of artefacts, and exist only in the environment of the job that needs them. The clause about artefacts matters: a keystore decoded into the workspace can be swept up by a later upload step.",
      },
      {
        id: "b",
        body: "Committed to a private repository, since only the team can read it.",
        correct: false,
        rationale:
          "Private is not secret. Repository access is broader and longer-lived than you think, git history is forever, and rotating a committed key means rewriting history.",
      },
      {
        id: "c",
        body: "Held as CI secrets and also echoed to the log at build start, so failures can be diagnosed.",
        correct: false,
        rationale:
          "Logs are retained, widely readable, and often attached to issues. This is one of the most common ways secrets escape.",
      },
      {
        id: "d",
        body: "Generated fresh for each release, so no long-lived secret exists.",
        correct: false,
        rationale:
          "Not possible for an upload key: Android requires that updates are signed with the same key. Regenerating it means you can never update the app again — an unrecoverable mistake, and the reason signing is treated with more care than other secrets.",
      },
    ],
    solution: {
      mentalModel:
        "Secrets should exist in exactly one place, be readable by exactly the jobs that need them, and never be written anywhere durable. For signing keys there is an extra property: losing or changing the upload key ends your ability to ship updates to existing installs.",
      whyItWorks: [
        "Environment injection scopes exposure to a single job run.",
        "Keeping key material out of the workspace stops artefact upload steps from exfiltrating it accidentally.",
      ],
      commonMistakes: [
        "Decoding a keystore into the repo directory and later uploading the whole workspace as an artefact.",
        "Assuming a private repo is a safe store, which makes rotation extremely painful.",
        "Printing configuration for debugging without masking.",
      ],
      followUps: [
        "If your signing key were lost tomorrow, what would happen to your existing users?",
      ],
    },
  },

  {
    id: "bd10",
    slug: "stage-a-risky-release",
    title: "Ship Something Risky",
    description:
      "The build is green. Design the way it reaches users — and the way back.",
    difficulty: "Hard",
    format: "quiz",
    track: "Android",
    topics: ["ci-cd", "observability"],
    stage: "reason",
    ownership: "own",
    concepts: ["pipeline", "observability"],
    estimatedMinutes: 12,
    introducedInWeek: 12,
    quizStem:
      "You are shipping a rewritten sync engine. CI is green and it works on your device. Which release plan is strongest?",
    choices: [
      {
        id: "a",
        body: "Behind a flag, defaulted off, enabled for a small percentage, with a metric that would show sync failures and a documented way to turn it off without shipping a build.",
        correct: true,
        rationale:
          "It separates deploying the code from enabling the behaviour, which is what makes the way back fast. Without a metric you cannot tell whether the rollout is healthy, and mobile's slow update cycle is exactly why the off switch must not require a release.",
      },
      {
        id: "b",
        body: "Full release, with a fix prepared in case something goes wrong.",
        correct: false,
        rationale:
          "On mobile the fix takes a review cycle and then depends on users updating. Rolling back a rewritten sync engine this way can take days, during which every user has it.",
      },
      {
        id: "c",
        body: "Staged rollout at 1%, 10%, 50%, 100% over a week, watching the crash rate.",
        correct: false,
        rationale:
          "Much better, and still incomplete. Crash rate misses the failure that matters most here — sync that silently does not sync — and halting a staged rollout does not help users who already updated.",
      },
      {
        id: "d",
        body: "Release to an internal testing track first, then to production once the team has used it for a week.",
        correct: false,
        rationale:
          "Useful and not sufficient. Your team is a small, homogeneous sample on good networks; a sync engine fails on the conditions internal users rarely have.",
      },
    ],
    solution: {
      mentalModel:
        "Deploying code and enabling behaviour are two separate events, and keeping them separate is what buys you a fast way back. On mobile, where you cannot pull a release, the flag is the rollback.",
      whyItWorks: [
        "A flag that can be turned off server-side works for users who already updated, which a halted staged rollout does not.",
        "Naming the metric before shipping forces you to say what failure would look like — often the most useful part of the exercise.",
      ],
      commonMistakes: [
        "Watching only crash rate, which misses silent failures entirely.",
        "Shipping the flag defaulted on, which means the first users to update get the untested path immediately.",
        "Leaving flags in place indefinitely, until the codebase has both paths forever and nobody knows which is live.",
      ],
      followUps: [
        "For a change you shipped recently: how would you have known it was failing, and how fast could you have stopped it?",
      ],
    },
  },
];
