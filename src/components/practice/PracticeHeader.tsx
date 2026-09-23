"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { ALL_QUESTIONS, QUESTION_COUNTS } from "@/data/questions";
import { TOPIC_MAP, topicLabel } from "@/data/topics";
import type { TopicId } from "@/lib/types";

/**
 * The heading has to agree with the list underneath it.
 *
 * Arriving from a module card at `/practice/?topic=oop` filters the list to
 * nine questions — but the header still announced "148 questions · All
 * Practice Questions", so the page read as though the filter had been
 * ignored. A heading that contradicts the content is worse than no heading:
 * it makes a working feature look broken.
 */
export function PracticeHeader() {
  const raw = useSearchParams().get("topic");
  // An unknown topic in the URL falls back to the unfiltered heading rather
  // than inventing a label for it.
  const topic = raw && TOPIC_MAP[raw as TopicId] ? (raw as TopicId) : null;

  if (!topic) {
    return (
      <PageHeader
        kicker={`${QUESTION_COUNTS.total} questions`}
        title="All Practice Questions"
        subtitle="Master Kotlin and Android through carefully designed coding, architecture, debugging, and interview exercises."
      />
    );
  }

  const count = ALL_QUESTIONS.filter((q) => q.topics.includes(topic)).length;
  const label = topicLabel(topic);

  return (
    <PageHeader
      kicker={`${count} question${count === 1 ? "" : "s"} · filtered`}
      title={label}
      subtitle={`Every ${label} exercise in the bank. Clear the topic filter below to browse all ${QUESTION_COUNTS.total}.`}
    />
  );
}
