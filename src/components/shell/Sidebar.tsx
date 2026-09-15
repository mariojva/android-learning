"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress/context";
import { reviewQueue } from "@/lib/progress/selectors";
import { QUESTION_COUNTS } from "@/data/questions";
import { currentStreak } from "@/data/activity";
import { IconFlame, IconX } from "@/components/icons";
import { useMemo } from "react";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { progress } = useProgress();

  const badges = useMemo(() => {
    const review = reviewQueue(progress).reduce((sum, r) => sum + r.dueCount, 0);
    return {
      questions: String(QUESTION_COUNTS.total),
      bookmarks: String(progress.bookmarks.length),
      review: String(review),
    };
  }, [progress]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5"
      >
        <Wordmark />
      </Link>

      <nav className="scrollbar-none flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <div className="mono-label mb-2 flex items-center gap-2 px-3 text-subtle">
                {group.icon ? <group.icon size={12} /> : null}
                {group.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-colors duration-150",
                        active
                          ? "bg-surface-2 text-fg"
                          : "text-muted hover:bg-surface/70 hover:text-fg-dim",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <item.icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-colors",
                          active ? "text-accent" : "text-faint group-hover:text-muted",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="mono-meta ml-auto text-faint">
                          {badges[item.badge]}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <StreakFooter />
    </div>
  );
}

function StreakFooter() {
  const { progress, mode } = useProgress();
  // Derived from the sessions themselves, so it is correct for a sparse
  // account as well as the dense demo history.
  const streak = currentStreak(progress.sessions);

  return (
    <div className="border-t border-line px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-medium/10 text-medium">
          <IconFlame size={14} />
        </span>
        <div className="leading-tight">
          <div className="font-mono text-[13px] font-semibold text-fg">
            {streak} day{streak === 1 ? "" : "s"}
          </div>
          <div className="mono-label text-subtle">Current streak</div>
        </div>
      </div>

      <div className="mono-label mt-3 flex items-center gap-1.5 text-faint">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            mode === "account" ? "bg-done" : "bg-faint",
          )}
        />
        {mode === "account" ? "Synced to your account" : "Saved in this browser"}
      </div>
    </div>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 17.5 12 5l7 12.5"
            stroke="var(--color-accent-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.6 14.6h6.8"
            stroke="var(--color-accent-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-[13.5px] font-semibold tracking-tight text-fg">
            Android Academy
          </span>
          <span className="mono-label mt-1 block text-subtle">
            Kotlin · Android · Depth
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-bg-raised lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-bg-raised animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-4 rounded-md p-1.5 text-subtle hover:text-fg"
        >
          <IconX size={16} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
