import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { QuestionBrowser } from "@/components/practice/QuestionBrowser";
import { QUESTION_COUNTS } from "@/data/questions";

export const metadata: Metadata = {
  title: "All Practice Questions",
  description:
    "Master Kotlin and Android through carefully designed coding, architecture, debugging, and interview exercises.",
};

export default function PracticePage() {
  return (
    <div>
      <PageHeader
        kicker={`${QUESTION_COUNTS.total} questions`}
        title="All Practice Questions"
        subtitle="Master Kotlin and Android through carefully designed coding, architecture, debugging, and interview exercises."
      />
      <Suspense fallback={<div className="h-64" />}>
        <QuestionBrowser />
      </Suspense>
    </div>
  );
}
