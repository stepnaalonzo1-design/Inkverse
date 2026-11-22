import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashToken } from "@/lib/auth";
import { fail, getClientIp, isSameOrigin, parseBody, readJson, success } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation";

const RESET_TTL_MS = 30 * 60 * 1000;
const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent. It expires in 30 minutes.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const limiter = rateLimit(`forgot:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limiter.allowed) return fail("Too many reset requests. Please try again later.", 429);

  const parsed = parseBody(forgotPasswordSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;

  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user && user.status === "active") {
    // Only the SHA-256 hash of the token is stored; the raw token exists only in the emailed link.
    const token = randomBytes(32).toString("base64url");
    await db
      .update(users)
      .set({
        resetTokenHash: hashToken(token),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const base = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("[forgot-password] Failed to deliver reset email", error);
    }
  }

  // Same response whether or not the account exists, to prevent account enumeration.
  return success({ message: GENERIC_MESSAGE });
}
