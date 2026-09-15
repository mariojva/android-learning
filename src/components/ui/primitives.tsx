import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn, difficultyStyles } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

/* ------------------------------ Surface ---------------------------- */

export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-line bg-surface",
        interactive && "card-lift hover:border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  kicker,
  title,
  action,
  className,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {kicker ? (
          <div className="mono-label mb-2 text-subtle">{kicker}</div>
        ) : null}
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Badges ----------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "done" | "info" | "warn" | "danger" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "text-muted bg-surface-2 ring-line-strong",
    accent: "text-accent bg-accent/10 ring-accent/25",
    done: "text-done bg-done/10 ring-done/25",
    info: "text-info bg-info/10 ring-info/25",
    warn: "text-medium bg-medium/10 ring-medium/25",
    danger: "text-hard bg-hard/10 ring-hard/25",
    violet: "text-violet bg-violet/10 ring-violet/25",
  };
  return (
    <span
      className={cn(
        "mono-meta inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyPill({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const s = difficultyStyles[difficulty];
  return (
    <span
      className={cn(
        "mono-meta inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] ring-1 ring-inset",
        s.text,
        s.bg,
        s.ring,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {difficulty}
    </span>
  );
}

/* ------------------------------ Buttons ---------------------------- */

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const buttonTones: Record<ButtonTone, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-soft active:bg-accent-deep font-semibold",
  secondary:
    "bg-surface-2 text-fg-dim ring-1 ring-inset ring-line-strong hover:bg-surface-3 hover:text-fg",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-hard/12 text-hard ring-1 ring-inset ring-hard/30 hover:bg-hard/20",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5",
  md: "h-10 px-4 text-[13.5px] gap-2",
};

export function buttonClass(
  tone: ButtonTone = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-lg transition-all duration-150 disabled:pointer-events-none disabled:opacity-40",
    buttonTones[tone],
    buttonSizes[size],
    className,
  );
}

export function Button({
  children,
  tone = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  tone = "secondary",
  size = "md",
  className,
}: {
  children: ReactNode;
  href: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(tone, size, className)}>
      {children}
    </Link>
  );
}

/* ----------------------------- Progress ---------------------------- */

export function ProgressBar({
  value,
  tone = "accent",
  className,
  height = 6,
  delay = 0,
}: {
  value: number;
  tone?: "accent" | "done" | "info" | "medium" | "hard" | "violet";
  className?: string;
  height?: number;
  delay?: number;
}) {
  const fills: Record<string, string> = {
    accent: "bg-accent",
    done: "bg-done",
    info: "bg-info",
    medium: "bg-medium",
    hard: "bg-hard",
    violet: "bg-violet",
  };
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full", fills[tone])}
        style={{
          width: `${pct}%`,
          transition: `width 900ms var(--ease-out-soft) ${delay}ms`,
        }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 84,
  stroke = 7,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 1s var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? (
          <span className="font-mono text-[15px] font-semibold text-fg">
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span className="mono-label mt-0.5 text-subtle">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ Layout ----------------------------- */

export function PageHeader({
  kicker,
  title,
  subtitle,
  right,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        {kicker ? (
          <div className="mono-label mb-2.5 text-accent">{kicker}</div>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg sm:text-[30px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface/40 px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-faint">{icon}</div> : null}
      <h3 className="text-[14px] font-semibold text-fg-dim">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-subtle">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("hairline h-px w-full", className)} />;
}
