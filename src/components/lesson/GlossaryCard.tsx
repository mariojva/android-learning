"use client";

import type { GlossaryEntry } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { glossaryEntry } from "@/data/glossary";
import { IconQuiz, IconAlert, IconLightbulb, IconSpark } from "@/components/icons";

/* ------------------------------------------------------------------
   One term, explained in the order that actually teaches it.

   what -> why -> what breaks without it. The third part is the one
   usually missing, and it is the one that lets you decide whether you
   need the thing at all — which is why `overkillWhen` sits right
   underneath it rather than being left implied.
   ------------------------------------------------------------------ */

export function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <div className="space-y-4">
      {entry.expansion ? (
        <p className="mono-meta text-faint">{entry.expansion}</p>
      ) : null}

      <Part icon={<IconQuiz size={12} />} label="What it is" tone="text-info">
        {entry.what.map((p, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed text-fg-dim">
            {p}
          </p>
        ))}
      </Part>

      <Part
        icon={<IconLightbulb size={12} />}
        label="Why it exists"
        tone="text-accent"
      >
        {entry.why.map((p, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed text-fg-dim">
            {p}
          </p>
        ))}
      </Part>

      <Part
        icon={<IconAlert size={12} />}
        label="What breaks without it"
        tone="text-medium"
      >
        <p className="text-[13.5px] leading-relaxed text-fg-dim">{entry.breaks}</p>
      </Part>

      {entry.example ? (
        <CodePane
          code={entry.example.code}
          caption={entry.example.label}
          language={entry.example.language ?? "kotlin"}
          maxHeight={420}
        />
      ) : null}

      {entry.overkillWhen ? (
        <div className="rounded-lg border border-line bg-surface-2/50 p-3.5">
          <div className="mono-label mb-2 flex items-center gap-2 text-subtle">
            <IconSpark size={11} />
            When it is overkill
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            {entry.overkillWhen}
          </p>
        </div>
      ) : null}

      {entry.related?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mono-label mr-1 text-subtle">See also</span>
          {entry.related.map((id) => {
            const other = glossaryEntry(id);
            if (!other) return null;
            return (
              <span
                key={id}
                className="mono-meta rounded-md bg-surface-2 px-2 py-[3px] text-muted ring-1 ring-inset ring-line-strong"
              >
                {other.term}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Part({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`mono-label mb-2 flex items-center gap-2 ${tone}`}>
        {icon}
        {label}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
