"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Avatar } from "@/components/ui";

export function HomeUserBanner() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "Administrator" : "Client";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const dashboardLabel = isAdmin ? "Open Admin Dashboard" : "Open Client Dashboard";

  return (
    <div className="border-b border-white/10 bg-ink-900/90">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
        <div className="flex items-center gap-3">
          <Avatar name={user.username} src={user.avatarUrl} size={36} />
          <div className="text-sm">
            <span className="font-semibold text-white">{user.username}</span>
            <span className="mx-2 text-ink-400">·</span>
            <span className="text-ink-300">{user.email}</span>
            <span className="ml-2.5 inline-flex items-center rounded-full border border-violet-400/40 bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-100">
              {roleLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={dashboardHref} className="btn btn-primary px-3.5 py-1.5 text-xs">
            {dashboardLabel} →
          </Link>
          <Link href="/profile" className="btn btn-ghost px-3 py-1.5 text-xs">
            My Profile
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn btn-ghost px-3 py-1.5 text-xs text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
