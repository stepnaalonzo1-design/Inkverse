import { eq } from "drizzle-orm";
import { db } from "@/db";
import { manhwa } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { fail, parseBody, readJson, success } from "@/lib/http";
import { slugify } from "@/lib/utils";
import { manhwaCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiUser(request, { role: "admin" });
  if ("response" in auth) return auth.response;

  const parsed = parseBody(manhwaCreateSchema, await readJson(request));
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const slug = data.slug ? data.slug : slugify(data.title);
  if (!slug) return fail("Could not create a URL slug from this title. Provide one manually.", 422);

  const [existing] = await db
    .select({ id: manhwa.id })
    .from(manhwa)
    .where(eq(manhwa.slug, slug))
    .limit(1);
  if (existing) return fail("Another manhwa already uses this slug.", 409);

  try {
    const [created] = await db
      .insert(manhwa)
      .values({
        title: data.title,
        slug,
        alternativeTitles: data.alternativeTitles ?? [],
        synopsis: data.synopsis ?? "",
        authors: data.authors ?? [],
        artists: data.artists ?? [],
        genres: data.genres ?? [],
        status: data.status ?? "ongoing",
        coverUrl: data.coverUrl || null,
        isFeatured: data.isFeatured ?? false,
      })
      .returning({ id: manhwa.id, slug: manhwa.slug });

    return success({ id: created.id, slug: created.slug, message: "Manhwa created." }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another manhwa already uses this slug.", 409);
    throw error;
  }
}
