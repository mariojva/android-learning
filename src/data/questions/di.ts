import type { Question } from "@/lib/types";

/* ------------------------------------------------------------------
   Dependency injection, derived rather than declared.

   The order here is deliberate and matches the way the idea is actually
   arrived at: a class that constructs its own collaborators, the problem
   that creates, constructor injection, a graph built by hand, the point
   where building it by hand stops scaling, and only then Dagger.

   Nobody needs a framework explained. They need the problem explained,
   after which the framework is obvious.
   ------------------------------------------------------------------ */

export const DI_QUESTIONS: Question[] = [
  {
    id: "di01",
    slug: "who-constructs-this",
    title: "Who Constructs This?",
    description:
      "A repository that builds its own API client. Name what that costs before naming the fix.",
    difficulty: "Easy",
    format: "quiz",
    track: "Architecture",
    topics: ["di", "oop"],
    stage: "explain",
    concepts: ["dependency-inversion", "constructor-injection"],
    estimatedMinutes: 8,
    introducedInWeek: 11,
    quizStem:
      "class UserRepository { private val api = UserApi() }\n\nWhat is the primary problem with this, as written?",
    choices: [
      {
        id: "a",
        body: "The repository decides which UserApi exists, so no caller can give it a different one — including a test.",
        correct: true,
        rationale:
          "That is the whole of it. Constructing your own collaborator welds the decision into the class. Everything else people dislike about this line follows from that one fact.",
      },
      {
        id: "b",
        body: "It creates a new UserApi every time the repository is used, which is wasteful.",
        correct: false,
        rationale:
          "It creates one per repository instance, not per call, and the allocation is irrelevant. Performance is almost never the reason to inject; substitutability is.",
      },
      {
        id: "c",
        body: "It violates the Single Responsibility Principle.",
        correct: false,
        rationale:
          "A principle name is not a diagnosis. You can recite SRP and still not be able to say what will go wrong — which is that you cannot swap the API.",
      },
      {
        id: "d",
        body: "It will not compile without a dependency injection framework.",
        correct: false,
        rationale:
          "It compiles fine. DI is a technique, not a requirement, and this code runs perfectly well right up until you try to test it.",
      },
    ],
    solution: {
      mentalModel:
        "A class that constructs its collaborators has made a decision on behalf of every caller it will ever have. Injection is nothing more exotic than moving that decision outward, to someone who knows more than the class does.",
      whyItWorks: [
        "The class states what it needs in its constructor, which makes the dependency visible in the type rather than buried in the body.",
        "Tests can pass a fake without a framework, a rule, or a mocking library.",
        "Swapping implementations — staging endpoint, offline stub, instrumented build — becomes a call-site decision.",
      ],
      commonMistakes: [
        "Reaching for Dagger at this point. The fix here is a constructor parameter; a framework is for when the graph is large, not for when it is one edge.",
        "Injecting a factory instead of the thing, which usually just moves the same welded decision one level down.",
      ],
      followUps: [
        "What in your own codebase constructs its own collaborators today, and what would it cost to test?",
      ],
    },
  },

  {
    id: "di02",
    slug: "constructor-injection-refactor",
    title: "Make It Testable Without a Framework",
    description:
      "Refactor to constructor injection, then prove it worked by substituting a fake.",
    difficulty: "Easy",
    format: "coding",
    track: "Architecture",
    topics: ["di", "testing"],
    stage: "implement",
    ownership: "implement",
    concepts: ["constructor-injection", "test-doubles", "dependency-inversion"],
    estimatedMinutes: 20,
    introducedInWeek: 11,
    prompt:
      "SessionManager below constructs everything it touches. Rewrite it so its collaborators arrive through the constructor, define the abstraction the test needs, and write the fake that proves a test can now control its behaviour. No DI library.",
    starterCode: `class SessionManager {
    private val api = AuthApi()
    private val clock = SystemClock()

    suspend fun isExpired(token: Token): Boolean =
        token.expiresAt < clock.now()

    suspend fun refresh(token: Token): Token = api.refresh(token)
}`,
    requirements: [
      "SessionManager takes its collaborators as constructor parameters",
      "Depend on an interface where the test needs to substitute behaviour",
      "Write a fake clock that lets a test place 'now' anywhere it likes",
      "No mocking library, and no DI framework",
    ],
    solutionCode: `interface Clock {
    fun now(): Instant
}

class SystemClock : Clock {
    override fun now(): Instant = Instant.now()
}

interface AuthService {
    suspend fun refresh(token: Token): Token
}

class SessionManager(
    private val auth: AuthService,
    private val clock: Clock,
) {
    fun isExpired(token: Token): Boolean =
        token.expiresAt < clock.now()

    suspend fun refresh(token: Token): Token = auth.refresh(token)
}

// The test can now put "now" wherever the case needs it, with no
// waiting, no system time, and nothing flaky.
class FakeClock(var current: Instant) : Clock {
    override fun now(): Instant = current
}`,
    solution: {
      mentalModel:
        "Injection is not the goal. Being able to substitute is the goal, and a constructor parameter is the cheapest way to get it. The interface only needs to exist where substitution actually happens — inventing one per class is ceremony.",
      whyItWorks: [
        "Time is the classic untestable dependency: a test that waits for a real clock is slow and flaky, and a test that cannot move time cannot cover expiry at all.",
        "A fake clock is three lines and reads better in a test than any mock framework's setup.",
        "SessionManager no longer knows which AuthService exists, so production, staging and test can each supply their own.",
      ],
      commonMistakes: [
        "Extracting an interface for every injected type by reflex. SystemClock needs one because tests replace it; a data-only helper usually does not.",
        "Injecting a whole Retrofit instance rather than the narrow capability the class uses.",
        "Keeping isExpired suspend after the dependency on the network went away — the signature should follow what the function actually does.",
      ],
      alternatives: [
        {
          title: "Default parameter values",
          body: "class SessionManager(private val clock: Clock = SystemClock()) keeps production call sites short while leaving tests free to override. It is pragmatic and common. The cost is that the default quietly reintroduces a decision inside the class, which matters once the default is expensive or environment-specific.",
        },
      ],
      followUps: [
        "Which of your own classes would need only a constructor change to become testable?",
      ],
    },
  },

  {
    id: "di03",
    slug: "object-graph-by-hand",
    title: "The Graph, Built by Hand",
    description:
      "Wire four objects manually, then say what happens to this code at forty.",
    difficulty: "Medium",
    format: "code-reading",
    track: "Architecture",
    topics: ["di"],
    stage: "explain",
    concepts: ["object-graph", "constructor-injection"],
    estimatedMinutes: 14,
    introducedInWeek: 11,
    readingCode: `// Somewhere in Application.onCreate
val okHttp = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenStore))
    .build()

val api = Retrofit.Builder()
    .client(okHttp)
    .baseUrl(BuildConfig.API_URL)
    .build()
    .create(UserApi::class.java)

val database = Room.databaseBuilder(this, AppDatabase::class.java, "app.db").build()

val repository = UserRepository(api, database.userDao())
val getUser = GetUserUseCase(repository)
// ...and the ViewModel needs getUser, somehow, from a factory`,
    readingPrompts: [
      {
        id: "p1",
        question:
          "This works and has no framework in it. What exactly does it buy you compared with each class constructing its own dependencies?",
        expert:
          "One place decides. Every construction choice — which base URL, which interceptors, which database file — is visible in a single block, and each class below it states its needs and receives them. That means a change of endpoint touches this block rather than a search across the codebase, and any of these objects can be built differently in a test.",
        keywords: ["one place", "visible", "substitute", "test"],
      },
      {
        id: "p2",
        question:
          "Follow the last line. Why is getting these objects into a ViewModel harder than getting them into UserRepository?",
        expert:
          "You do not construct a ViewModel; the framework does, when it feels like it, after a rotation or a process restart. So you cannot simply pass constructor arguments — you have to hand the system a factory that knows how to build it, and that factory needs access to this graph. That awkwardness is exactly the seam DI libraries are selling into.",
        keywords: ["framework constructs", "factory", "lifecycle", "rotation"],
      },
      {
        id: "p3",
        question:
          "Imagine this block at forty objects with several shared singletons. Name two specific things that get painful — not 'it gets messy'.",
        expert:
          "Ordering and sharing. Ordering: every object must be constructed after its dependencies, so the block becomes a topological sort you maintain by hand, and a new dependency can force you to move lines. Sharing: the moment two branches need the same OkHttpClient you are manually threading one instance through many constructors, and 'is this a singleton' becomes a fact you enforce by remembering rather than by declaring.",
        keywords: ["order", "topological", "singleton", "threading", "shared"],
      },
      {
        id: "p4",
        question:
          "Given all that, what is a dependency injection framework actually automating?",
        expert:
          "The bookkeeping, not the idea. The constructors stay exactly as they are — that part was already right. What the framework does is work out the construction order from the types, hold the shared instances for a stated lifetime, and generate the factories the framework-constructed objects need. If you have not first felt the bookkeeping, the annotations look like magic rather than like a labour saving.",
        keywords: ["order", "lifetime", "factories", "generated", "bookkeeping"],
      },
    ],
    solution: {
      mentalModel:
        "Dagger does not introduce dependency injection — the constructors above already are dependency injection. It automates the graph's bookkeeping: ordering, sharing and factory generation.",
      whyItWorks: [
        "Constructor injection is a design decision; the framework is a labour-saving device layered on top of it.",
        "Understanding the manual version is what lets you debug the generated one.",
      ],
      commonMistakes: [
        "Believing DI means Dagger, then concluding a small app 'does not use DI' because it has no framework.",
      ],
      followUps: [
        "At what size would you personally reach for a framework — and what is the evidence you would use to decide?",
      ],
    },
  },

  {
    id: "di04",
    slug: "what-a-scope-means",
    title: "A Scope Is a Lifetime",
    description:
      "Scopes are explained as annotations. They are actually a statement about how long something lives.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["dagger", "di"],
    stage: "explain",
    concepts: ["dagger-scopes", "object-graph"],
    estimatedMinutes: 9,
    introducedInWeek: 11,
    quizStem:
      "What does annotating a binding @Singleton in Hilt actually guarantee?",
    choices: [
      {
        id: "a",
        body: "One instance per component that holds the scope — here, for as long as the application component lives.",
        correct: true,
        rationale:
          "A scope binds an instance to a component's lifetime. @Singleton means the SingletonComponent's lifetime, which is the process, not some global truth about the class.",
      },
      {
        id: "b",
        body: "One instance for the whole application, forever, guaranteed across process death.",
        correct: false,
        rationale:
          "Nothing survives process death in memory. After a cold start you get a new instance — which is precisely why in-memory caches marked @Singleton still need a persistent backing store.",
      },
      {
        id: "c",
        body: "The class becomes thread-safe.",
        correct: false,
        rationale:
          "Scoping says how many exist, never what happens when several threads touch one. A shared singleton is if anything more exposed to concurrency, not less.",
      },
      {
        id: "d",
        body: "The object is created eagerly when the app starts.",
        correct: false,
        rationale:
          "Scoped bindings are still created lazily, on first request. Scope controls sharing and lifetime, not eagerness.",
      },
    ],
    solution: {
      mentalModel:
        "Read every scope as a lifetime: 'one of these, for as long as X lives'. Then the mistakes become visible, because holding something whose lifetime is shorter than yours is exactly how leaks happen.",
      whyItWorks: [
        "Component lifetimes are the real hierarchy: application outlives activity, which outlives view.",
        "A binding can safely depend on something of equal or longer lifetime, and never on something shorter.",
      ],
      commonMistakes: [
        "Marking things @Singleton because it seems efficient, turning per-request state into accidental shared state.",
        "Assuming @Singleton is a guarantee of uniqueness rather than of sharing within one component.",
      ],
      followUps: [
        "Which scoped objects in your app hold state that would be wrong to share between two screens?",
      ],
    },
  },

  {
    id: "di05",
    slug: "singleton-holding-an-activity",
    title: "The Singleton That Held an Activity",
    description:
      "A tracker injected everywhere, an Activity that never gets collected. Find the lifetime mismatch.",
    difficulty: "Hard",
    format: "debugging",
    track: "Architecture",
    topics: ["dagger", "di", "performance"],
    stage: "predict",
    ownership: "improve",
    concepts: ["dagger-scopes", "leaks", "context"],
    estimatedMinutes: 18,
    introducedInWeek: 11,
    symptom:
      "LeakCanary reports a leaked CheckoutActivity after every rotation. Memory climbs through a session and never comes back down. The app works correctly.",
    brokenCode: `@Singleton
class ScreenTracker @Inject constructor() {

    private val listeners = mutableListOf<TrackingListener>()

    fun register(listener: TrackingListener) {
        listeners += listener
    }

    fun screenViewed(name: String) {
        listeners.forEach { it.onScreen(name) }
    }
}

@AndroidEntryPoint
class CheckoutActivity : AppCompatActivity(), TrackingListener {

    @Inject lateinit var tracker: ScreenTracker

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tracker.register(this)
        tracker.screenViewed("checkout")
    }

    override fun onScreen(name: String) { /* update a debug overlay */ }
}`,
    debugHints: [
      {
        label: "Compare the two lifetimes",
        body: "ScreenTracker lives as long as the process. CheckoutActivity lives until the next rotation. Ask what one is holding of the other.",
      },
      {
        label: "Follow the reference direction",
        body: "register(this) puts the Activity into a list owned by the longer-lived object. Nothing ever takes it out.",
      },
      {
        label: "Count the instances",
        body: "Rotate five times and the list holds five Activities, four of them destroyed. That is the climbing memory.",
      },
    ],
    rootCause:
      "A lifetime mismatch, not a Dagger bug. The @Singleton tracker outlives every Activity, and register(this) hands it a strong reference to one. Because there is no matching unregister, each destroyed Activity stays reachable from a process-scoped object and can never be collected. The scope annotation is working exactly as asked; the code asked for the wrong thing.",
    fixedCode: `@Singleton
class ScreenTracker @Inject constructor() {

    private val listeners = mutableListOf<TrackingListener>()

    fun register(listener: TrackingListener) { listeners += listener }
    fun unregister(listener: TrackingListener) { listeners -= listener }

    fun screenViewed(name: String) { listeners.forEach { it.onScreen(name) } }
}

@AndroidEntryPoint
class CheckoutActivity : AppCompatActivity(), TrackingListener {

    @Inject lateinit var tracker: ScreenTracker

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Tie the registration to the lifecycle that owns it, so the
        // removal cannot be forgotten the way a manual onDestroy can.
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onCreate(owner: LifecycleOwner) = tracker.register(this@CheckoutActivity)
            override fun onDestroy(owner: LifecycleOwner) = tracker.unregister(this@CheckoutActivity)
        })
        tracker.screenViewed("checkout")
    }

    override fun onScreen(name: String) { /* update a debug overlay */ }
}`,
    productionImplications: [
      "Every leaked Activity drags its whole view hierarchy and any bitmaps with it, so this is measured in megabytes rather than bytes.",
      "The symptom appears only after rotation or repeated navigation, so it routinely survives QA and shows up as 'the app gets slow after a while'.",
      "The same shape appears wherever a long-lived object collects callbacks: event buses, in-memory caches keyed by listener, and singletons holding a Context.",
    ],
    solution: {
      mentalModel:
        "Whenever a shorter-lived object hands itself to a longer-lived one, something must hand it back. Preferably something that cannot be forgotten — a lifecycle observer rather than a remembered onDestroy.",
      whyItWorks: [
        "Registration and removal are declared in one place, so they cannot drift apart during a later edit.",
        "The lifecycle owner already knows when the Activity dies, which is exactly the signal needed.",
      ],
      commonMistakes: [
        "Unregistering in onDestroy only — correct until someone adds an early return or a finish() path that skips it.",
        "Reaching for a WeakReference, which hides the leak rather than fixing the ownership mistake.",
        "Blaming the scope and dropping @Singleton, which trades a leak for several trackers that each see part of the truth.",
      ],
      followUps: [
        "Where else in your app does a singleton hold a callback? What removes it?",
      ],
    },
  },

  {
    id: "di06",
    slug: "binds-versus-provides",
    title: "@Binds or @Provides",
    description:
      "Two ways to satisfy the same type. The difference is not style.",
    difficulty: "Medium",
    format: "quiz",
    track: "Architecture",
    topics: ["dagger", "di"],
    stage: "explain",
    concepts: ["dagger-scopes", "interfaces"],
    estimatedMinutes: 8,
    introducedInWeek: 11,
    quizCode: `@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    abstract fun bindUserRepository(impl: RealUserRepository): UserRepository
}`,
    quizStem:
      "When is @Binds the right choice over an equivalent @Provides function?",
    choices: [
      {
        id: "a",
        body: "When the implementation already has an @Inject constructor and you only need to say which interface it satisfies.",
        correct: true,
        rationale:
          "That is exactly its job. Dagger already knows how to build RealUserRepository; @Binds only records that it should be supplied when UserRepository is asked for. It generates less code and cannot get the construction wrong, because it does not do any.",
      },
      {
        id: "b",
        body: "When you need to configure the object before returning it.",
        correct: false,
        rationale:
          "That is the case for @Provides. @Binds has no body — it cannot call a builder, read config, or make decisions.",
      },
      {
        id: "c",
        body: "When the binding must be a singleton.",
        correct: false,
        rationale:
          "Both take scope annotations. Scope and binding style are independent choices.",
      },
      {
        id: "d",
        body: "When the type comes from a third-party library.",
        correct: false,
        rationale:
          "That is usually the opposite — you cannot add @Inject to someone else's constructor, so you need @Provides to build it yourself.",
      },
    ],
    solution: {
      mentalModel:
        "@Binds says 'when someone asks for A, give them B' and nothing else. @Provides says 'here is how to build one'. If you are writing a body, you needed @Provides; if the body is just a constructor call, you wanted @Binds.",
      whyItWorks: [
        "@Binds is abstract, so Dagger resolves it at compile time without generating a factory that calls your code.",
        "Third-party types — OkHttpClient, Retrofit, Room databases — must go through @Provides because you cannot annotate their constructors.",
      ],
      commonMistakes: [
        "Writing @Provides fun provide(impl: RealUserRepository): UserRepository = impl, which works but generates a pointless factory for what is a rename.",
        "Putting @Binds in a non-abstract module, which will not compile and produces a confusing message.",
      ],
      followUps: [
        "In your codebase, how many @Provides functions are really just returning their parameter?",
      ],
    },
  },

  {
    id: "di07",
    slug: "missing-binding-error",
    title: "Read the Missing Binding",
    description:
      "A wall of generated-code errors. The answer is in the first two lines.",
    difficulty: "Medium",
    format: "debugging",
    track: "Architecture",
    topics: ["dagger", "di"],
    stage: "predict",
    ownership: "improve",
    concepts: ["object-graph", "dagger-scopes"],
    estimatedMinutes: 15,
    introducedInWeek: 11,
    symptom:
      "The build fails. The output is forty lines of generated file paths, beginning with:\n\nerror: [Dagger/MissingBinding] AnalyticsClient cannot be provided without an @Inject constructor or an @Provides-annotated method.\n    CheckoutViewModel(analytics, repository)\n    ^",
    brokenCode: `// A third-party client — not ours, no annotations we can add.
class AnalyticsClient(private val apiKey: String)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val analytics: AnalyticsClient,
    private val repository: CartRepository,
) : ViewModel()

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    abstract fun bindCartRepository(impl: RealCartRepository): CartRepository
}`,
    debugHints: [
      {
        label: "Read the first line, not the stack",
        body: "Dagger names the exact type it could not build and the chain that asked for it. The generated paths beneath are noise.",
      },
      {
        label: "Ask what Dagger knows",
        body: "It can build anything with an @Inject constructor, or anything a module provides. AnalyticsClient is neither.",
      },
      {
        label: "Notice why @Binds cannot help",
        body: "AnalyticsClient needs an apiKey. Something has to actually construct it and decide where that string comes from.",
      },
    ],
    rootCause:
      "Dagger has no way to build AnalyticsClient. It is a third-party class, so it has no @Inject constructor, and no module provides one. @Binds cannot fill the gap because the object genuinely needs constructing with an apiKey — a binding has to exist that does the work.",
    fixedCode: `@Module
@InstallIn(SingletonComponent::class)
object AnalyticsModule {

    // @Provides, not @Binds: something has to construct this and decide
    // where the key comes from. A binding cannot make that decision.
    @Provides
    @Singleton
    fun provideAnalyticsClient(): AnalyticsClient =
        AnalyticsClient(apiKey = BuildConfig.ANALYTICS_KEY)
}`,
    productionImplications: [
      "Missing bindings fail the build rather than the app, which is the argument for compile-time DI: this class of mistake never reaches a device.",
      "The same error appears when a binding exists but in a component with the wrong lifetime, so read which component the error names as well as which type.",
    ],
    solution: {
      mentalModel:
        "A MissingBinding error is Dagger saying 'somebody asked me for a T and I was never told how to make one'. Read the type, read the chain that requested it, and ignore the generated paths entirely.",
      whyItWorks: [
        "Every dependency must be reachable either from an @Inject constructor or from a module in the right component.",
        "Third-party types always need @Provides, because you cannot annotate code you do not own.",
      ],
      commonMistakes: [
        "Scrolling to the bottom of the error, where the generated file paths are, instead of reading the top.",
        "Adding the module but forgetting @InstallIn, so it exists and is never consulted.",
        "Providing it in a narrower component than the thing that needs it.",
      ],
      followUps: [
        "Why is a compile-time failure here preferable to a runtime crash on the checkout screen?",
      ],
    },
  },

  {
    id: "di08",
    slug: "write-a-hilt-module",
    title: "Wire a Real Module",
    description:
      "An interface binding, a configured third-party client, and the right scope on each.",
    difficulty: "Medium",
    format: "coding",
    track: "Architecture",
    topics: ["dagger", "di", "networking"],
    stage: "implement",
    ownership: "implement",
    concepts: ["dagger-scopes", "object-graph", "constructor-injection"],
    estimatedMinutes: 25,
    introducedInWeek: 11,
    prompt:
      "Write the Hilt wiring for a feature that needs a shared OkHttpClient with an auth interceptor, a Retrofit-created UserApi, and UserRepository backed by RealUserRepository. Choose @Binds or @Provides for each, and justify every scope you apply.",
    requirements: [
      "One OkHttpClient shared across the app, not one per call site",
      "UserApi created from Retrofit and available for injection",
      "UserRepository satisfied by RealUserRepository, which has an @Inject constructor",
      "Every @Singleton you write should be defensible — do not scope by reflex",
    ],
    solutionCode: `@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // Scoped: OkHttp owns a connection pool and a thread pool. Two of
    // these is two pools, which is the actual reason to share it — not
    // a vague sense that construction is expensive.
    @Provides
    @Singleton
    fun provideOkHttp(tokenStore: TokenStore): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenStore))
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .client(client)
            .baseUrl(BuildConfig.API_URL)
            .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
            .build()

    // Unscoped deliberately: this is a stateless interface proxy, and a
    // new one costs nothing. Scope is for sharing state or expensive
    // resources, and this is neither.
    @Provides
    fun provideUserApi(retrofit: Retrofit): UserApi =
        retrofit.create(UserApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    // @Binds: RealUserRepository already has an @Inject constructor, so
    // there is nothing to construct — only a type to satisfy.
    @Binds
    @Singleton
    abstract fun bindUserRepository(impl: RealUserRepository): UserRepository
}`,
    solution: {
      mentalModel:
        "Two questions per binding. Does something have to construct it, or does Dagger already know how — that picks @Provides or @Binds. Does it hold state or an expensive resource that should be shared — that decides the scope.",
      whyItWorks: [
        "OkHttpClient is scoped because it owns pools; that is a concrete, statable reason rather than a habit.",
        "The Retrofit-created API is unscoped because it is a stateless proxy over the shared client.",
        "The repository is scoped because it is the thing likely to hold caches and in-flight state that two screens should agree on.",
      ],
      commonMistakes: [
        "@Singleton on everything, which turns per-feature state into global state and hides lifetime bugs until something shares what it should not.",
        "Creating a second OkHttpClient somewhere else, quietly doubling the connection pools.",
        "Using @Provides where the body is only 'return impl'.",
      ],
      alternatives: [
        {
          title: "Constructor injection without modules",
          body: "Classes you own and that need no configuration need no module at all — @Inject on the constructor is enough. Modules exist for types you cannot annotate and for decisions that need a body. A module full of trivial provides is a sign the graph could be simpler.",
        },
      ],
      followUps: [
        "For each @Singleton in your own app, can you state what is shared and why it would be wrong to have two?",
      ],
    },
  },

  {
    id: "di09",
    slug: "review-scope-in-a-pr",
    title: "Review: A Cache Injected Everywhere",
    description:
      "The PR compiles, tests pass, and it introduces a bug that only appears with two users.",
    difficulty: "Hard",
    format: "code-review",
    track: "Architecture",
    topics: ["dagger", "di"],
    stage: "reason",
    ownership: "improve",
    concepts: ["dagger-scopes", "single-source-of-truth"],
    estimatedMinutes: 22,
    introducedInWeek: 11,
    review: {
      prTitle: "Add an in-memory profile cache",
      author: "a teammate",
      description: [
        "Profile lookups were hitting the network on every screen.",
        "Added a small in-memory cache, scoped as a singleton so every screen shares it.",
        "Measured: profile screen opens are noticeably faster on a warm cache.",
      ],
      filesChanged: ["di/CacheModule.kt", "data/ProfileCache.kt"],
      context: [
        "The app supports account switching — a user can sign out and a different account can sign in without the process restarting.",
        "Sign-out currently clears the token store and navigates to the login screen.",
      ],
    },
    reviewCode: `@Singleton
class ProfileCache @Inject constructor() {

    private val byId = mutableMapOf<String, Profile>()

    fun get(id: String): Profile? = byId[id]

    fun put(profile: Profile) {
        byId[profile.id] = profile
    }
}

@Module
@InstallIn(SingletonComponent::class)
object CacheModule {

    @Provides
    @Singleton
    fun provideProfileCache(): ProfileCache = ProfileCache()
}`,
    reviewFindings: [
      {
        id: "f1",
        line: 1,
        severity: "blocking",
        summary: "Process-scoped cache is never cleared on sign-out",
        detail:
          "The context says accounts can be switched without a process restart. This cache lives for the whole process, so profiles fetched by the previous account remain readable by the next one. That is a data-leak between users, and it will not reproduce in any test that signs in once.",
        keywords: ["sign-out", "account switch", "clear", "leak", "previous user"],
      },
      {
        id: "f2",
        line: 4,
        severity: "blocking",
        summary: "Unsynchronised mutable map shared across threads",
        detail:
          "A singleton reachable from every screen will be written from whatever dispatcher each caller happens to be on. A plain mutableMapOf offers no thread-safety guarantee, so concurrent writes can corrupt it or throw. Scoping controls how many exist, never what happens when several threads touch one.",
        keywords: ["thread", "concurrent", "synchron", "ConcurrentHashMap"],
      },
      {
        id: "f3",
        line: 8,
        throughLine: 10,
        severity: "should-fix",
        summary: "Unbounded cache with no eviction",
        detail:
          "Nothing removes entries. On a long session that browses many profiles this grows without limit. A bounded structure with an eviction policy turns an unbounded memory commitment into a stated one.",
        keywords: ["unbounded", "evict", "LRU", "size", "memory"],
      },
      {
        id: "f4",
        line: 19,
        severity: "should-fix",
        summary: "Redundant @Provides alongside an @Inject constructor",
        detail:
          "ProfileCache already has an @Inject constructor, so this module function adds a second way to build the same thing and generates a factory for a plain constructor call. Delete the module, or keep it and drop the constructor annotation — but not both.",
        keywords: ["@Provides", "@Inject constructor", "redundant", "@Binds"],
      },
      {
        id: "f5",
        line: 6,
        throughLine: 10,
        severity: "praise",
        summary: "Cache interface is minimal",
        detail:
          "get and put, nothing else. A cache that exposes only what callers need is far easier to make correct later — which matters, because the fixes above all change the internals.",
        keywords: ["small", "minimal", "surface"],
      },
    ],
    reviewVerdict: {
      decision: "request-changes",
      rationale:
        "The performance goal is sound and the shape is nearly right, but a process-scoped cache surviving account switches serves one user's data to another. That is not a refinement to follow up — it has to change before this merges. The thread-safety issue is in the same category.",
    },
    solution: {
      mentalModel:
        "A scope is a lifetime, so the review question for any scoped mutable state is: what events happen inside that lifetime that ought to reset it? For a process-scoped cache in an app with account switching, sign-out is exactly such an event.",
      whyItWorks: [
        "Tying cache lifetime to session rather than process makes the bug structurally impossible instead of remembered.",
        "Concurrency and eviction are properties of shared mutable state, and scoping something is what makes it shared.",
      ],
      commonMistakes: [
        "Reviewing only the diff. The bug here is only visible once you read the context about account switching — nothing in the changed lines is wrong on its own.",
        "Treating 'tests pass' as evidence, when no test signs in twice.",
      ],
      followUps: [
        "What else in your app is process-scoped and holds user data? What clears it?",
      ],
    },
  },

  {
    id: "di10",
    slug: "what-dagger-generates",
    title: "What Is Actually Generated",
    description:
      "Compile-time DI is a trade. Say what you get and what it costs.",
    difficulty: "Hard",
    format: "quiz",
    track: "Architecture",
    topics: ["dagger", "di"],
    stage: "reason",
    concepts: ["object-graph", "dagger-scopes"],
    estimatedMinutes: 10,
    introducedInWeek: 11,
    quizStem:
      "Dagger resolves the dependency graph at compile time rather than at runtime. What is the strongest statement of what that buys — and what it costs?",
    choices: [
      {
        id: "a",
        body: "An unsatisfiable dependency fails the build instead of the app, and lookup is ordinary generated code rather than reflection — paid for with build time and an indirection you have to read generated code to follow.",
        correct: true,
        rationale:
          "Both halves are honest. The correctness win is real and the cost is real: annotation processing slows builds, and debugging means reading generated factories. Anyone who can only state the benefit has not used it on a large codebase.",
      },
      {
        id: "b",
        body: "It makes the app start faster because nothing is reflective.",
        correct: false,
        rationale:
          "True but minor, and not the point. Startup differences are small next to the fact that a whole class of wiring bug cannot reach a device.",
      },
      {
        id: "c",
        body: "It removes the need to think about object lifetimes.",
        correct: false,
        rationale:
          "The opposite. It makes you state lifetimes explicitly as scopes, and a wrong one is still a leak — the framework just makes the claim visible.",
      },
      {
        id: "d",
        body: "It is type-safe, unlike service-locator approaches which can only fail at runtime.",
        correct: false,
        rationale:
          "Directionally right and too narrow: it omits the cost entirely, and a trade-off answer that names no trade-off is a half answer.",
      },
    ],
    solution: {
      mentalModel:
        "Dagger moves wiring errors from runtime to compile time. That is the whole product. Every cost it carries — build time, generated code, a learning curve — is the price of that move, and whether it is worth paying depends on how large the graph is.",
      whyItWorks: [
        "Generated factories are ordinary Kotlin you can read and step through, which is how you debug a graph you did not write.",
        "Scopes make lifetime claims explicit and checkable rather than conventional.",
      ],
      commonMistakes: [
        "Presenting compile-time DI as free. On a large multi-module build, annotation processing is a genuine cost teams actively manage.",
        "Treating the framework as the thing that 'does' dependency injection, rather than as bookkeeping over constructors you already wrote.",
      ],
      followUps: [
        "For an app of five screens, would you use Hilt, manual construction, or something in between — and what decides it?",
      ],
    },
  },
];
