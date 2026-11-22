import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { GENRES, SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const headerUser = user
    ? {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={headerUser} />
      <main className="flex-1">{children}</main>
      <footer className="mt-10 border-t border-white/5 bg-ink-900/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              {SITE_NAME}
              <span className="text-violet-400">.</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-400">
              A premium home for manhwa. Read vertically, pick up where you left off and keep your
              library private to you.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li><Link className="hover:text-violet-300" href="/browse">Browse all titles</Link></li>
              <li><Link className="hover:text-violet-300" href="/browse?sort=latest">Latest updates</Link></li>
              <li><Link className="hover:text-violet-300" href="/browse?sort=newest">New releases</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Genres</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink-400">
              {GENRES.slice(0, 8).map((genre) => (
                <li key={genre}>
                  <Link className="hover:text-violet-300" href={`/browse?genre=${encodeURIComponent(genre)}`}>
                    {genre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li><Link className="hover:text-violet-300" href="/dashboard">Client dashboard</Link></li>
              <li><Link className="hover:text-violet-300" href="/library">My library</Link></li>
              <li><Link className="hover:text-violet-300" href="/profile">Profile &amp; security</Link></li>
              <li><Link className="hover:text-violet-300" href="/login">Sign in</Link></li>
              <li><Link className="hover:text-violet-300" href="/forgot-password">Reset password</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 py-5 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} {SITE_NAME}. Sample artwork is generated placeholder content.
        </div>
      </footer>
    </div>
  );
}
