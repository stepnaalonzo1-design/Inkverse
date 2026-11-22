import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, manhwa } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { chapterUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const id = parseId((await params).id);
  if (!id) return fail("Invalid chapter id.", 400);

  const parsed = parseBody(chapterUpdateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const update: Partial<typeof chapters.$inferInsert> = { updatedAt: new Date() };
  if (data.number !== undefined) update.number = data.number;
  if (data.title !== undefined) update.title = data.title;
  if (data.pages !== undefined) update.pages = data.pages;

  try {
    const [updated] = await db
      .update(chapters)
      .set(update)
      .where(eq(chapters.id, id))
      .returning({ id: chapters.id });
    if (!updated) return fail("Chapter not found.", 404);
    return success({ message: "Chapter saved." });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another chapter already uses that number.", 409);
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const id = parseId((await params).id);
  if (!id) return fail("Invalid chapter id.", 400);

  const [chapter] = await db
    .select({ manhwaId: chapters.manhwaId })
    .from(chapters)
    .where(eq(chapters.id, id))
    .limit(1);
  if (!chapter) return fail("Chapter not found.", 404);

  await db.delete(chapters).where(eq(chapters.id, id));
  await db.update(manhwa).set({ updatedAt: new Date() }).where(eq(manhwa.id, chapter.manhwaId));

  return success({ message: "Chapter deleted." });
}
