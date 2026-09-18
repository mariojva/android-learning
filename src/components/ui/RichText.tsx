"use client";

import { Fragment, useState, type ReactNode } from "react";
import { glossaryEntry } from "@/data/glossary";
import { GlossaryCard } from "@/components/lesson/GlossaryCard";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Inline formatting for content strings.

   The content was always authored with `code` and **bold** in it; until
   now nothing rendered them, so the markers were printed literally. This
   is the renderer they were written for.

   It also carries [[term]], which is the whole point of adding it here
   rather than reaching for a markdown library: a term anywhere in the
   prose can open its glossary entry in place, so vocabulary gets
   explained where it is first used instead of in an appendix nobody
   opens.

   Supported, deliberately a closed set:
     `code`              inline code
     **bold**
     *italic*
     [[term-id]]         glossary term, shown by its own name
     [[term-id|words]]   glossary term, shown as `words`
   ------------------------------------------------------------------ */

type Token =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "term"; id: string; label: string };

// Order matters: ** must be attempted before *, or bold parses as two italics.
const PATTERN =
  /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;

export function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;

  for (const match of input.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) {
      tokens.push({ kind: "text", value: input.slice(last, start) });
    }

    const [, termId, termLabel, code, bold, italic] = match;
    if (termId !== undefined) {
      const entry = glossaryEntry(termId);
      tokens.push({
        kind: "term",
        id: termId,
        // An unknown id must not silently vanish from the sentence.
        label: termLabel ?? entry?.term ?? termId,
      });
    } else if (code !== undefined) {
      tokens.push({ kind: "code", value: code });
    } else if (bold !== undefined) {
      tokens.push({ kind: "bold", value: bold });
    } else if (italic !== undefined) {
      tokens.push({ kind: "italic", value: italic });
    }

    last = start + match[0].length;
  }

  if (last < input.length) {
    tokens.push({ kind: "text", value: input.slice(last) });
  }
  return tokens;
}

/**
 * Renders no wrapper of its own. An opened term expands into a card, which
 * is block content, so it cannot sit inside a `<p>` — callers pass a block
 * element and this drops its tokens straight into it. That is also why the
 * lesson renderers use `div` rather than `p` for body copy.
 */
export function RichText({ children }: { children: string | undefined }) {
  if (!children) return null;
  const tokens = tokenise(children);

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.kind) {
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-surface-2 px-[5px] py-[2px] font-mono text-[0.9em] text-accent-soft"
              >
                {token.value}
              </code>
            );
          case "bold":
            return (
              <strong key={i} className="font-semibold text-fg">
                {token.value}
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="italic">
                {token.value}
              </em>
            );
          case "term":
            return <Term key={i} id={token.id} label={token.label} />;
          default:
            return <Fragment key={i}>{token.value}</Fragment>;
        }
      })}
    </>
  );
}

/**
 * A term you can ask about without leaving the sentence. Renders as plain
 * text when the id is unknown, so a typo costs a definition rather than a
 * word — the sentence still reads correctly either way.
 */
function Term({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const entry = glossaryEntry(id);

  if (!entry) return <>{label}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "underline decoration-dotted decoration-from-font underline-offset-[3px] transition-colors",
          open ? "text-accent decoration-accent" : "text-fg decoration-line-strong hover:text-accent",
        )}
      >
        {label}
      </button>
      {open ? (
        <div className="animate-fade-up mb-1 mt-2.5 rounded-lg border border-line bg-bg-raised/70 p-4">
          <GlossaryCard entry={entry} />
        </div>
      ) : null}
    </>
  );
}
