import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LESSONS, getLesson } from "@/data/lessons/day1";
import { LessonView } from "@/components/lesson/LessonView";

/** Static export: only the paths generated below exist as files. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Lesson" };
  return { title: `Day ${lesson.dayNumber} · ${lesson.title}`, description: lesson.goal };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  return <LessonView lesson={lesson} />;
}
