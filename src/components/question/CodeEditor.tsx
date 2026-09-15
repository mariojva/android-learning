"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-bg-raised">
      <span className="mono-label animate-fade-in text-faint">Loading editor…</span>
    </div>
  );
}

const THEME = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "", foreground: "c9d1d9" },
    { token: "comment", foreground: "5a6472", fontStyle: "italic" },
    { token: "keyword", foreground: "ff89b5" },
    { token: "string", foreground: "a8e6a1" },
    { token: "number", foreground: "e5b880" },
    { token: "type", foreground: "8fd3ff" },
    { token: "annotation", foreground: "b28cff" },
    { token: "delimiter", foreground: "8a93a0" },
  ],
  colors: {
    "editor.background": "#0d0f13",
    "editor.foreground": "#c9d1d9",
    "editorLineNumber.foreground": "#3c4350",
    "editorLineNumber.activeForeground": "#848e9d",
    "editor.lineHighlightBackground": "#14171c",
    "editorCursor.foreground": "#c8fa4b",
    "editorIndentGuide.background1": "#1e2330",
    "editorWidget.background": "#101318",
    "editorGutter.background": "#0d0f13",
    "scrollbarSlider.background": "#1e232c",
    "scrollbarSlider.hoverBackground": "#2a313d",
  },
};

/**
 * Kotlin editor. Monaco ships Kotlin tokenisation in its basic-languages
 * bundle, so highlighting works with no extra configuration.
 *
 * Monaco is loaded from a CDN by the react wrapper. If it has not mounted
 * within a few seconds — offline, blocked network, restrictive CSP — the
 * component falls back to a plain textarea so the exercise stays usable.
 */
export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = 440,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number | string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [fallback, setFallback] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mountedRef.current) setFallback(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  if (fallback && !mounted) {
    return (
      <div className="relative h-full" style={{ height }}>
        <textarea
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            "h-full w-full resize-none bg-bg-raised p-4 font-mono text-[12.5px] leading-[1.65] text-fg-dim outline-none",
            className,
          )}
        />
        <span className="mono-label absolute right-3 top-3 rounded border border-line bg-surface px-1.5 py-1 text-faint">
          Plain editor
        </span>
      </div>
    );
  }

  return (
    <div className={cn("h-full", className)} style={{ height }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="kotlin"
        language="kotlin"
        theme="academy-dark"
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        beforeMount={(monaco) => {
          try {
            monaco.editor.defineTheme("academy-dark", THEME);
          } catch {
            /* theme is cosmetic — never block the editor over it */
          }
        }}
        onMount={() => {
          mountedRef.current = true;
          setMounted(true);
        }}
        loading={<EditorSkeleton />}
        options={{
          readOnly,
          fontSize: 12.5,
          lineHeight: 21,
          fontFamily:
            "var(--font-mono-jb), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "line",
          smoothScrolling: true,
          padding: { top: 14, bottom: 14 },
          tabSize: 4,
          automaticLayout: true,
          scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
          overviewRulerLanes: 0,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
        }}
      />
    </div>
  );
}
