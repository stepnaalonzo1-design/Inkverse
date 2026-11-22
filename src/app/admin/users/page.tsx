import { AdminUsersView } from "@/components/admin-shell";
import { type AdminUserRowData } from "@/components/admin-user-row";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return <AdminUsersView initialRows={[]} initialMeId={null} />;
  }

  const users = await getAdminUsers();
  const rows: AdminUserRowData[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    bookmarkCount: user.bookmarkCount,
    chaptersRead: user.chaptersRead,
  }));

  return <AdminUsersView initialRows={rows} initialMeId={me.id} />;
}
