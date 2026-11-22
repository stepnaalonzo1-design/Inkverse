import { defaultDashboardForRole, getCurrentUser, publicUser } from "@/lib/auth";
import { fail, success } from "@/lib/http";
import {
  getContinueReading,
  getLibraryEntries,
  getReadingHistory,
  getUserStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Returns the currently authenticated user's profile and personal library/reading data
 * directly from PostgreSQL. Supports both session cookies and Authorization Bearer tokens.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return fail("Not authenticated.", 401, { user: null });
  }

  const url = new URL(request.url);
  const includeLibrary = url.searchParams.get("include") === "library";

  const stats = await getUserStats(user.id);
  const profile = publicUser(user);

  if (!includeLibrary) {
    return success({
      user: profile,
      stats,
      redirectTo: defaultDashboardForRole(profile.role),
    });
  }

  const [entries, history, continueReading] = await Promise.all([
    getLibraryEntries(user.id),
    getReadingHistory(user.id, 100),
    getContinueReading(user.id, 6),
  ]);

  return success({
    user: profile,
    stats,
    entries,
    history,
    continueReading,
    redirectTo: defaultDashboardForRole(profile.role),
  });
}
