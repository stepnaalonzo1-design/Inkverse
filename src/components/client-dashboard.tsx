"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { useAuth } from "@/components/auth-provider";
import { PasswordForm, ProfileForm } from "@/components/profile-forms";
import { Avatar, EmptyState, StatCard } from "@/components/ui";
import type { PublicUser } from "@/lib/auth";
import { api } from "@/lib/client-api";
import type { LibraryEntry } from "@/lib/queries";
import { coverSrc, formatDate, timeAgo } from "@/lib/utils";

type UserStats = {
  bookmarks: number;
  chaptersRead: number;
  inProgress: number;
  history: number;
};

type HistoryRow = {
  historyId: number;
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  completed: boolean;
  readCount: number;
  lastReadAt: string | Date;
  slug: string;
  manhwaTitle: string;
  coverUrl: string | null;
};

type ContinueRow = {
  manhwaId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  scrollPosition: number;
  lastReadAt: string | Date;
};

export function ClientDashboardView({
  initialUser,
  initialStats,
  initialEntries,
  initialHistory,
  initialContinue,
}: {
  initialUser: PublicUser | null;
  initialStats?: UserStats;
  initialEntries?: LibraryEntry[];
  initialHistory?: HistoryRow[];
  initialContinue?: ContinueRow[];
}) {
  const router = useRouter();
  const { user: contextUser, loading: authLoading, signOut } = useAuth();
  const user = contextUser ?? initialUser;

  const [stats, setStats] = useState<UserStats>(
    initialStats ?? { bookmarks: 0, chaptersRead: 0, inProgress: 0, history: 0 },
  );
  const [entries, setEntries] = useState<LibraryEntry[]>(initialEntries ?? []);
  const [history, setHistory] = useState<HistoryRow[]>(initialHistory ?? []);
  const [continueReading, setContinueReading] = useState<ContinueRow[]>(initialContinue ?? []);
  const [fetching, setFetching] = useState<boolean>(!initialUser);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard");
      return;
    }
    if (user && !initialUser) {
      setFetching(true);
      void api<{
        stats?: UserStats;
        entries?: LibraryEntry[];
        history?: HistoryRow[];
        continueReading?: ContinueRow[];
      }>("/api/auth/me?include=library", "GET").then((res) => {
        if (res.ok) {
          if (res.data.stats) setStats(res.data.stats);
          if (res.data.entries) setEntries(res.data.entries);
          if (res.data.history) setHistory(res.data.history);
          if (res.data.continueReading) setContinueReading(res.data.continueReading);
        }
        setFetching(false);
      });
    }
  }, [authLoading, initialUser, router, user]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="card w-full p-8 text-center">
          <p className="text-sm text-ink-300">Verifying your session…</p>
        </div>
      </div>
    );
  }

  const bookmarked = entries.filter((entry) => entry.bookmarked);
  const reading = entries.filter((entry) => entry.lastReadAt && entry.completedCount < entry.totalChapters);
  const completed = entries.filter((entry) => entry.totalChapters > 0 && entry.completedCount >= entry.totalChapters);
  const isAdmin = user.role === "admin";
  const roleDisplay = isAdmin ? "Administrator" : "Client";

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 lg:px-8">
      <header className="card flex animate-fade-up flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.username} src={user.avatarUrl} size={84} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              {isAdmin ? "Administrator Account" : "Client Dashboard"}
            </p>
            <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-white">
              Welcome, {user.username}
            </h1>
            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-300">
              <div className="flex items-center gap-1.5">
                <dt className="text-ink-400">Username:</dt>
                <dd className="font-semibold text-white">{user.username}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-ink-400">Email:</dt>
                <dd className="font-semibold text-white">{user.email}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-ink-400">Role:</dt>
                <dd>
                  <span className="chip border-violet-400/40 bg-violet-500/15 text-violet-100">
                    {roleDisplay} ({user.role})
                  </span>
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-ink-400">Joined:</dt>
                <dd className="text-ink-300">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-primary">
              Admin Dashboard →
            </Link>
          ) : null}
          <Link href="/browse" className="btn btn-primary">
            Browse Manhwa
          </Link>
          <Link href="/library" className="btn btn-ghost">
            My Library
          </Link>
          <Link href="/profile" className="btn btn-ghost">
            Edit Profile
          </Link>
          <button type="button" onClick={() => void signOut()} className="btn btn-danger">
            Sign out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bookmarked Manhwa" value={bookmarked.length} hint="Saved in your library" />
        <StatCard label="Currently Reading" value={reading.length} hint="Active reading progress" />
        <StatCard label="Completed Titles" value={completed.length} hint="All chapters finished" />
        <StatCard label="Chapters Read" value={stats.chaptersRead} hint={`${stats.history} history entries`} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Resume</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Continue Reading</h2>
          </div>
          <Link href="/library?tab=reading" className="text-sm font-medium text-ink-300 hover:text-violet-300">
            View all in-progress →
          </Link>
        </div>

        {fetching ? (
          <div className="card p-6 text-sm text-ink-400">Loading your reading progress…</div>
        ) : continueReading.length === 0 ? (
          <EmptyState
            title="No chapters in progress yet"
            description="Open any manhwa chapter and your reading position will be saved automatically."
            action={
              <Link href="/browse" className="btn btn-primary">
                Start reading
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {continueReading.map((item) => (
              <Link
                key={item.manhwaId}
                href={`/read/${item.slug}/${item.chapterNumber}`}
                className="group card flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverSrc(item)}
                  alt=""
                  className="h-24 w-18 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                  style={{ width: 72 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-semibold transition group-hover:text-violet-300">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-400">
                    Chapter {item.chapterNumber} · {Math.round((item.scrollPosition ?? 0) * 100)}% read
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">{timeAgo(item.lastReadAt)}</p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                      style={{ width: `${Math.max(4, Math.round((item.scrollPosition ?? 0) * 100))}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Bookmarked Manhwa ({bookmarked.length})</h2>
            <Link href="/library?tab=bookmarks" className="text-sm text-ink-300 hover:text-violet-300">
              Manage bookmarks →
            </Link>
          </div>
          {bookmarked.length === 0 ? (
            <EmptyState
              title="No bookmarked titles"
              description="Bookmark manhwa from any title page to save them here."
              action={<Link href="/browse" className="btn btn-ghost">Explore catalogue</Link>}
            />
          ) : (
            <div className="space-y-3">
              {bookmarked.slice(0, 5).map((entry) => (
                <div key={entry.manhwaId} className="card flex items-center gap-4 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc(entry)}
                    alt=""
                    className="h-16 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/manhwa/${entry.slug}`} className="line-clamp-1 font-semibold hover:text-violet-300">
                      {entry.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {entry.completedCount} / {entry.totalChapters} chapters completed
                    </p>
                  </div>
                  <Link
                    href={
                      entry.chapterNumber != null
                        ? `/read/${entry.slug}/${entry.chapterNumber}`
                        : `/manhwa/${entry.slug}`
                    }
                    className="btn btn-primary px-3 py-1.5 text-xs"
                  >
                    {entry.chapterNumber != null ? `Ch. ${entry.chapterNumber}` : "Read"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Reading Activity</h2>
            <Link href="/library?tab=history" className="text-sm text-ink-300 hover:text-violet-300">
              Full history →
            </Link>
          </div>
          {history.length === 0 ? (
            <EmptyState
              title="No reading history yet"
              description="Every chapter you read will be tracked here."
            />
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map((row) => (
                <div key={row.historyId} className="card flex items-center gap-4 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc({ coverUrl: row.coverUrl, title: row.manhwaTitle, slug: row.slug })}
                    alt=""
                    className="h-16 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/manhwa/${row.slug}`} className="line-clamp-1 font-semibold hover:text-violet-300">
                      {row.manhwaTitle}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Chapter {row.chapterNumber} · {timeAgo(row.lastReadAt)}
                    </p>
                  </div>
                  <Link
                    href={`/read/${row.slug}/${row.chapterNumber}`}
                    className="btn btn-ghost px-3 py-1.5 text-xs"
                  >
                    {row.completed ? "Completed" : "Resume"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ProfilePageView({
  initialUser,
  initialStats,
}: {
  initialUser: PublicUser | null;
  initialStats?: UserStats;
}) {
  const router = useRouter();
  const { user: contextUser, loading: authLoading, signOut } = useAuth();
  const user = contextUser ?? initialUser;
  const [stats, setStats] = useState<UserStats>(
    initialStats ?? { bookmarks: 0, chaptersRead: 0, inProgress: 0, history: 0 },
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/profile");
      return;
    }
    if (user && !initialUser) {
      void api<{ stats?: UserStats }>("/api/auth/me", "GET").then((res) => {
        if (res.ok && res.data.stats) setStats(res.data.stats);
      });
    }
  }, [authLoading, initialUser, router, user]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="card w-full p-8 text-center">
          <p className="text-sm text-ink-300">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "Administrator" : "Client";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <header className="card flex animate-fade-up flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar name={user.username} src={user.avatarUrl} size={88} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Your profile</p>
          <h1 className="mt-1 truncate text-3xl font-black tracking-tight">{user.username}</h1>
          <p className="mt-1 truncate text-sm text-ink-300">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip border-violet-400/40 bg-violet-500/15 text-violet-100">
              {roleLabel} ({user.role})
            </span>
            <span className="chip">Registered {formatDate(user.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="btn btn-primary">
            {isAdmin ? "Admin Dashboard →" : "Client Dashboard →"}
          </Link>
          <button type="button" onClick={() => void signOut()} className="btn btn-danger">
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bookmarked titles" value={stats.bookmarks} />
        <StatCard label="Chapters completed" value={stats.chaptersRead} />
        <StatCard label="In progress" value={stats.inProgress} hint="Titles with a saved position" />
        <StatCard label="History entries" value={stats.history} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ProfileForm
          key={`${user.username}-${user.email}`}
          initial={{ username: user.username, email: user.email, avatarUrl: user.avatarUrl }}
        />
        <PasswordForm />
      </section>
    </div>
  );
}

const TABS = [
  { key: "bookmarks", label: "Bookmarks" },
  { key: "reading", label: "Currently reading" },
  { key: "completed", label: "Completed" },
  { key: "recent", label: "Recently read" },
  { key: "history", label: "Reading history" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function continueLink(entry: LibraryEntry, label = "Continue") {
  if (entry.chapterNumber == null) {
    return (
      <Link href={`/manhwa/${entry.slug}`} className="btn btn-primary px-3 py-2 text-xs">
        Start reading
      </Link>
    );
  }
  return (
    <Link href={`/read/${entry.slug}/${entry.chapterNumber}`} className="btn btn-primary px-3 py-2 text-xs">
      {label} · Ch. {entry.chapterNumber}
    </Link>
  );
}

export function LibraryPageView({
  initialUser,
  initialTab,
  initialEntries,
  initialStats,
  initialHistory,
}: {
  initialUser: PublicUser | null;
  initialTab: TabKey;
  initialEntries?: LibraryEntry[];
  initialStats?: UserStats;
  initialHistory?: HistoryRow[];
}) {
  const router = useRouter();
  const { user: contextUser, loading: authLoading } = useAuth();
  const user = contextUser ?? initialUser;
  const tab = initialTab;

  const [entries, setEntries] = useState<LibraryEntry[]>(initialEntries ?? []);
  const [stats, setStats] = useState<UserStats>(
    initialStats ?? { bookmarks: 0, chaptersRead: 0, inProgress: 0, history: 0 },
  );
  const [history, setHistory] = useState<HistoryRow[]>(initialHistory ?? []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/library");
      return;
    }
    if (user && !initialUser) {
      void api<{
        stats?: UserStats;
        entries?: LibraryEntry[];
        history?: HistoryRow[];
      }>("/api/auth/me?include=library", "GET").then((res) => {
        if (res.ok) {
          if (res.data.entries) setEntries(res.data.entries);
          if (res.data.stats) setStats(res.data.stats);
          if (res.data.history) setHistory(res.data.history);
        }
      });
    }
  }, [authLoading, initialUser, router, user]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
        <div className="card w-full p-8 text-center">
          <p className="text-sm text-ink-300">Loading your library…</p>
        </div>
      </div>
    );
  }

  const bookmarked = entries.filter((entry) => entry.bookmarked);
  const reading = entries.filter((entry) => entry.lastReadAt && entry.completedCount < entry.totalChapters);
  const completed = entries.filter((entry) => entry.totalChapters > 0 && entry.completedCount >= entry.totalChapters);
  const recent = entries
    .filter((entry) => entry.lastReadAt)
    .sort((a, b) => new Date(b.lastReadAt ?? 0).getTime() - new Date(a.lastReadAt ?? 0).getTime());
  const resume = reading[0] ?? recent[0] ?? null;

  const counts: Record<TabKey, number> = {
    bookmarks: bookmarked.length,
    reading: reading.length,
    completed: completed.length,
    recent: recent.length,
    history: stats.history,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <header className="animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Private library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {user.username}</h1>
        <p className="mt-2 text-sm text-ink-400">
          Signed in as <span className="font-semibold text-white">{user.email}</span> ({user.role === "admin" ? "Administrator" : "Client"}). Only you can see this library.
        </p>
      </header>

      {resume ? (
        <section className="card mt-8 flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc(resume)} alt="" className="h-28 w-20 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Continue reading</p>
            <p className="mt-1 truncate text-xl font-bold">{resume.title}</p>
            <p className="mt-1 text-sm text-ink-400">
              {resume.chapterNumber != null
                ? `Chapter ${resume.chapterNumber} · ${Math.round((resume.scrollPosition ?? 0) * 100)}% read · ${timeAgo(resume.lastReadAt)}`
                : "Not started yet"}
            </p>
          </div>
          {continueLink(resume)}
        </section>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bookmarked" value={bookmarked.length} />
        <StatCard label="Currently reading" value={reading.length} />
        <StatCard label="Completed titles" value={completed.length} />
        <StatCard label="Chapters read" value={stats.chaptersRead} />
      </section>

      <nav className="mt-10 flex gap-2 overflow-x-auto pb-1" aria-label="Library sections">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/library?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            className={
              tab === item.key
                ? "whitespace-nowrap rounded-full border border-violet-400/50 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100"
                : "whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-ink-300 transition hover:border-violet-400/30 hover:text-white"
            }
          >
            {item.label} <span className="ml-1 text-xs opacity-70">{counts[item.key]}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "bookmarks" ? (
          bookmarked.length === 0 ? (
            <EmptyState
              title="No bookmarks yet"
              description="Bookmark a title to keep it one tap away."
              action={<Link href="/browse" className="btn btn-primary">Browse titles</Link>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bookmarked.map((entry) => (
                <article key={entry.manhwaId} className="card flex gap-4 p-3 sm:p-4">
                  <Link href={`/manhwa/${entry.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc(entry)} alt="" className="h-32 w-24 rounded-xl object-cover ring-1 ring-white/10" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/manhwa/${entry.slug}`} className="line-clamp-2 font-semibold transition hover:text-violet-300">
                      {entry.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-400">
                      {entry.completedCount} of {entry.totalChapters} chapters read
                    </p>
                    {entry.chapterNumber != null ? (
                      <p className="mt-1 text-xs text-violet-300">
                        Last read: Chapter {entry.chapterNumber} · {timeAgo(entry.lastReadAt)}
                      </p>
                    ) : null}
                    <div className="mt-auto pt-3 flex flex-wrap gap-2">
                      {continueLink(entry, "Read")}
                      <ActionButton
                        url={`/api/bookmarks?manhwaId=${entry.manhwaId}`}
                        label="Remove bookmark"
                        pendingLabel="Removing…"
                        successTitle="Removed from library"
                        confirmMessage={`Remove “${entry.title}” from your bookmarks?`}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === "reading" ? (
          reading.length === 0 ? (
            <EmptyState title="Nothing in progress" description="Open a chapter and your reading position will appear here." action={<Link href="/browse" className="btn btn-primary">Find something to read</Link>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reading.map((entry) => (
                <article key={entry.manhwaId} className="card flex gap-4 p-3 sm:p-4">
                  <Link href={`/manhwa/${entry.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc(entry)} alt="" className="h-32 w-24 rounded-xl object-cover ring-1 ring-white/10" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/manhwa/${entry.slug}`} className="line-clamp-2 font-semibold transition hover:text-violet-300">
                      {entry.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-400">
                      {entry.completedCount} of {entry.totalChapters} chapters read
                    </p>
                    <div className="mt-auto pt-3">{continueLink(entry)}</div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === "completed" ? (
          completed.length === 0 ? (
            <EmptyState title="No completed titles yet" description="Finish every chapter of a title to see it here." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {completed.map((entry) => (
                <article key={entry.manhwaId} className="card flex gap-4 p-3 sm:p-4">
                  <Link href={`/manhwa/${entry.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc(entry)} alt="" className="h-32 w-24 rounded-xl object-cover ring-1 ring-white/10" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/manhwa/${entry.slug}`} className="line-clamp-2 font-semibold transition hover:text-violet-300">
                      {entry.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-400">
                      {entry.completedCount} of {entry.totalChapters} chapters read
                    </p>
                    <div className="mt-auto pt-3">
                      <Link href={`/manhwa/${entry.slug}`} className="btn btn-ghost px-3 py-2 text-xs">
                        View title
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === "recent" ? (
          recent.length === 0 ? (
            <EmptyState title="Nothing read recently" description="Your most recent reading sessions appear here." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recent.map((entry) => (
                <article key={entry.manhwaId} className="card flex gap-4 p-3 sm:p-4">
                  <Link href={`/manhwa/${entry.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc(entry)} alt="" className="h-32 w-24 rounded-xl object-cover ring-1 ring-white/10" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/manhwa/${entry.slug}`} className="line-clamp-2 font-semibold transition hover:text-violet-300">
                      {entry.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-400">
                      {entry.completedCount} of {entry.totalChapters} chapters read
                    </p>
                    <div className="mt-auto pt-3">{continueLink(entry)}</div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === "history" ? (
          history.length === 0 ? (
            <EmptyState title="Your reading history is empty" description="Every chapter you open is recorded here." />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <ActionButton
                  url="/api/reading/history"
                  label="Clear history"
                  variant="danger"
                  successTitle="History cleared"
                  confirmMessage="Clear your reading history and continue-reading progress? Bookmarks are kept."
                />
              </div>
              <ol className="space-y-3">
                {history.map((row) => (
                  <li key={row.historyId} className="card flex items-center gap-4 p-3 sm:p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverSrc({ coverUrl: row.coverUrl, title: row.manhwaTitle, slug: row.slug })} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/manhwa/${row.slug}`} className="line-clamp-1 font-semibold transition hover:text-violet-300">
                        {row.manhwaTitle}
                      </Link>
                      <p className="mt-1 text-sm text-ink-400">
                        Chapter {row.chapterNumber} · read {row.readCount}× · {timeAgo(row.lastReadAt)}
                      </p>
                    </div>
                    {row.completed ? (
                      <span className="chip shrink-0 border-emerald-400/30 text-emerald-200">Completed</span>
                    ) : (
                      <Link href={`/read/${row.slug}/${row.chapterNumber}`} className="btn btn-ghost shrink-0 px-3 py-2 text-xs">
                        Resume
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
