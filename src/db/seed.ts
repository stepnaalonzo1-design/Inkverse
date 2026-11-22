/**
 * Sample catalogue seeder. Idempotent: existing slugs and chapter numbers are left untouched.
 * Run with: npm run db:seed
 * This script never creates user accounts. The administrator is created through /setup.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { chapters, manhwa } from "@/db/schema";

const DAY = 24 * 60 * 60 * 1000;
const PAGES_PER_CHAPTER = 6;

type SampleTitle = {
  slug: string;
  title: string;
  alternativeTitles: string[];
  synopsis: string;
  authors: string[];
  artists: string[];
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  featured?: boolean;
  views: number;
  weeklyViews: number;
  chapters: number;
  hue: number;
};

const SAMPLES: SampleTitle[] = [
  {
    slug: "moonlit-sword-saga",
    title: "Moonlit Sword Saga",
    alternativeTitles: ["The Blade Beneath the Moon"],
    synopsis:
      "Exiled from the Verdant Sect after a failed duel, young swordsman Ren Hallow discovers a blade that wakes only under moonlight. Every technique it teaches costs a memory, and the sect's elders are hiding why.",
    authors: ["Ren Hallow"],
    artists: ["Mio Sato"],
    genres: ["Action", "Fantasy", "Martial Arts"],
    status: "ongoing",
    featured: true,
    views: 182000,
    weeklyViews: 9400,
    chapters: 6,
    hue: 265,
  },
  {
    slug: "starfall-academy",
    title: "Starfall Academy",
    alternativeTitles: ["Academy of Falling Stars"],
    synopsis:
      "When a meteor shower opens a rift above the capital, the city's first class of star-touched students is recruited to seal it. Friendship, rivalry and a few secrets arrive at the same time.",
    authors: ["Ilya Voss"],
    artists: ["Dana Kim"],
    genres: ["Fantasy", "Romance", "Slice of Life"],
    status: "ongoing",
    views: 143000,
    weeklyViews: 7100,
    chapters: 5,
    hue: 210,
  },
  {
    slug: "the-ink-witch",
    title: "The Ink Witch",
    alternativeTitles: ["Witch of Black Ink"],
    synopsis:
      "A quiet bookbinder discovers that every sentence she writes in black ink becomes real for one night. Her first commission, a missing-person case, is written in a hand she does not recognise.",
    authors: ["Sora Vale"],
    artists: ["Sora Vale"],
    genres: ["Mystery", "Supernatural", "Psychological"],
    status: "ongoing",
    views: 98000,
    weeklyViews: 12000,
    chapters: 5,
    hue: 290,
  },
  {
    slug: "crimson-tide-hunter",
    title: "Crimson Tide Hunter",
    alternativeTitles: ["Hunter of the Red Sea"],
    synopsis:
      "Every hundred years the sea rises red and something climbs from the deep. Marcus Bell, a salvage diver with a debt to pay, takes a contract that leads him straight into the tide.",
    authors: ["Marcus Bell"],
    artists: ["Yuna Park"],
    genres: ["Action", "Thriller", "Horror"],
    status: "completed",
    views: 264000,
    weeklyViews: 3000,
    chapters: 6,
    hue: 0,
  },
  {
    slug: "shadow-of-the-tower",
    title: "Shadow of the Tower",
    alternativeTitles: ["Beneath the Ninth Floor"],
    synopsis:
      "The Tower adds a new floor every season, and each floor rewards those who reach it first. Oren Hale is the only climber who can see the shadows that guard the stairs.",
    authors: ["Oren Hale"],
    artists: ["Kade Ito"],
    genres: ["Adventure", "Action", "Fantasy"],
    status: "ongoing",
    views: 77000,
    weeklyViews: 5000,
    chapters: 4,
    hue: 175,
  },
  {
    slug: "lotus-requiem",
    title: "Lotus Requiem",
    alternativeTitles: ["Requiem of the Lotus"],
    synopsis:
      "In a river city during a dynasty in decline, a court musician and a disgraced general share one secret song. Their letters, passed through a teahouse wall, change the fate of the empire.",
    authors: ["Hana Rei"],
    artists: ["Hana Rei"],
    genres: ["Drama", "Historical", "Romance"],
    status: "completed",
    views: 120000,
    weeklyViews: 1500,
    chapters: 6,
    hue: 335,
  },
  {
    slug: "neon-dungeon-diary",
    title: "Neon Dungeon Diary",
    alternativeTitles: ["Diary of a Neon Delver"],
    synopsis:
      "Pixel Ruiz wakes up inside a video game where the monsters respect the terms of service. Hilarity, hard-earned loot and a lot of paperwork follow.",
    authors: ["Pixel Ruiz"],
    artists: ["Bo Tanaka"],
    genres: ["Comedy", "Sci-Fi", "Isekai"],
    status: "ongoing",
    views: 56000,
    weeklyViews: 6400,
    chapters: 4,
    hue: 150,
  },
  {
    slug: "silver-blade-chronicles",
    title: "Silver Blade Chronicles",
    alternativeTitles: ["The Silver Oath"],
    synopsis:
      "Sworn to a vow of silence, the last Silver Blade must choose between her oath and the people of a border fortress that is about to fall.",
    authors: ["Elena Frost"],
    artists: ["Dae Jung"],
    genres: ["Historical", "Martial Arts", "Drama"],
    status: "hiatus",
    views: 41000,
    weeklyViews: 800,
    chapters: 3,
    hue: 30,
  },
];

function placeholderUrl(params: Record<string, string>): string {
  return `/api/placeholder?${new URLSearchParams(params).toString()}`;
}

async function seed() {
  let createdTitles = 0;
  let createdChapters = 0;

  for (const [index, sample] of SAMPLES.entries()) {
    const createdAt = new Date(Date.now() - index * 10 * DAY);

    const inserted = await db
      .insert(manhwa)
      .values({
        slug: sample.slug,
        title: sample.title,
        alternativeTitles: sample.alternativeTitles,
        synopsis: sample.synopsis,
        authors: sample.authors,
        artists: sample.artists,
        genres: sample.genres,
        status: sample.status,
        isFeatured: sample.featured ?? false,
        views: sample.views,
        weeklyViews: sample.weeklyViews,
        createdAt,
        updatedAt: createdAt,
      })
      .onConflictDoNothing({ target: manhwa.slug })
      .returning({ id: manhwa.id });
    if (inserted.length) createdTitles += 1;

    const [row] = await db
      .select({ id: manhwa.id })
      .from(manhwa)
      .where(eq(manhwa.slug, sample.slug))
      .limit(1);

    let latest: Date | null = null;
    for (let number = 1; number <= sample.chapters; number += 1) {
      const chapterCreatedAt = new Date(
        Date.now() - ((sample.chapters - number) * 4 + index) * DAY,
      );
      const pages = Array.from({ length: PAGES_PER_CHAPTER }, (_, pageIndex) =>
        placeholderUrl({
          kind: "page",
          title: sample.title,
          label: `Chapter ${number} · Page ${pageIndex + 1}`,
          hue: String(sample.hue),
        }),
      );
      const result = await db
        .insert(chapters)
        .values({
          manhwaId: row.id,
          number,
          title: `Part ${number}`,
          pages,
          createdAt: chapterCreatedAt,
          updatedAt: chapterCreatedAt,
        })
        .onConflictDoNothing({ target: [chapters.manhwaId, chapters.number] })
        .returning({ id: chapters.id });
      if (result.length) createdChapters += 1;
      if (!latest || chapterCreatedAt > latest) latest = chapterCreatedAt;
    }

    if (latest) {
      await db.update(manhwa).set({ lastChapterAt: latest }).where(eq(manhwa.id, row.id));
    }
  }

  console.log(
    `Seed complete: ${createdTitles} new titles and ${createdChapters} new chapters (${SAMPLES.length} sample titles defined).`,
  );
}

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
