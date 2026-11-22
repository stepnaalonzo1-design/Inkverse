import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, SetupForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Administrator setup" };

export default async function SetupPage() {
  return (
    <AuthShell
      title="Administrator Setup"
      subtitle="Create an administrator account with full access to the InkVerse Admin Dashboard."
    >
      <SetupForm tokenRequired={Boolean(process.env.ADMIN_SETUP_TOKEN)} />
      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
