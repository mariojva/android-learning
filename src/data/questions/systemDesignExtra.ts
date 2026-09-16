import type { Question, SystemDesignStage } from "@/lib/types";

/* ------------------------------------------------------------------
   Four more design workbooks, completing the nine named in the
   original curriculum.

   Each was chosen because its central pressure is different from the
   others: Maps is latency and location, YouTube is memory and media
   lifetime, Reddit is a recursive data structure with optimistic
   writes, and the banking dashboard is the one where caching
   aggressively is the wrong answer.
   ------------------------------------------------------------------ */

function stage(
  id: string,
  title: string,
  prompt: string,
  reference: string[],
  signals?: string[],
): SystemDesignStage {
  return { id, title, prompt, reference, signals };
}

export const SYSTEM_DESIGN_EXTRA_QUESTIONS: Question[] = [
  /* ================================================================ */
  {
    id: "sd06",
    slug: "design-maps-search",
    title: "Design Google Maps Search",
    description:
      "Search-as-you-type over places, with location, offline results and a latency budget you can feel.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "flow", "networking", "room", "performance"],
    estimatedMinutes: 60,
    completedCount: 1700,
    introducedInWeek: 12,
    designBrief:
      "Design the Android client for place search in a maps application. The user types, sees suggestions update as they type, and taps one to move the map. Results depend on where they are. Some of it must work without a connection.\n\nThe pressure in this design is latency: a suggestion that arrives after the next keystroke is worse than no suggestion. Treat every stage as a budget question.",
    designStages: [
      stage(
        "req",
        "Requirements",
        "Scope it, and put numbers on the things that will decide your design.",
        [
          "Functional: suggestions as the user types, recent searches, current-location bias, tap a result to centre the map, saved places available offline.",
          "Out of scope: turn-by-turn navigation, reviews, the map rendering itself.",
          "Non-functional: first suggestion under 200ms perceived, no suggestion older than the current query ever displayed, works degraded with no connection.",
          "Scale: a suggestion request per ~150ms of typing at worst, results capped at 10, recents capped at ~50.",
        ],
        [
          "Do they name a latency target, or leave 'fast' undefined?",
          "Do they ask whether offline means cached recents only, or a bundled local dataset?",
        ],
      ),
      stage(
        "model",
        "Data model",
        "What is a 'place' here, and what exists only on the device?",
        [
          "Place(id, name, address, latLng, category, distanceMeters?) — distance is derived at query time, not stored.",
          "RecentSearch(query, placeId?, searchedAt) — local only, never synced unless the user is signed in and has opted in.",
          "SavedPlace(placeId, label, cachedPlace) — the offline set, fully denormalised so it needs no join or network.",
          "SuggestionResult(query, places, source: NETWORK | CACHE | LOCAL) — carrying the source is what lets the UI be honest about staleness.",
        ],
        [
          "Do they denormalise the offline set deliberately, or assume a join will be available?",
          "Does the result type know where it came from?",
        ],
      ),
      stage(
        "api",
        "API",
        "Design the suggestion endpoint. What travels, and how often?",
        [
          "GET /suggest?q=&lat=&lng=&radius=&sessionToken= — coarse location, not precise; rounding to ~100m is plenty for biasing and leaks far less.",
          "A session token groups the keystrokes of one search so the backend can bill and rank a session rather than isolated characters.",
          "Response carries an echo of the query string, so the client can discard a response that no longer matches what is typed.",
          "GET /place/{id} for the detail fetch on tap — suggestions carry only what the list row renders.",
        ],
        [
          "Does the response echo the query? Without it, out-of-order responses cannot be filtered reliably.",
          "Do they send precise coordinates without thinking about it?",
        ],
      ),
      stage(
        "arch",
        "Architecture",
        "Lay out the layers and say what each is allowed to know.",
        [
          "SearchViewModel owns the query StateFlow and the resulting UI state; it knows nothing about HTTP.",
          "SearchRepository merges three sources — local saved places, recent searches, and the network — behind one Flow.",
          "A PlaceDataSource per source, each returning the same Place type, so merging is a list operation rather than a type negotiation.",
          "Location is injected as a Flow<LatLng?> rather than fetched imperatively, so the query pipeline can combine with it.",
        ],
        [
          "Is the merge in the repository or smeared across the ViewModel?",
          "Is location a dependency or a global?",
        ],
      ),
      stage(
        "state",
        "State ownership",
        "Who owns the query text, and why does that decision matter here?",
        [
          "The text field's value is UI state, hoisted to the ViewModel so rotation does not lose it mid-search.",
          "The ViewModel owns query, results, and a selected place; the map owns its own camera, which is not search state.",
          "SavedStateHandle carries the query across process death — coming back to an empty search box after a call interrupts you is a real complaint.",
          "The 'which suggestion is highlighted' state belongs to the list, not the ViewModel.",
        ],
        [
          "Do they distinguish state that must survive process death from state that need not?",
        ],
      ),
      stage(
        "flow",
        "Data flow",
        "Write the pipeline from keystroke to rendered suggestion.",
        [
          "query → debounce(150ms) → filter(length >= 2) → distinctUntilChanged → combine(location) → flatMapLatest { search(it) } → stateIn.",
          "flatMapLatest is the load-bearing operator: it cancels the in-flight request when the next keystroke arrives, which is both the latency fix and the cost fix.",
          "Local results (saved places, recents) are emitted immediately, then replaced or merged when the network responds — the list is never empty while the user waits.",
          "The query echo is checked on arrival as a second line of defence against a stale response winning.",
        ],
        [
          "flatMapLatest rather than flatMapMerge or flatMapConcat — can they say why each of the other two is wrong here?",
          "Do they show something during the round trip, or a spinner?",
        ],
      ),
      stage(
        "persist",
        "Persistence",
        "What is written to disk, and what is deliberately not?",
        [
          "Room holds saved places and recent searches. Both are small and both need to survive reinstallation of the process, not the app.",
          "Suggestion responses are not persisted — they are location- and time-sensitive, and a stale suggestion list is worse than none.",
          "Recent searches are capped and trimmed on write, so the table cannot grow without bound.",
          "The user must be able to clear recents, and clearing must actually delete rather than hide.",
        ],
        [
          "Do they persist suggestions because 'caching is good', without asking whether a stale one is acceptable?",
        ],
      ),
      stage(
        "cache",
        "Caching",
        "Design the cache, including its invalidation, or justify not having one.",
        [
          "An in-memory LRU keyed by (normalised query, rounded location, radius) with a short TTL — 60s is generous — serving backspace and retyping, which is the common case.",
          "Keying on rounded location is what makes the cache hit at all; keyed on precise coordinates it never would.",
          "No disk cache for suggestions: the invalidation story is bad and the win is small.",
          "Cache the place detail on tap, since a place's name and address change rarely.",
        ],
        [
          "Do they identify backspace as the case a cache actually serves?",
          "Can they state the invalidation rule, not just the storage?",
        ],
      ),
      stage(
        "concurrency",
        "Concurrency",
        "Where do races appear, and what makes each impossible?",
        [
          "Out-of-order responses: solved structurally by flatMapLatest, plus the query echo check.",
          "Location arriving after the first keystroke: combine re-runs the search with the better bias rather than the first result standing.",
          "Tap-while-loading: selecting a place cancels the suggestion pipeline; the detail fetch is a separate scope so it survives the query clearing.",
          "The pipeline runs in viewModelScope; the map camera animation does not depend on it.",
        ],
        [
          "Do they solve ordering with a structural guarantee, or with a 'latest request id' variable and a manual check?",
        ],
      ),
      stage(
        "offline",
        "Offline behaviour",
        "What does the feature do with no connection, and how does the user know?",
        [
          "Recents and saved places are searched locally and returned immediately — the box is never dead.",
          "The result list is labelled by source, so 'saved places only' is visible rather than implied by a short list.",
          "No retry storm: a failed suggestion request is not retried, because by the time a retry lands the query has moved on.",
          "Connectivity returning re-runs the current query once, rather than replaying the queue of abandoned ones.",
        ],
        [
          "Do they retry suggestions? It is the instinct, and it is wrong here.",
        ],
      ),
      stage(
        "errors",
        "Error handling",
        "Classify the failures and decide what the user sees for each.",
        [
          "Network failure mid-typing: silent. Show local results; a toast per keystroke is intolerable.",
          "Location permission denied: search still works, unbiased, with a one-time explanation of what is lost — not a blocking dialog.",
          "Location unavailable but permitted (indoors, cold start): proceed unbiased rather than waiting; a suggestion now beats a better one in three seconds.",
          "4xx from the suggest endpoint: log it, fall back to local, do not surface — the user cannot act on it.",
        ],
        [
          "Do they distinguish errors the user can act on from ones they cannot?",
          "Is permission denial treated as a dead end or a degraded mode?",
        ],
      ),
      stage(
        "perf",
        "Performance",
        "Where does the budget actually go, and what do you measure?",
        [
          "Debounce tuning is the biggest single lever: too short burns requests and battery, too long feels laggy. 150ms is a starting point to be measured, not a constant to be believed.",
          "Render cost: a stable key per place id, and rows that do not re-measure text on every keystroke.",
          "Cancel eagerly — an abandoned request still costs radio time and battery even if its result is discarded.",
          "Measure time-to-first-suggestion at p50 and p95 on a mid-range device on a slow network, not on the developer's phone on wifi.",
        ],
        [
          "Do they name p95 rather than an average?",
        ],
      ),
      stage(
        "a11y",
        "Accessibility",
        "What does this feature owe someone using TalkBack or a large font?",
        [
          "Suggestions arriving must be announced as a live region — but politely, so each keystroke does not interrupt the last announcement.",
          "Announce the count ('7 results') rather than reading the list unprompted.",
          "Each row's content description reads name then distance then category, in the order a person would ask.",
          "Rows must grow with font scale rather than truncating the place name; the address is the line that should truncate.",
          "Touch targets stay at 48dp even when the list is dense.",
        ],
        [
          "Do they think about announcement *frequency*, not just labels?",
        ],
      ),
      stage(
        "test",
        "Testing",
        "What do you test, at which seam?",
        [
          "The pipeline, with a virtual-time test dispatcher: debounce boundaries, cancellation on a new keystroke, out-of-order responses discarded.",
          "The merge logic as a pure function over three lists — ordering, deduplication between a recent and a network result for the same place.",
          "Repository against a fake data source with injectable latency, so 'slow network' is a test case rather than a manual experiment.",
          "One UI test for the degraded-permission path, because it is the one people break while refactoring and never notice.",
        ],
        [
          "Do they test cancellation, or only the happy path of a settled query?",
        ],
      ),
    ],
    solution: {
      mentalModel:
        "Search-as-you-type is a cancellation problem wearing a search costume. Nearly every decision — flatMapLatest, the query echo, the cache key, the no-retry rule — exists to guarantee that what the user sees corresponds to what they have currently typed.",
      whyItWorks: [
        "flatMapLatest makes stale responses structurally impossible rather than filtered after the fact.",
        "Emitting local results first means the list is never empty while the network is consulted.",
        "Rounding location makes the cache viable and leaks less at the same time.",
        "Refusing to retry acknowledges that a suggestion's value expires with the keystroke that prompted it.",
      ],
      commonMistakes: [
        "Retrying failed suggestion requests, producing a queue of answers to questions the user has stopped asking.",
        "Keying the cache on precise coordinates, guaranteeing a 0% hit rate.",
        "Blocking the search on a location fix, so the first search after cold start takes three seconds.",
        "Announcing every suggestion update to TalkBack, making the feature unusable with a screen reader.",
      ],
      followUps: [
        "How would you support search along a route rather than around a point?",
        "What changes if the suggestion endpoint is billed per request?",
      ],
    },
  },

  /* ================================================================ */
  {
    id: "sd07",
    slug: "design-youtube-home",
    title: "Design YouTube's Home Feed",
    description:
      "A mixed-media feed where the expensive resource is memory, and autoplay makes lifecycle a correctness problem.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "performance", "networking", "compose", "lifecycle"],
    estimatedMinutes: 60,
    completedCount: 1500,
    introducedInWeek: 12,
    designBrief:
      "Design the Android home feed for a video application: an infinite list of thumbnails with titles and channel metadata, where the item nearest the centre of the screen autoplays muted.\n\nThe pressure here is resource ownership. Images, players and prefetch all compete for memory and bandwidth, and the feed scrolls faster than any of them can load.",
    designStages: [
      stage(
        "req",
        "Requirements",
        "Scope it and name the resource limits you are designing against.",
        [
          "Functional: infinite scroll, thumbnail + title + channel + duration, the centred item autoplays muted with no controls, tap opens the watch screen.",
          "Out of scope: the watch page itself, comments, uploads, downloads.",
          "Non-functional: no dropped frames while scrolling, at most one player instance active, bounded image memory, autoplay never continues off-screen or in the background.",
          "Scale: 20 items per page, a session may scroll hundreds of items, thumbnails ~50KB each.",
        ],
        [
          "Do they state 'at most one player' as a requirement, or discover it later as a bug?",
        ],
      ),
      stage(
        "model",
        "Data model",
        "Define the feed item. What is a paging cursor here?",
        [
          "FeedItem is a sealed type from the start: Video, Shelf (a horizontal row), Ad, Banner. A feed that assumes homogeneity is rewritten within a quarter.",
          "Video(id, title, channel, thumbnailUrl, previewUrl, durationSeconds, viewCountText, publishedText) — the human-readable strings are computed server-side so they are consistent and localised once.",
          "Page(items, nextCursor) — an opaque cursor, not an offset; a personalised feed reorders between requests and offsets skip or duplicate.",
          "No local persistence identifier is needed if the feed is not cached to disk — decide that here, not later.",
        ],
        [
          "Sealed feed item from the beginning? This is the single most consequential modelling decision in the exercise.",
          "Cursor or offset — can they say why an offset is wrong for a personalised feed?",
        ],
      ),
      stage(
        "api",
        "API",
        "Design the feed endpoint and the preview media contract.",
        [
          "GET /feed?cursor=&count= returning items plus nextCursor; the server decides composition, the client renders what it is given.",
          "Thumbnails at several widths; the client requests the one matching its measured density rather than downscaling a large one.",
          "previewUrl points at a short, low-bitrate, audio-free clip — not the real video. Autoplay must never pull the full stream.",
          "Items carry a server-assigned impression token so analytics need not reconstruct position client-side.",
        ],
        [
          "Do they distinguish the preview asset from the real video?",
        ],
      ),
      stage(
        "arch",
        "Architecture",
        "Lay out the layers, and say where the player lives.",
        [
          "Paging source → repository → ViewModel → LazyColumn, with the feed as a Flow of pages.",
          "A single PlayerHolder, scoped above the list and injected, owning one ExoPlayer instance. Rows request playback; they never construct a player.",
          "An ImageLoader configured once with an explicit memory-cache budget, not left at its default.",
          "The row composable is given a 'should play' boolean and a preview URL; it knows nothing about how the decision was made.",
        ],
        [
          "Is the player owned above the list or inside the row? A player per row is the classic failure.",
        ],
      ),
      stage(
        "state",
        "State ownership",
        "Who decides which item plays?",
        [
          "The list's scroll state decides: derive the centred visible item from LazyListState, debounce it, and publish one 'currently playing id'.",
          "derivedStateOf keeps that computation from recomposing the whole list on every scroll pixel.",
          "The ViewModel owns the feed pages; the list owns scroll position; the PlayerHolder owns playback. Three owners, no overlap.",
          "Muted/unmuted is user state and belongs to the ViewModel, since it persists across items.",
        ],
        [
          "Do they debounce the centred-item calculation, or switch players on every frame of a fling?",
        ],
      ),
      stage(
        "flow",
        "Data flow",
        "Trace a scroll from gesture to a playing preview.",
        [
          "LazyListState → snapshotFlow { centredItemId } → debounce(~250ms) → distinctUntilChanged → PlayerHolder.play(previewUrl).",
          "The debounce is essential: a fling crosses forty items and must start zero players.",
          "Paging triggers a page fetch when the last visible index nears the end of the loaded set.",
          "Prefetch of thumbnails runs a fixed distance ahead of the visible window, cancelled when the user reverses direction.",
        ],
        [
          "Can they explain why distinctUntilChanged alone is insufficient during a fling?",
        ],
      ),
      stage(
        "persist",
        "Persistence",
        "Is any of this written to disk? Defend the answer.",
        [
          "The feed itself: arguably not. It is personalised, it goes stale in minutes, and a cached home feed shown at next launch is usually worse than a fresh fetch with a skeleton.",
          "A defensible compromise is persisting only the first page, with an age check, to make cold start feel instant while a refresh runs behind it.",
          "Thumbnails: yes, a bounded disk cache. They are immutable, addressed by URL, and re-fetching them is pure waste.",
          "Watch position and mute preference: yes, small and genuinely user state.",
        ],
        [
          "Do they cache the feed reflexively, or reason about whether stale personalised content has value?",
        ],
      ),
      stage(
        "cache",
        "Caching",
        "Budget memory explicitly across the competing consumers.",
        [
          "Image memory cache set as a fraction of available heap, deliberately — the default is often too large once a video player is also resident.",
          "Disk cache for thumbnails with a size cap and LRU eviction.",
          "The player holds one buffer; that budget is set once and not tuned per item.",
          "Prefetch depth is a number you can lower under memory pressure — treat it as a dial, not a constant.",
        ],
        [
          "Do they acknowledge that image cache and player buffer compete for the same heap?",
        ],
      ),
      stage(
        "concurrency",
        "Concurrency",
        "Name the races and what makes each safe.",
        [
          "Play requests arriving faster than the player can switch: serialise through the PlayerHolder and honour only the latest — the same single-flight shape as search.",
          "Page N+1 arriving while the user has scrolled back to page N-1: paging is idempotent by cursor, so late arrivals merge rather than reorder.",
          "Prefetch racing the visible load for bandwidth: prefetch runs at lower priority and is cancelled when a visible item needs the connection.",
          "Rotation mid-playback: the player survives if it is scoped above the configuration change; otherwise it restarts and the position is lost.",
        ],
        [
          "Is the player scoped so rotation does not restart playback?",
        ],
      ),
      stage(
        "offline",
        "Offline behaviour",
        "What happens with no connection, mid-scroll?",
        [
          "Already-loaded items keep rendering with cached thumbnails; the list does not clear.",
          "Autoplay stops attempting; the thumbnail simply stays, with no error decoration on every row.",
          "Pagination shows an inline retry at the end of the list — a footer, not a dialog, and not a full-screen error that discards what is loaded.",
          "Reconnection retries the failed page automatically, once.",
        ],
        [
          "Does losing connection destroy the loaded feed? It is a common and infuriating bug.",
        ],
      ),
      stage(
        "errors",
        "Error handling",
        "Classify failures by whether the user can act.",
        [
          "One thumbnail fails: a neutral placeholder, no message. It is not worth the user's attention.",
          "Preview fails to play: fall back to the static thumbnail silently. Autoplay is a nicety; failing loudly makes it a liability.",
          "First page fails: full-screen state with a retry, because there is nothing else to show.",
          "Subsequent page fails: inline footer retry, because there is.",
          "An item the server cannot render: drop it client-side rather than crashing the list on an unknown type — which is another argument for the sealed type having an Unknown branch.",
        ],
        [
          "Do they distinguish first-page from nth-page failure? The right treatment differs.",
          "Is there an Unknown branch for forward compatibility?",
        ],
      ),
      stage(
        "perf",
        "Performance",
        "Where do the frames go?",
        [
          "Stable keys on list items, so recycling does not rebind the wrong content mid-fling.",
          "No layout work in the row that depends on the image having loaded — reserve the aspect ratio up front or every load shifts the list.",
          "Decode thumbnails at the display size; a full-resolution decode into a small row is the most common memory mistake here.",
          "Measure with recomposition counts and a scroll jank trace, not by feel on a flagship.",
          "Release the player promptly when the feed is not visible; a resident decoder is expensive even when paused.",
        ],
        [
          "Do they reserve space before the image loads?",
        ],
      ),
      stage(
        "a11y",
        "Accessibility",
        "What does autoplay owe a user who cannot see it, or does not want it?",
        [
          "Respect the system reduced-motion setting by disabling autoplay entirely — this is a real setting with a real reason behind it.",
          "Provide an in-app autoplay toggle regardless; not everyone who wants it off has set the system flag.",
          "Each row is one focusable element with a content description covering title, channel and duration — not four separate stops.",
          "Duration must be announced as '4 minutes 12 seconds', not '4:12', which screen readers read as a time of day.",
          "Never let autoplay steal or move accessibility focus.",
        ],
        [
          "Reduced motion — do they know it exists and applies here?",
        ],
      ),
      stage(
        "test",
        "Testing",
        "What is worth testing, and where?",
        [
          "The centred-item derivation as a pure function over a list of visible item bounds — no UI needed, and it is where the off-by-one lives.",
          "Paging merge behaviour with out-of-order page arrivals.",
          "PlayerHolder: exactly one player exists after a sequence of rapid play requests.",
          "A macrobenchmark for scroll jank, so a regression is a number in CI rather than a complaint in review.",
          "One instrumented test that backgrounding the app stops playback — the bug most likely to ship and most likely to be reported.",
        ],
        [
          "Do they test 'only one player' explicitly?",
        ],
      ),
    ],
    solution: {
      mentalModel:
        "A media feed is a resource-ownership problem. Images, decoders and prefetch all want the same heap and the same radio, and the feed scrolls faster than any of them can respond — so every design decision is really about who owns a scarce thing and when they give it back.",
      whyItWorks: [
        "One player owned above the list makes 'at most one' structural rather than a rule people remember.",
        "Debouncing the centred item means a fling costs zero player switches.",
        "A sealed feed item absorbs the ad, shelf and banner the product team will add later without a rewrite.",
        "Explicit memory budgets stop the image cache and the decoder from discovering each other in a crash report.",
      ],
      commonMistakes: [
        "A player per row — works in a demo with five items, fails on a real feed.",
        "Assuming a homogeneous feed, then discovering ads.",
        "Offset pagination against a personalised backend, producing duplicates and gaps nobody can reproduce.",
        "Autoplay that keeps running when the app is backgrounded, which users experience as the app playing sound at them.",
      ],
      followUps: [
        "How would you add a horizontally scrolling shelf without breaking the centred-item calculation?",
        "What changes if previews must have audio?",
      ],
    },
  },

  /* ================================================================ */
  {
    id: "sd08",
    slug: "design-reddit",
    title: "Design Reddit's Comment Tree",
    description:
      "A recursive structure with optimistic voting, deep nesting, and collapse state that must survive everything.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "room", "flow", "performance", "compose"],
    estimatedMinutes: 60,
    completedCount: 1400,
    introducedInWeek: 12,
    designBrief:
      "Design the Android post-detail screen for a threaded discussion application: a post, a tree of comments nested to arbitrary depth, voting on everything, collapsible subtrees, and 'load more replies' at the edges.\n\nThe pressure is the data structure. A tree renders in a flat list, and almost every bug in this feature comes from the impedance between those two shapes.",
    designStages: [
      stage(
        "req",
        "Requirements",
        "Scope it, and be specific about the tree.",
        [
          "Functional: post header, comment tree, vote up/down on post and comments, collapse/expand a subtree, load-more at truncated branches, sort (best / new / top / controversial).",
          "Out of scope: composing a reply, moderation tools, chat.",
          "Non-functional: votes feel instant and never silently fail, collapse state survives rotation and process death, a 5,000-comment thread scrolls without jank.",
          "Depth: the server truncates around depth 8 with a 'continue thread' link; the client must handle arbitrary depth anyway.",
        ],
        [
          "Do they ask about depth limits and truncation, or assume a fully materialised tree?",
        ],
      ),
      stage(
        "model",
        "Data model",
        "Model the tree. Then model how it is rendered.",
        [
          "Store flat: Comment(id, postId, parentId, depth, body, author, score, myVote, childCount, sortIndex, isCollapsed, hasMoreChildren).",
          "`depth` and `sortIndex` are denormalised deliberately — recomputing them during rendering is exactly the work you cannot afford per frame.",
          "The rendered list is a *flattened projection* of the tree, computed once per change: walk in sort order, skip the children of anything collapsed.",
          "MoreChildren(parentId, count, childIds) as its own row type, so 'load 47 more' is an item rather than a special case inside a comment.",
          "Vote is stored as -1 / 0 / +1 with the *server's* score kept separately from the local delta, so the displayed number is score + localDelta.",
        ],
        [
          "Flat storage with a computed projection, or a nested structure they then struggle to diff?",
          "Do they separate server score from local delta?",
        ],
      ),
      stage(
        "api",
        "API",
        "Design the endpoints, including the awkward one.",
        [
          "GET /post/{id}/comments?sort=&limit=&depth= returning a flat list with parentId and depth, plus explicit more-children markers. Flat over the wire avoids a deeply nested JSON that is painful to stream and parse.",
          "POST /vote { thingId, direction } — idempotent, returns the authoritative score.",
          "GET /morechildren?parentId=&ids= for the truncated branches, because they are requested by id set rather than by cursor.",
          "Sorting is a server concern: the same thread in two sorts is two different orderings, not a client-side re-sort.",
        ],
        [
          "Is the wire format flat? Do they notice the client structure and the wire format can differ?",
        ],
      ),
      stage(
        "arch",
        "Architecture",
        "Layers, and where the flattening happens.",
        [
          "Room as the single source of truth; the network writes into it and never into the UI.",
          "A pure `flatten(comments, collapsedIds): List<Row>` function in the domain layer — pure, unit-testable, and the single place the tree becomes a list.",
          "The ViewModel observes comments from Room, combines with collapse state, and publishes rows.",
          "The UI renders rows and emits intents. It never walks the tree.",
        ],
        [
          "Is flattening a pure function, or smeared into a composable?",
        ],
      ),
      stage(
        "state",
        "State ownership",
        "Collapse state is the interesting one. Who owns it?",
        [
          "Collapsed ids are UI state with a long life: not server state, but it must survive rotation and process death. SavedStateHandle holding a Set<CommentId>.",
          "Storing collapse in Room is defensible for very large threads, and overkill for most — say which and why.",
          "Vote state lives in Room, because it must survive the screen and be consistent with the same comment shown elsewhere.",
          "Scroll position belongs to the list, but 'scroll to this comment' is a one-shot event from the ViewModel.",
        ],
        [
          "Do they classify collapse as neither pure UI state nor server state, and handle the middle case?",
        ],
      ),
      stage(
        "flow",
        "Data flow",
        "Trace a vote, and trace a collapse.",
        [
          "Vote: write the local delta to Room immediately → UI updates from the observed Flow → enqueue the network call → on success reconcile with the authoritative score → on permanent failure roll the delta back and tell the user once.",
          "Collapse: update the collapsed set → the combine re-runs flatten → a new row list is emitted. No network involved, so it must feel instantaneous.",
          "combine(commentsFromRoom, collapsedIds) { comments, collapsed -> flatten(comments, collapsed) } is the whole pipeline.",
          "Flatten runs on a background dispatcher for large threads; 5,000 comments is real work to do on the main thread every keystroke of state change.",
        ],
        [
          "Is the optimistic vote written to the source of truth, or held beside it in the ViewModel?",
        ],
      ),
      stage(
        "persist",
        "Persistence",
        "What survives, and for how long?",
        [
          "Comments for the currently open post, so returning to it is instant and rotation is free.",
          "Pending votes in a durable outbox — a vote lost to process death is the failure users notice and resent most.",
          "Eviction by recency: keep the last few posts' comment trees, not every thread ever opened.",
          "Collapse state persisted alongside if it is stored in Room, otherwise in SavedStateHandle only.",
        ],
        [
          "Is the vote queue durable, or in memory?",
        ],
      ),
      stage(
        "cache",
        "Caching",
        "How stale can a comment tree be?",
        [
          "Very stale is fine for reading — a thread from two minutes ago is a reasonable thing to show instantly while refreshing.",
          "Scores are the exception: they move constantly and matter least. Showing a slightly old score is acceptable; showing an old *vote of mine* is not.",
          "Refresh replaces server fields but must never clobber an unsynced local vote — merge by field, not by row.",
          "Different sorts are different cache entries; do not reuse one for the other.",
        ],
        [
          "Do they notice that a naive refresh overwrites pending optimistic votes?",
        ],
      ),
      stage(
        "concurrency",
        "Concurrency",
        "Races, in a screen that is mostly local.",
        [
          "Double-tap on a vote: collapse to a final state rather than queueing two operations — the outbox holds at most one pending vote per thing, replaced not appended.",
          "Refresh landing while a vote is in flight: field-level merge keeps the local delta.",
          "Two 'load more' taps on the same branch: deduplicate by parentId.",
          "Flatten is pure, so it can run concurrently with anything; only its result assignment is ordered.",
        ],
        [
          "One pending vote per thing, replaced — or a queue of every tap?",
        ],
      ),
      stage(
        "offline",
        "Offline behaviour",
        "Reading and voting without a connection.",
        [
          "Cached threads are fully readable, including collapse and expand, since neither needs the network.",
          "Votes are accepted and queued; the UI shows them applied, with a subtle pending indicator rather than a blocking one.",
          "'Load more replies' cannot be satisfied — that branch shows an inline unavailable state rather than a spinner that never ends.",
          "On reconnect the outbox drains oldest first, reconciling scores as it goes.",
        ],
        [
          "Do they let the user vote offline? Refusing is defensible only if stated deliberately.",
        ],
      ),
      stage(
        "errors",
        "Error handling",
        "The failure that matters most is a rejected vote.",
        [
          "Vote rejected because the thread is archived or locked: roll back the delta, explain once, and stop retrying — this will never succeed.",
          "Vote failed on the network: keep the delta, keep retrying with backoff, show pending. It will probably succeed.",
          "Rate limited: back off hard and stop optimistically accepting further votes, or you accumulate a queue that will all fail.",
          "Comment tree fails to load with nothing cached: full-screen retry. With something cached: show the cache with a stale indicator.",
        ],
        [
          "Do they distinguish 'will never succeed' from 'will succeed later'? Retrying a vote on a locked thread forever is the bug.",
        ],
      ),
      stage(
        "perf",
        "Performance",
        "5,000 comments, scrolling smoothly.",
        [
          "Flatten off the main thread, and diff the result rather than resetting the list.",
          "Stable keys by comment id, so collapsing a subtree animates the removal rather than rebuilding everything below it.",
          "Depth indentation drawn as padding or a cheap divider, never as nested layout containers — nesting 20 containers deep is how you exceed the view hierarchy limit and jank simultaneously.",
          "Cap indentation visually beyond a depth (~8) so deep threads do not squeeze content into a column two words wide.",
          "Collapsing a subtree removes its rows from the projection entirely; it must not merely hide them.",
        ],
        [
          "Indentation as padding rather than nested containers — do they see the trap?",
          "Does collapse actually remove rows, or hide them while still paying for them?",
        ],
      ),
      stage(
        "a11y",
        "Accessibility",
        "A tree read linearly is where accessibility gets hard.",
        [
          "Depth must be announced — 'reply, level 3' — because indentation carries the structure and is invisible to a screen reader.",
          "Collapse/expand exposed as a proper expandable state with its subtree count: 'collapsed, 47 replies'.",
          "Vote controls need distinct labels and a state: 'upvote, selected', not two identical buttons.",
          "Score changes should not be announced on every update; they are ambient, not events.",
          "Provide navigation by sibling where possible so a user is not forced to traverse an entire subtree to reach the next top-level comment.",
        ],
        [
          "Do they realise indentation conveys meaning that must be stated explicitly?",
        ],
      ),
      stage(
        "test",
        "Testing",
        "Where the bugs are is where the tests go.",
        [
          "flatten() as a pure function: collapsed subtrees excluded, ordering preserved, more-children rows placed correctly, depth capped. This is the highest-value test file in the feature.",
          "Optimistic vote lifecycle: applied immediately, reconciled on success, rolled back on permanent failure, preserved across a refresh.",
          "The merge-on-refresh case specifically, with a pending vote present.",
          "Process-death simulation for collapse state.",
          "A benchmark that flattens a 5,000-comment fixture, so a regression in that function is caught as a number.",
        ],
        [
          "Is flatten tested directly? If it is buried in a composable it cannot be, which is itself the argument for extracting it.",
        ],
      ),
    ],
    solution: {
      mentalModel:
        "Store the tree flat, render a computed projection of it, and keep that projection a pure function. Every hard bug in a threaded UI — wrong collapse, duplicated rows, lost votes on refresh, jank on deep threads — comes from letting the tree and the list disagree.",
      whyItWorks: [
        "Flat rows with parentId and depth make storage, diffing and paging ordinary list problems.",
        "A pure flatten function is testable, cacheable and movable off the main thread.",
        "Separating server score from local delta makes refresh and optimistic voting compose instead of fight.",
        "Padding-based indentation keeps the view hierarchy shallow regardless of thread depth.",
      ],
      commonMistakes: [
        "A nested data structure that must be rebuilt to toggle one node, so collapse becomes a full-list reset.",
        "Refreshing by replacing rows wholesale, silently discarding unsynced votes.",
        "Nested layout containers for indentation, which janks and eventually breaks.",
        "Retrying a vote forever when the server has said no permanently.",
      ],
      followUps: [
        "How would you implement 'continue this thread' as a navigation rather than an inline load?",
        "What changes if new comments arrive live while the user is reading?",
      ],
    },
  },

  /* ================================================================ */
  {
    id: "sd09",
    slug: "design-banking-dashboard",
    title: "Design a Banking Dashboard",
    description:
      "The design where caching aggressively is wrong, and a stale number is a defect rather than a compromise.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "room", "networking", "testing", "lifecycle"],
    estimatedMinutes: 60,
    completedCount: 1600,
    introducedInWeek: 12,
    designBrief:
      "Design the Android dashboard for a retail banking application: account balances, recent transactions, a spending summary, and entry points to transfer and pay.\n\nEvery other design in this set rewards aggressive caching and optimistic updates. This one punishes both. The question running through it is: what are you willing to show the user, and how confident are you that it is true?",
    designStages: [
      stage(
        "req",
        "Requirements",
        "Scope it, and state the correctness requirements explicitly.",
        [
          "Functional: list accounts with balances, recent transactions per account, a month-to-date spending summary, navigation to transfer and pay.",
          "Out of scope: the transfer flow itself, card management, onboarding.",
          "Non-functional: no figure displayed without the user being able to tell how fresh it is; no financial data readable after logout or in the app switcher; session expiry enforced client-side as well as server-side.",
          "A balance is authoritative only at the moment the server states it — the client never computes one.",
        ],
        [
          "Do they state 'never compute a balance client-side' as a rule?",
          "Is freshness in the requirements, or an afterthought?",
        ],
      ),
      stage(
        "model",
        "Data model",
        "Model money, and model freshness.",
        [
          "Money as minor units in a Long plus a currency code — never a Double. Floating point in a financial app is a defect waiting for a rounding complaint.",
          "Account(id, maskedNumber, type, balanceMinor, availableMinor, currency, asOf: Instant) — asOf is part of the model, not metadata.",
          "Transaction(id, accountId, amountMinor, currency, merchant, postedAt, status: PENDING | POSTED | DECLINED, runningBalanceMinor?).",
          "Pending and posted are genuinely different states with different display rules; collapsing them is a common and serious modelling error.",
          "No PAN, no CVV, no full account number ever stored on device — masked representations only.",
        ],
        [
          "Long minor units rather than Double — immediate, or after prompting?",
          "Is `asOf` on the model, so staleness is impossible to lose?",
        ],
      ),
      stage(
        "api",
        "API",
        "Design the endpoints with the freshness contract in them.",
        [
          "GET /accounts returning balances with a server timestamp per account; the server's clock is authoritative, never the device's.",
          "GET /accounts/{id}/transactions?cursor=&limit= with a cursor, and pending items clearly typed.",
          "Explicit cache-control: no-store on balance responses. This is one of the few places that header genuinely matters.",
          "A short-lived access token with refresh, and a hard session ceiling independent of activity.",
          "Certificate pinning, and a plan for rotating the pin that does not brick the app.",
        ],
        [
          "Do they think about pin rotation, or just say 'pin the certificate'?",
        ],
      ),
      stage(
        "arch",
        "Architecture",
        "Layers, plus a security boundary the other designs do not need.",
        [
          "Standard repository/ViewModel layering, with one addition: a SessionManager that can invalidate everything, synchronously, from anywhere.",
          "Encrypted storage for anything cached; the plain Room database is not an acceptable home for transaction history.",
          "A single screen-state type that can express 'showing data, known stale, refreshing' — three booleans cannot, and this screen needs the distinction.",
          "Biometric/PIN gate as a separate layer above the dashboard, not a flag inside it.",
        ],
        [
          "Is there a single place that can wipe everything on logout?",
        ],
      ),
      stage(
        "state",
        "State ownership",
        "Who owns the session, and what happens when it ends mid-scroll?",
        [
          "SessionManager owns authentication state as a Flow the whole app observes; expiry is an event every screen reacts to, not a 401 each screen handles.",
          "The ViewModel owns dashboard data and a refresh trigger.",
          "Data must be cleared from memory as well as disk on logout — a ViewModel surviving in the back stack holding balances is a real leak of a real kind.",
          "Screen state carries `asOf` through to the UI so the freshness indicator is not a separate, divergent source.",
        ],
        [
          "Is session expiry handled centrally or reimplemented per screen?",
        ],
      ),
      stage(
        "flow",
        "Data flow",
        "Trace a dashboard load, and be explicit about what is shown while it happens.",
        [
          "On resume: show cached balances immediately *marked as of their timestamp*, trigger a refresh, replace on success.",
          "The alternative — showing nothing until fresh data arrives — is also defensible and should be argued for rather than dismissed. A wrong balance is worse than a slow one.",
          "Never animate a balance counting up from the cached to the fresh figure; it reads as the money changing.",
          "Refresh is explicit and observable: the user can always tell a refresh is happening and when it last succeeded.",
        ],
        [
          "Do they argue the show-stale-with-label versus show-nothing trade, or assume one?",
          "Do they catch the counting-animation trap?",
        ],
      ),
      stage(
        "persist",
        "Persistence",
        "What is stored, where, and for how long?",
        [
          "Encrypted at rest — SQLCipher or equivalent, with the key in the Android Keystore, ideally requiring user authentication to unlock.",
          "Balances cached briefly for cold-start responsiveness, with a short expiry after which they are not shown at all rather than shown very stale.",
          "Transactions cached longer — posted transactions are immutable history and there is little harm in retaining them.",
          "Everything wiped on logout, on session expiry, and on detected device compromise.",
          "No financial data in SharedPreferences, in logs, or in crash-report breadcrumbs — the last one catches people out.",
        ],
        [
          "Do they mention logs and crash reporting? Financial data leaking through breadcrumbs is a genuine, common incident.",
        ],
      ),
      stage(
        "cache",
        "Caching",
        "Justify each cache, or refuse it.",
        [
          "Balance: cache for minutes, display with its timestamp, hard-expire rather than degrade indefinitely.",
          "Posted transactions: cache freely, they do not change.",
          "Pending transactions: cache warily, they change to posted or vanish.",
          "Spending summary: derive from cached transactions and mark it derived — an incomplete transaction set yields a wrong total, which looks authoritative.",
          "This is the design where 'cache aggressively' is the wrong instinct, and being able to say that is the point of the stage.",
        ],
        [
          "Can they explain why a derived summary over a partial cache is dangerous?",
        ],
      ),
      stage(
        "concurrency",
        "Concurrency",
        "Where does parallelism help, and where is it forbidden?",
        [
          "Accounts and summary fetch in parallel; the screen renders each as it lands rather than waiting for both.",
          "Token refresh is single-flight — the same mutex pattern as anywhere else, and here a duplicate refresh can invalidate a session and log the user out.",
          "Pull-to-refresh while a refresh is running: ignore, or restart — decide, because both are defensible and doing neither deliberately produces two in-flight refreshes writing the same rows.",
          "Session expiry must win any race: an in-flight response arriving after logout is discarded, never rendered.",
        ],
        [
          "Do they handle the response-arrives-after-logout case?",
        ],
      ),
      stage(
        "offline",
        "Offline behaviour",
        "What is it acceptable to show with no connection?",
        [
          "Posted transaction history: yes, it is immutable and useful.",
          "Balances: only within the short freshness window, clearly labelled, and disabled beyond it — 'last updated 3 days ago' on a balance is a number someone may act on.",
          "Transfer and pay entry points disabled offline rather than failing at the end of a flow the user has already filled in.",
          "No optimistic anything. A transfer is not a like button.",
        ],
        [
          "Do they refuse optimistic writes here, and say why this differs from the feed designs?",
        ],
      ),
      stage(
        "errors",
        "Error handling",
        "Errors in a context where ambiguity is unacceptable.",
        [
          "Never show a partial dashboard that looks complete: if one account failed to load, say so in that row rather than omitting the account.",
          "A failed refresh keeps the old data *and* its old timestamp — it must not appear to have refreshed.",
          "401 routes to re-authentication centrally, preserving where the user was.",
          "Timeouts on a transfer-adjacent action must never imply failure; 'we could not confirm' is the honest message, because the operation may have succeeded.",
          "Errors are logged without any account identifiers or amounts.",
        ],
        [
          "The timeout-ambiguity point is the senior signal here — do they raise it unprompted?",
        ],
      ),
      stage(
        "perf",
        "Performance",
        "Performance matters, but it is not what this design optimises for.",
        [
          "Cold start to a usable dashboard is the number that matters; it is the app's entire first impression.",
          "Transaction list paging with stable keys; histories are long but the screen is simple.",
          "Encryption costs something on every read — measure it rather than assuming it is free or assuming it is ruinous.",
          "Explicitly accept slower cold start in exchange for encrypted storage. Naming the trade is the point.",
        ],
        [
          "Do they acknowledge encryption has a cost and accept it deliberately?",
        ],
      ),
      stage(
        "a11y",
        "Accessibility",
        "Money, read aloud.",
        [
          "Amounts announced as '£1,240.50', not digit by digit, and negatives as 'minus' rather than a dash that may be skipped entirely.",
          "Never rely on colour alone for credit versus debit — a sign or a word as well, since red/green is the most common colour-blindness pairing.",
          "Masked account numbers read as 'ending 4 4 2 1', grouped so they are intelligible.",
          "Support large font scales without truncating amounts — a balance with the last digit cut off is a serious defect, not a cosmetic one.",
          "Consider a privacy mode that hides balances on screen, which helps both privacy and screen-reader users in public.",
        ],
        [
          "Truncated amounts at large font — do they see it as a correctness bug?",
        ],
      ),
      stage(
        "test",
        "Testing",
        "What must be provably correct?",
        [
          "Money formatting and arithmetic exhaustively, including negatives, zero, large values and every supported currency.",
          "Freshness logic: the exact boundary at which a cached balance stops being displayable.",
          "Logout wipes everything — assert it, in a test, because it is easy to add a new cache later and forget.",
          "Session expiry mid-request discards the response.",
          "Screenshot tests at the largest font scale for amount truncation.",
          "A test that no financial field appears in logs or crash breadcrumbs, if your tooling permits it.",
        ],
        [
          "Is 'logout clears everything' an assertion, or an assumption?",
        ],
      ),
    ],
    solution: {
      mentalModel:
        "Most mobile design optimises for perceived speed; this one optimises for not lying. Every cache, every optimistic update and every stale-while-revalidate trick has to justify itself against the possibility that someone makes a financial decision on a number your app displayed.",
      whyItWorks: [
        "Carrying `asOf` on the model makes staleness impossible to lose between layers.",
        "Minor units in a Long removes an entire class of rounding defects.",
        "A central session manager makes logout and expiry one behaviour rather than a dozen partial ones.",
        "Hard-expiring balances means the app declines to show a number rather than showing a wrong one.",
      ],
      commonMistakes: [
        "Doubles for money.",
        "Reusing the feed-shaped 'cache everything, refresh in the background' instinct without asking what a stale figure costs here.",
        "Optimistic updates on financial actions.",
        "Financial data reaching logs or crash-report breadcrumbs.",
        "Treating truncated amounts at large font sizes as cosmetic.",
      ],
      followUps: [
        "Argue the other side: when is showing a stale balance with a clear timestamp better than showing nothing?",
        "How would you handle a balance that disagrees with the sum of the transactions you are showing?",
      ],
    },
  },
];
