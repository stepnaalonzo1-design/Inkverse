import { requireApiUser } from "@/lib/auth";
import { fail, success } from "@/lib/http";
import { saveImageUpload } from "@/lib/uploads";

/** Admin image upload used for covers and chapter pages. Returns the served URL. */
export async function POST(request: Request) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Choose an image file to upload.", 422);

  const saved = await saveImageUpload(file);
  if (!saved.ok) return fail(saved.error, 422);

  return success({ url: saved.url, message: "Image uploaded." }, 201);
}
