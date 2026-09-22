import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";
import {
  IconDashboard,
  IconPath,
  IconBraces,
  IconAndroid,
  IconLayers,
  IconBlueprint,
  IconFlow,
  IconList,
  IconTarget,
  IconTerminal,
  IconBug,
  IconQuiz,
  IconSitemap,
  IconCalendar,
  IconBookmark,
  IconChart,
  IconTrophy,
  IconSettings,
  IconBook,
  IconGrid,
  IconEye,
} from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
  /** Shown as a small monospace count on the right. */
  badge?: "questions" | "bookmarks" | "review";
}

export interface NavGroup {
  label?: string;
  icon?: ComponentType<IconProps>;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/", icon: IconDashboard },
      { label: "Knowledge Graph", href: "/knowledge-graph", icon: IconSitemap },
    ],
  },
  {
    label: "Learn",
    icon: IconBook,
    items: [
      { label: "Learning Paths", href: "/learn/paths", icon: IconPath },
      { label: "Kotlin", href: "/learn/kotlin", icon: IconBraces },
      { label: "Android", href: "/learn/android", icon: IconAndroid },
      { label: "Jetpack Compose", href: "/learn/compose", icon: IconLayers },
      { label: "Architecture", href: "/learn/architecture", icon: IconBlueprint },
      { label: "Coroutines & Flow", href: "/learn/coroutines-flow", icon: IconFlow },
    ],
  },
  {
    label: "Practice",
    icon: IconTarget,
    items: [
      { label: "All Questions", href: "/practice", icon: IconList, badge: "questions" },
      { label: "Kotlin Drills", href: "/practice/topic/kotlin-drills", icon: IconBraces },
      { label: "Android Challenges", href: "/practice/topic/android-challenges", icon: IconAndroid },
      { label: "Code Reading", href: "/practice/topic/code-reading", icon: IconBook },
      { label: "Code Review", href: "/practice/topic/code-review", icon: IconEye },
      { label: "Feature Assignments", href: "/practice/topic/feature", icon: IconTarget },
      { label: "Debugging", href: "/practice/topic/debugging", icon: IconBug },
      { label: "Quizzes", href: "/practice/topic/quizzes", icon: IconQuiz },
      { label: "Interview Coding", href: "/practice/topic/interview-coding", icon: IconTerminal },
    ],
  },
  {
    items: [
      { label: "System Design", href: "/system-design", icon: IconSitemap },
      { label: "Study Plans", href: "/study-plans", icon: IconCalendar },
      { label: "Bookmarks", href: "/bookmarks", icon: IconBookmark, badge: "bookmarks" },
      { label: "Progress", href: "/progress", icon: IconChart },
      { label: "Mid-Level Readiness", href: "/readiness", icon: IconTrophy },
      { label: "Settings", href: "/settings", icon: IconSettings },
    ],
  },
];

/** Five destinations for the mobile bottom bar. */
export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: IconDashboard },
  { label: "Learn", href: "/learn/paths", icon: IconPath },
  { label: "Practice", href: "/practice", icon: IconGrid },
  { label: "Design", href: "/system-design", icon: IconSitemap },
  { label: "Progress", href: "/progress", icon: IconChart },
];

/** Practice sub-collections, addressed as /practice/topic/<slug>. */
export const PRACTICE_COLLECTIONS: Record<
  string,
  {
    title: string;
    subtitle: string;
    format?: string;
    track?: string;
    topics?: string[];
  }
> = {
  "kotlin-drills": {
    title: "Kotlin Drills",
    subtitle:
      "Short exercises on language behaviour — collections, types, nullability, functional style.",
    track: "Kotlin",
  },
  "android-challenges": {
    title: "Android Challenges",
    subtitle:
      "Production-shaped problems: search, pagination, offline writes, token refresh, state ownership.",
    track: "Android",
  },
  "code-reading": {
    title: "Code Reading",
    subtitle:
      "Realistic Kotlin and Android code. Explain what it does, what it costs, and what breaks.",
    format: "code-reading",
  },
  "code-review": {
    title: "Code Review",
    subtitle:
      "Somebody else's pull request. Say what you would say on the line you would say it, then compare.",
    format: "code-review",
  },
  feature: {
    title: "Feature Assignments",
    subtitle:
      "An ambiguous requirement and no instructions. Decide the design, the tests, the failure behaviour and the way back.",
    format: "feature",
  },
  debugging: {
    title: "Debugging",
    subtitle:
      "Deliberately broken implementations. Find the fault before the hints unlock.",
    format: "debugging",
  },
  quizzes: {
    title: "Quizzes",
    subtitle:
      "Conceptual questions where every option is explained — including why the wrong ones are wrong.",
    format: "quiz",
  },
  "interview-coding": {
    title: "Interview Coding",
    subtitle: "Data structures and algorithms in Kotlin, organised by pattern.",
    track: "Interview",
  },
};
