import { Suspense } from "react";
import type { Metadata } from "next";
import { QuestionBrowser } from "@/components/practice/QuestionBrowser";
import { PracticeHeader } from "@/components/practice/PracticeHeader";

export const metadata: Metadata = {
  title: "All Practice Questions",
  description:
    "Master Kotlin and Android through carefully designed coding, architecture, debugging, and interview exercises.",
};

export default function PracticePage() {
  return (
    <div>
      {/* Both of these read the topic query parameter, so both sit inside
          the Suspense boundary a static export requires. */}
      <Suspense fallback={<div className="h-64" />}>
        <PracticeHeader />
        <QuestionBrowser />
      </Suspense>
    </div>
  );
}
