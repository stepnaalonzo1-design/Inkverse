"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast-provider";
import { Avatar } from "@/components/ui";
import type { PublicUser } from "@/lib/auth";
import { api } from "@/lib/client-api";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function ProfileForm({
  initial,
}: {
  initial: { username: string; email: string; avatarUrl: string | null };
}) {
  const router = useRouter();
  const { setSession, refreshAuth } = useAuth();
  const { notify } = useToast();
  const [username, setUsername] = useState(initial.username);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailChanged = email.trim().toLowerCase() !== initial.email.toLowerCase();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await api<{ user?: PublicUser }>("/api/profile", "PATCH", {
      username,
      email,
      currentPassword: emailChanged ? currentPassword : undefined,
    });
    setPending(false);

    if (!result.ok) {
      const message = result.data.error ?? "Could not save your profile.";
      setError(message);
      notify({ tone: "error", title: "Profile not saved", description: message });
      return;
    }

    if (result.data.user) {
      setSession(result.data.user);
    } else {
      await refreshAuth();
    }
    setCurrentPassword("");
    notify({ tone: "success", title: "Profile updated", description: result.data.message });
    router.refresh();
  }

  return (
    <section className="card p-6 sm:p-7">
      <h2 className="text-lg font-bold">Profile details</h2>
      <p className="mt-1 text-sm text-ink-400">Update your username, email address and profile picture.</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={username || initial.username} src={avatarUrl} size={72} />
        <ImageUpload
          endpoint="/api/profile/avatar"
          label="Upload profile picture"
          hint="JPG, PNG, WEBP or GIF · up to 8 MB"
          onUploaded={(url) => {
            setAvatarUrl(url);
            void refreshAuth();
            router.refresh();
          }}
        />
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <Field id="profile-username" label="Username">
          <input id="profile-username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field id="profile-email" label="Email">
          <input id="profile-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {emailChanged ? (
          <Field id="profile-current-password" label="Current password" hint="Required to change your email address.">
            <input id="profile-current-password" type="password" autoComplete="current-password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </Field>
        ) : null}
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 sm:w-auto">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}

export function PasswordForm() {
  const { notify } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await api("/api/profile/password", "POST", form);
    setPending(false);

    if (!result.ok) {
      const message = result.data.error ?? "Could not change your password.";
      setError(message);
      notify({ tone: "error", title: "Password not changed", description: message });
      return;
    }

    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    notify({ tone: "success", title: "Password changed", description: result.data.message });
  }

  return (
    <section className="card p-6 sm:p-7">
      <h2 className="text-lg font-bold">Change password</h2>
      <p className="mt-1 text-sm text-ink-400">Changing your password signs out every other device.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <Field id="current-password" label="Current password">
          <input id="current-password" type="password" autoComplete="current-password" required className="input" value={form.currentPassword} onChange={(e) => update("currentPassword", e.target.value)} />
        </Field>
        <Field id="new-password" label="New password" hint="At least 6 characters.">
          <input id="new-password" type="password" autoComplete="new-password" required className="input" value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} />
        </Field>
        <Field id="confirm-new-password" label="Confirm new password">
          <input id="confirm-new-password" type="password" autoComplete="new-password" required className="input" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
        </Field>
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 sm:w-auto">
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
