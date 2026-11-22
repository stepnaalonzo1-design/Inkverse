import type { Metadata } from "next";
import { ProfilePageView } from "@/components/client-dashboard";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { getUserStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <ProfilePageView initialUser={null} />;
  }

  const stats = await getUserStats(user.id);
  return <ProfilePageView initialUser={publicUser(user)} initialStats={stats} />;
}
