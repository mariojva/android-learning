"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Badge, Divider } from "@/components/ui/primitives";
import { useProgress } from "@/lib/progress/context";
import { useAuth } from "@/lib/auth/AuthProvider";
import { USER } from "@/data/profile";
import { QUESTION_COUNTS } from "@/data/questions";
import { STORAGE_KEY } from "@/lib/progress/repository";
import {
  IconSettings,
  IconTrash,
  IconRefresh,
  IconAlert,
  IconCheck,
  IconTerminal,
  IconLock,
  IconArrowRight,
} from "@/components/icons";

export default function SettingsPage() {
  const {
    progress,
    mode,
    hydrated,
    syncState,
    syncError,
    hasLocalProgress,
    resetAll,
    loadDemoHistory,
    importLocalProgress,
  } = useProgress();
  const { user, profile, configured, signOut, updateProfile, updatePassword } =
    useAuth();

  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNote, setPasswordNote] = useState<string | null>(null);
  const [passwordFailed, setPasswordFailed] = useState(false);

  const savePassword = async () => {
    setPasswordNote(null);
    setPasswordFailed(false);

    if (newPassword !== confirmPassword) {
      setPasswordFailed(true);
      setPasswordNote("The two passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const result = await updatePassword(newPassword);
    setSavingPassword(false);

    if (result.error) {
      setPasswordFailed(true);
      setPasswordNote(result.error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNote("Password changed.");
  };

  const runImport = async () => {
    const result = await importLocalProgress();
    setImportResult(
      "error" in result
        ? result.error
        : result.imported === 0
          ? "Nothing new to import — your account already has everything this browser holds."
          : `Imported ${result.imported} attempt${result.imported === 1 ? "" : "s"} from this browser.`,
    );
  };

  const saveName = async () => {
    if (nameDraft === null) return;
    setSavingName(true);
    await updateProfile({ displayName: nameDraft.trim() || "Engineer" });
    setSavingName(false);
    setNameDraft(null);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        kicker="Settings"
        title="Settings"
        subtitle="Your account, where progress is kept, and the levers that matter while the Kotlin runtime is not wired up."
      />

      <div className="space-y-5">
        {/* --------------------------- Account --------------------------- */}
        <Card className="p-5">
          <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
            <IconLock size={13} />
            Account
          </div>

          {!configured ? (
            <div className="flex items-start gap-3 rounded-lg border border-medium/25 bg-medium/[0.06] p-4">
              <IconAlert size={15} className="mt-0.5 shrink-0 text-medium" />
              <div>
                <div className="text-[13.5px] font-semibold text-fg-dim">
                  Supabase is not configured
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  Copy <code className="text-accent-soft">env.example</code> to{" "}
                  <code className="text-accent-soft">.env.local</code>, fill in{" "}
                  <code className="text-accent-soft">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="text-accent-soft">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,
                  then restart the dev server.
                </p>
              </div>
            </div>
          ) : user ? (
            <>
              <dl className="space-y-3">
                <Row label="Signed in as" value={user.email ?? "—"} />
                <Row
                  label="Account created"
                  value={new Date(user.created_at).toLocaleDateString()}
                />
                <Row label="Daily target" value={`${USER.dailyTargetMinutes} minutes`} />
              </dl>

              <Divider className="my-5" />

              <div className="mono-label mb-2 text-subtle">Display name</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={nameDraft ?? profile?.displayName ?? ""}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="h-9 flex-1 min-w-[180px] rounded-lg border border-line bg-bg-raised px-3 text-[13px] text-fg focus:border-line-strong focus:outline-none"
                />
                <Button
                  tone="secondary"
                  size="sm"
                  disabled={nameDraft === null || savingName}
                  onClick={saveName}
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </div>

              <Divider className="my-5" />

              <div className="mono-label mb-2 text-subtle">Change password</div>
              <div className="space-y-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="New password — at least 6 characters"
                  className="h-9 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Confirm it"
                  className="h-9 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    tone="secondary"
                    size="sm"
                    disabled={newPassword.length < 6 || savingPassword}
                    onClick={() => void savePassword()}
                  >
                    {savingPassword ? "Saving…" : "Change password"}
                  </Button>
                  {passwordNote ? (
                    <span
                      className={
                        passwordFailed
                          ? "text-[12.5px] text-hard"
                          : "text-[12.5px] text-accent"
                      }
                    >
                      {passwordNote}
                    </span>
                  ) : null}
                </div>
              </div>

              <Divider className="my-5" />

              <Button tone="ghost" size="sm" onClick={() => void signOut()}>
                <IconLock size={13} />
                Sign out
              </Button>
            </>
          ) : (
            <div>
              <p className="text-[13.5px] leading-relaxed text-muted">
                You are working locally. Progress is kept in this browser only —
                clear its storage, or open the app on another device, and it is gone.
              </p>
              <Link
                href="/auth"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft"
              >
                Sign in or create an account
                <IconArrowRight size={14} />
              </Link>
            </div>
          )}
        </Card>

        {/* ------------------------- Persistence ------------------------- */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="mono-label text-subtle">Persistence</div>
            <Badge tone={mode === "account" ? "done" : "neutral"}>
              {mode === "account" ? "Supabase" : "This browser"}
            </Badge>
          </div>

          <dl className="space-y-3">
            <Row
              label="Progress stored in"
              value={mode === "account" ? "Your Supabase account" : "localStorage"}
            />
            {mode === "local" ? <Row label="Storage key" value={STORAGE_KEY} mono /> : null}
            <Row label="State" value={hydrated ? "Loaded" : "Loading…"} />
            <Row
              label="Last write"
              value={
                syncState === "error"
                  ? "Failed"
                  : syncState === "saving"
                    ? "In flight"
                    : syncState === "saved"
                      ? "Succeeded"
                      : "—"
              }
            />
            <Row
              label="Recorded attempts"
              value={`${Object.keys(progress.attempts).length} of ${QUESTION_COUNTS.total}`}
            />
            <Row label="Bookmarks" value={String(progress.bookmarks.length)} />
            <Row label="Notes" value={String(Object.keys(progress.notes).length)} />
            <Row
              label="Days studied"
              value={String(progress.sessions.filter((s) => s.minutes > 0).length)}
            />
          </dl>

          {syncError ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-hard/25 bg-hard/[0.06] p-3">
              <IconAlert size={14} className="mt-[1px] shrink-0 text-hard" />
              <p className="text-[12.5px] leading-relaxed text-hard">{syncError}</p>
            </div>
          ) : null}

          {mode === "account" ? (
            <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-subtle">
              Writes are diffed against the last saved snapshot, so typing a note
              sends one row rather than your whole history. Every row is protected
              by row-level security — the policies in{" "}
              <code className="text-accent-soft">supabase/schema.sql</code> are all{" "}
              <code className="text-accent-soft">auth.uid() = user_id</code>.
            </p>
          ) : null}
        </Card>

        {/* --------------------- Code execution -------------------------- */}
        <Card className="p-5">
          <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
            <IconTerminal size={13} />
            Kotlin execution
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-medium/25 bg-medium/[0.06] p-4">
            <span className="mt-0.5 text-medium">
              <IconAlert size={15} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-fg-dim">
                Simulated runner
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                No Kotlin runtime is connected, so Run and Submit report simulated
                results and say so. Point{" "}
                <code className="text-accent-soft">NEXT_PUBLIC_KOTLIN_RUNNER_URL</code>{" "}
                at a sandboxed execution service and the browser posts to it
                directly — <code className="text-accent-soft">runKotlin</code> in{" "}
                <code className="text-accent-soft">src/lib/kotlin-runner.ts</code> is
                the only integration surface. The site is a static export, so there
                is no server of ours in between; the service needs CORS headers for
                this origin.
              </p>
            </div>
          </div>
        </Card>

        {/* ---------------------------- Data ----------------------------- */}
        <Card className="p-5">
          <div className="mono-label mb-4 text-subtle">Data</div>

          <div className="flex flex-wrap gap-2">
            {mode === "account" && hasLocalProgress ? (
              <Button tone="secondary" size="sm" onClick={() => void runImport()}>
                <IconArrowRight size={13} />
                Import this browser&rsquo;s progress
              </Button>
            ) : null}

            <Button tone="secondary" size="sm" onClick={loadDemoHistory}>
              <IconRefresh size={13} />
              Load demo history
            </Button>

            {!confirming ? (
              <Button tone="danger" size="sm" onClick={() => setConfirming(true)}>
                <IconTrash size={13} />
                {mode === "account" ? "Erase account progress" : "Clear all progress"}
              </Button>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <Button
                  tone="danger"
                  size="sm"
                  onClick={() => {
                    resetAll();
                    setConfirming(false);
                  }}
                >
                  <IconCheck size={13} />
                  Yes, erase everything
                </Button>
                <Button tone="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </span>
            )}
          </div>

          {importResult ? (
            <p className="mt-3 text-[12.5px] text-accent">{importResult}</p>
          ) : null}

          <p className="mt-4 text-[12.5px] leading-relaxed text-subtle">
            {mode === "account"
              ? "Erasing deletes every row this account owns — attempts, bookmarks, notes, lesson progress and study days. It cannot be undone. Loading the demo history writes the generated twelve weeks into your account, which is useful for seeing a populated dashboard and useless as a record of anything."
              : "The signed-out experience ships with a generated twelve weeks of history so the dashboard is a populated product rather than an empty shell. Clearing starts you at zero. Neither touches the question bank."}
          </p>
        </Card>

        {/* ---------------------------- About ---------------------------- */}
        <Card className="p-5">
          <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
            <IconSettings size={13} />
            About
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{QUESTION_COUNTS.total} questions</Badge>
            <Badge>{QUESTION_COUNTS.coding} coding</Badge>
            <Badge>{QUESTION_COUNTS.codeReading} code reading</Badge>
            <Badge>{QUESTION_COUNTS.codeReview} code review</Badge>
            <Badge>{QUESTION_COUNTS.debugging} debugging</Badge>
            <Badge>{QUESTION_COUNTS.quiz} quizzes</Badge>
            <Badge>{QUESTION_COUNTS.systemDesign} system design</Badge>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-subtle">
            Android Academy — master Kotlin, understand Android, think like a
            senior engineer.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13px] text-subtle">{label}</dt>
      <dd
        className={
          mono
            ? "mono-meta truncate text-fg-dim"
            : "truncate text-[13px] text-fg-dim"
        }
      >
        {value}
      </dd>
    </div>
  );
}
