import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { publicUser, requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = parseBody(profileUpdateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { username, email, currentPassword } = parsed.data;

  const [current] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!current) return fail("Account not found.", 404);

  // Changing the email address is security-sensitive, so it requires the current password.
  if (email !== user.email) {
    if (!currentPassword) {
      return fail("Enter your current password to change your email address.", 422);
    }
    if (!(await verifyPassword(currentPassword, current.passwordHash))) {
      return fail("Your current password is incorrect.", 403);
    }
  }

  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        ne(users.id, user.id),
        or(sql`lower(${users.username}) = ${username.toLowerCase()}`, eq(users.email, email)),
      ),
    )
    .limit(1);
  if (conflict) return fail("That username or email is already in use.", 409);

  try {
    const [updated] = await db
      .update(users)
      .set({ username, email, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    return success({ message: "Profile updated.", user: publicUser(updated) });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("That username or email is already in use.", 409);
    throw error;
  }
}
