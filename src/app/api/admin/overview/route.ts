import { publicUser, requireApiUser } from "@/lib/auth";
import { success } from "@/lib/http";
import { getAdminManhwaList, getAdminStats, getAdminUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const [stats, titles, users] = await Promise.all([
    getAdminStats(),
    getAdminManhwaList(),
    getAdminUsers(),
  ]);

  return success({
    user: publicUser(auth.user),
    stats,
    titles,
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    })),
  });
}
