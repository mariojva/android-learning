import type { LearnHubId, Topic, TopicId } from "@/lib/types";

export const TOPICS: Topic[] = [
  {
    id: "kotlin",
    label: "Kotlin",
    blurb: "Language semantics: references, nullability, types, equality.",
    hub: "kotlin",
  },
  {
    id: "collections",
    label: "Collections",
    blurb: "Transformations, grouping, folding, and when eagerness costs you.",
    hub: "kotlin",
  },
  {
    id: "oop",
    label: "OOP & Sealed Types",
    blurb: "Modelling with data classes, sealed hierarchies and delegation.",
    hub: "kotlin",
  },
  {
    id: "generics",
    label: "Generics",
    blurb: "Variance, reified types, and the inline/crossinline machinery.",
    hub: "kotlin",
  },
  {
    id: "coroutines",
    label: "Coroutines",
    blurb: "Structured concurrency, scopes, cancellation, exception flow.",
    hub: "coroutines-flow",
  },
  {
    id: "flow",
    label: "Flow",
    blurb: "Cold vs hot streams, operators, sharing and back-pressure.",
    hub: "coroutines-flow",
  },
  {
    id: "lifecycle",
    label: "Android Lifecycle",
    blurb: "Process death, configuration change, and who owns what.",
    hub: "android",
  },
  {
    id: "viewmodel",
    label: "ViewModel",
    blurb: "State ownership, events, SavedStateHandle, scope boundaries.",
    hub: "android",
  },
  {
    id: "compose",
    label: "Jetpack Compose",
    blurb: "Composition, recomposition, effects, stability and skipping.",
    hub: "compose",
  },
  {
    id: "architecture",
    label: "Architecture",
    blurb: "Layer boundaries, models per layer, dependency inversion.",
    hub: "architecture",
  },
  {
    id: "networking",
    label: "Networking",
    blurb: "HTTP semantics, serialisation, error taxonomy, pagination.",
    hub: "architecture",
  },
  {
    id: "room",
    label: "Room & Offline",
    blurb: "Single source of truth, sync, cache invalidation, WorkManager.",
    hub: "architecture",
  },
  {
    id: "testing",
    label: "Testing",
    blurb: "Turbine, test dispatchers, fakes over mocks, Compose tests.",
    hub: "architecture",
  },
  {
    id: "performance",
    label: "Performance",
    blurb: "Recomposition counts, startup, jank, memory, ANRs.",
    hub: "android",
  },
  {
    id: "dsa",
    label: "Data Structures & Algorithms",
    blurb: "Interview patterns, written exclusively in Kotlin.",
    hub: "kotlin",
  },
];

export const TOPIC_MAP: Record<TopicId, Topic> = TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TopicId, Topic>,
);

export function topicLabel(id: TopicId): string {
  return TOPIC_MAP[id]?.label ?? id;
}

export const LEARN_HUBS: Record<
  LearnHubId,
  { title: string; tagline: string; topics: TopicId[] }
> = {
  kotlin: {
    title: "Kotlin",
    tagline:
      "The language beneath the framework. Most Android bugs are Kotlin misunderstandings wearing an Android costume.",
    topics: ["kotlin", "collections", "oop", "generics", "dsa"],
  },
  android: {
    title: "Android",
    tagline:
      "Lifecycles, state ownership and the platform contracts you cannot opt out of.",
    topics: ["lifecycle", "viewmodel", "performance"],
  },
  compose: {
    title: "Jetpack Compose",
    tagline:
      "A function of state, recomposed. Learn what the runtime actually does before learning its APIs.",
    topics: ["compose"],
  },
  architecture: {
    title: "Architecture",
    tagline:
      "Where a decision belongs, which model crosses which boundary, and what each layer is allowed to know.",
    topics: ["architecture", "networking", "room", "testing"],
  },
  "coroutines-flow": {
    title: "Coroutines & Flow",
    tagline:
      "Structured concurrency and reactive streams — the two ideas that carry almost all modern Android data flow.",
    topics: ["coroutines", "flow"],
  },
};
