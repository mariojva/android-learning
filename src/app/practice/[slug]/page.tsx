import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ALL_QUESTIONS, getQuestion } from "@/data/questions";
import { QuestionView } from "@/components/question/QuestionView";

/** Static export: only the paths generated below exist as files. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_QUESTIONS.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = getQuestion(slug);
  if (!question) return { title: "Question" };
  return { title: question.title, description: question.description };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const question = getQuestion(slug);
  if (!question) notFound();

  return <QuestionView question={question} />;
}
