/* ------------------------------------------------------------------
   Android Academy — domain model
   These types are the contract between seeded content, the progress
   store and the UI. The Supabase schema in supabase/schema.sql mirrors
   them one-for-one so persistence can be swapped without touching
   components.
   ------------------------------------------------------------------ */

export type Difficulty = "Warmup" | "Easy" | "Medium" | "Hard";

export type QuestionFormat =
  | "coding"
  | "code-reading"
  | "code-review"
  | "debugging"
  | "quiz"
  | "system-design";

/** The lens a question is filed under — "what kind of engineer work is this?" */
export type QuestionTrack =
  | "Kotlin"
  | "Android"
  | "Compose"
  | "Architecture"
  | "Interview"
  | "System Design";

export type TopicId =
  | "kotlin"
  | "collections"
  | "oop"
  | "generics"
  | "coroutines"
  | "flow"
  | "lifecycle"
  | "viewmodel"
  | "compose"
  | "architecture"
  | "networking"
  | "room"
  | "testing"
  | "performance"
  | "dsa";

export interface Topic {
  id: TopicId;
  label: string;
  blurb: string;
  /** Which nav hub this topic surfaces under. */
  hub: LearnHubId;
}

export type LearnHubId =
  | "kotlin"
  | "android"
  | "compose"
  | "architecture"
  | "coroutines-flow";

export type QuestionStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "bookmarked";

/* ---------------------------- Questions ---------------------------- */

export interface TestCase {
  name: string;
  /** Human-readable call, shown in the Tests tab. */
  call: string;
  expected: string;
  hidden?: boolean;
}

export interface WorkedSolution {
  /** The one-paragraph mental model the learner should walk away with. */
  mentalModel: string;
  straightforward?: CodeBlock;
  improved?: CodeBlock;
  /** Line-by-line commentary keyed to the improved solution. */
  lineByLine?: { line: string; note: string }[];
  whyItWorks: string[];
  commonMistakes: string[];
  alternatives?: { title: string; body: string }[];
  complexity?: { time: string; space: string; note?: string };
  inProduction?: string;
  followUps?: string[];
}

export interface CodeBlock {
  label?: string;
  language?: "kotlin" | "sql" | "text";
  code: string;
}

export interface QuizChoice {
  id: string;
  body: string;
  correct: boolean;
  /** Why this choice is right — or precisely why it is wrong. */
  rationale: string;
}

export interface CodeReadingPrompt {
  id: string;
  question: string;
  /** What a strong answer contains — revealed after the learner commits. */
  expert: string;
  /** Optional keywords used to give the learner a self-assessment nudge. */
  keywords?: string[];
}

export interface DebugHint {
  label: string;
  body: string;
}

/* --------------------------- Code review ---------------------------- */

/**
 * Knowing what to block on is most of the skill. A reviewer who marks
 * everything `blocking` is routed around within a month; one who never
 * does is not actually reviewing.
 */
export type ReviewSeverity = "blocking" | "should-fix" | "nit" | "praise";

export interface ReviewFinding {
  id: string;
  /** 1-based line into `reviewCode` this comment is anchored to. */
  line: number;
  /** For an issue that spans a block rather than a statement. */
  throughLine?: number;
  severity: ReviewSeverity;
  /** The headline a reviewer would actually leave on the line. */
  summary: string;
  /** The reasoning — why it matters, not merely what is wrong. */
  detail: string;
  /** Terms a learner's own note tends to contain once they have seen it. */
  keywords?: string[];
}

export interface CodeReviewBrief {
  prTitle: string;
  author: string;
  /** The description as its author wrote it. Occasionally misleading. */
  description: string[];
  filesChanged?: string[];
  /** Any context a reviewer would already hold about this codebase. */
  context?: string[];
}

export interface ReviewVerdict {
  decision: "approve" | "comment" | "request-changes";
  rationale: string;
}

export interface SystemDesignStage {
  id: string;
  title: string;
  prompt: string;
  /** Reference answer — the bar a strong candidate would clear. */
  reference: string[];
  /** Things interviewers listen for. */
  signals?: string[];
}

export interface Question {
  id: string;
  title: string;
  slug: string;
  /** One-line card description. */
  description: string;
  difficulty: Difficulty;
  format: QuestionFormat;
  track: QuestionTrack;
  topics: TopicId[];
  estimatedMinutes: number;
  companyTags?: string[];
  /** Rough social proof for the browser cards. */
  completedCount?: number;

  /* Long-form problem body (coding, debugging, code-reading) */
  prompt?: string;
  requirements?: string[];
  examples?: { input: string; output: string; note?: string }[];
  constraints?: string[];
  relatedConcepts?: string[];

  /* Coding */
  starterCode?: string;
  solutionCode?: string;
  tests?: TestCase[];

  /* Debugging */
  brokenCode?: string;
  symptom?: string;
  debugHints?: DebugHint[];
  rootCause?: string;
  fixedCode?: string;
  productionImplications?: string[];

  /* Code reading */
  readingCode?: string;
  readingPrompts?: CodeReadingPrompt[];

  /* Code review */
  review?: CodeReviewBrief;
  reviewCode?: string;
  reviewFindings?: ReviewFinding[];
  reviewVerdict?: ReviewVerdict;

  /* Quiz */
  quizStem?: string;
  quizCode?: string;
  choices?: QuizChoice[];

  /* System design */
  designBrief?: string;
  designStages?: SystemDesignStage[];

  /* Shared */
  hints?: string[];
  solution?: WorkedSolution;
  /** Spaced repetition: which week first introduced the idea. */
  introducedInWeek?: number;
}

/* ------------------------- Path and lessons ------------------------ */

export interface Module {
  id: string;
  index: number;
  title: string;
  summary: string;
  difficulty: Difficulty;
  lessonCount: number;
  exerciseCount: number;
  estimatedHours: number;
  topics: TopicId[];
  /** Modules unlock in order; the first two are open from day one. */
  unlockedByDefault?: boolean;
  outcomes: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  modules: Module[];
}

export type LessonBlockKind =
  | "prose"
  | "code"
  | "predict"
  | "explain"
  | "compare"
  | "diagram"
  | "pipeline"
  | "mutation"
  | "callout"
  | "implement"
  | "quiz";

export interface LessonBlock {
  id: string;
  kind: LessonBlockKind;
  title?: string;
  /** Paragraphs of teaching copy. */
  body?: string[];
  code?: CodeBlock;
  /** predict / explain */
  question?: string;
  answer?: string;
  /** predict — the exact value to type, compared loosely. */
  expected?: string;
  /** explain — terms a strong written answer tends to contain. */
  keywords?: string[];
  /** compare */
  compare?: { label: string; code: string; verdict: string }[];
  /** callout */
  tone?: "insight" | "warning" | "why";
  /** quiz */
  choices?: QuizChoice[];
  /** implement — links to a question in the bank. */
  questionSlug?: string;
  /** pipeline / diagram payloads */
  stages?: { label: string; caption?: string }[];
  steps?: { label: string; items: string[] }[];
}

export interface LessonSection {
  id: string;
  title: string;
  /** Minute offsets within the 120-minute session. */
  startMinute: number;
  endMinute: number;
  kicker: string;
  blocks: LessonBlock[];
}

export interface Lesson {
  id: string;
  slug: string;
  dayNumber: number;
  moduleId: string;
  title: string;
  subtitle: string;
  goal: string;
  concepts: string[];
  totalMinutes: number;
  sections: LessonSection[];
}

/* --------------------------- Study plan ---------------------------- */

export interface StudyWeek {
  week: number;
  theme: string;
  focus: string;
  kotlin: string[];
  android: string[];
  interview: string[];
  project?: string;
  outcome: string;
}

export interface DailyPlanSlot {
  label: string;
  minutes: number;
  topic: string;
  accent: "kotlin" | "android" | "interview";
  href: string;
}

export interface DailyPlan {
  date: string;
  targetMinutes: number;
  completedMinutes: number;
  slots: DailyPlanSlot[];
}

/* --------------------------- Progress ------------------------------ */

export type MasteryLevel =
  | "Not Started"
  | "Learning"
  | "Practising"
  | "Proficient"
  | "Mastered";

export interface QuestionAttempt {
  questionSlug: string;
  attempts: number;
  solved: boolean;
  /** Correctness of the last graded interaction, where gradeable. */
  lastCorrect?: boolean;
  lastRuntimeMs?: number;
  passedTests?: number;
  totalTests?: number;
  updatedAt: string;
  code?: string;
}

export interface Bookmark {
  ref: string;
  kind: "question" | "lesson";
  createdAt: string;
}

export interface Note {
  ref: string;
  body: string;
  updatedAt: string;
}

export interface StudySession {
  date: string;
  minutes: number;
}

export interface TopicMastery {
  topic: TopicId;
  percent: number;
  level: MasteryLevel;
  solved: number;
  total: number;
}

export interface ReviewItem {
  topic: TopicId;
  label: string;
  dueCount: number;
  reason: string;
  slugs: string[];
}

export interface ProgressState {
  attempts: Record<string, QuestionAttempt>;
  bookmarks: Bookmark[];
  notes: Record<string, Note>;
  lessonProgress: Record<string, { completedBlocks: string[]; completedAt?: string }>;
  sessions: StudySession[];
  /** Seeded so the dashboard is populated on first run. */
  streak: { current: number; longest: number; lastActiveDate: string };
}

export interface UserProfile {
  id: string;
  displayName: string;
  handle: string;
  role: string;
  goal: string;
  dailyTargetMinutes: number;
  joinedAt: string;
}
