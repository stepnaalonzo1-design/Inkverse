import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { adminUserUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function countAdminsExcluding(userId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, userId)));
  return Number(row?.value ?? 0);
}

/** Changes a user's role or status. Admins only; administrators cannot change their own access. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;
  const actor = auth.user;

  const targetId = parseId((await params).id);
  if (!targetId) return fail("Invalid user id.", 400);
  if (targetId === actor.id) {
    return fail("You cannot change your own role or status.", 400);
  }

  const parsed = parseBody(adminUserUpdateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { role, status } = parsed.data;

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) return fail("User not found.", 404);

  if (role === "user" && target.role === "admin") {
    if ((await countAdminsExcluding(targetId)) < 1) {
      return fail("At least one administrator must remain.", 409);
    }
  }

  const update: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (role) update.role = role;
  if (status) update.status = status;

  await db.transaction(async (tx) => {
    await tx.update(users).set(update).where(eq(users.id, targetId));
    if (status === "suspended") {
      await tx.delete(sessions).where(eq(sessions.userId, targetId));
    }
  });

  return success({ message: "User updated." });
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;
  const actor = auth.user;

  const targetId = parseId((await params).id);
  if (!targetId) return fail("Invalid user id.", 400);
  if (targetId === actor.id) return fail("You cannot delete your own account here.", 400);

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) return fail("User not found.", 404);

  if (target.role === "admin" && (await countAdminsExcluding(targetId)) < 1) {
    return fail("At least one administrator must remain.", 409);
  }

  await db.delete(users).where(sql`${users.id} = ${targetId}`);
  return success({ message: "User account deleted." });
}
