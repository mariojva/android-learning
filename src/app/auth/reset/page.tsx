"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui/primitives";
import { Wordmark } from "@/components/shell/Sidebar";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  IconAlert,
  IconCheck,
  IconEye,
  IconLock,
  IconArrowRight,
} from "@/components/icons";

/* ------------------------------------------------------------------
   Where a recovery link lands.

   Supabase puts its tokens in the URL *fragment*, which never reaches a
   server — which is exactly why this works on a static host with no
   backend of ours. The client picks them up (detectSessionInUrl),
   establishes a short-lived session and fires PASSWORD_RECOVERY, and
   that session's only purpose is to authorise the password change
   happening below.
   ------------------------------------------------------------------ */

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading, configured, recovering, updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  /* Supabase reports a dead link in the fragment rather than by failing a
     request, so read it before anything clears it. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const code = params.get("error_code");
    const description = params.get("error_description");
    if (!code && !description) return;
    setLinkError(
      code === "otp_expired"
        ? "This reset link has expired. They are good for one hour."
        : (description ?? "This reset link is no longer valid.").replace(
            /\+/g,
            " ",
          ),
    );
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  const canSet = Boolean(user) || recovering;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        {!configured ? (
          <Panel
            tone="warn"
            title="Supabase is not configured"
            body="Accounts are switched off in this build, so there is no password to reset."
          />
        ) : done ? (
          <Card className="p-6 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-done/15 text-done">
              <IconCheck size={20} className="animate-check" />
            </span>
            <h1 className="text-[17px] font-semibold tracking-tight text-fg">
              Password changed
            </h1>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
              You are signed in with the new one. The reset link is now spent
              and cannot be used again.
            </p>
            <Button
              tone="primary"
              size="md"
              className="mt-5 w-full"
              onClick={() => router.replace("/")}
            >
              Go to the dashboard
              <IconArrowRight size={14} />
            </Button>
          </Card>
        ) : loading ? (
          <Card className="p-6 text-center">
            <p className="text-[13.5px] text-muted">Checking your link…</p>
          </Card>
        ) : linkError || !canSet ? (
          <Card className="p-6">
            <div className="mono-label mb-3 flex items-center gap-2 text-medium">
              <IconAlert size={13} />
              Link not usable
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              {linkError ??
                "This link has expired or has already been used. Reset links are single-use and last an hour."}
            </p>
            <Link
              href="/auth"
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
            >
              Request a new link
              <IconArrowRight size={14} />
            </Link>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="text-[19px] font-semibold tracking-tight text-fg">
              Set a new password
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {user?.email ? (
                <>
                  For <span className="text-fg-dim">{user.email}</span>. Choose
                  something you have not used here before.
                </>
              ) : (
                "Choose something you have not used here before."
              )}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-3.5">
              <div>
                <div className="mono-label mb-2 flex items-center justify-between text-subtle">
                  <span>New password</span>
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="inline-flex items-center gap-1 text-faint transition-colors hover:text-muted"
                  >
                    <IconEye size={11} />
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="h-10 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13.5px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
                />
              </div>

              <div>
                <label className="mono-label mb-2 block text-subtle">
                  Confirm it
                </label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="The same again"
                  className="h-10 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13.5px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
                />
              </div>

              {error ? (
                <div className="animate-fade-in flex items-start gap-2.5 rounded-lg border border-hard/25 bg-hard/[0.06] p-3">
                  <IconAlert size={14} className="mt-[1px] shrink-0 text-hard" />
                  <p className="text-[12.5px] leading-relaxed text-hard">
                    {error}
                  </p>
                </div>
              ) : null}

              <Button
                tone="primary"
                size="md"
                type="submit"
                disabled={busy}
                className="w-full"
              >
                {busy ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent-ink" />
                    Saving…
                  </>
                ) : (
                  <>
                    <IconLock size={14} />
                    Set new password
                  </>
                )}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  body,
}: {
  tone: "warn";
  title: string;
  body: string;
}) {
  return (
    <Card className="p-6">
      <div className="mono-label mb-3 flex items-center gap-2 text-medium">
        <IconAlert size={13} />
        {title}
      </div>
      <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>
      <Link
        href="/"
        className="mono-meta mt-5 inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-fg-dim"
      >
        Continue without an account
        <IconArrowRight size={12} />
      </Link>
    </Card>
  );
}
