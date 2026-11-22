import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, manhwa } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { chapterCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const parsed = parseBody(chapterCreateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { manhwaId, number, title, pages } = parsed.data;

  const [parent] = await db
    .select({ id: manhwa.id })
    .from(manhwa)
    .where(eq(manhwa.id, manhwaId))
    .limit(1);
  if (!parent) return fail("Manhwa not found.", 404);

  try {
    const now = new Date();
    const [created] = await db
      .insert(chapters)
      .values({
        manhwaId,
        number,
        title: title ?? "",
        pages: pages ?? [],
      })
      .returning({ id: chapters.id });

    await db
      .update(manhwa)
      .set({ lastChapterAt: now, updatedAt: now })
      .where(eq(manhwa.id, manhwaId));

    return success({ id: created.id, message: "Chapter added." }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(`Chapter ${number} already exists for this manhwa.`, 409);
    }
    throw error;
  }
}
