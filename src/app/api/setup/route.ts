import { timingSafeEqual } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, endCurrentSession, publicUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, getClientIp, isSameOrigin, parseBody, readJson, success } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { setupSchema } from "@/lib/validation";

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Administrator account setup endpoint.
 * Validates all fields, hashes the password with scrypt, creates the administrator in PostgreSQL,
 * creates a persistent session, and redirects to /admin.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const limiter = rateLimit(`setup:${getClientIp(request)}`, 30, 15 * 60 * 1000);
  if (!limiter.allowed) return fail("Too many attempts. Please wait and try again.", 429);

  const parsed = parseBody(setupSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { username, email, password, setupToken } = parsed.data;

  const requiredToken = process.env.ADMIN_SETUP_TOKEN;
  if (requiredToken && !tokensMatch(setupToken ?? "", requiredToken)) {
    return fail("The setup token is incorrect.", 403);
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        sql`lower(${users.username}) = ${username.toLowerCase()}`,
        eq(users.email, email),
      ),
    )
    .limit(1);
  if (existing) return fail("That username or email is already in use.", 409);

  const passwordHash = await hashPassword(password);

  try {
    await endCurrentSession(request);
    const now = new Date();
    const [admin] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: "admin",
        lastLoginAt: now,
      })
      .returning();

    const sessionToken = await createSession(
      admin.id,
      request.headers.get("user-agent"),
      request,
    );
    const profile = publicUser(admin);

    return success(
      {
        message: `Administrator account created. Welcome, ${profile.username}!`,
        user: profile,
        sessionToken,
        redirectTo: "/admin",
      },
      201,
    );
  } catch (error) {
    if (isUniqueViolation(error)) return fail("That username or email is already in use.", 409);
    throw error;
  }
}
