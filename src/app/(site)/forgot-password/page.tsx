import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, ForgotPasswordForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter the email linked to your account and we will send a reset link.">
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-ink-400">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
