import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordChangeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = parseBody(passwordChangeSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const [current] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!current) return fail("Account not found.", 404);

  if (!(await verifyPassword(currentPassword, current.passwordHash))) {
    return fail("Your current password is incorrect.", 403);
  }
  if (await verifyPassword(newPassword, current.passwordHash)) {
    return fail("Choose a password you have not used before.", 422);
  }

  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    // Keep the current browser signed in; sign out every other session.
    await tx
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), ne(sessions.id, user.sessionId)));
  });

  return success({ message: "Password changed. Other devices have been signed out." });
}
