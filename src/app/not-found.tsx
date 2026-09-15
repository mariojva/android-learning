import Link from "next/link";
import { Card } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <div className="mono-label mb-4 text-accent">404</div>
        <h1 className="text-[20px] font-semibold tracking-tight text-fg">
          Nothing here
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
          That page does not exist. The question bank, the path and the study plan
          all do.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
          >
            Dashboard
          </Link>
          <Link
            href="/practice"
            className="inline-flex h-9 items-center rounded-lg bg-surface-2 px-4 text-[13px] text-fg-dim ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-3 hover:text-fg"
          >
            All questions
          </Link>
        </div>
      </Card>
    </div>
  );
}
