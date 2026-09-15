"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconCopy, IconCheck } from "@/components/icons";

/* ------------------------------------------------------------------
   A small, dependency-free Kotlin highlighter. It is deliberately
   conservative: it colours the things that carry meaning when you are
   reading Android code — keywords, types, annotations, strings,
   comments, numbers and call sites — and leaves everything else alone.
   ------------------------------------------------------------------ */

const KEYWORDS = [
  "fun", "val", "var", "class", "object", "interface", "data", "sealed",
  "enum", "return", "if", "else", "when", "for", "while", "do", "in", "is",
  "as", "null", "true", "false", "this", "super", "suspend", "override",
  "private", "public", "internal", "protected", "open", "abstract", "const",
  "lateinit", "companion", "init", "by", "import", "package", "typealias",
  "inline", "reified", "crossinline", "noinline", "vararg", "operator",
  "infix", "out", "try", "catch", "finally", "throw", "break", "continue",
  "constructor", "where", "annotation", "expect", "actual", "tailrec",
  "external", "field", "get", "set",
];

const BUILTINS = [
  "List", "MutableList", "Map", "MutableMap", "Set", "MutableSet", "String",
  "Int", "Long", "Double", "Float", "Boolean", "Unit", "Any", "Nothing",
  "Flow", "StateFlow", "SharedFlow", "MutableStateFlow", "MutableSharedFlow",
  "Result", "Pair", "Triple", "Sequence", "Array", "IntArray", "CharArray",
];

const MASTER = new RegExp(
  [
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // 1 comment
    '("""[\\s\\S]*?"""|"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')', // 2 string
    "(@[A-Za-z_][\\w.]*)", // 3 annotation
    "(\\b\\d[\\d_]*(?:\\.\\d+)?[fFlL]?\\b)", // 4 number
    `\\b(${KEYWORDS.join("|")})\\b`, // 5 keyword
    "\\b([A-Z][A-Za-z0-9_]*)\\b", // 6 type
    "\\b([a-z_][A-Za-z0-9_]*)(?=\\s*\\()", // 7 call
  ].join("|"),
  "g",
);

const TOKEN_CLASS = [
  "", // 0
  "text-subtle italic", // comment
  "text-[#a8e6a1]", // string
  "text-violet", // annotation
  "text-[#e5b880]", // number
  "text-[#ff89b5]", // keyword
  "text-[#8fd3ff]", // type
  "text-accent-soft", // call
];

export function highlightKotlin(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  MASTER.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = MASTER.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    let groupIndex = 0;
    for (let g = 1; g <= 7; g += 1) {
      if (typeof m[g] === "string") {
        groupIndex = g;
        break;
      }
    }
    const text = m[groupIndex];
    let cls = TOKEN_CLASS[groupIndex];
    if (groupIndex === 6 && BUILTINS.includes(text)) cls = "text-[#8fd3ff]";
    out.push(
      <span key={`t${key++}`} className={cls}>
        {text}
      </span>,
    );
    last = m.index + m[0].length;
    if (m[0].length === 0) MASTER.lastIndex += 1;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodePane({
  code,
  language = "kotlin",
  showLineNumbers = true,
  highlightLines,
  caption,
  copyable = true,
  className,
  maxHeight,
}: {
  code: string;
  language?: "kotlin" | "sql" | "text";
  showLineNumbers?: boolean;
  highlightLines?: number[];
  caption?: string;
  copyable?: boolean;
  className?: string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);
  const marked = new Set(highlightLines ?? []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — no interruption warranted */
    }
  };

  return (
    <figure
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-bg-raised",
        className,
      )}
    >
      {caption ? (
        <figcaption className="flex items-center justify-between border-b border-line bg-surface/60 px-3.5 py-2">
          <span className="mono-label text-subtle">{caption}</span>
          <span className="mono-label text-faint">{language}</span>
        </figcaption>
      ) : null}

      {copyable ? (
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="absolute right-2.5 top-2.5 z-10 rounded-md border border-line bg-surface-2/90 p-1.5 text-subtle opacity-0 transition-opacity duration-150 hover:text-fg group-hover:opacity-100"
          style={caption ? { top: 44 } : undefined}
        >
          {copied ? (
            <IconCheck size={13} className="text-done" />
          ) : (
            <IconCopy size={13} />
          )}
        </button>
      ) : null}

      <div
        className="overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <pre className="min-w-full py-3 text-[12.5px] leading-[1.65]">
          <code className="block">
            {lines.map((line, i) => (
              <span
                key={i}
                className={cn(
                  "flex px-3.5",
                  marked.has(i + 1) &&
                    "bg-accent/[0.07] shadow-[inset_2px_0_0_0_var(--color-accent)]",
                )}
              >
                {showLineNumbers ? (
                  <span className="mr-4 w-6 shrink-0 select-none text-right text-faint">
                    {i + 1}
                  </span>
                ) : null}
                <span className="whitespace-pre text-fg-dim">
                  {language === "kotlin" ? highlightKotlin(line) : line}
                  {line.length === 0 ? " " : null}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}

/** Inline monospace snippet used inside prose. */
export function Tok({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-line bg-surface-2 px-1.5 py-[1.5px] text-[12px] text-accent-soft">
      {children}
    </code>
  );
}
