# Android Academy

**Master Kotlin. Understand Android. Think like a senior engineer.**

An interactive learning and interview-preparation platform for Kotlin and Android
engineers. The aim is not to get anyone through an interview — it is to turn a
developer who can follow existing code into one who understands *why* the code
works, can reason about unfamiliar systems, and can defend an architectural
decision out loud.

Every topic eventually demands one of: **predict · implement · debug · explain ·
compare · design.**

---

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Signed out, the app needs no environment variables at all: it runs on seeded
local content and keeps progress in `localStorage`.

For a real account — progress that follows you across devices — see
[Accounts](#accounts-supabase) below.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

---

## What is here

| Area | Route | Notes |
| --- | --- | --- |
| Dashboard | `/` | Continue-learning card, today's plan, analytics, activity heatmap, review queue, weak areas |
| Learning path | `/learn/paths` | The 16-module Android Engineer Path with unlock state |
| Learn hubs | `/learn/kotlin` … | Kotlin, Android, Compose, Architecture, Coroutines & Flow |
| Day 1 lesson | `/lessons/day-1` | The full 120-minute guided session |
| Practice browser | `/practice` | Tabs, topic/difficulty/type/status filters, search |
| Question detail | `/practice/[slug]` | Five different experiences, by question format |
| Collections | `/practice/topic/[slug]` | Kotlin drills, Android challenges, code reading, code review, debugging, quizzes, interview coding |
| System design | `/system-design` | Nine long-form exercises, 14 stages each |
| Study plan | `/study-plans` | Twelve weeks at two hours a day |
| Bookmarks & notes | `/bookmarks` | |
| Progress | `/progress` | Mastery, difficulty split, streaks, recent attempts |
| Sign in | `/auth` | Email + password; stands outside the app shell |
| Settings | `/settings` | Account, persistence, runner status, reset/import |

### The six question experiences

The question page dispatches on `question.format`, and each mode is built around
a different demand:

- **Coding** — two-column layout, Monaco editor with Code / Tests / Notes tabs,
  Run and Submit, then a ten-part worked solution that unlocks after an attempt.
- **Code reading** — the code stays pinned while questions arrive one at a time.
  You must write an answer before the expert one is revealed.
- **Code review** — a pull request with a description, a file list and the
  context you would already hold. You comment on the lines you would comment on,
  choose a severity for each, and commit to approve / comment / request changes.
  Submitting reveals the reference review anchored to the same lines, and scores
  what you caught, what you missed, and where you weighted an issue differently
  to the reviewer. One of the six should be approved; blocking all six is the
  wrong answer.
- **Debugging** — the symptom, the broken code, and a diagnosis you have to
  commit to. Hints unlock one at a time; the root cause unlocks after you commit.
- **Quiz** — answering explains *every* option, including why each wrong one is
  wrong.
- **System design** — a 14-stage workbook. Each stage takes your answer before it
  shows a reference one.

---

## Seeded content

122 questions, all written for this platform rather than adapted:

| By track | | By format | | By difficulty | |
| --- | --- | --- | --- | --- | --- |
| Kotlin | 36 | Coding | 47 | Warmup | 3 |
| Android | 24 | Quiz | 31 | Easy | 28 |
| Architecture | 22 | Code reading | 17 | Medium | 61 |
| Compose | 16 | Debugging | 12 | Hard | 30 |
| Interview (DSA) | 15 | System design | 9 | | |
| System design | 9 | Code review | 6 | | |

Fifteen of those are coroutine and Flow questions specifically. Plus 16 path
modules, a 12-week study plan, and the complete Day 1 lesson (7 sections,
120 minutes, 40 blocks).

Two groups exist for competence at work rather than performance in an
interview. `src/data/questions/codeReview.ts` holds six pull requests to review
— the format has its own experience, described below. `src/data/questions/senior.ts`
holds the reading, migration and testing-judgement set: reading a ninety-line
sync layer you did not write, reading a nine-file change-set rather than a file,
planning a migration that can be stopped halfway, Compose/Fragment interop,
choosing what deserves a test, fakes over mocks, what a flaky test is telling
you, and testing at the right seam.

Content lives in `src/data/` as typed TypeScript. That is deliberate: it is
versioned with the code, reviewable in a pull request, and needs no round trip to
render. Only per-user state is a database concern.

---

## Architecture

```
.github/workflows/deploy.yml    build + deploy to GitHub Pages
src/
  app/            routes (App Router; fully static — no route handlers)
  components/
    shell/        sidebar, top bar, mobile bottom nav
    ui/           primitives + the Kotlin syntax highlighter
    dashboard/    stat panels and the activity heatmap
    practice/     question cards and the filtering browser
    question/     the six question experiences + Monaco editor
    lesson/       lesson block renderers and the Day 1 view
  data/           seeded content (questions, path, plan, lessons, profile)
  lib/
    types.ts      the domain model
    auth/         session, profile, sign in/up/out
    progress/     repository (local + Supabase), context, derived selectors
    kotlin-runner.ts
    supabase/
    basePath.ts
supabase/schema.sql
```

Two boundaries are worth knowing about.

**Persistence.** Everything the UI knows about saving is the `ProgressRepository`
interface (three methods). `LocalProgressRepository` backs the signed-out demo;
`SupabaseProgressRepository` backs a real account and writes only changed rows.
`ProgressProvider` chooses between them from the auth state, and swapping them
changes no components.

**Derived figures.** Nothing is stored twice. Mastery, accuracy, streaks, the
difficulty split and the review queue are all computed in
`src/lib/progress/selectors.ts` from one `ProgressState`, so no two numbers on a
screen can disagree.

---

## Kotlin execution

There is no Kotlin runtime in the browser, and running arbitrary code needs a
sandbox. So the default runner is an honest simulator: it measures how much of the
reference solution's vocabulary appears in your submission, reports per-test
results, and labels itself **Simulated** everywhere it surfaces. It never claims
to have compiled anything.

`runKotlin` in `src/lib/kotlin-runner.ts` is the entire integration surface. Set
`NEXT_PUBLIC_KOTLIN_RUNNER_URL` and the browser posts `{ code, tests }` to that
service and takes its verdict with `executed: true`. Because the site is a static
export there is no server of ours in the middle, so the service must send CORS
headers for the site's origin. If it is unreachable, the simulator answers rather
than blocking practice.

---

## Deploying to GitHub Pages

The whole app is pre-rendered — `output: "export"` in `next.config.ts` — so it
runs on any static host. Everything that needs a backend (accounts, progress)
talks to Supabase from the browser.

1. Push the repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Push to `main`. `.github/workflows/deploy.yml` builds and deploys.

The workflow works out the base path itself: `/<repo>` for a project page,
empty for a `<owner>.github.io` user site or when `public/CNAME` exists. Nothing
to configure by hand.

Then point Supabase at the deployed URL — **Authentication → URL Configuration**:

- Site URL: `https://<owner>.github.io/<repo>/`
- Redirect URLs: add both that and `http://localhost:3000/**` so local
  development keeps working.

### Two things to know before you publish

**The anon key ships in the bundle.** That is how Supabase is designed to work,
and it is only safe because row-level security decides what that key can reach.
`supabase/schema.sql` is what makes publishing safe; do not skip it.

**A public URL means anyone can sign up** against your project. Once your own
account exists, turn sign-ups off in **Authentication → Sign In / Providers →
Allow new users to sign up**. Visitors still get the full signed-out experience —
every question, every lesson, progress in their own browser.

### Building a project page locally

`npm run dev` always serves from `/`. To reproduce the deployed paths:

```bash
NEXT_PUBLIC_BASE_PATH=/android-learning npm run build
npx serve out          # or any static server
```

---

## Accounts (Supabase)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor. It creates the seven tables, the
   new-user trigger, and per-user RLS policies — every one of them
   `auth.uid() = user_id`.
3. In **Authentication → URL Configuration**, set Site URL to
   `http://localhost:3000`.
4. `cp env.example .env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. Restart the dev server and visit `/auth`.

The anon key belongs in the client — it is public by design. What protects your
rows is row-level security, which is why step 2 is not optional.

### How the two modes coexist

| | Signed out | Signed in |
| --- | --- | --- |
| Store | `localStorage` | Supabase, per user |
| Starting data | the generated demo history | empty |
| Scope | this browser | every device |

The provider picks the store from the auth state; no component knows which is
in use. Signing in does **not** silently absorb your local progress — if this
browser holds any, Settings offers an explicit import that never overwrites
what the account already has.

Writes are diffed against the last saved snapshot, so editing a note sends one
row rather than your entire history, and the top bar shows Saving / Saved /
Not saved rather than pretending writes always succeed.

### No email round trip

Supabase's *Confirm email* setting (Authentication → Providers → Email) decides
whether sign-up needs an inbox. With it on, the app shows a "check your email"
screen and the confirmation link brings you back signed in. With it off, sign-up
signs you straight in — usually what you want for a personal app.

---

## Design

A near-black developer-tool surface: elevated cards, restrained borders,
generous spacing, one bright chartreuse accent, and semantic colour reserved for
difficulty and state (green complete, orange medium, red/pink hard). Inter for
prose, JetBrains Mono for code, technical labels and question metadata.

Animations are quick and few — a completion check that pops, progress bars that
advance, a 2px sidebar marker that slides, cards that lift 2px on hover. All of it
collapses under `prefers-reduced-motion`.

Responsive by design, not by afterthought: a persistent rail on desktop, a drawer
on tablet, and a five-item bottom bar with single-column question layouts on
phones.

---

## Deliberately not done yet

- Real Kotlin execution (the boundary exists; the sandbox does not)
- Password reset and email change (Supabase supports both; no UI yet)
- Lessons for days 2–84 (Day 1 is complete and is the template)
- Mock interview mode with a timer

---

## Product principle

This is never a passive tutorial site. The question underneath everything is
**why** — why this operator, why this scope, why this state model, why this
architecture, and what breaks if you choose something else. The application
rewards understanding, not completion.
