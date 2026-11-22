import type { Metadata } from "next";
import { ClientDashboardView } from "@/components/client-dashboard";
import { getCurrentUser, publicUser } from "@/lib/auth";
import {
  getContinueReading,
  getLibraryEntries,
  getReadingHistory,
  getUserStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Client Dashboard" };

export default async function ClientDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <ClientDashboardView initialUser={null} />;
  }

  const [stats, entries, history, continueReading] = await Promise.all([
    getUserStats(user.id),
    getLibraryEntries(user.id),
    getReadingHistory(user.id, 50),
    getContinueReading(user.id, 6),
  ]);

  return (
    <ClientDashboardView
      initialUser={publicUser(user)}
      initialStats={stats}
      initialEntries={entries}
      initialHistory={history}
      initialContinue={continueReading}
    />
  );
}
