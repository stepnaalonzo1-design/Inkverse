import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { fail, success } from "@/lib/http";
import { saveImageUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Choose an image file to upload.", 422);

  const saved = await saveImageUpload(file);
  if (!saved.ok) return fail(saved.error, 422);

  await db
    .update(users)
    .set({ avatarUrl: saved.url, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return success({ url: saved.url, avatarUrl: saved.url, message: "Profile picture updated." });
}
