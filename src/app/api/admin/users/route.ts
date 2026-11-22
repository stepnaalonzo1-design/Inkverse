import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { publicUser, requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { adminCreateUserSchema } from "@/lib/validation";

/** Allows an administrator to create a new Client or Administrator account from the dashboard. */
export async function POST(request: Request) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const parsed = parseBody(adminCreateUserSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { username, email, password, role } = parsed.data;

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
    const [created] = await db
      .insert(users)
      .values({ username, email, passwordHash, role })
      .returning();

    return success(
      {
        message: `${role === "admin" ? "Administrator" : "Client"} account "${created.username}" created.`,
        user: publicUser(created),
      },
      201,
    );
  } catch (error) {
    if (isUniqueViolation(error)) return fail("That username or email is already registered.", 409);
    throw error;
  }
}
