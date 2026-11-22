"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SearchForm } from "@/components/search-form";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type HeaderUser = {
  id?: number;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function SiteHeader({ user: serverUser }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const { user: contextUser, signOut } = useAuth();
  const user = contextUser ?? serverUser;

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function handleSignOut() {
    setAccountOpen(false);
    setMobileOpen(false);
    await signOut();
  }

  const isAdmin = user?.role === "admin";
  const roleLabel = isAdmin ? "Administrator" : "Client";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Client Dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="InkVerse home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-black text-white shadow-lg shadow-violet-900/40 transition duration-300 group-hover:scale-105">
            IV
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Ink<span className="gradient-text">Verse</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <Link
            href="/browse"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
              isActive(pathname, "/browse")
                ? "bg-white/10 text-white"
                : "text-ink-300 hover:bg-white/5 hover:text-white",
            )}
          >
            Browse
          </Link>
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
                  isActive(pathname, dashboardHref)
                    ? "bg-violet-500/20 text-violet-100"
                    : "text-violet-300 hover:bg-violet-500/10 hover:text-violet-100",
                )}
              >
                {dashboardLabel}
              </Link>
              <Link
                href="/library"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
                  isActive(pathname, "/library")
                    ? "bg-white/10 text-white"
                    : "text-ink-300 hover:bg-white/5 hover:text-white",
                )}
              >
                My Library
              </Link>
              <Link
                href="/profile"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition duration-200",
                  isActive(pathname, "/profile")
                    ? "bg-white/10 text-white"
                    : "text-ink-300 hover:bg-white/5 hover:text-white",
                )}
              >
                Profile
              </Link>
            </>
          ) : null}
        </nav>

        <div className="hidden min-w-0 flex-1 md:block md:max-w-xs lg:max-w-sm">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div ref={accountRef} className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Open account menu"
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition duration-200 hover:border-violet-400/40 hover:bg-white/10"
              >
                <Avatar name={user.username} src={user.avatarUrl} size={30} />
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {user.username}
                </span>
                <span
                  className={cn(
                    "hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider lg:inline-block",
                    isAdmin
                      ? "bg-violet-500/25 text-violet-200"
                      : "bg-sky-500/20 text-sky-200",
                  )}
                >
                  {roleLabel}
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={cn("h-4 w-4 text-ink-400 transition", accountOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn-ghost hidden px-3 py-1.5 text-xs text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200 sm:inline-flex"
              >
                Sign out
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-3 w-72 origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl [animation-duration:0.25s]"
                >
                  <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <Avatar name={user.username} src={user.avatarUrl} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{user.username}</p>
                      <p className="truncate text-xs text-ink-300">{user.email}</p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          isAdmin
                            ? "bg-violet-500/25 text-violet-200"
                            : "bg-sky-500/20 text-sky-200",
                        )}
                      >
                        {roleLabel} ({user.role})
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col">
                    <Link
                      role="menuitem"
                      href={dashboardHref}
                      onClick={() => setAccountOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/10"
                    >
                      {dashboardLabel}
                    </Link>
                    <Link
                      role="menuitem"
                      href="/profile"
                      onClick={() => setAccountOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/10"
                    >
                      My profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/library"
                      onClick={() => setAccountOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/10"
                    >
                      My library
                    </Link>
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn btn-ghost hidden px-3.5 py-2 sm:inline-flex">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary px-3.5 py-2">
                Join free
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="animate-fade-up border-t border-white/5 bg-ink-950/95 px-4 pb-6 pt-4 md:hidden">
          {user ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <Avatar name={user.username} src={user.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{user.username}</p>
                <p className="truncate text-xs text-ink-300">{user.email}</p>
                <p className="text-xs font-medium text-violet-300">{roleLabel}</p>
              </div>
            </div>
          ) : null}
          <SearchForm className="mb-4" />
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <Link
              href="/browse"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white"
            >
              Browse
            </Link>
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-violet-300 hover:bg-violet-500/10"
                >
                  {dashboardLabel}
                </Link>
                <Link
                  href="/library"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white"
                >
                  My Library
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white"
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-300 hover:bg-rose-500/10"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn btn-ghost">Sign in</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary">Join free</Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
