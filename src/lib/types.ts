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
  | "feature"
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
  | "execution"
  | "coroutines"
  | "flow"
  | "lifecycle"
  | "viewmodel"
  | "compose"
  | "architecture"
  | "networking"
  | "data-modelling"
  | "sql"
  | "room"
  | "repositories"
  | "offline"
  | "di"
  | "dagger"
  | "testing"
  | "gradle"
  | "ci-cd"
  | "git"
  | "observability"
  | "performance"
  | "codebase"
  | "ownership"
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

/* ------------------------ Mastery & ownership ----------------------- */

/**
 * What a learner can currently do with a concept — not how much of its
 * material they have seen. The order is the whole point: recognising a
 * word is not explaining it, and explaining it is not being able to
 * choose it over the alternatives.
 */
export type MasteryStage =
  | "recognise"
  | "explain"
  | "predict"
  | "implement"
  | "reason";

export const MASTERY_STAGES: MasteryStage[] = [
  "recognise",
  "explain",
  "predict",
  "implement",
  "reason",
];

/** How much of a feature the learner could carry on their own. */
export type OwnershipLevel =
  | "follow"
  | "implement"
  | "design"
  | "own"
  | "improve";

export const OWNERSHIP_LEVELS: OwnershipLevel[] = [
  "follow",
  "implement",
  "design",
  "own",
  "improve",
];

/**
 * Derived, never stored: a label computed from which stages are cleared.
 * Storing it alongside them would be a second copy of the same fact, and
 * the two would disagree the first time one was updated without the other.
 */
export type ConceptProficiency =
  | "Not Started"
  | "Learning"
  | "Practising"
  | "Proficient"
  | "Mastered";

/**
 * A single idea the curriculum teaches, and what it depends on. The
 * prerequisite edges are what make the knowledge graph a graph rather than
 * a list — and what lets the app say *why* something is not next yet.
 */
export interface Concept {
  id: string;
  name: string;
  /** One sentence: what it is. */
  definition: string;
  /** One sentence: the problem it exists to solve. */
  why: string;
  /** The module that introduces it. */
  moduleId: string;
  topics: TopicId[];
  /** Concept ids that should come first. */
  prerequisites?: string[];
  /** Deeper treatment in the glossary, where one exists. */
  glossaryId?: string;
}

/** Which stages a learner has cleared for one concept. */
export interface ConceptMastery {
  conceptId: string;
  recognise: boolean;
  explain: boolean;
  predict: boolean;
  implement: boolean;
  reason: boolean;
  lastReviewedAt?: string;
  /** When spaced repetition should bring this back. */
  nextReviewAt?: string;
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

  /** Which stage of understanding this question actually exercises. */
  stage?: MasteryStage;
  /** How much of the work the learner owns in this exercise. */
  ownership?: OwnershipLevel;
  /** Concept ids this question practises — the link into the graph. */
  concepts?: string[];
  /** Concept ids worth clearing first. */
  prerequisites?: string[];

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

export interface PipelineStage {
  label: string;
  /** The one-line version, for someone who already knows the term. */
  caption?: string;
  /** Glossary entry id — what the stage expands into for everyone else. */
  term?: string;
}

/**
 * A term explained for someone who has shipped features without ever being
 * told why the layers exist. The three required fields are the whole point:
 * a definition that says only what a thing *is* leaves you unable to decide
 * whether you need it.
 */
export interface GlossaryEntry {
  id: string;
  term: string;
  /** Spelled out, where an acronym hides the meaning. */
  expansion?: string;
  /** What it is, in plain words. */
  what: string[];
  /** The problem that forces it to exist. */
  why: string[];
  /** What concretely breaks if you delete it. */
  breaks: string;
  /** Deliberately a different domain per term, so the idea travels. */
  example?: CodeBlock;
  /** The size below which this layer is ceremony rather than architecture. */
  overkillWhen?: string;
  /** Other entries worth reading next. */
  related?: string[];
}

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
  stages?: PipelineStage[];
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

/** How a graded free-text answer came out. */
export type AnswerVerdict = "strong" | "partial" | "off-track";

/**
 * What the learner actually wrote, kept so revisiting a lesson block or a
 * question shows their own words rather than a bare "answered earlier".
 * The verdict and feedback are cached alongside it because grading costs a
 * real API call -- re-reading your own answer should not re-charge for it.
 */
export interface SavedAnswer {
  ref: string;
  body: string;
  verdict?: AnswerVerdict;
  feedback?: string;
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
  /** Keyed by ref: `lesson:<lessonId>#<blockId>` or `question:<slug>#<partId>`. */
  answers: Record<string, SavedAnswer>;
  /** Keyed by concept id. */
  conceptMastery: Record<string, ConceptMastery>;
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
