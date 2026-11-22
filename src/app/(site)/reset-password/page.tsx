import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, ResetPasswordForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = (Array.isArray(params.token) ? params.token[0] : params.token) ?? "";

  if (!token || token.length < 20) {
    return (
      <AuthShell title="Link not valid" subtitle="This reset link is incomplete. Request a new one to continue.">
        <Link href="/forgot-password" className="btn btn-primary w-full py-3">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Reset links expire after 30 minutes and can be used once.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
