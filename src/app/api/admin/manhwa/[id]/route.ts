import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { manhwa } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { manhwaUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const id = parseId((await params).id);
  if (!id) return fail("Invalid manhwa id.", 400);

  const parsed = parseBody(manhwaUpdateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const [target] = await db.select({ id: manhwa.id }).from(manhwa).where(eq(manhwa.id, id)).limit(1);
  if (!target) return fail("Manhwa not found.", 404);

  const update: Partial<typeof manhwa.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.slug) {
    const [clash] = await db
      .select({ id: manhwa.id })
      .from(manhwa)
      .where(and(eq(manhwa.slug, data.slug), ne(manhwa.id, id)))
      .limit(1);
    if (clash) return fail("Another manhwa already uses this slug.", 409);
    update.slug = data.slug;
  }
  if (data.alternativeTitles !== undefined) update.alternativeTitles = data.alternativeTitles;
  if (data.synopsis !== undefined) update.synopsis = data.synopsis;
  if (data.authors !== undefined) update.authors = data.authors;
  if (data.artists !== undefined) update.artists = data.artists;
  if (data.genres !== undefined) update.genres = data.genres;
  if (data.status !== undefined) update.status = data.status;
  if (data.coverUrl !== undefined) update.coverUrl = data.coverUrl || null;
  if (data.isFeatured !== undefined) update.isFeatured = data.isFeatured;

  try {
    const [updated] = await db
      .update(manhwa)
      .set(update)
      .where(eq(manhwa.id, id))
      .returning({ id: manhwa.id, slug: manhwa.slug });
    return success({ id: updated.id, slug: updated.slug, message: "Manhwa saved." });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another manhwa already uses this slug.", 409);
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const id = parseId((await params).id);
  if (!id) return fail("Invalid manhwa id.", 400);

  // Chapters, bookmarks and reading records are removed by foreign-key cascades.
  const deleted = await db.delete(manhwa).where(eq(manhwa.id, id)).returning({ id: manhwa.id });
  if (deleted.length === 0) return fail("Manhwa not found.", 404);

  return success({ message: "Manhwa and all related chapters were deleted." });
}
