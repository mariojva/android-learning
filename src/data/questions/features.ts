import type { Question, SystemDesignStage } from "@/lib/types";

/* ------------------------------------------------------------------
   Feature assignments.

   The brief is a ticket, written the way tickets actually arrive:
   short, confident, and missing most of what you need to build it.
   There are no steps to follow. Every stage asks for a decision and
   then shows what a considered answer looks like — not the answer,
   because most of these have several defensible ones.

   The stage order is the order the work happens in, and it starts
   before any code: what you did not know, and what you would ask.
   ------------------------------------------------------------------ */

const STAGE_TITLES = [
  "What you do not know yet",
  "Define done",
  "Data model",
  "Where state lives",
  "The data layer",
  "Concurrency and ordering",
  "When it fails",
  "What deserves a test",
  "How you would know in production",
  "Shipping it",
] as const;

function stage(
  id: string,
  title: (typeof STAGE_TITLES)[number],
  prompt: string,
  reference: string[],
  signals?: string[],
): SystemDesignStage {
  return { id, title, prompt, reference, signals };
}

export const FEATURE_QUESTIONS: Question[] = [
  /* ---------------------------------------------------------------- */
  {
    id: "fa01",
    slug: "feature-bookmarks",
    title: "Add Favourites",
    description:
      "Three words of requirement. Everything that matters is a decision you have to make.",
    difficulty: "Medium",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "repositories", "room"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "feature-ownership", "repository", "room"],
    estimatedMinutes: 55,
    introducedInWeek: 12,
    designBrief:
      "The ticket, in full: \"Add favourites. Users should be able to favourite an item and see their favourites.\" It is assigned to you, the reporter is on holiday, and the product manager is in meetings until Thursday. Start.",
    designStages: [
      stage(
        "fa01-s1",
        "What you do not know yet",
        "Before any code: list the questions whose answers change the design. Rank them — which one, answered differently, would cause the most rework?",
        [
          "Does a favourite belong to the account or the install? That single answer decides whether this needs a server at all, and it is the most expensive one to get wrong.",
          "Does it work offline, and what happens to a favourite made on a plane? This decides whether the local store is a cache or the source of truth.",
          "Is there a limit, and what happens at it? Silent failure at a cap is a support ticket nobody can reproduce.",
          "Who else displays favourite state — a list, a detail screen, a widget? That decides whether one screen owning it is viable.",
        ],
        [
          "Ranking the questions rather than listing them",
          "Noticing that account-versus-device is the load-bearing one",
          "Asking what already exists before designing anything new",
        ],
      ),
      stage(
        "fa01-s2",
        "Define done",
        "Write the acceptance criteria you would put on the ticket. Include at least one about behaviour under failure.",
        [
          "Tapping favourite updates the icon immediately, before any network call completes.",
          "Favourites survive app restart, and survive sign-out and sign-in on the same account.",
          "A favourite made offline appears immediately and reaches the server once connectivity returns.",
          "If the server rejects it, the icon returns to its previous state and the user is told once — not on every retry.",
        ],
        ["Criteria that are observable", "A stated failure behaviour", "No implementation detail"],
      ),
      stage(
        "fa01-s3",
        "Data model",
        "What does a favourite look like on the wire, on disk, and in the domain? Justify any model you would not have.",
        [
          "On disk, the minimum is (itemId, favouritedAt) keyed by item, plus a flag for whether the server has accepted it yet.",
          "A domain model probably is not needed: 'is this favourited' is a boolean attached to an item that already has a model.",
          "The pending flag is the design decision — without it you cannot tell an accepted favourite from one still queued, and offline needs that distinction.",
        ],
        ["Deleting a model rather than adding one", "Recognising the pending state as data"],
      ),
      stage(
        "fa01-s4",
        "Where state lives",
        "A list and a detail screen both show favourite state. Where does the truth live, and how does each screen stay correct?",
        [
          "One owner: the local database. Both screens observe it, so a change on one is a change on both without either knowing about the other.",
          "Screen-level state would immediately produce the classic bug — favourite on detail, go back, the list still shows it unfavourited.",
          "The ViewModel maps the observed data to UI state; it does not own the favourite.",
        ],
        ["Naming the stale-list bug before it is described", "One owner, many observers"],
      ),
      stage(
        "fa01-s5",
        "The data layer",
        "Sketch the repository. What does it expose, and what does it deliberately hide?",
        [
          "Exposes questions and commands: observeFavourites(), isFavourite(id), toggle(id). Not 'the dao' and not 'the api'.",
          "Hides whether the answer came from disk or network, and hides the retry of a pending write entirely.",
          "The write goes to the database first and to the server after, because the database is what the UI observes.",
        ],
        ["A narrow surface", "Local write before remote", "No leaking of Dao or Retrofit types"],
      ),
      stage(
        "fa01-s6",
        "Concurrency and ordering",
        "A user taps favourite four times quickly, on a slow network. What must be true when the dust settles?",
        [
          "Final state matches the final tap, regardless of the order responses arrive in. That is the actual requirement.",
          "Collapse rather than queue: the intent is a desired end state, not four events, so the fourth tap should supersede the first three.",
          "Requests for the same item must not be allowed to overtake each other and land out of order.",
        ],
        ["Framing it as a desired end state", "Noticing out-of-order responses", "Not sending four writes"],
      ),
      stage(
        "fa01-s7",
        "When it fails",
        "The write is rejected: offline, a 500, and a 401. Should all three behave the same? Decide and defend it.",
        [
          "No. Offline is not a failure — it is a delay, and the favourite should stand and sync later.",
          "A 500 is retryable with backoff; the user need not be told unless it keeps failing.",
          "A 401 is terminal for this write: no retry will fix it, so revert the icon and route into re-authentication.",
          "The rule underneath: retry what might succeed, revert what cannot, and only interrupt the user for the latter.",
        ],
        ["Treating the three differently", "Offline as a delay", "Only interrupting when action is needed"],
      ),
      stage(
        "fa01-s8",
        "What deserves a test",
        "You have limited time. Which three tests would you write first, and what does each protect?",
        [
          "Toggle writes locally and emits immediately — protects the whole optimistic premise.",
          "A rejected write reverts the local state — protects the user from a favourite that silently is not one.",
          "Rapid toggles settle on the final intent — protects the ordering logic, which is the part most likely to break under a later refactor.",
          "Not worth writing: that the DAO inserts a row. That tests Room.",
        ],
        ["Tests chosen by risk", "Naming something not worth testing"],
      ),
      stage(
        "fa01-s9",
        "How you would know in production",
        "It ships and something is wrong for 2% of users. What did you put in place to find out?",
        [
          "A counter of writes that ended terminally failed, by reason — the single most useful number here.",
          "A gauge of pending writes older than some threshold, which is what a broken sync looks like from outside.",
          "Not the favourite contents, and not user ids in logs.",
        ],
        ["Metrics that would show silent failure", "Knowing what must not be logged"],
      ),
      stage(
        "fa01-s10",
        "Shipping it",
        "Sequence the work so something useful merges early, and say what you would put behind a flag.",
        [
          "Local-only favourites first: database, repository, UI. That is shippable, useful, and testable on its own.",
          "Server sync second, behind a flag, so the risky half can be disabled without reverting the useful half.",
          "The migration is the irreversible part — get the schema right before anything ships, because changing it later means migrating real user data.",
        ],
        ["A first slice that is genuinely useful", "Isolating the risky part", "Spotting the irreversible step"],
      ),
    ],
    solution: {
      mentalModel:
        "The engineering starts before the code. A three-word ticket has perhaps a dozen embedded decisions, and the job of a mid-level engineer is to surface them, decide the ones they can, and ask about the ones they cannot — rather than picking silently and finding out in review.",
      whyItWorks: [
        "Local-first with a pending flag gives an instant UI and a correct offline story from one mechanism.",
        "A single owner for the state removes a whole family of stale-screen bugs by construction.",
      ],
      commonMistakes: [
        "Starting at the database schema, which locks in answers to questions nobody asked.",
        "Treating offline, 500 and 401 identically — usually as a toast that says 'Something went wrong'.",
        "Shipping all of it at once, so a sync bug forces reverting the whole feature.",
      ],
      followUps: [
        "Which of your questions could you have answered yourself from the existing codebase rather than waiting for Thursday?",
      ],
    },
  },

  /* ---------------------------------------------------------------- */
  {
    id: "fa02",
    slug: "feature-search",
    title: "Add Search",
    description:
      "Typing, cancelling, and the request that comes back after the one you wanted.",
    difficulty: "Hard",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "flow", "networking"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "flow-operators", "cancellation", "ui-state"],
    estimatedMinutes: 55,
    introducedInWeek: 12,
    designBrief:
      "\"Add search to the catalogue screen. It should feel fast.\" The endpoint exists and takes a query string. Nothing else has been decided.",
    designStages: [
      stage(
        "fa02-s1",
        "What you do not know yet",
        "What would you need to know before choosing an approach? Name the one that most changes the design.",
        [
          "How large is the catalogue, and is it already on the device? Local search and remote search are different features wearing the same word.",
          "Should results update as they type, or on submit? That decides whether stale-request handling is a core concern or not a concern at all.",
          "What is a result — the same item model the list uses, or something with match highlighting?",
          "Is there history, and does it persist? A stored history is a second feature hiding in this one.",
        ],
        ["Local versus remote as the load-bearing question", "Spotting history as separate scope"],
      ),
      stage(
        "fa02-s2",
        "Define done",
        "Write acceptance criteria. Include what happens between keystrokes, and what happens when nothing matches.",
        [
          "Results reflect the current query, never a previous one, no matter what order responses arrive in.",
          "There is a visible difference between 'searching', 'no results for this query' and 'something went wrong'.",
          "An empty query shows the unfiltered list rather than an empty state.",
          "Typing fast does not produce one request per character.",
        ],
        ["Distinguishing empty from error", "Naming the stale-result rule as acceptance"],
      ),
      stage(
        "fa02-s3",
        "Data model",
        "What does the UI state for this screen look like? Write it as a type.",
        [
          "One value describing the whole screen: the current query, plus a result state that is one of idle, searching, results, empty, failed.",
          "Query and result state are separate fields — the text must not be lost when a search fails, or the user cannot edit and retry.",
          "Results are already in display shape, so no formatting happens while drawing.",
        ],
        ["A single state value", "Query kept separate from results", "Empty modelled explicitly"],
      ),
      stage(
        "fa02-s4",
        "Where state lives",
        "Where does the query text live, and what happens to results across a rotation?",
        [
          "The query lives in the ViewModel, so a rotation does not clear what was typed.",
          "SavedStateHandle for the query if surviving process death matters — it is small, and retyping is the most annoying possible loss.",
          "Results need not survive: re-running the search is cheap and guarantees freshness.",
        ],
        ["Separating rotation from process death", "Deciding not to persist results, with a reason"],
      ),
      stage(
        "fa02-s5",
        "The data layer",
        "What does the repository expose for search, and what does it not do?",
        [
          "A suspend function taking a query and returning results — search is a request/response, not a stream.",
          "It does not debounce and does not cancel: those are presentation concerns about typing, and belong where the typing is.",
          "It does translate transport failure into something the UI can act on.",
        ],
        ["Keeping debounce out of the data layer", "Error translation at the boundary"],
      ),
      stage(
        "fa02-s6",
        "Concurrency and ordering",
        "The user types 'kotl', then 'kotlin'. The response for 'kotl' arrives second. What must happen, and what makes it happen?",
        [
          "The 'kotl' response must be discarded. Showing it would display results for a query no longer on screen — the defining bug of search.",
          "A new query must cancel the in-flight one rather than race it, which is exactly what flatMapLatest does on a query stream.",
          "Debounce before it, so a fast typist produces one request rather than six — a cost and latency measure, not a correctness one.",
          "Correctness comes from the cancellation; debounce only reduces volume.",
        ],
        ["Separating debounce from cancellation", "Naming why the old response is dangerous"],
      ),
      stage(
        "fa02-s7",
        "When it fails",
        "Timeout, 500, and no connectivity — while the user is mid-word. Design the behaviour.",
        [
          "Never clear the text, and never clear the previous results without saying why — an input that empties itself is infuriating.",
          "Offer retry for the current query rather than silently retrying, because the user may have moved on.",
          "Offline is worth stating distinctly: 'no connection' is actionable, 'something went wrong' is not.",
        ],
        ["Preserving user input", "Distinguishing offline from failure"],
      ),
      stage(
        "fa02-s8",
        "What deserves a test",
        "Name three tests and what each protects.",
        [
          "Out-of-order responses: the late result for an old query must not win. Protects the core correctness property.",
          "Rapid typing produces one request, not one per character. Protects the debounce.",
          "Failure preserves the query text. Protects the thing users notice most.",
          "Use a virtual clock rather than real delays, or these tests will be slow and flaky.",
        ],
        ["Testing ordering deliberately", "Knowing to control time in the test"],
      ),
      stage(
        "fa02-s9",
        "How you would know in production",
        "Search is quietly returning nothing for a subset of queries. What tells you?",
        [
          "The rate of searches ending in the empty state — a jump is the signal, and no crash will ever fire.",
          "Latency at the 95th percentile, since search that is slow is search that is broken.",
          "Never log query text: it is user content and frequently personal.",
        ],
        ["Monitoring an outcome, not an error", "Refusing to log queries"],
      ),
      stage(
        "fa02-s10",
        "Shipping it",
        "What ships first, and what would you flag?",
        [
          "Submit-on-enter first if the catalogue is remote: it is most of the value with none of the ordering complexity.",
          "As-you-type second, behind a flag, because it is the part that multiplies request volume.",
          "Watch the request-rate metric on rollout — this is the feature most likely to surprise the backend team.",
        ],
        ["A first slice that avoids the hard part", "Anticipating load on someone else's service"],
      ),
    ],
    solution: {
      mentalModel:
        "Search is a stream problem wearing a text field. The single property that matters is that what is on screen corresponds to what is in the box; everything else — debounce, caching, history — is optimisation around that.",
      whyItWorks: [
        "Cancellation gives correctness; debounce gives economy. Conflating them is why people debounce and still show stale results.",
        "Modelling empty and failed as distinct states removes the most common search UI bug.",
      ],
      commonMistakes: [
        "Debouncing and assuming that solved ordering. A slow response still overtakes a fast one.",
        "Clearing the text field on error.",
        "Logging query strings for debugging.",
      ],
      followUps: [
        "If the catalogue were fully local, which stages above would disappear entirely?",
      ],
    },
  },

  /* ---------------------------------------------------------------- */
  {
    id: "fa03",
    slug: "feature-paginated-feed",
    title: "Add a Paginated Feed",
    description:
      "Pages, duplicates, retries and a scroll position that must not jump.",
    difficulty: "Hard",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "networking", "compose"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "repository", "ui-state", "compose-stability"],
    estimatedMinutes: 55,
    introducedInWeek: 12,
    designBrief:
      "\"Show the activity feed. It needs to page — there can be thousands of items.\" The endpoint accepts a cursor and returns items plus a next cursor. Design the feature.",
    designStages: [
      stage(
        "fa03-s1",
        "What you do not know yet",
        "What must you find out before designing? Which answer would most change the shape?",
        [
          "Is the feed stable or live? A feed where items are inserted at the top while you scroll is a much harder problem than an append-only archive.",
          "Does it need to work offline, or survive a restart mid-scroll?",
          "Can the same item appear in two pages? With a cursor over changing data, usually yes — and that decides whether de-duplication is required.",
          "What is the refresh gesture meant to do: fetch newer, or start over?",
        ],
        ["Asking whether the underlying data changes", "Spotting duplicates as a consequence of paging live data"],
      ),
      stage(
        "fa03-s2",
        "Define done",
        "Acceptance criteria, including scroll behaviour and what the bottom of the list looks like in each state.",
        [
          "Scrolling near the end loads more without the user asking, and without jumping the scroll position.",
          "The footer distinguishes loading, failed-with-retry, and end-of-feed. All three are different and all three occur.",
          "A failed page load does not discard the pages already shown.",
          "Refresh replaces the feed without leaving the user somewhere unexpected.",
        ],
        ["Three distinct footer states", "Preserving loaded pages on failure"],
      ),
      stage(
        "fa03-s3",
        "Data model",
        "Model the paging state. What do you track besides the items?",
        [
          "Items, the next cursor, and an append state that is one of idle, loading, failed or end-reached.",
          "The append state must be separate from the initial load state — a failure appending page four is not an empty screen.",
          "Item identity matters: a stable id per item is required, both for de-duplication and for list keys.",
        ],
        ["Separating initial and append states", "Recognising id as load-bearing"],
      ),
      stage(
        "fa03-s4",
        "Where state lives",
        "Who owns the accumulated pages, and what happens on rotation?",
        [
          "The ViewModel owns them, so rotation does not refetch and the user does not lose their place.",
          "Scroll position belongs to the list state, saved so it is restored with the items.",
          "After process death, restoring thirty pages is usually wrong — reload the first page and accept it.",
        ],
        ["Deciding what not to restore", "Keeping scroll position with the data"],
      ),
      stage(
        "fa03-s5",
        "The data layer",
        "What does the repository expose, and where does accumulation happen?",
        [
          "A function taking a cursor and returning one page plus the next cursor. It returns a page, not the world.",
          "Accumulation belongs above it, in the ViewModel, unless pages are persisted — then the database accumulates and the repository observes it.",
          "De-duplication belongs wherever accumulation does, because that is where the collision is visible.",
        ],
        ["A stateless page fetch", "Putting de-duplication with accumulation"],
      ),
      stage(
        "fa03-s6",
        "Concurrency and ordering",
        "The user flings to the bottom and the trigger fires three times before the first response lands. What must be true?",
        [
          "One request in flight per cursor. The second and third triggers must be ignored, not queued.",
          "Without that guard you fetch the same page repeatedly and append duplicates — the most common paging bug there is.",
          "A failed append must reset the guard, or the list silently stops loading forever.",
        ],
        ["Guarding the trigger", "Remembering to reset the guard on failure"],
      ),
      stage(
        "fa03-s7",
        "When it fails",
        "Page one fails; page five fails. Should they look the same?",
        [
          "No. Page one failing is an empty screen and deserves a full-screen error with retry.",
          "Page five failing is a footer with a retry affordance — the user has content and should keep it.",
          "Auto-retry once for a transient failure; after that let the user decide, because silent repeated retries burn battery and data.",
        ],
        ["Different treatment by position", "Bounded automatic retry"],
      ),
      stage(
        "fa03-s8",
        "What deserves a test",
        "Three tests, and what each protects.",
        [
          "Repeated triggers produce exactly one request — protects against duplicate pages.",
          "An item appearing in two pages appears once in the list — protects de-duplication.",
          "A failed append leaves existing items intact and the footer retryable — protects the thing users hit most.",
        ],
        ["Testing the guard", "Testing de-duplication explicitly"],
      ),
      stage(
        "fa03-s9",
        "How you would know in production",
        "Paging is subtly broken for some users. What surfaces it?",
        [
          "Rate of append failures, and how often sessions stop paging after one — that is the silent stuck state.",
          "Distribution of pages loaded per session: a cliff at one or two suggests the trigger is not firing.",
          "Frame timing on the feed, since a list that janks while paging reads as 'the app is slow'.",
        ],
        ["Monitoring the stuck state", "Looking at a distribution rather than an average"],
      ),
      stage(
        "fa03-s10",
        "Shipping it",
        "Sequence it, and name the performance trap you would watch for.",
        [
          "First page only, with the full error and empty states. That is shippable and exercises most of the plumbing.",
          "Append second; refresh third.",
          "The trap is list keys and stability: without stable keys the whole list recomposes on every append, and it will be blamed on paging rather than on Compose.",
        ],
        ["Shipping a single page first", "Naming keys and stability as the performance risk"],
      ),
    ],
    solution: {
      mentalModel:
        "Paging is accumulation plus a guard. Most paging bugs are one of three things: no guard on the trigger, no de-duplication, or the append state conflated with the initial load state.",
      whyItWorks: [
        "A stateless page fetch keeps the repository simple and puts accumulation where the collision is visible.",
        "Separating append state from initial state makes the three footer states expressible.",
      ],
      commonMistakes: [
        "Triggering on scroll position without a guard, then filtering duplicates as a workaround.",
        "Treating a failed page five as an empty screen.",
        "Using list index as key, which breaks as soon as items shift.",
      ],
      followUps: [
        "How would this change if new items could be inserted at the top while the user is on page four?",
      ],
    },
  },

  /* ---------------------------------------------------------------- */
  {
    id: "fa04",
    slug: "feature-optimistic-likes",
    title: "Make Likes Instant",
    description:
      "Update before the server agrees, and be correct when it does not.",
    difficulty: "Hard",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "coroutines", "repositories"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "single-source-of-truth", "cancellation", "idempotency"],
    estimatedMinutes: 50,
    introducedInWeek: 12,
    designBrief:
      "\"Likes feel laggy — there's a spinner before the heart fills. Make it instant.\" The endpoint is a POST that returns the new like count. Design it.",
    designStages: [
      stage(
        "fa04-s1",
        "What you do not know yet",
        "What do you need to establish before changing anything?",
        [
          "Is the endpoint idempotent? Whether a repeated like is safe decides how freely you may retry.",
          "Is the like count authoritative from the server, or can the client derive it? Optimistically changing a count you do not own is how numbers drift.",
          "Where else does like state appear — a detail screen, a profile, a notification?",
          "What currently causes the lag: the network, or a refetch of the whole list after the write?",
        ],
        ["Asking about idempotency early", "Checking whether the lag is even the network"],
      ),
      stage(
        "fa04-s2",
        "Define done",
        "Acceptance criteria. Be explicit about what the user sees when the server disagrees.",
        [
          "The heart fills on tap, with no spinner and no wait.",
          "If the write fails terminally, the heart reverts and the user is told once.",
          "The displayed count never goes negative and never drifts from the server's value after a refresh.",
          "Double-tapping rapidly does not produce two likes or a stuck state.",
        ],
        ["Naming the count as a drift risk", "A stated revert behaviour"],
      ),
      stage(
        "fa04-s3",
        "Data model",
        "How do you represent 'liked, but the server has not confirmed'?",
        [
          "The stored item keeps the server's truth; a separate pending layer holds intent that has not landed.",
          "The UI reads server-truth-overlaid-with-pending, so the optimistic value is derived rather than written over the real one.",
          "Writing the optimistic value directly into the item is the trap — you then have nothing to revert to.",
        ],
        ["Keeping truth and intent separate", "Recognising you need something to revert to"],
      ),
      stage(
        "fa04-s4",
        "Where state lives",
        "The same post appears in a feed and on its own screen. How do both stay right?",
        [
          "One owner again — the local store — with both screens observing it, including the pending overlay.",
          "Per-screen optimistic state produces the bug where liking on detail and returning shows an unliked post.",
        ],
        ["One owner", "Naming the cross-screen bug"],
      ),
      stage(
        "fa04-s5",
        "The data layer",
        "What does the repository expose, and who owns the retry?",
        [
          "A command — like(postId) — that records intent locally and returns immediately.",
          "The repository owns retry and reconciliation; the ViewModel should never be orchestrating backoff.",
          "It reconciles by applying the server's returned count, which is the only value allowed to be authoritative.",
        ],
        ["Fire-and-record command", "Retry below the ViewModel"],
      ),
      stage(
        "fa04-s6",
        "Concurrency and ordering",
        "Like, unlike, like — faster than the network. What arrives at the server, and what ends up displayed?",
        [
          "Collapse to the final intent: one request expressing 'liked', not three round trips.",
          "Requests for one post must not overlap, or responses can land out of order and the final state becomes a coin flip.",
          "If the endpoint is not idempotent, a retry after an unacknowledged success can double-count — which is why the idempotency question mattered in stage one.",
        ],
        ["Collapsing rather than queueing", "Connecting back to idempotency"],
      ),
      stage(
        "fa04-s7",
        "When it fails",
        "Design the revert. What does the user see, and when?",
        [
          "Revert only after retries are exhausted, not on the first failure — a flickering heart is worse than a slightly late one.",
          "Tell the user once, quietly, and do not block anything.",
          "Offline is not failure: hold the intent and sync later, same as favourites.",
        ],
        ["Not reverting on the first failure", "Offline held, not reverted"],
      ),
      stage(
        "fa04-s8",
        "What deserves a test",
        "Three tests.",
        [
          "Optimistic update is visible before any network call completes.",
          "A terminal failure reverts to exactly the prior state, including the count.",
          "Rapid toggling produces one request and the correct final state.",
        ],
        ["Testing the revert restores the count too"],
      ),
      stage(
        "fa04-s9",
        "How you would know in production",
        "Optimistic UI hides failure by design. How do you see it?",
        [
          "Rate of optimistic updates that ended reverted — the number that would otherwise be invisible to everyone.",
          "Drift: how often a refresh disagrees with what was displayed.",
          "Crash rate will show nothing here, which is the point.",
        ],
        ["Recognising that this failure mode is silent by construction"],
      ),
      stage(
        "fa04-s10",
        "Shipping it",
        "How would you roll this out?",
        [
          "Behind a flag, since the fallback is the existing working behaviour and the flag is a genuine way back.",
          "Small percentage first, watching the revert rate — a high rate means the optimism is unfounded and users are seeing hearts flip back.",
          "Keep the old path until the revert rate is understood, then delete it rather than leaving both forever.",
        ],
        ["Watching revert rate specifically", "Planning to delete the old path"],
      ),
    ],
    solution: {
      mentalModel:
        "Optimistic UI is a promise you make on the server's behalf. The engineering is entirely in what happens when the promise is broken — and in keeping something to revert to.",
      whyItWorks: [
        "Separating server truth from pending intent makes revert trivial and drift visible.",
        "Collapsing to final intent makes rapid toggling a non-event.",
      ],
      commonMistakes: [
        "Overwriting the stored value optimistically, leaving nothing to revert to.",
        "Reverting on first failure, producing a flickering UI on a flaky network.",
        "Monitoring crashes and concluding the feature is healthy.",
      ],
      followUps: [
        "Which parts of your app already update optimistically without a revert path?",
      ],
    },
  },

  /* ---------------------------------------------------------------- */
  {
    id: "fa05",
    slug: "feature-offline-first-feed",
    title: "Make It Work On a Plane",
    description:
      "The database becomes the truth and the network becomes a detail.",
    difficulty: "Hard",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "offline", "room", "repositories"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "single-source-of-truth", "cache-invalidation", "room", "migrations"],
    estimatedMinutes: 60,
    introducedInWeek: 12,
    designBrief:
      "\"The feed should work offline. Users complain it's a blank screen on the tube.\" The feed currently fetches from the network on every open. Design the change.",
    designStages: [
      stage(
        "fa05-s1",
        "What you do not know yet",
        "What must you establish first?",
        [
          "How stale is acceptable? Offline-first is a staleness policy wearing a database, and nobody has stated the policy.",
          "How much should be kept — the last page, a day, everything? This is a storage commitment on someone else's device.",
          "Can the user act on stale content, and what happens if they act on something since deleted?",
          "Is there anything sensitive in the feed that should not persist to disk?",
        ],
        ["Framing it as a staleness policy", "Asking about sensitive data on disk"],
      ),
      stage(
        "fa05-s2",
        "Define done",
        "Acceptance criteria, including what the user sees on a cold start with no connectivity.",
        [
          "Opening the app shows the last known feed immediately, before any network call.",
          "With no connectivity it stays usable and says so, rather than showing a blank screen or an error.",
          "Refreshing updates in place, without clearing the screen first.",
          "Content the user has never seen is never shown as though it were current.",
        ],
        ["Immediately, before the network", "Not clearing on refresh"],
      ),
      stage(
        "fa05-s3",
        "Data model",
        "What goes in the database, and what must you get right the first time?",
        [
          "Entities for the items, with a stable id and a fetchedAt timestamp — staleness cannot be computed without it.",
          "The schema is the irreversible decision: once it is on user devices, changing it means writing a migration.",
          "Store what the UI needs. A cache that requires three joins to render is a cache that will be slow on cold start.",
        ],
        ["Recording when data was fetched", "Recognising schema as the irreversible part"],
      ),
      stage(
        "fa05-s4",
        "Where state lives",
        "State the ownership rule, and what follows from it.",
        [
          "The database is the single source of truth. The UI observes it and never observes the network.",
          "Refresh becomes a side effect that writes to the database; the UI updates because the database changed, not because a call returned.",
          "This is the whole architectural move — everything else follows from it.",
        ],
        ["Network writes, UI observes", "Recognising this as the central decision"],
      ),
      stage(
        "fa05-s5",
        "The data layer",
        "Sketch the repository and the refresh path.",
        [
          "observeFeed() returns a Flow from the database. refresh() suspends, fetches, maps and writes.",
          "refresh() returns success or failure so the UI can show a refresh error without losing content.",
          "Writes are transactional — a half-written page is worse than a stale one.",
        ],
        ["Separating observe from refresh", "Transactional writes"],
      ),
      stage(
        "fa05-s6",
        "Concurrency and ordering",
        "A pull-to-refresh and an automatic refresh overlap. What do you guarantee?",
        [
          "One refresh at a time — the second joins the first rather than starting a duplicate fetch and a duplicate write.",
          "Writes must not interleave, or the feed can end up partly old and partly new with no ordering.",
          "Reads keep working throughout; observers are never shown an empty database mid-write.",
        ],
        ["Joining rather than duplicating", "No empty state during a write"],
      ),
      stage(
        "fa05-s7",
        "When it fails",
        "Refresh fails while cached content is on screen. Design it.",
        [
          "Keep the content, stop the spinner, and say quietly that it could not update — content plus a stale marker beats an error screen.",
          "Show when it was last updated, so the user can judge for themselves.",
          "Distinguish offline from server failure; only one of them is worth retrying immediately.",
        ],
        ["Content plus a stale marker", "Showing last-updated time"],
      ),
      stage(
        "fa05-s8",
        "What deserves a test",
        "Three tests.",
        [
          "With a populated database and no network, the feed renders — the entire premise of the feature.",
          "A failed refresh leaves cached content intact.",
          "A successful refresh updates observers without an intermediate empty emission, which is the flicker bug.",
        ],
        ["Testing the no-network path directly", "Testing for the intermediate empty state"],
      ),
      stage(
        "fa05-s9",
        "How you would know in production",
        "What would tell you this is working, or quietly failing?",
        [
          "Cache hit rate on cold start — how often the feed renders before the network answers.",
          "Age of content at render time: if the median is days, sync is broken even though nothing errors.",
          "Database size on device, because an unbounded cache becomes a complaint about storage.",
        ],
        ["Measuring content age", "Watching storage growth"],
      ),
      stage(
        "fa05-s10",
        "Shipping it",
        "Sequence it. What is irreversible, and what is risky?",
        [
          "Schema first and carefully — it is the part you cannot change freely once it is on devices.",
          "Write-through next, with the UI still reading from the network, so you can verify writes without user-visible risk.",
          "Flip the UI to observe the database last, behind a flag. That flip is the risky moment and the one worth being able to undo.",
          "Eviction before wide rollout, or storage grows without limit on real devices.",
        ],
        ["Verifying writes before switching reads", "Eviction before rollout"],
      ),
    ],
    solution: {
      mentalModel:
        "Offline-first is one decision — the database is the truth, the network is how it gets updated — and a long tail of consequences. Teams that struggle usually adopted the consequences without making the decision explicit.",
      whyItWorks: [
        "Observing one store means every screen agrees, and a failed refresh degrades instead of breaking.",
        "Write-through-then-flip-reads makes the risky change reversible.",
      ],
      commonMistakes: [
        "Keeping the network as the UI's source and using the database as a fallback, which doubles the code paths and the bugs.",
        "No eviction, so the cache grows until users notice.",
        "Clearing the table before writing a refresh, producing a visible flicker to empty.",
      ],
      followUps: [
        "What is the oldest content your app would show without telling the user how old it is?",
      ],
    },
  },

  /* ---------------------------------------------------------------- */
  {
    id: "fa06",
    slug: "feature-production-ownership",
    title: "\"Users Want Sharing\"",
    description:
      "A one-line request with no design, no scope and no acceptance criteria. Own it.",
    difficulty: "Hard",
    format: "feature",
    track: "Architecture",
    topics: ["ownership", "observability", "codebase"],
    stage: "reason",
    ownership: "own",
    concepts: ["requirement-decomposition", "feature-ownership", "observability", "tracing-a-feature"],
    estimatedMinutes: 65,
    introducedInWeek: 12,
    designBrief:
      "Your product manager says, in a corridor: \"A few users have asked for sharing. Can we get that in this cycle?\" There is no ticket, no design, and no further detail. This is the most realistic brief in the set.",
    designStages: [
      stage(
        "fa06-s1",
        "What you do not know yet",
        "You cannot build this. Write what you would take back, and how you would frame it so it does not read as obstruction.",
        [
          "Share what, to where, and what should the recipient see — a link, a preview, an install prompt? Each is a different feature.",
          "What does success look like: shares sent, or people arriving from them? The second implies attribution work nobody has mentioned.",
          "Bring options with costs rather than a list of questions: a share sheet with a plain link is days; a rich preview with a landing page and attribution is weeks.",
          "'A few users' is worth gently testing — how many, and were they asking for sharing or for something sharing would solve?",
        ],
        ["Options with costs, not a list of blockers", "Questioning the stated demand kindly"],
      ),
      stage(
        "fa06-s2",
        "Define done",
        "Pick the smallest version that delivers real value and write its acceptance criteria.",
        [
          "Smallest useful version: the system share sheet with a working link to the item, for items that are publicly visible.",
          "Opening the link on a device with the app installed lands on that item; without it, a web page or store listing.",
          "Explicitly out of scope, and stated: rich previews, in-app recipient pickers, attribution dashboards.",
          "Writing the out-of-scope list down is the part that prevents the cycle ending in an argument.",
        ],
        ["A stated out-of-scope list", "A slice that is genuinely useful"],
      ),
      stage(
        "fa06-s3",
        "Data model",
        "What does sharing need that does not exist yet?",
        [
          "A canonical URL per shareable item, and a rule for items that are private or deleted.",
          "Nothing needs persisting locally for the minimal version — a good sign the slice is small enough.",
          "If attribution is ever wanted, the link needs a parameter carrying it, and deciding that now is cheap while adding it later is not.",
        ],
        ["Noticing there is no local model needed", "Leaving room for attribution without building it"],
      ),
      stage(
        "fa06-s4",
        "Where state lives",
        "Sharing spans screens and leaves the app entirely. What owns what?",
        [
          "Almost nothing is owned: it is an action, not a state. Resisting the urge to invent state is the correct move.",
          "Link construction belongs in one place, not built ad hoc at each call site.",
          "The inbound side is where state appears — a deep link arriving must be handled from a cold start, which is a lifecycle concern.",
        ],
        ["Recognising it is mostly stateless", "Spotting cold-start deep links as the real work"],
      ),
      stage(
        "fa06-s5",
        "The data layer",
        "What does this need from the layers below, and what would you have to go and find out?",
        [
          "Probably nothing new from the network for the minimal version — which you can only assert after checking.",
          "This is the stage where you trace the existing feature: how items are addressed, whether the web has equivalent pages, how deep links are currently routed.",
          "If deep linking does not exist at all, that is the real scope of the work, and it needs saying before the cycle starts.",
        ],
        ["Tracing before estimating", "Finding the hidden scope"],
      ),
      stage(
        "fa06-s6",
        "Concurrency and ordering",
        "Where does timing bite in a feature with almost no async work?",
        [
          "A deep link arriving during a cold start, before authentication has resolved — route it, hold it, or drop it, and that must be decided.",
          "A link to content the user cannot see: not an error case to forget, a common one.",
          "Two links in quick succession from a notification and a paste — the second should win rather than both racing to navigate.",
        ],
        ["Cold start before auth resolves", "Links to inaccessible content"],
      ),
      stage(
        "fa06-s7",
        "When it fails",
        "Design behaviour for a deleted item, a private item, and an unparseable link.",
        [
          "Deleted: a plain message and a route onward, not a crash and not a blank screen.",
          "Private: do not confirm it exists — a 'this is private' message on a valid id is an information leak.",
          "Unparseable: open the app normally rather than showing an error about a link the user may not have knowingly clicked.",
        ],
        ["Treating private as a disclosure question", "Failing softly on a malformed link"],
      ),
      stage(
        "fa06-s8",
        "What deserves a test",
        "What would you test in a feature that is mostly integration?",
        [
          "Link construction is pure and trivially testable — do that, including the escaping nobody thinks about.",
          "Routing from a link to the right screen, including the cold-start path, which is where it actually breaks.",
          "The inaccessible-content path, because it is the one manual testing always misses.",
          "Do not test the system share sheet; that is the platform's.",
        ],
        ["Testing cold start specifically", "Knowing what belongs to the platform"],
      ),
      stage(
        "fa06-s9",
        "How you would know in production",
        "The PM asked for this. What will you be able to tell them in a month?",
        [
          "Shares initiated, and links opened — the second is the one that answers whether it worked.",
          "Failed inbound routes by reason, which is where a broken link format shows up.",
          "Being able to answer the question you were originally asked is part of owning the feature, not an extra.",
        ],
        ["Measuring the outcome, not the action", "Closing the loop with the requester"],
      ),
      stage(
        "fa06-s10",
        "Shipping it",
        "Sequence it, and say what you would tell the PM at the start of the cycle.",
        [
          "Outbound first: share sheet and link. It is useful even before inbound routing is perfect.",
          "Inbound routing second, behind a flag, because deep link handling can affect cold start for everyone.",
          "Tell the PM the slice, the out-of-scope list, and the one thing that might expand scope — the state of deep linking — before committing to the cycle.",
          "Saying what would make this take longer, early, is what distinguishes owning it from accepting it.",
        ],
        ["Flagging a scope risk before committing", "An honest early conversation"],
      ),
    ],
    solution: {
      mentalModel:
        "Owning a feature means converting an ambiguous request into a stated scope, a sequence and a measurable outcome — then telling the person who asked what they are going to get and what they are not. The code is frequently the easy part.",
      whyItWorks: [
        "A written out-of-scope list is the cheapest protection against a cycle ending in disagreement.",
        "Tracing the existing codebase before estimating is what turns a guess into a commitment you can keep.",
      ],
      commonMistakes: [
        "Starting to build the obvious interpretation, then discovering deep linking does not exist.",
        "Taking back a list of questions rather than options with costs, which reads as obstruction.",
        "Shipping without any measure, so nobody can say whether it worked.",
      ],
      followUps: [
        "Think of an ambiguous request you accepted recently. What did you not ask, and what did it cost?",
      ],
    },
  },
];
