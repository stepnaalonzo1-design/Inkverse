import type { ReactNode } from "react";
import { AdminRestrictedView, AdminShell } from "@/components/admin-shell";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // If the server already resolved a non-admin user from the session, block immediately on the server without evaluating {children}
  if (user && user.role !== "admin") {
    return <AdminRestrictedView username={user.username} email={user.email} />;
  }

  return <AdminShell initialUser={user ? publicUser(user) : null}>{children}</AdminShell>;
}
