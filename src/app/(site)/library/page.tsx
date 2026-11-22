import type { Metadata } from "next";
import { LibraryPageView } from "@/components/client-dashboard";
import { getCurrentUser, publicUser } from "@/lib/auth";
import {
  getLibraryEntries,
  getReadingHistory,
  getUserStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Library" };

const TAB_KEYS = ["bookmarks", "reading", "completed", "recent", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabInput = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabKey = TAB_KEYS.includes(tabInput as TabKey) ? (tabInput as TabKey) : "bookmarks";

  const user = await getCurrentUser();
  if (!user) {
    return <LibraryPageView initialUser={null} initialTab={tab} />;
  }

  const [entries, stats, history] = await Promise.all([
    getLibraryEntries(user.id),
    getUserStats(user.id),
    getReadingHistory(user.id, 100),
  ]);

  return (
    <LibraryPageView
      initialUser={publicUser(user)}
      initialTab={tab}
      initialEntries={entries}
      initialStats={stats}
      initialHistory={history}
    />
  );
}
