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
  IconArrowRight,
  IconEye,
  IconLock,
} from "@/components/icons";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up" | "forgot";

const COPY: Record<Mode, { title: string; blurb: string; action: string }> = {
  "sign-in": {
    title: "Sign in",
    blurb: "Your progress, streak and notes follow you across devices.",
    action: "Sign in",
  },
  "sign-up": {
    title: "Create your account",
    blurb:
      "A new account starts empty — every number in it will be one you earned.",
    action: "Create account",
  },
  forgot: {
    title: "Reset your password",
    blurb:
      "Give us the address you signed up with and we will send a link that lets you set a new password.",
    action: "Send reset link",
  },
};

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, configured, recovering, signIn, signUp, requestPasswordReset } =
    useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Already signed in — nothing to do here. A recovery session is the
  // exception: the user is technically signed in but is on their way to
  // /auth/reset/, and bouncing them home would strand the reset.
  useEffect(() => {
    if (!loading && user && !recovering) router.replace("/");
  }, [loading, user, recovering, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "forgot") {
      const result = await requestPasswordReset(email.trim());
      setBusy(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setResetSent(true);
      return;
    }

    const result =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "sign-up" && "needsConfirmation" in result && result.needsConfirmation) {
      setConfirmationSent(true);
      return;
    }
    router.replace("/");
  };

  const goTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        {!configured ? (
          <Card className="p-6">
            <div className="mono-label mb-3 flex items-center gap-2 text-medium">
              <IconAlert size={13} />
              Supabase not configured
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              Accounts need <code className="text-accent-soft">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and <code className="text-accent-soft">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
              <code className="text-accent-soft">.env.local</code>. Copy{" "}
              <code className="text-accent-soft">env.example</code>, fill both in, and
              restart the dev server.
            </p>
            <Link
              href="/"
              className="mono-meta mt-5 inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-fg-dim"
            >
              Continue without an account
              <IconArrowRight size={12} />
            </Link>
          </Card>
        ) : resetSent ? (
          <Card className="p-6 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-done/15 text-done">
              <IconCheck size={20} className="animate-check" />
            </span>
            <h1 className="text-[17px] font-semibold tracking-tight text-fg">
              Check your email
            </h1>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
              If an account exists for{" "}
              <span className="text-fg-dim">{email}</span>, a reset link is on
              its way. Open it and you can set a new password.
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-subtle">
              The link is single-use and expires after an hour. Nothing changes
              until you set the new password.
            </p>
            <Button
              tone="ghost"
              size="sm"
              className="mt-5"
              onClick={() => {
                setResetSent(false);
                goTo("sign-in");
              }}
            >
              Back to sign in
            </Button>
          </Card>
        ) : confirmationSent ? (
          <Card className="p-6 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-done/15 text-done">
              <IconCheck size={20} className="animate-check" />
            </span>
            <h1 className="text-[17px] font-semibold tracking-tight text-fg">
              Check your email
            </h1>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
              A confirmation link is on its way to{" "}
              <span className="text-fg-dim">{email}</span>. Open it and you will land
              back here signed in.
            </p>
            <Button
              tone="ghost"
              size="sm"
              className="mt-5"
              onClick={() => {
                setConfirmationSent(false);
                setMode("sign-in");
              }}
            >
              Back to sign in
            </Button>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="text-[19px] font-semibold tracking-tight text-fg">
              {COPY[mode].title}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {COPY[mode].blurb}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-3.5">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />

              {mode !== "forgot" ? (
                <div>
                  <div className="mono-label mb-2 flex items-center justify-between text-subtle">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="inline-flex items-center gap-1 text-faint transition-colors hover:text-muted"
                    >
                      <IconEye size={11} />
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    required
                    minLength={6}
                    placeholder={mode === "sign-up" ? "At least 6 characters" : "••••••••"}
                    className="h-10 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13.5px] text-fg placeholder:text-faint focus:border-line-strong focus:outline-none"
                  />
                  {mode === "sign-in" ? (
                    <button
                      type="button"
                      onClick={() => goTo("forgot")}
                      className="mono-meta mt-2 text-faint transition-colors hover:text-accent"
                    >
                      Forgot your password?
                    </button>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <div className="animate-fade-in flex items-start gap-2.5 rounded-lg border border-hard/25 bg-hard/[0.06] p-3">
                  <IconAlert size={14} className="mt-[1px] shrink-0 text-hard" />
                  <p className="text-[12.5px] leading-relaxed text-hard">{error}</p>
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
                    Working…
                  </>
                ) : (
                  <>
                    <IconLock size={14} />
                    {COPY[mode].action}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 border-t border-line pt-4 text-center">
              <button
                type="button"
                onClick={() => goTo(mode === "sign-in" ? "sign-up" : "sign-in")}
                className="text-[13px] text-muted transition-colors hover:text-accent"
              >
                {mode === "sign-in"
                  ? "No account yet? Create one"
                  : mode === "sign-up"
                    ? "Already have an account? Sign in"
                    : "Remembered it? Back to sign in"}
              </button>
            </div>
          </Card>
        )}

        {configured ? (
          <p className="mt-5 text-center text-[12.5px] leading-relaxed text-subtle">
            <Link href="/" className="transition-colors hover:text-muted">
              Continue without an account
            </Link>{" "}
            — progress stays in this browser, with the seeded demo history.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mono-label mb-2 block text-subtle">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={cn(
          "h-10 w-full rounded-lg border border-line bg-bg-raised px-3 text-[13.5px] text-fg",
          "placeholder:text-faint focus:border-line-strong focus:outline-none",
        )}
      />
    </div>
  );
}
