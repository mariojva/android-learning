"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, MobileDrawer, Wordmark } from "./Sidebar";
import { MOBILE_NAV } from "./nav";
import { cn, formatMinutes } from "@/lib/utils";
import {
  IconMenu,
  IconSearch,
  IconFlame,
  IconTimer,
  IconCheck,
  IconAlert,
  IconRefresh,
  IconLock,
  IconChevronDown,
  IconSettings,
} from "@/components/icons";
import { useProgress } from "@/lib/progress/context";
import { useAuth } from "@/lib/auth/AuthProvider";
import { currentStreak, minutesToday } from "@/data/activity";
import { USER } from "@/data/profile";

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // The sign-in screen stands alone — no nav to a product you are not in yet.
  if (pathname.startsWith("/auth")) {
    return <div className="min-h-screen bg-bg">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="lg:pl-[248px]">
        <TopBar onOpenNav={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-7 sm:px-6 lg:px-9 lg:pb-16">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { progress } = useProgress();
  const today = minutesToday(progress.sessions);
  const streak = currentStreak(progress.sessions);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-9">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        >
          <IconMenu size={18} />
        </button>

        <span className="lg:hidden">
          <Wordmark compact />
        </span>

        <Link
          href="/practice"
          className="ml-auto hidden items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-[7px] text-[12.5px] text-subtle transition-colors hover:border-line-strong hover:text-muted sm:flex"
        >
          <IconSearch size={14} />
          <span>Search questions…</span>
          <kbd className="mono-meta ml-6 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-faint">
            /
          </kbd>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <SyncBadge />
          <span className="mono-meta hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-[7px] text-muted md:inline-flex">
            <IconTimer size={13} className="text-accent" />
            {formatMinutes(today)} / {formatMinutes(USER.dailyTargetMinutes)}
          </span>
          <span className="mono-meta inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-[7px] text-muted">
            <IconFlame size={13} className="text-medium" />
            {streak}
          </span>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

/** Quiet by default; speaks up only when a write fails. */
function SyncBadge() {
  const { mode, syncState, syncError } = useProgress();
  const [recentlySaved, setRecentlySaved] = useState(false);

  useEffect(() => {
    if (syncState !== "saved") return;
    setRecentlySaved(true);
    const handle = setTimeout(() => setRecentlySaved(false), 1600);
    return () => clearTimeout(handle);
  }, [syncState]);

  if (mode !== "account") return null;

  if (syncState === "error") {
    return (
      <span
        title={syncError ?? "Could not save"}
        className="mono-meta inline-flex items-center gap-1.5 rounded-lg border border-hard/30 bg-hard/10 px-2.5 py-[7px] text-hard"
      >
        <IconAlert size={12} />
        <span className="hidden sm:inline">Not saved</span>
      </span>
    );
  }

  if (syncState === "saving") {
    return (
      <span className="mono-meta inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-[7px] text-subtle">
        <IconRefresh size={12} className="animate-pulse" />
        <span className="hidden sm:inline">Saving</span>
      </span>
    );
  }

  if (recentlySaved) {
    return (
      <span className="mono-meta animate-fade-in inline-flex items-center gap-1.5 rounded-lg border border-done/25 bg-done/10 px-2.5 py-[7px] text-done">
        <IconCheck size={12} />
        <span className="hidden sm:inline">Saved</span>
      </span>
    );
  }

  return null;
}

function AccountMenu() {
  const { user, profile, configured, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading) {
    return <span className="h-8 w-8 rounded-full bg-surface-2" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href={configured ? "/auth" : "/settings"}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
      >
        <IconLock size={12} />
        Sign in
      </Link>
    );
  }

  const name = profile?.displayName ?? user.email ?? "Account";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg p-0.5 pr-1.5 transition-colors hover:bg-surface-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[12px] font-semibold text-accent ring-1 ring-inset ring-accent/25">
          {initial}
        </span>
        <IconChevronDown size={12} className="text-faint" />
      </button>

      {open ? (
        <div className="animate-fade-in absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-xl shadow-black/40">
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-[13px] font-semibold text-fg">{name}</div>
            <div className="mono-meta mt-1 truncate text-subtle">{user.email}</div>
          </div>
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <IconSettings size={14} className="text-faint" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-hard"
            >
              <IconLock size={14} className="text-faint" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-raised/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {MOBILE_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                  active ? "text-accent" : "text-subtle",
                )}
              >
                <item.icon size={18} />
                <span className="mono-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
