"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ActionButton } from "@/components/action-button";
import { AdminUserRow, type AdminUserRowData } from "@/components/admin-user-row";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Avatar, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import type { PublicUser } from "@/lib/auth";
import { api } from "@/lib/client-api";
import { cn, coverSrc, formatDate, formatNumber, timeAgo } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/manhwa", label: "Manhwa & chapters" },
  { href: "/admin/users", label: "Users & roles" },
  { href: "/profile", label: "My Profile" },
];

export function AdminRestrictedView({
  username,
  email,
}: {
  username?: string;
  email?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">403 · Restricted</p>
      <h1 className="mt-3 text-3xl font-black">Administrator access required</h1>
      <p className="mt-3 text-ink-400">
        {username ? (
          <>
            You are signed in as <span className="font-semibold text-white">{username}</span>
            {email ? ` (${email})` : ""} with the{" "}
            <span className="font-semibold text-sky-300">Client</span> role. Only administrators can
            access this dashboard.
          </>
        ) : (
          "Your account does not have permission to view this area."
        )}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="btn btn-primary">
          Go to Client Dashboard
        </Link>
        <Link href="/" className="btn btn-ghost">
          Return to InkVerse
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: contextUser, loading: authLoading, signOut } = useAuth();
  const user = contextUser ?? initialUser;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/admin");
    }
  }, [authLoading, router, user]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="card w-full p-8">
          <p className="text-sm text-ink-300">Verifying administrator session…</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return <AdminRestrictedView username={user.username} email={user.email} />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="flex flex-col border-b border-white/5 bg-ink-900/80 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <Link href="/admin" className="text-lg font-extrabold tracking-tight">
            Ink<span className="gradient-text">Verse</span>
            <span className="ml-2 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">
              Admin
            </span>
          </Link>
          <Link href="/" className="text-xs text-ink-400 transition hover:text-white">
            ← Main site
          </Link>
        </div>

        <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex items-center gap-3">
            <Avatar name={user.username} src={user.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user.username}</p>
              <p className="truncate text-xs text-ink-300">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-violet-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                Administrator ({user.role})
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-ink-400">
            <span>Joined {formatDate(user.createdAt)}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="font-semibold text-rose-300 transition hover:text-rose-200"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible" aria-label="Admin">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-violet-500/20 text-violet-100"
                    : "text-ink-300 hover:bg-white/5 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-white/5 p-4 lg:block">
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn btn-danger w-full justify-center"
          >
            Sign out of Admin
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}

type AdminStatsData = {
  users: number;
  admins: number;
  newUsers: number;
  manhwa: number;
  chapters: number;
  bookmarks: number;
  views: number;
  completedReads: number;
  activeSessions: number;
};

type AdminTitleData = {
  id: number;
  slug: string;
  title: string;
  status: string;
  views: number;
  chapterCount: number;
  updatedAt: string | Date;
};

export function AdminOverviewView({
  initialAdmin,
  initialStats,
  initialTitles,
  initialUsers,
}: {
  initialAdmin: PublicUser | null;
  initialStats?: AdminStatsData;
  initialTitles?: AdminTitleData[];
  initialUsers?: AdminUserRowData[];
}) {
  const { user: contextUser } = useAuth();
  const adminUser = contextUser ?? initialAdmin;
  const [stats, setStats] = useState<AdminStatsData | null>(initialStats ?? null);
  const [titles, setTitles] = useState<AdminTitleData[]>(initialTitles ?? []);
  const [users, setUsers] = useState<AdminUserRowData[]>(initialUsers ?? []);

  useEffect(() => {
    if (!initialStats && adminUser?.role === "admin") {
      void api<{
        stats?: AdminStatsData;
        titles?: AdminTitleData[];
        users?: AdminUserRowData[];
      }>("/api/admin/overview", "GET").then((res) => {
        if (res.ok) {
          if (res.data.stats) setStats(res.data.stats);
          if (res.data.titles) setTitles(res.data.titles);
          if (res.data.users) setUsers(res.data.users);
        }
      });
    }
  }, [adminUser, initialStats]);

  if (!stats) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-300">Loading platform statistics…</p>
      </div>
    );
  }

  const topTitles = [...titles].sort((a, b) => b.views - a.views).slice(0, 5);
  const newest = users.slice(0, 6);

  return (
    <div className="space-y-10">
      <header className="animate-fade-up flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Admin Dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Platform Overview</h1>
          <p className="mt-2 text-sm text-ink-400">
            {adminUser
              ? `Signed in as ${adminUser.username} (${adminUser.email}) · Role: Administrator`
              : "Live figures read directly from PostgreSQL."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/manhwa/new" className="btn btn-primary">
            + Add Manhwa
          </Link>
          <Link href="/admin/users" className="btn btn-ghost">
            Manage Users
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Registered users" value={formatNumber(stats.users)} hint={`${stats.newUsers} joined in the last 7 days`} />
        <StatCard label="Administrators" value={formatNumber(stats.admins)} />
        <StatCard label="Manhwa titles" value={formatNumber(stats.manhwa)} hint={`${formatNumber(stats.chapters)} chapters published`} />
        <StatCard label="Total views" value={formatNumber(stats.views)} />
        <StatCard label="Bookmarks" value={formatNumber(stats.bookmarks)} />
        <StatCard label="Chapters completed" value={formatNumber(stats.completedReads)} hint="Across all readers" />
        <StatCard label="Active sessions" value={formatNumber(stats.activeSessions)} hint="Signed-in browsers" />
        <StatCard label="Catalogue health" value={stats.chapters > 0 ? "Live" : "Empty"} hint="Based on chapter count" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Top titles by views</h2>
            <Link href="/admin/manhwa" className="text-sm text-ink-300 hover:text-violet-300">Manage →</Link>
          </div>
          {topTitles.length === 0 ? (
            <p className="text-sm text-ink-400">No titles yet.</p>
          ) : (
            <ol className="space-y-3">
              {topTitles.map((title, index) => (
                <li key={title.id} className="flex items-center gap-4">
                  <span className="w-6 text-sm font-bold text-ink-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/manhwa/${title.id}`} className="block truncate font-semibold hover:text-violet-300">{title.title}</Link>
                    <p className="text-xs text-ink-400">{title.chapterCount} chapters</p>
                  </div>
                  <StatusBadge status={title.status} />
                  <span className="w-20 text-right text-sm font-semibold">{formatNumber(title.views)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Newest members</h2>
            <Link href="/admin/users" className="text-sm text-ink-300 hover:text-violet-300">Manage users →</Link>
          </div>
          <ul className="space-y-3">
            {newest.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <Avatar name={user.username} src={user.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{user.username}</p>
                  <p className="truncate text-xs text-ink-400">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold capitalize text-violet-300">
                    {user.role === "admin" ? "Administrator" : "Client"} ({user.role})
                  </p>
                  <p className="text-xs text-ink-400">{formatDate(user.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Quick actions</h2>
          <p className="mt-1 text-sm text-ink-400">Latest catalogue activity: {titles[0] ? `${titles[0].title}, ${timeAgo(titles[0].updatedAt)}` : "none yet"}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/manhwa/new" className="btn btn-primary">Add manhwa</Link>
          <Link href="/admin/manhwa" className="btn btn-ghost">Edit catalogue</Link>
          <Link href="/admin/users" className="btn btn-ghost">Manage roles</Link>
        </div>
      </section>
    </div>
  );
}

export function AdminCreateUserForm({ onCreated }: { onCreated?: (user: PublicUser) => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await api<{ user?: PublicUser }>("/api/admin/users", "POST", {
      username,
      email,
      password,
      role,
    });
    setPending(false);

    if (!result.ok) {
      const msg = result.data.error ?? "Could not create account.";
      setError(msg);
      notify({ tone: "error", title: "Creation failed", description: msg });
      return;
    }

    setUsername("");
    setEmail("");
    setPassword("");
    notify({
      tone: "success",
      title: "Account created",
      description: result.data.message,
    });
    if (result.data.user && onCreated) {
      onCreated(result.data.user);
    }
    router.refresh();
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold text-white">Create New Account</h2>
      <p className="mt-1 text-sm text-ink-400">
        Create a new Client or Administrator account directly in PostgreSQL.
      </p>
      {error ? (
        <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_160px_auto] lg:items-end" noValidate>
        <div>
          <label className="label" htmlFor="admin-new-username">Username</label>
          <input
            id="admin-new-username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="admin-new-email">Email</label>
          <input
            id="admin-new-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="admin-new-password">Password</label>
          <input
            id="admin-new-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="admin-new-role">Role</label>
          <select
            id="admin-new-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            className="input"
          >
            <option value="user">Client (user)</option>
            <option value="admin">Administrator (admin)</option>
          </select>
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </section>
  );
}

export type AdminManhwaRow = {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  views: number;
  isFeatured: boolean;
  chapterCount: number;
  updatedAt: string | Date;
};

export function AdminManhwaListView({
  initialTitles,
  actionSlot,
}: {
  initialTitles: AdminManhwaRow[];
  actionSlot?: (item: AdminManhwaRow) => ReactNode;
}) {
  const { user: contextUser } = useAuth();
  const [titles, setTitles] = useState<AdminManhwaRow[]>(initialTitles);

  useEffect(() => {
    if (initialTitles.length > 0) {
      setTitles(initialTitles);
    } else if (contextUser?.role === "admin") {
      void api<{ titles?: AdminManhwaRow[] }>("/api/admin/overview", "GET").then((res) => {
        if (res.ok && res.data.titles) {
          setTitles(res.data.titles);
        }
      });
    }
  }, [contextUser, initialTitles]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Catalogue</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Manhwa</h1>
          <p className="mt-1 text-sm text-ink-400">{titles.length} titles in the library</p>
        </div>
        <Link href="/admin/manhwa/new" className="btn btn-primary">+ New manhwa</Link>
      </header>

      {titles.length === 0 ? (
        <EmptyState
          title="No titles yet"
          description="Create the first manhwa to start publishing chapters."
          action={<Link href="/admin/manhwa/new" className="btn btn-primary">Add manhwa</Link>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Chapters</th>
                <th className="px-3 py-3 font-medium">Views</th>
                <th className="px-3 py-3 font-medium">Featured</th>
                <th className="px-3 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {titles.map((item) => (
                <tr key={item.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverSrc(item)} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0">
                        <Link href={`/admin/manhwa/${item.id}`} className="font-semibold transition hover:text-violet-300">
                          {item.title}
                        </Link>
                        <p className="text-xs text-ink-400">/manhwa/{item.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-3">{item.chapterCount}</td>
                  <td className="px-3 py-3">{formatNumber(item.views)}</td>
                  <td className="px-3 py-3">
                    {item.isFeatured ? <span className="text-violet-300">Yes</span> : <span className="text-ink-400">No</span>}
                  </td>
                  <td className="px-3 py-3 text-ink-400">{timeAgo(item.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/manhwa/${item.id}`} className="btn btn-ghost px-3 py-2 text-xs">
                        Edit
                      </Link>
                      {actionSlot ? (
                        actionSlot(item)
                      ) : (
                        <ActionButton
                          url={`/api/admin/manhwa/${item.id}`}
                          label="Delete"
                          variant="danger"
                          successTitle="Manhwa deleted"
                          confirmMessage={`Delete “${item.title}” and all of its chapters? This cannot be undone.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminUsersView({
  initialRows,
  initialMeId,
}: {
  initialRows: AdminUserRowData[];
  initialMeId: number | null;
}) {
  const { user: contextUser } = useAuth();
  const [rows, setRows] = useState<AdminUserRowData[]>(initialRows);
  const meId = contextUser?.id ?? initialMeId;

  useEffect(() => {
    if (initialRows.length > 0) {
      setRows(initialRows);
    } else if (contextUser?.role === "admin") {
      refreshList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRows, contextUser]);

  function refreshList() {
    void api<{ users?: AdminUserRowData[] }>("/api/admin/overview", "GET").then((res) => {
      if (res.ok && res.data.users) {
        setRows(res.data.users);
      }
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Accounts</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Users &amp; roles</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-400">
          Create new Client or Administrator accounts, grant or remove administrator access, and suspend accounts.
        </p>
      </header>

      <AdminCreateUserForm onCreated={() => refreshList()} />

      {rows.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Joined</th>
                <th className="px-3 py-3 font-medium">Last login</th>
                <th className="px-3 py-3 font-medium">Activity</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <AdminUserRow key={row.id} user={row} isSelf={row.id === meId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
