import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, manhwa, readingHistory, readingProgress } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { progressSchema } from "@/lib/validation";

/** Records where the signed-in user is reading. Called by the reader on open, periodically, and on exit. */
export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = parseBody(progressSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { chapterId, scrollPosition, completed = false, opened = false } = parsed.data;

  const [chapter] = await db
    .select({ id: chapters.id, manhwaId: chapters.manhwaId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) return fail("Chapter not found.", 404);

  // The server only accepts completion when the reported position is near the end of the chapter.
  const markCompleted = completed && scrollPosition >= 0.85;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(readingProgress)
      .values({
        userId: user.id,
        manhwaId: chapter.manhwaId,
        chapterId,
        scrollPosition,
        lastReadAt: now,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.manhwaId],
        set: { chapterId, scrollPosition, lastReadAt: now },
      });

    await tx
      .insert(readingHistory)
      .values({
        userId: user.id,
        manhwaId: chapter.manhwaId,
        chapterId,
        completed: markCompleted,
        readCount: 1,
        lastReadAt: now,
      })
      .onConflictDoUpdate({
        target: [readingHistory.userId, readingHistory.chapterId],
        set: {
          completed: sql`${readingHistory.completed} or ${markCompleted}`,
          readCount: sql`${readingHistory.readCount} + ${opened ? 1 : 0}`,
          lastReadAt: now,
        },
      });

    if (opened) {
      await tx
        .update(manhwa)
        .set({
          views: sql`${manhwa.views} + 1`,
          weeklyViews: sql`${manhwa.weeklyViews} + 1`,
        })
        .where(eq(manhwa.id, chapter.manhwaId));
    }
  });

  return success({ completed: markCompleted });
}
