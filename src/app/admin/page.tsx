import { AdminOverviewView } from "@/components/admin-shell";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { getAdminManhwaList, getAdminStats, getAdminUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <AdminOverviewView initialAdmin={null} />;
  }

  const [stats, titles, users] = await Promise.all([
    getAdminStats(),
    getAdminManhwaList(),
    getAdminUsers(),
  ]);

  return (
    <AdminOverviewView
      initialAdmin={publicUser(user)}
      initialStats={stats}
      initialTitles={titles}
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      }))}
    />
  );
}
