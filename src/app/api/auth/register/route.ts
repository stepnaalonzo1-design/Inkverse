import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, defaultDashboardForRole, endCurrentSession, publicUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, getClientIp, isSameOrigin, parseBody, readJson, success } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";

const registerInputSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    role: z.enum(["user", "admin"]).optional(),
    accountType: z.enum(["client", "administrator", "user", "admin"]).optional(),
  })
  .refine((v) => v.confirmPassword === undefined || v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const limiter = rateLimit(`register:${getClientIp(request)}`, 60, 60 * 60 * 1000);
  if (!limiter.allowed) return fail("Too many sign-ups from this network. Try again later.", 429);

  const parsed = parseBody(registerInputSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { username, email, password, role, accountType } = parsed.data;

  const resolvedRole: "user" | "admin" =
    role === "admin" || accountType === "administrator" || accountType === "admin"
      ? "admin"
      : "user";

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
  if (existing) return fail("That username or email is already registered.", 409);

  const passwordHash = await hashPassword(password);

  try {
    await endCurrentSession(request);
    const now = new Date();
    const [created] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: resolvedRole,
        lastLoginAt: now,
      })
      .returning();

    const sessionToken = await createSession(
      created.id,
      request.headers.get("user-agent"),
      request,
    );
    const profile = publicUser(created);
    const redirectTo = defaultDashboardForRole(profile.role);

    return success(
      {
        message: `Welcome to InkVerse, ${profile.username}! Your ${profile.roleLabel.toLowerCase()} account is ready.`,
        user: profile,
        sessionToken,
        redirectTo,
      },
      201,
    );
  } catch (error) {
    if (isUniqueViolation(error)) return fail("That username or email is already registered.", 409);
    throw error;
  }
}
