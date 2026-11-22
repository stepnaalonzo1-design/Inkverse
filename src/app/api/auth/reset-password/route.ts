import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashToken } from "@/lib/auth";
import { fail, isSameOrigin, parseBody, readJson, success } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const parsed = parseBody(resetPasswordSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { token, password } = parsed.data;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.resetTokenHash, hashToken(token)),
        gt(users.resetTokenExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!user) {
    return fail("This reset link is invalid or has expired. Request a new one.", 400);
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    // Sign out every existing session so a compromised session cannot survive the reset.
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
  });

  return success({ message: "Your password has been updated. Please sign in with your new password." });
}
