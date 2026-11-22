import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, LoginForm } from "@/components/auth-forms";
import { adminExists, defaultDashboardForRole, getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await adminExists())) redirect("/setup");

  const user = await getCurrentUser();
  if (user) {
    redirect(defaultDashboardForRole(user.role));
  }

  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeNextPath(nextRaw, "/");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your username or email. Administrators go to the Admin Dashboard and clients go to the Client Dashboard."
    >
      <LoginForm nextPath={nextPath} />
      <p className="mt-6 text-center text-sm text-ink-400">
        New to InkVerse?{" "}
        <Link href="/register" className="font-semibold text-violet-300 hover:text-violet-200">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
