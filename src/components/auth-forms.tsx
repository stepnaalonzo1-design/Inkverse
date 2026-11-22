"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import type { PublicUser } from "@/lib/auth";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600/25 to-blue-600/20 blur-3xl"
      />
      <div className="card w-full max-w-md animate-fade-up p-7 shadow-2xl shadow-black/50 sm:p-9">
        <div className="mb-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 font-black text-white shadow-lg shadow-violet-900/40">
            IV
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-ink-400">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="mt-6 text-center text-sm text-ink-400">{footer}</div> : null}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
      {message}
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full py-3">
      {pending ? pendingLabel : label}
    </button>
  );
}

function resolvePostAuthDestination(role: string, nextPath?: string): string {
  if (role === "admin") {
    if (nextPath && nextPath.startsWith("/admin")) return nextPath;
    return "/admin";
  }
  if (nextPath && nextPath !== "/" && !nextPath.startsWith("/admin") && !nextPath.startsWith("/login") && !nextPath.startsWith("/register")) {
    return nextPath;
  }
  return "/dashboard";
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { user: currentUser, setSession } = useAuth();
  const { notify } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Never keep an already-authenticated user on the login page
  useEffect(() => {
    if (currentUser && !pending && !successMsg) {
      const target = resolvePostAuthDestination(currentUser.role, nextPath);
      router.replace(target);
    }
  }, [currentUser, nextPath, pending, router, successMsg]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccessMsg(null);

    const result = await api<{
      user?: PublicUser;
      sessionToken?: string;
      redirectTo?: string;
    }>("/api/auth/login", "POST", {
      identifier,
      password,
    });
    setPending(false);

    if (!result.ok || !result.data.user) {
      const message = result.data.error ?? "Sign-in failed. Please try again.";
      setError(message);
      notify({ tone: "error", title: "Login failed", description: message });
      return;
    }

    const loggedInUser = result.data.user;
    setSession(loggedInUser, result.data.sessionToken);

    const target = resolvePostAuthDestination(loggedInUser.role, nextPath);
    const dashboardName = loggedInUser.role === "admin" ? "Admin Dashboard" : "Client Dashboard";
    const banner =
      result.data.message ??
      `Welcome back, ${loggedInUser.username}! Signed in as ${loggedInUser.roleLabel}.`;

    setSuccessMsg(`${banner} Redirecting to ${dashboardName}…`);
    notify({
      tone: "success",
      title: banner,
      description: `Redirecting you to your ${dashboardName}.`,
    });

    router.replace(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ErrorBanner message={error} />
      <SuccessBanner message={successMsg} />
      <Field id="identifier" label="Username or email">
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="input"
          placeholder="your_name or you@example.com"
        />
      </Field>
      <Field id="password" label="Password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input"
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-violet-300 transition hover:text-violet-200">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={pending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

export function RegisterForm({ defaultRole = "user" }: { defaultRole?: "user" | "admin" }) {
  const router = useRouter();
  const { user: currentUser, setSession } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: defaultRole as "user" | "admin",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && !pending && !successMsg) {
      const target = resolvePostAuthDestination(currentUser.role);
      router.replace(target);
    }
  }, [currentUser, pending, router, successMsg]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccessMsg(null);

    const result = await api<{
      user?: PublicUser;
      sessionToken?: string;
      redirectTo?: string;
    }>("/api/auth/register", "POST", {
      username: form.username,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
      role: form.role,
      accountType: form.role === "admin" ? "administrator" : "client",
    });
    setPending(false);

    if (!result.ok || !result.data.user) {
      const message = result.data.error ?? "Registration failed. Please try again.";
      setError(message);
      notify({ tone: "error", title: "Registration failed", description: message });
      return;
    }

    const createdUser = result.data.user;
    setSession(createdUser, result.data.sessionToken);

    const target = resolvePostAuthDestination(createdUser.role);
    const dashboardName = createdUser.role === "admin" ? "Admin Dashboard" : "Client Dashboard";
    const banner =
      result.data.message ??
      `Account created! Welcome to InkVerse, ${createdUser.username}.`;

    setSuccessMsg(`${banner} Redirecting to ${dashboardName}…`);
    notify({
      tone: "success",
      title: banner,
      description: `Opening your ${dashboardName}.`,
    });

    router.replace(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ErrorBanner message={error} />
      <SuccessBanner message={successMsg} />
      <Field id="username" label="Username" hint="3–32 characters: letters, numbers, underscores, hyphens or dots.">
        <input id="username" name="username" autoComplete="username" required value={form.username} onChange={(e) => update("username", e.target.value)} className="input" />
      </Field>
      <Field id="email" label="Email">
        <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="input" />
      </Field>
      <Field id="role" label="Account role">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account role">
          <button
            type="button"
            onClick={() => update("role", "user")}
            aria-pressed={form.role === "user"}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition",
              form.role === "user"
                ? "border-violet-400/60 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/5 text-ink-300 hover:border-white/20 hover:text-white",
            )}
          >
            <span className="block text-sm font-semibold">Client</span>
            <span className="mt-0.5 block text-xs text-ink-400">Reader &amp; personal library</span>
          </button>
          <button
            type="button"
            onClick={() => update("role", "admin")}
            aria-pressed={form.role === "admin"}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition",
              form.role === "admin"
                ? "border-violet-400/60 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/5 text-ink-300 hover:border-white/20 hover:text-white",
            )}
          >
            <span className="block text-sm font-semibold">Administrator</span>
            <span className="mt-0.5 block text-xs text-ink-400">Manage catalogue &amp; users</span>
          </button>
        </div>
      </Field>
      <Field id="password" label="Password" hint="At least 6 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => update("password", e.target.value)} className="input" />
      </Field>
      <Field id="confirmPassword" label="Confirm password">
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="input" />
      </Field>
      <SubmitButton
        pending={pending}
        label={form.role === "admin" ? "Create administrator account" : "Create client account"}
        pendingLabel="Creating account…"
      />
    </form>
  );
}

export function ForgotPasswordForm() {
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await api("/api/auth/forgot-password", "POST", { email });
    setPending(false);

    if (!result.ok) {
      setError(result.data.error ?? "Could not process your request.");
      return;
    }
    setSentMessage(result.data.message ?? "Check your email for a reset link.");
    notify({ tone: "info", title: "Check your inbox", description: "If the address is registered, a reset link is on its way." });
  }

  if (sentMessage) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {sentMessage}
        </p>
        <Link href="/login" className="btn btn-ghost w-full">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ErrorBanner message={error} />
      <Field id="email" label="Account email" hint="We will send a secure link valid for 30 minutes.">
        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </Field>
      <SubmitButton pending={pending} label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await api("/api/auth/reset-password", "POST", { token, password, confirmPassword });
    setPending(false);

    if (!result.ok) {
      setError(result.data.error ?? "Could not reset your password.");
      notify({ tone: "error", title: "Reset failed", description: result.data.error });
      return;
    }
    notify({ tone: "success", title: "Password updated", description: "Sign in with your new password." });
    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ErrorBanner message={error} />
      <Field id="password" label="New password" hint="At least 6 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
      </Field>
      <Field id="confirmPassword" label="Confirm new password">
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
      </Field>
      <SubmitButton pending={pending} label="Set new password" pendingLabel="Updating…" />
    </form>
  );
}

export function SetupForm({ tokenRequired }: { tokenRequired: boolean }) {
  const router = useRouter();
  const { setSession } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", setupToken: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccessMsg(null);

    const result = await api<{
      user?: PublicUser;
      sessionToken?: string;
      redirectTo?: string;
    }>("/api/setup", "POST", {
      username: form.username,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
      ...(tokenRequired ? { setupToken: form.setupToken } : {}),
    });
    setPending(false);

    if (!result.ok || !result.data.user) {
      const message = result.data.error ?? "Setup failed. Please check the form and try again.";
      setError(message);
      notify({ tone: "error", title: "Setup failed", description: message });
      return;
    }

    setSession(result.data.user, result.data.sessionToken);
    const banner = result.data.message ?? "Administrator account created";
    setSuccessMsg(`${banner} Redirecting to Admin Dashboard…`);
    notify({
      tone: "success",
      title: banner,
      description: "Opening the Admin Dashboard.",
    });
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ErrorBanner message={error} />
      <SuccessBanner message={successMsg} />
      <Field id="username" label="Administrator username" hint="3–32 characters: letters, numbers, underscores, hyphens or dots.">
        <input id="username" name="username" autoComplete="username" required value={form.username} onChange={(e) => update("username", e.target.value)} className="input" />
      </Field>
      <Field id="email" label="Administrator email">
        <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="input" />
      </Field>
      <Field id="password" label="Password" hint="At least 6 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => update("password", e.target.value)} className="input" />
      </Field>
      <Field id="confirmPassword" label="Confirm password">
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="input" />
      </Field>
      {tokenRequired ? (
        <Field id="setupToken" label="Setup token" hint="Provided by the server operator (ADMIN_SETUP_TOKEN).">
          <input id="setupToken" name="setupToken" type="password" autoComplete="off" required value={form.setupToken} onChange={(e) => update("setupToken", e.target.value)} className="input" />
        </Field>
      ) : null}
      <SubmitButton pending={pending} label="Create administrator" pendingLabel="Creating account…" />
    </form>
  );
}
