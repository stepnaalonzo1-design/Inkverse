import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, RegisterForm } from "@/components/auth-forms";
import { defaultDashboardForRole, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(defaultDashboardForRole(user.role));
  }

  const params = await searchParams;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const defaultRole = roleParam === "admin" ? "admin" : "user";

  return (
    <AuthShell
      title="Join InkVerse"
      subtitle="Create a Client or Administrator account to access your dashboard and personal library."
    >
      <RegisterForm defaultRole={defaultRole} />
      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
