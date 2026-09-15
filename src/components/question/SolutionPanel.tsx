"use client";

import type { Question } from "@/lib/types";
import { CodePane } from "@/components/ui/code";
import { Card, Badge } from "@/components/ui/primitives";
import {
  IconLightbulb,
  IconCheck,
  IconAlert,
  IconRefresh,
  IconTimer,
  IconAndroid,
  IconQuiz,
  IconSpark,
} from "@/components/icons";
import type { ReactNode } from "react";

/**
 * The worked solution, in the order a good explanation goes: model first,
 * then a solution you would actually write, then the reasoning, then the
 * failure modes, then what it looks like in a real codebase.
 */
export function SolutionPanel({ question }: { question: Question }) {
  const s = question.solution;
  if (!s) return null;

  return (
    <div className="space-y-5">
      <Block
        n={1}
        icon={<IconLightbulb size={14} />}
        title="Mental model"
        tone="accent"
      >
        <p className="text-[13.5px] leading-relaxed text-fg-dim">{s.mentalModel}</p>
      </Block>

      {s.straightforward ? (
        <Block n={2} title={s.straightforward.label ?? "Straightforward solution"}>
          <CodePane
            code={s.straightforward.code}
            language={s.straightforward.language ?? "kotlin"}
          />
        </Block>
      ) : null}

      {s.improved ? (
        <Block n={s.straightforward ? 3 : 2} title={s.improved.label ?? "Improved solution"}>
          <CodePane
            code={s.improved.code}
            language={s.improved.language ?? "kotlin"}
          />
        </Block>
      ) : null}

      {s.lineByLine?.length ? (
        <Block n={4} title="Line by line">
          <ul className="space-y-3">
            {s.lineByLine.map((row, i) => (
              <li key={i} className="border-l-2 border-line-strong pl-3.5">
                <code className="block text-[12px] text-accent-soft">{row.line}</code>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {row.note}
                </p>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block n={5} icon={<IconCheck size={14} />} title="Why this approach works">
        <List items={s.whyItWorks} marker="accent" />
      </Block>

      <Block n={6} icon={<IconAlert size={14} />} title="Common mistakes" tone="warn">
        <List items={s.commonMistakes} marker="warn" />
      </Block>

      {s.alternatives?.length ? (
        <Block n={7} icon={<IconRefresh size={14} />} title="Alternative approaches">
          <div className="space-y-3">
            {s.alternatives.map((alt, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface-2/50 p-3.5">
                <div className="text-[13px] font-semibold text-fg-dim">{alt.title}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {alt.body}
                </p>
              </div>
            ))}
          </div>
        </Block>
      ) : null}

      {s.complexity ? (
        <Block n={8} icon={<IconTimer size={14} />} title="Complexity">
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Time · {s.complexity.time}</Badge>
            <Badge tone="violet">Space · {s.complexity.space}</Badge>
          </div>
          {s.complexity.note ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {s.complexity.note}
            </p>
          ) : null}
        </Block>
      ) : null}

      {s.inProduction ? (
        <Block
          n={9}
          icon={<IconAndroid size={14} />}
          title="How this appears in production Android code"
        >
          <p className="text-[13.5px] leading-relaxed text-fg-dim">{s.inProduction}</p>
        </Block>
      ) : null}

      {s.followUps?.length ? (
        <Block n={10} icon={<IconQuiz size={14} />} title="Interview follow-ups">
          <ul className="space-y-2.5">
            {s.followUps.map((f, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-fg-dim">
                <span className="mono-meta mt-[3px] shrink-0 text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}

function Block({
  n,
  title,
  icon,
  tone,
  children,
}: {
  n: number;
  title: string;
  icon?: ReactNode;
  tone?: "accent" | "warn";
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="mono-label text-faint">{String(n).padStart(2, "0")}</span>
        {icon ? (
          <span
            className={
              tone === "accent"
                ? "text-accent"
                : tone === "warn"
                  ? "text-medium"
                  : "text-subtle"
            }
          >
            {icon}
          </span>
        ) : null}
        <h3 className="text-[13.5px] font-semibold tracking-tight text-fg">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function List({
  items,
  marker,
}: {
  items: string[];
  marker: "accent" | "warn";
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
              marker === "accent" ? "bg-accent" : "bg-medium"
            }`}
          />
          <span className="text-[13.5px] leading-relaxed text-muted">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SolutionLock({
  onUnlock,
  reason,
}: {
  onUnlock: () => void;
  reason: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 border-dashed border-line-strong bg-surface/40 p-10 text-center">
      <span className="text-faint">
        <IconSpark size={24} />
      </span>
      <div>
        <h3 className="text-[14px] font-semibold text-fg-dim">Solution locked</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-subtle">
          {reason}
        </p>
      </div>
      <button
        type="button"
        onClick={onUnlock}
        className="mono-meta rounded-lg border border-line px-3 py-2 text-subtle transition-colors hover:border-line-strong hover:text-muted"
      >
        Reveal anyway
      </button>
    </Card>
  );
}
