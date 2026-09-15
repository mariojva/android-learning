import type { Question, SystemDesignStage } from "@/lib/types";

/** The standard Android Academy design workbook. Every exercise walks these stages. */
export const DESIGN_STAGE_TITLES = [
  "Requirements",
  "Data model",
  "API",
  "Architecture",
  "State ownership",
  "Data flow",
  "Persistence",
  "Caching",
  "Concurrency",
  "Offline behaviour",
  "Error handling",
  "Performance",
  "Accessibility",
  "Testing",
] as const;

function stage(
  id: string,
  title: string,
  prompt: string,
  reference: string[],
  signals?: string[],
): SystemDesignStage {
  return { id, title, prompt, reference, signals };
}

export const SYSTEM_DESIGN_QUESTIONS: Question[] = [
  {
    id: "sd01",
    slug: "design-offline-first-feed",
    title: "Design an Offline-First Feed",
    description:
      "Design the Android architecture for a feed that works without connectivity.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "room", "networking", "flow"],
    estimatedMinutes: 60,
    completedCount: 4800,
    companyTags: ["Google", "Meta", "Reddit"],
    introducedInWeek: 9,
    designBrief:
      "A social feed of posts with text, images and a like count. It must open instantly, show something useful with no connection, let the user like posts offline, and reconcile when connectivity returns. Assume tens of thousands of posts server-side and a device that may be offline for days.",
    designStages: [
      stage(
        "req",
        "Requirements",
        "Scope it. What is in, what is out, and what numbers are you designing against?",
        [
          "Functional: read feed, paginate, like/unlike, view post detail, pull to refresh.",
          "Out of scope for this exercise: posting, comments, video, real-time push.",
          "Non-functional: first frame under 1s warm, feed content visible offline, likes never lost, image memory bounded.",
          "Scale assumptions worth stating aloud: ~50 posts per page, retain ~500 posts locally, images up to 2MB, sync when connectivity returns.",
        ],
        [
          "Does the candidate ask what 'offline' means — cached read-only, or full read-write?",
          "Do they put a number on anything, or stay entirely qualitative?",
        ],
      ),
      stage(
        "model",
        "Data model",
        "Define the entities. Which fields exist only locally?",
        [
          "PostEntity(id, authorId, body, imageUrl, likeCount, likedByMe, createdAt, cursor, syncState, localLikeDelta)",
          "AuthorEntity(id, name, avatarUrl)",
          "PendingActionEntity(id, type, postId, createdAt, attempts) — the durable outbox.",
          "`syncState` and `localLikeDelta` are local-only: they describe the device's relationship to the server, not the post.",
          "Store `cursor` per row so a page boundary survives a restart.",
        ],
        ["Do they separate server truth from local intent, or overwrite one with the other?"],
      ),
      stage(
        "api",
        "API",
        "Specify the endpoints and the pagination scheme. Justify the choice.",
        [
          "GET /feed?cursor=&limit=50 → { items: [...], nextCursor: string? }",
          "POST /posts/{id}/like and DELETE /posts/{id}/like — idempotent by design, so retries are safe.",
          "Cursor rather than offset: the feed changes between requests, and offsets duplicate and skip items when it does.",
          "ETag / If-None-Match on the feed so an unchanged page costs a 304 rather than a payload.",
        ],
        ["Do they notice that like/unlike must be idempotent for an offline outbox to be safe?"],
      ),
      stage(
        "arch",
        "Architecture",
        "Draw the layers and the direction of every dependency.",
        [
          "UI (Compose) → ViewModel → Repository → { RemoteDataSource, LocalDataSource } ",
          "The repository is the only component that knows both sources exist.",
          "The database is the single source of truth: the UI reads only from `LocalDataSource`.",
          "A SyncWorker writes to the database; it never talks to the UI.",
        ],
        ["Is the network an input to the database, or a second thing the UI reads from?"],
      ),
      stage(
        "state",
        "State ownership",
        "Who owns what, and for how long?",
        [
          "Composition: scroll position, expanded states, image loading placeholders.",
          "ViewModel: FeedUiState (items, isRefreshing, isLoadingMore, endReached, banner).",
          "SavedStateHandle: the scroll anchor post id, so process death restores position.",
          "Database: posts, authors, pending actions — everything that must survive the process.",
        ],
        ["Do they distinguish configuration change from process death?"],
      ),
      stage(
        "flow",
        "Data flow",
        "Trace a pull-to-refresh and an offline like, end to end.",
        [
          "Refresh: UI event → ViewModel → repository.refresh() → network → upsert into DB → Room invalidation → Flow emits → UI updates. The UI never receives the network response directly.",
          "Offline like: UI event → repository.like(id) → DB write (likedByMe = true, localLikeDelta += 1, enqueue PendingAction) → Flow emits immediately → SyncWorker enqueued with a network constraint.",
          "On sync: push each pending action, apply the server's authoritative count, clear the delta.",
        ],
        ["Is the optimistic update written to the database, or only to memory?"],
      ),
      stage(
        "persist",
        "Persistence",
        "What is stored, where, and how does it stay bounded?",
        [
          "Room for posts, authors and the outbox. DataStore for user preferences and the last sync timestamp.",
          "Images on disk via the image loader's own cache, size-capped; never as BLOBs in Room.",
          "Retention: keep the most recent ~500 posts; a periodic worker deletes older rows not referenced by the outbox.",
        ],
        ["Do they bound growth at all, or assume the database is free?"],
      ),
      stage(
        "cache",
        "Caching",
        "Define the policy and its invalidation.",
        [
          "Feed rows are always served from the database, however stale — stale content beats a spinner.",
          "Refresh on: screen entry if older than 5 minutes, explicit pull-to-refresh, and on returning to foreground.",
          "A 'last updated' timestamp drives a subtle staleness indicator rather than blocking the UI.",
          "Images: memory LRU (a fraction of the heap) plus a disk cache with its own size cap.",
        ],
        ["Is invalidation time-based, event-based or both — and can they say why?"],
      ),
      stage(
        "concurrency",
        "Concurrency",
        "Where can two things collide, and what prevents it?",
        [
          "One in-flight page request, guarded by state rather than by a separate boolean.",
          "The outbox is processed sequentially per post id so two likes on the same post cannot race.",
          "Database writes go through Room transactions; upserts are atomic.",
          "`flatMapLatest` cancels a superseded refresh.",
        ],
        ["Do they identify a specific race, or speak generally about 'thread safety'?"],
      ),
      stage(
        "offline",
        "Offline behaviour",
        "Describe exactly what the user sees with no connection.",
        [
          "Feed opens with cached posts and a non-blocking 'Offline' banner.",
          "Likes apply instantly and are marked pending in the UI only if the user would care — usually they are not marked at all.",
          "Pagination past the cached end shows 'You're offline' rather than an infinite spinner.",
          "On reconnect the outbox drains and counts reconcile, ideally without visible flicker.",
        ],
        ["Do they describe the user experience, or only the mechanism?"],
      ),
      stage(
        "errors",
        "Error handling",
        "Classify failures and give each a response.",
        [
          "Offline / timeout: keep cached content, show a retry affordance. Never an empty state.",
          "401: refresh once via an Authenticator; if that fails, sign out and preserve the outbox.",
          "5xx: exponential backoff with jitter, bounded attempts.",
          "4xx on a pending action (post deleted): drop the action, revert the local delta, tell the user quietly.",
        ],
        ["Is there a case where the app gives up, and does the user find out?"],
      ),
      stage(
        "perf",
        "Performance",
        "Name your budgets and how you would measure them.",
        [
          "Stable `key` and `contentType` on every list item; stable parameter types so rows skip.",
          "Image loading with explicit size hints, downsampled to the display size; prefetch a screen ahead.",
          "Baseline Profile for the feed path; measure with Macrobenchmark FrameTimingMetric.",
          "Budget: p90 frame under 16ms at 60Hz, cold start under 1.5s on a mid-range device.",
        ],
        ["Do they name a measurement tool, or only techniques?"],
      ),
      stage(
        "a11y",
        "Accessibility",
        "What does this feed need to be usable by everyone?",
        [
          "Content descriptions on images that carry meaning; explicitly null for decorative ones.",
          "Touch targets at least 48dp; like buttons are the usual offender.",
          "Merge each post into one semantic node so TalkBack reads it as a unit rather than field by field.",
          "Respect font scaling up to 200% — no fixed-height rows — and honour reduced-motion for animations.",
          "State changes announced: a like should announce the new state, not just change colour.",
        ],
        ["Is accessibility a list of attributes, or reasoning about how the screen is actually used?"],
      ),
      stage(
        "test",
        "Testing",
        "What do you test, at which level?",
        [
          "Unit: mappers, the pagination state machine, the outbox reconciliation logic.",
          "Repository: fake remote + in-memory Room, asserting that an offline like survives a restart.",
          "ViewModel: emitted state sequences with Turbine on a test dispatcher.",
          "UI: Compose tests for empty, offline, error and loaded states.",
          "Macrobenchmark: scroll performance and cold start, in CI, on a fixed device.",
        ],
        ["Do they test the offline path specifically, or only the happy path?"],
      ),
    ],
    solution: {
      mentalModel:
        "Offline-first is not a feature; it is an inversion. The database is the application. The network is a background process that reconciles the database with a server, and the UI never waits for it.",
      whyItWorks: [
        "A single source of truth means every writer reaches every reader without coordination.",
        "A durable outbox makes user intent survive process death, which in-memory optimism cannot.",
        "Idempotent endpoints make retry safe, which is what allows the outbox to be simple.",
      ],
      commonMistakes: [
        "Cache-then-network from a single flow, which couples reading to refreshing.",
        "Optimistic updates in memory only.",
        "Unbounded local growth.",
        "Treating 'offline' as an error state rather than a normal mode.",
      ],
      followUps: [
        "What happens when the same post is liked on two devices while both are offline?",
        "How would you add comments without redesigning the sync layer?",
        "Where would real-time push fit, and what would it replace?",
      ],
    },
  },
  {
    id: "sd02",
    slug: "design-instagram-feed",
    title: "Design Instagram's Android Feed",
    description:
      "Image-heavy, infinite, and expected to stay at 60fps on a four-year-old phone.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "performance", "networking", "compose"],
    estimatedMinutes: 60,
    completedCount: 6200,
    companyTags: ["Meta", "Google"],
    introducedInWeek: 9,
    designBrief:
      "An infinite feed of image posts with double-tap to like, prefetching, and video that autoplays when a cell is sufficiently visible. The performance constraints dominate every decision here.",
    designStages: [
      stage("req", "Requirements", "Scope and budgets.", [
        "Read feed, like, prefetch ahead, autoplay video above 50% visibility, mute by default.",
        "Budgets: p90 frame under 16ms, memory below the per-app heap limit with images bounded, no more than one video decoder active.",
        "Explicitly out: stories, direct messages, uploads.",
      ]),
      stage("model", "Data model", "Entities and media metadata.", [
        "PostEntity with media as a separate table: MediaEntity(postId, url, width, height, blurHash, kind).",
        "Storing intrinsic dimensions lets the list reserve exact space before the image arrives — no layout shift.",
        "blurHash or a dominant colour gives a meaningful placeholder at almost no cost.",
      ]),
      stage("api", "API", "Endpoints and media delivery.", [
        "GET /feed?cursor= returning posts with several media renditions per item.",
        "The server picks renditions; the client requests the one matching its display size and density.",
        "A CDN with cache-friendly URLs; immutable URLs so caching is trivial.",
      ]),
      stage("arch", "Architecture", "Layers plus a media subsystem.", [
        "Standard UI → ViewModel → Repository → DB/Network.",
        "Media is its own concern: an image loader with memory and disk caches, and a player pool for video.",
        "The feed ViewModel emits visibility information; the media subsystem reacts to it.",
      ]),
      stage("state", "State ownership", "Who owns playback?", [
        "The player pool is owned above the list, not by an item — items are recycled and must not own decoders.",
        "Which item is playing is derived from scroll state, ideally via `snapshotFlow` over layout info with `derivedStateOf` semantics.",
        "Like state is ViewModel state backed by the database.",
      ]),
      stage("flow", "Data flow", "Trace a scroll.", [
        "Scroll → layout info changes → derived 'most visible item' → play/pause commands to the player pool.",
        "Approaching the end → next page request → DB upsert → Flow emission → new items appear.",
        "Prefetch: as items enter a lookahead window, enqueue image requests at low priority.",
      ]),
      stage("persist", "Persistence", "What survives a restart.", [
        "Posts and media metadata in Room; the first screen of images on disk so a cold start shows content.",
        "Video is not persisted beyond the player's own cache.",
      ]),
      stage("cache", "Caching", "Three caches, three policies.", [
        "Memory: LRU sized as a fraction of the available heap, holding decoded bitmaps.",
        "Disk: size-capped, holding encoded originals.",
        "Video: a chunked media cache with a hard byte limit.",
        "Prefetch distance is a trade between data usage and smoothness — two to three screens is typical, and should shrink on metered connections.",
      ]),
      stage("concurrency", "Concurrency", "Bounded parallelism everywhere.", [
        "Image decoding on a bounded dispatcher — unbounded parallel decode is a reliable way to run out of memory.",
        "Prefetch requests at a lower priority than visible ones, and cancelled when the item leaves the window.",
        "One page request in flight.",
      ]),
      stage("offline", "Offline behaviour", "What remains usable.", [
        "Cached posts and cached images render; uncached images show the blurHash placeholder.",
        "Likes queue in an outbox as in the offline-first feed.",
        "Video simply does not play, with an explicit indication rather than a spinner.",
      ]),
      stage("errors", "Error handling", "Per-item failure.", [
        "An image failing must not fail the row — placeholder plus a quiet retry.",
        "Page failure preserves loaded content and offers retry inline at the list end.",
      ]),
      stage("perf", "Performance", "The heart of this design.", [
        "Stable keys and contentType; reserve space using intrinsic dimensions to avoid layout shift.",
        "Downsample to display size; never decode a 4000px image into a 400px slot.",
        "Baseline Profile for the scroll path; Macrobenchmark in CI with a fixed device.",
        "Watch the frame timeline for decode-on-main and for GC pauses caused by bitmap churn.",
      ]),
      stage("a11y", "Accessibility", "Images and autoplay.", [
        "Alt text from the server where authors provided it; explicit 'image' fallback where not.",
        "Autoplay respects the system reduce-motion setting and a user preference.",
        "Double-tap-to-like needs an accessible alternative action, since a double tap is not reliably available to every input method.",
      ]),
      stage("test", "Testing", "Performance is a test, not a vibe.", [
        "Macrobenchmark scroll test gating merges on frame timing.",
        "Screenshot tests for placeholder, loaded and error states.",
        "Unit tests for the visibility-to-playback derivation, which is pure logic.",
      ]),
    ],
    solution: {
      mentalModel:
        "An image feed is a memory-management problem wearing a UI. Bound every cache, decode at display size, and keep decoders out of recycled items.",
      whyItWorks: [
        "Intrinsic dimensions eliminate layout shift, which is both a perceived-performance and an accessibility win.",
        "A player pool above the list keeps decoder count bounded regardless of scroll speed.",
      ],
      commonMistakes: [
        "A player per item.",
        "Decoding full-resolution images.",
        "Unbounded prefetch on a metered connection.",
      ],
      followUps: ["How would you decide the prefetch distance empirically?"],
    },
  },
  {
    id: "sd03",
    slug: "design-spotify-offline-downloads",
    title: "Design Spotify Offline Downloads",
    description:
      "Large files, limited storage, licence expiry, and a progress UI that must always tell the truth.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["room", "architecture", "networking"],
    estimatedMinutes: 60,
    completedCount: 3900,
    companyTags: ["Spotify", "Google"],
    introducedInWeek: 9,
    designBrief:
      "Let users download albums and playlists for offline playback. Downloads must survive app kill and reboot, resume rather than restart, respect a storage budget, and expire when a licence lapses.",
    designStages: [
      stage("req", "Requirements", "Scope and constraints.", [
        "Download a playlist, see per-track and aggregate progress, pause/resume/cancel, play offline.",
        "Constraints: multi-hundred-megabyte downloads, Wi-Fi-only by default, a user-set storage cap, licences that expire.",
        "Must survive process death and device reboot.",
      ]),
      stage("model", "Data model", "Track download as first-class state.", [
        "DownloadEntity(trackId, state, bytesDownloaded, totalBytes, filePath, licenceExpiresAt, attempts, updatedAt)",
        "state ∈ QUEUED, RUNNING, PAUSED, COMPLETED, FAILED, EXPIRED.",
        "Aggregate playlist progress is derived from track rows, never stored separately — two sources of truth for progress always diverge.",
      ]),
      stage("api", "API", "Range requests and licences.", [
        "GET /tracks/{id}/audio with HTTP Range support so resume is a byte offset, not a restart.",
        "POST /licences/{trackId} returning a token with an expiry.",
        "A periodic licence renewal call while the content is retained.",
      ]),
      stage("arch", "Architecture", "Downloads are a background subsystem.", [
        "WorkManager unique work per playlist with a Wi-Fi constraint and exponential backoff.",
        "A DownloadRepository exposing Flows over the DAO; the UI observes the database and nothing else.",
        "A foreground service (or expedited work with a notification) for user-initiated downloads so the system does not defer them indefinitely.",
      ]),
      stage("state", "State ownership", "Progress belongs in the database.", [
        "The database is the source of truth for progress — that is what makes it correct after process death.",
        "Write progress at intervals (every ~1MB or ~1s), not per chunk: per-chunk writes will dominate the download's own cost.",
        "The UI holds only what is transient: which row is expanded.",
      ]),
      stage("flow", "Data flow", "Trace a download from tap to playback.", [
        "Tap → insert QUEUED rows → enqueue unique work → worker picks up queued rows → streams with Range → writes progress → COMPLETED with a file path.",
        "Playback checks the local file and a valid licence before falling back to streaming.",
      ]),
      stage("persist", "Persistence", "Files and their bookkeeping.", [
        "Audio in app-specific external storage, referenced by path in the entity.",
        "Never store audio as a BLOB in Room.",
        "A reconciliation pass on startup: rows without files and files without rows are both corruption, and both need cleaning.",
      ]),
      stage("cache", "Caching", "Eviction under a storage cap.", [
        "User-set cap. When exceeded, evict least-recently-played completed tracks that are not explicitly pinned.",
        "Explicit downloads outrank streaming cache; the user asked for these.",
        "Report actual usage, computed from the filesystem rather than from the sum of the rows — they drift.",
      ]),
      stage("concurrency", "Concurrency", "Bounded and resumable.", [
        "Two to three concurrent track downloads; more competes for bandwidth and yields worse aggregate time.",
        "Per-track work is idempotent: re-running a partially complete download resumes from the byte offset.",
        "A single writer per file; no two workers on one track.",
      ]),
      stage("offline", "Offline behaviour", "The point of the feature.", [
        "The library shows downloaded content first and marks streamable-only items clearly.",
        "Queued downloads wait for Wi-Fi without appearing stuck — surface the constraint in the UI.",
      ]),
      stage("errors", "Error handling", "Disk, network, licence.", [
        "Out of space: pause the queue and tell the user how much is needed. Never fail silently.",
        "Network loss: WorkManager retries; the UI shows 'waiting for Wi-Fi' rather than an error.",
        "Expired licence: mark EXPIRED, keep or delete the file per policy, and make renewal one tap.",
      ]),
      stage("perf", "Performance", "Throughput and battery.", [
        "Stream to disk; never buffer a whole track in memory.",
        "Batch progress writes.",
        "Respect Doze — that is exactly what WorkManager's constraints are for.",
      ]),
      stage("a11y", "Accessibility", "Progress must be perceivable.", [
        "Progress announced as text, not conveyed by a bar alone.",
        "Download state has a text label, not only an icon colour.",
        "Long-running operations announce completion.",
      ]),
      stage("test", "Testing", "The failure paths are the feature.", [
        "Unit: state machine transitions, eviction ordering, byte-offset resume arithmetic.",
        "Integration: kill the process mid-download and assert resume from the recorded offset.",
        "Instrumented: fill the disk and assert the out-of-space path.",
      ]),
    ],
    solution: {
      mentalModel:
        "A download manager is a durable state machine over a table of rows. Everything the user sees is a query over that table, so correctness after a crash is a property of the schema rather than of the code.",
      whyItWorks: [
        "Progress in the database means the UI is correct after process death by construction.",
        "Range requests make resume cheap, which is what makes the feature usable on a mobile connection.",
      ],
      commonMistakes: [
        "Progress held in memory.",
        "Restarting downloads from zero.",
        "Storage usage computed from database rows rather than the filesystem.",
      ],
      followUps: ["What happens when the user clears the app's storage from system settings?"],
    },
  },
  {
    id: "sd04",
    slug: "design-whatsapp-chat",
    title: "Design WhatsApp Chat",
    description:
      "Ordering, delivery receipts, and a message list that must never lose a send.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "room", "networking", "flow"],
    estimatedMinutes: 60,
    completedCount: 5400,
    companyTags: ["Meta", "Google"],
    introducedInWeek: 9,
    designBrief:
      "A one-to-one chat screen with real-time delivery, sent/delivered/read receipts, offline sending, and correct ordering when messages arrive out of order.",
    designStages: [
      stage("req", "Requirements", "Scope.", [
        "Send and receive text, per-message status, typing indicator, scroll history, offline send.",
        "Out of scope: media, groups, encryption details (mention them, do not design them here).",
        "Guarantees: no message is ever lost; order is stable and consistent between devices.",
      ]),
      stage("model", "Data model", "Local ids and server ids both matter.", [
        "MessageEntity(localId, serverId?, conversationId, body, senderId, status, createdAtLocal, serverSeq?)",
        "`localId` is generated on the device so an optimistic message has an identity before the server replies.",
        "`serverSeq` is the ordering authority; local messages sort after the highest known sequence.",
        "status ∈ PENDING, SENT, DELIVERED, READ, FAILED.",
      ]),
      stage("api", "API", "Transport and idempotency.", [
        "WebSocket for live delivery; REST for history pagination and receipts.",
        "Send carries the `localId` as an idempotency key so a retry cannot duplicate a message.",
        "The server returns `serverId` and `serverSeq` on acknowledgement.",
      ]),
      stage("arch", "Architecture", "Socket writes to the database.", [
        "A connection manager owns the socket, with reconnect and backoff.",
        "Incoming frames are written to the database; the UI observes the database only.",
        "An outbox drains pending messages whenever the socket is available.",
      ]),
      stage("state", "State ownership", "Nothing important lives in memory.", [
        "Database: messages, statuses, the outbox.",
        "ViewModel: derived list state, unread divider position, scroll-to-bottom affordance.",
        "Composition: the draft text, forwarded as events.",
      ]),
      stage("flow", "Data flow", "Trace a send while offline.", [
        "Type → tap send → insert PENDING with a localId → the bubble appears immediately → outbox waits.",
        "Reconnect → outbox sends with the idempotency key → ack returns serverId and serverSeq → row updates to SENT and takes its final position.",
        "A receipt frame arrives → status updated → the tick changes.",
      ]),
      stage("persist", "Persistence", "Paging backwards through history.", [
        "Room with an index on (conversationId, serverSeq desc) for the reverse-chronological query.",
        "History pages backwards by sequence; new messages arrive at the other end.",
        "Retention policy per conversation to bound growth.",
      ]),
      stage("cache", "Caching", "The database is the cache.", [
        "There is no separate cache layer; the database is it.",
        "Keep a bounded window in memory via paging; a long conversation must not be fully loaded.",
      ]),
      stage("concurrency", "Concurrency", "Ordering under concurrent writes.", [
        "Socket frames and outbox acknowledgements both write to the same rows — use transactions and upsert by localId or serverId.",
        "A single outbox coroutine per conversation keeps send order deterministic.",
        "Reconnect must not double-send: the idempotency key is what makes at-least-once delivery safe.",
      ]),
      stage("offline", "Offline behaviour", "Sending must feel identical.", [
        "Messages appear instantly with a pending indicator; nothing blocks.",
        "The composer is never disabled for lack of connectivity.",
        "Failed sends offer retry and are never silently dropped.",
      ]),
      stage("errors", "Error handling", "Failure per message, not per screen.", [
        "A rejected message (blocked recipient) becomes FAILED with a reason the user can act on.",
        "Socket drop is invisible: reconnect with backoff, and the outbox resumes.",
        "Clock skew is why `serverSeq`, not `createdAtLocal`, decides order.",
      ]),
      stage("perf", "Performance", "Long lists, frequent updates.", [
        "Reverse layout with stable keys; paging so the list never holds the whole history.",
        "Status updates must touch one row, not re-emit the whole list — a partial diff, not a full refresh.",
        "Typing indicators throttled; they are the highest-frequency, lowest-value traffic on the screen.",
      ]),
      stage("a11y", "Accessibility", "Receipts and incoming messages.", [
        "Status conveyed as text to screen readers, not only as tick glyphs.",
        "New incoming messages announced when the user is at the bottom, not when they are reading history.",
        "Each bubble is one semantic node including sender, time and status.",
      ]),
      stage("test", "Testing", "Ordering and idempotency.", [
        "Unit: ordering with out-of-order sequence arrival; outbox retry with duplicate acknowledgements.",
        "Integration: kill the process with a pending message and assert it sends on restart.",
        "UI: pending, failed and read states.",
      ]),
    ],
    solution: {
      mentalModel:
        "Chat is an outbox and an ordered log. The device generates identity, the server generates order, and the database reconciles the two.",
      whyItWorks: [
        "A client-generated idempotency key makes at-least-once delivery safe, which is the only delivery guarantee a mobile network can offer.",
        "Server sequence numbers make ordering independent of unreliable device clocks.",
      ],
      commonMistakes: [
        "Ordering by device timestamp.",
        "Optimistic messages with no durable identity, which duplicate on retry.",
        "Disabling the composer when offline.",
      ],
      followUps: ["How would you extend this to group chats without redesigning the outbox?"],
    },
  },
  {
    id: "sd05",
    slug: "design-uber-live-tracking",
    title: "Design Uber Live Driver Tracking",
    description:
      "A moving marker at 60fps, on a bad connection, without draining the battery.",
    difficulty: "Hard",
    format: "system-design",
    track: "System Design",
    topics: ["architecture", "networking", "performance", "flow"],
    estimatedMinutes: 60,
    completedCount: 3400,
    companyTags: ["Uber", "Lyft", "Google"],
    introducedInWeek: 9,
    designBrief:
      "Show a driver's position moving smoothly toward the rider while location updates arrive every three to five seconds over an unreliable connection.",
    designStages: [
      stage("req", "Requirements", "The core tension.", [
        "Updates arrive every 3–5s; the marker must appear continuous.",
        "Must degrade gracefully on connection loss and must not drain the battery.",
        "ETA updates, route polyline, and a clear indication when the position is stale.",
      ]),
      stage("model", "Data model", "Positions and freshness.", [
        "DriverPosition(lat, lng, bearing, speed, serverTimestamp, receivedAt)",
        "Keep the last few positions so interpolation has both a source and a target.",
        "Freshness is derived from `receivedAt`, and drives the stale indicator.",
      ]),
      stage("api", "API", "Push, not poll.", [
        "WebSocket or long-lived stream pushing positions; polling at this frequency is a battery and data cost with no benefit.",
        "Server sends the route polyline once and deltas thereafter.",
        "Heartbeats so the client can distinguish 'driver stopped' from 'connection dead'.",
      ]),
      stage("arch", "Architecture", "Separate transport from animation.", [
        "A LocationStream repository exposing `Flow<DriverPosition>`.",
        "An animation layer that interpolates between the last two positions on a frame clock.",
        "The ViewModel exposes trip state; the map layer consumes positions directly to avoid routing 60fps updates through recomposition.",
      ]),
      stage("state", "State ownership", "Frame-rate state does not belong in a StateFlow.", [
        "Trip state (driver, ETA, status) in the ViewModel.",
        "Interpolated marker position in an `Animatable` owned by the map composable — updating a StateFlow sixty times a second recomposes the world.",
        "Camera position owned by the map, with a user-override flag so auto-follow stops when the user pans.",
      ]),
      stage("flow", "Data flow", "From socket to pixel.", [
        "Socket → repository Flow → animation layer sets a new target → `Animatable` animates toward it on the frame clock → marker draws.",
        "Because `animateTo` retargets from the current value and velocity, an update arriving mid-animation produces a smooth course correction rather than a jump.",
      ]),
      stage("persist", "Persistence", "Almost nothing.", [
        "Trip identity and status persist so a restart restores the screen.",
        "Position history is transient — a stale position is worse than none.",
      ]),
      stage("cache", "Caching", "Map tiles and route.", [
        "Tiles cached by the map SDK.",
        "Route polyline cached for the trip and re-requested only when the route changes.",
      ]),
      stage("concurrency", "Concurrency", "One animation, many updates.", [
        "Updates arriving faster than animation completes must retarget, never queue — a queue makes the marker fall behind reality.",
        "Reconnect with backoff; on reconnect, snap rather than animate if the gap is large, because a long smooth glide across the city is a lie.",
      ]),
      stage("offline", "Offline behaviour", "Be honest.", [
        "After ~15s with no update, mark the position stale and stop animating.",
        "Show last-known position with a timestamp rather than a plausible-looking moving marker.",
        "Never extrapolate beyond the data — an extrapolated driver that turns out to be stationary destroys trust.",
      ]),
      stage("errors", "Error handling", "Connection is the failure mode.", [
        "Silent reconnect with backoff; surface only sustained loss.",
        "Distinguish 'driver stopped' from 'we lost the connection' using heartbeats.",
      ]),
      stage("perf", "Performance", "Battery is a first-class budget.", [
        "Animate in the map layer, outside composition. Use `graphicsLayer`/marker APIs rather than recomposing.",
        "Reduce update frequency when the app is backgrounded; stop entirely when not visible.",
        "Measure with the battery historian and the frame timeline, not by feel.",
      ]),
      stage("a11y", "Accessibility", "A map is not usable by everyone.", [
        "A non-map textual alternative: 'Driver is 4 minutes away, approaching on High Street.'",
        "Announce meaningful changes — arrival, delay — not every position update.",
        "Ensure ETA and status are readable independently of the map.",
      ]),
      stage("test", "Testing", "Simulate the network.", [
        "Unit: interpolation maths, staleness thresholds, retarget behaviour.",
        "Integration: a scripted stream with gaps, bursts and out-of-order arrivals.",
        "Manual: airplane-mode mid-trip, and a two-minute gap.",
      ]),
    ],
    solution: {
      mentalModel:
        "Two clocks: the network's (every few seconds, irregular) and the display's (every 16ms, relentless). The design is the bridge between them, and the honesty rule is that the bridge must never invent data.",
      whyItWorks: [
        "Interpolation in the animation layer keeps 60fps work out of recomposition entirely.",
        "Retargeting rather than queueing keeps the marker tracking reality.",
        "An explicit staleness threshold keeps the UI truthful when data stops.",
      ],
      commonMistakes: [
        "Pushing 60fps positions through a StateFlow.",
        "Extrapolating a position when updates stop.",
        "Animating a long jump after reconnect instead of snapping.",
      ],
      followUps: ["How would you handle a driver update that arrives with an older timestamp than the current position?"],
    },
  },
];
