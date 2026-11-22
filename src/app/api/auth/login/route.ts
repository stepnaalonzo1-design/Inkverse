import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { createSession, defaultDashboardForRole, endCurrentSession, publicUser } from "@/lib/auth";
import { fail, getClientIp, isSameOrigin, parseBody, readJson, success } from "@/lib/http";
import { burnPasswordCheck, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

const INVALID_CREDENTIALS = "Invalid username/email or password.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const parsed = parseBody(loginSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { identifier, password } = parsed.data;

  const normalized = identifier.trim().toLowerCase();
  const isEmail = normalized.includes("@");
  const [user] = await db
    .select()
    .from(users)
    .where(isEmail ? sql`lower(${users.email}) = ${normalized}` : sql`lower(${users.username}) = ${normalized}`)
    .limit(1);

  if (!user) {
    const limiter = rateLimit(`login-fail:${getClientIp(request)}:${normalized}`, 30, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return fail(`Too many login attempts. Try again in ${limiter.retryAfterSec} seconds.`, 429);
    }
    await burnPasswordCheck(password);
    return fail(INVALID_CREDENTIALS, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const limiter = rateLimit(`login-fail:${getClientIp(request)}:${normalized}`, 30, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return fail(`Too many login attempts. Try again in ${limiter.retryAfterSec} seconds.`, 429);
    }
    return fail(INVALID_CREDENTIALS, 401);
  }

  if (user.status !== "active") {
    return fail("This account has been suspended. Contact an administrator.", 403);
  }

  const now = new Date();
  await endCurrentSession(request);
  await db.delete(sessions).where(sql`${sessions.expiresAt} < now()`);
  const [updatedUser] = await db
    .update(users)
    .set({ lastLoginAt: now })
    .where(eq(users.id, user.id))
    .returning();

  const sessionToken = await createSession(
    user.id,
    request.headers.get("user-agent"),
    request,
  );
  const profile = publicUser(updatedUser ?? { ...user, lastLoginAt: now });
  const redirectTo = defaultDashboardForRole(profile.role);

  return success({
    message: `Welcome back, ${profile.username}! Signed in as ${profile.roleLabel}.`,
    user: profile,
    sessionToken,
    redirectTo,
  });
}
