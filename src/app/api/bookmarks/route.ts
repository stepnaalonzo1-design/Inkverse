import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks, manhwa } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { bookmarkSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = parseBody(bookmarkSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const { manhwaId } = parsed.data;

  const [title] = await db
    .select({ id: manhwa.id })
    .from(manhwa)
    .where(eq(manhwa.id, manhwaId))
    .limit(1);
  if (!title) return fail("That manhwa could not be found.", 404);

  await db
    .insert(bookmarks)
    .values({ userId: user.id, manhwaId })
    .onConflictDoNothing();

  return success({ bookmarked: true, message: "Added to your library." }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const manhwaId = Number(new URL(request.url).searchParams.get("manhwaId"));
  if (!Number.isInteger(manhwaId) || manhwaId <= 0) {
    return fail("A valid manhwa id is required.", 422);
  }

  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.manhwaId, manhwaId)));

  return success({ bookmarked: false, message: "Removed from your library." });
}
