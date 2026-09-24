import type { Metadata } from "next";
import { ReviewSession } from "@/components/review/ReviewSession";

export const metadata: Metadata = {
  title: "Review",
  description:
    "Concepts brought back at widening intervals, each in a form you have not seen recently.",
};

export default function ReviewPage() {
  return <ReviewSession />;
}
