import { AdminManhwaListView } from "@/components/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getAdminManhwaList } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminManhwaListPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <AdminManhwaListView initialTitles={[]} />;
  }

  const titles = await getAdminManhwaList();
  return <AdminManhwaListView initialTitles={titles} />;
}
