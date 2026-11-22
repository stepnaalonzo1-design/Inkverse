import { eq } from "drizzle-orm";
import { db } from "@/db";
import { readingHistory, readingProgress } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { success } from "@/lib/http";

/** Clears the signed-in user's reading history and continue-reading progress. */
export async function DELETE(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  await db.transaction(async (tx) => {
    await tx.delete(readingHistory).where(eq(readingHistory.userId, user.id));
    await tx.delete(readingProgress).where(eq(readingProgress.userId, user.id));
  });

  return success({ message: "Reading history cleared." });
}
