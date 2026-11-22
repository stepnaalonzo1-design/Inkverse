import { and, asc, count, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  bookmarks,
  chapters,
  manhwa,
  readingHistory,
  readingProgress,
  users,
} from "@/db/schema";
import { PAGE_SIZE } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Shared column fragments                                             */
/* ------------------------------------------------------------------ */

export const latestChapterSql = sql<number | null>`(select max(${chapters.number}) from ${chapters} where ${chapters.manhwaId} = ${manhwa.id})`;

export const chapterCountSql = sql<number>`(select count(*)::int from ${chapters} where ${chapters.manhwaId} = ${manhwa.id})`;

const cardFields = {
  id: manhwa.id,
  slug: manhwa.slug,
  title: manhwa.title,
  coverUrl: manhwa.coverUrl,
  status: manhwa.status,
  genres: manhwa.genres,
  authors: manhwa.authors,
  views: manhwa.views,
  isFeatured: manhwa.isFeatured,
  lastChapterAt: manhwa.lastChapterAt,
  createdAt: manhwa.createdAt,
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export type BrowseFilters = {
  q: string;
  genre: string;
  status: string;
  sort: string;
  page: number;
};

export async function browseManhwa(filters: BrowseFilters) {
  const conditions: SQL[] = [];

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    conditions.push(
      sql`(${manhwa.title} ilike ${pattern} or array_to_string(${manhwa.alternativeTitles}, ' ') ilike ${pattern} or array_to_string(${manhwa.authors}, ' ') ilike ${pattern})`,
    );
  }
  if (filters.genre) {
    conditions.push(sql`${manhwa.genres} @> ARRAY[${filters.genre}]::text[]`);
  }
  if (filters.status) {
    conditions.push(eq(manhwa.status, filters.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let order: SQL[];
  switch (filters.sort) {
    case "latest":
      order = [desc(manhwa.lastChapterAt), desc(manhwa.id)];
      break;
    case "newest":
      order = [desc(manhwa.createdAt), desc(manhwa.id)];
      break;
    case "title":
      order = [asc(manhwa.title)];
      break;
    default:
      order = [desc(manhwa.views), desc(manhwa.id)];
  }

  const offset = (filters.page - 1) * PAGE_SIZE;
  const [items, totals] = await Promise.all([
    db
      .select({ ...cardFields, latestChapter: latestChapterSql })
      .from(manhwa)
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(manhwa).where(where),
  ]);

  return { items, total: Number(totals[0]?.value ?? 0) };
}

export async function getManhwaBySlug(slug: string) {
  const [row] = await db
    .select({
      ...getTableColumns(manhwa),
      latestChapter: latestChapterSql,
      chapterCount: chapterCountSql,
    })
    .from(manhwa)
    .where(eq(manhwa.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getManhwaById(id: number) {
  const [row] = await db.select().from(manhwa).where(eq(manhwa.id, id)).limit(1);
  return row ?? null;
}

/** Chapter list without page payloads, ascending by number. */
export async function getChapterOutline(manhwaId: number) {
  return db
    .select({
      id: chapters.id,
      number: chapters.number,
      title: chapters.title,
      createdAt: chapters.createdAt,
      pagesCount: sql<number>`coalesce(array_length(${chapters.pages}, 1), 0)::int`,
    })
    .from(chapters)
    .where(eq(chapters.manhwaId, manhwaId))
    .orderBy(asc(chapters.number));
}

export async function getChapterById(chapterId: number) {
  const [row] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  return row ?? null;
}

export async function getGenreCounts() {
  const result = await db.execute<{ genre: string; count: number }>(sql`
    select g as genre, count(*)::int as count
    from manhwa, unnest(manhwa.genres) as g
    group by g
    order by count desc, g asc
  `);
  return result.rows;
}

export async function getHomeData(userId: number | null) {
  const [featured, trending, popular, recentChapters, latest, genres, continueReading] =
    await Promise.all([
      db
        .select({ ...cardFields, latestChapter: latestChapterSql, synopsis: manhwa.synopsis })
        .from(manhwa)
        .orderBy(desc(manhwa.isFeatured), desc(manhwa.views))
        .limit(5),
      db
        .select({ ...cardFields, latestChapter: latestChapterSql })
        .from(manhwa)
        .orderBy(desc(manhwa.weeklyViews), desc(manhwa.views))
        .limit(12),
      db
        .select({ ...cardFields, latestChapter: latestChapterSql })
        .from(manhwa)
        .orderBy(desc(manhwa.views), desc(manhwa.id))
        .limit(12),
      db
        .select({
          chapterId: chapters.id,
          number: chapters.number,
          title: chapters.title,
          createdAt: chapters.createdAt,
          slug: manhwa.slug,
          manhwaTitle: manhwa.title,
          coverUrl: manhwa.coverUrl,
        })
        .from(chapters)
        .innerJoin(manhwa, eq(chapters.manhwaId, manhwa.id))
        .orderBy(desc(chapters.createdAt), desc(chapters.id))
        .limit(12),
      db
        .select({ ...cardFields, latestChapter: latestChapterSql })
        .from(manhwa)
        .orderBy(desc(manhwa.createdAt), desc(manhwa.id))
        .limit(12),
      getGenreCounts(),
      userId ? getContinueReading(userId, 6) : Promise.resolve([]),
    ]);

  return { featured, trending, popular, recentChapters, latest, genres, continueReading };
}

/* ------------------------------------------------------------------ */
/* Per-user library, progress and history                              */
/* ------------------------------------------------------------------ */

export async function getContinueReading(userId: number, limit = 6) {
  return db
    .select({
      manhwaId: manhwa.id,
      slug: manhwa.slug,
      title: manhwa.title,
      coverUrl: manhwa.coverUrl,
      chapterId: chapters.id,
      chapterNumber: chapters.number,
      chapterTitle: chapters.title,
      scrollPosition: readingProgress.scrollPosition,
      lastReadAt: readingProgress.lastReadAt,
    })
    .from(readingProgress)
    .innerJoin(manhwa, eq(readingProgress.manhwaId, manhwa.id))
    .innerJoin(chapters, eq(readingProgress.chapterId, chapters.id))
    .where(eq(readingProgress.userId, userId))
    .orderBy(desc(readingProgress.lastReadAt))
    .limit(limit);
}

export type LibraryEntry = {
  manhwaId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  authors: string[];
  bookmarked: boolean;
  lastReadAt: Date | null;
  scrollPosition: number | null;
  chapterId: number | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  completedCount: number;
  totalChapters: number;
};

/** Every title the user has bookmarked or opened, with progress aggregates in one query. */
export async function getLibraryEntries(userId: number): Promise<LibraryEntry[]> {
  const result = await db.execute<LibraryEntry>(sql`
    select
      m.id as "manhwaId",
      m.slug,
      m.title,
      m.cover_url as "coverUrl",
      m.status,
      m.authors,
      (b.user_id is not null) as bookmarked,
      p.last_read_at as "lastReadAt",
      p.scroll_position as "scrollPosition",
      c.id as "chapterId",
      c.number as "chapterNumber",
      c.title as "chapterTitle",
      coalesce(h.completed_count, 0)::int as "completedCount",
      (select count(*)::int from chapters cc where cc.manhwa_id = m.id) as "totalChapters"
    from manhwa m
    left join bookmarks b on b.manhwa_id = m.id and b.user_id = ${userId}
    left join reading_progress p on p.manhwa_id = m.id and p.user_id = ${userId}
    left join chapters c on c.id = p.chapter_id
    left join (
      select manhwa_id, count(*) as completed_count
      from reading_history
      where user_id = ${userId} and completed = true
      group by manhwa_id
    ) h on h.manhwa_id = m.id
    where b.user_id is not null or p.user_id is not null
    order by coalesce(p.last_read_at, b.created_at) desc
  `);
  return result.rows;
}

export async function getReadingHistory(userId: number, limit = 100) {
  return db
    .select({
      historyId: readingHistory.id,
      chapterId: chapters.id,
      chapterNumber: chapters.number,
      chapterTitle: chapters.title,
      completed: readingHistory.completed,
      readCount: readingHistory.readCount,
      lastReadAt: readingHistory.lastReadAt,
      slug: manhwa.slug,
      manhwaTitle: manhwa.title,
      coverUrl: manhwa.coverUrl,
    })
    .from(readingHistory)
    .innerJoin(chapters, eq(readingHistory.chapterId, chapters.id))
    .innerJoin(manhwa, eq(readingHistory.manhwaId, manhwa.id))
    .where(eq(readingHistory.userId, userId))
    .orderBy(desc(readingHistory.lastReadAt))
    .limit(limit);
}

export async function getUserStats(userId: number) {
  const result = await db.execute<{
    bookmarks: number;
    chaptersRead: number;
    inProgress: number;
    history: number;
  }>(sql`
    select
      (select count(*)::int from bookmarks where user_id = ${userId}) as bookmarks,
      (select count(*)::int from reading_history where user_id = ${userId} and completed = true) as "chaptersRead",
      (select count(*)::int from reading_progress where user_id = ${userId}) as "inProgress",
      (select count(*)::int from reading_history where user_id = ${userId}) as history
  `);
  return result.rows[0] ?? { bookmarks: 0, chaptersRead: 0, inProgress: 0, history: 0 };
}

export async function getBookmarkedIds(userId: number): Promise<Set<number>> {
  const rows = await db
    .select({ manhwaId: bookmarks.manhwaId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));
  return new Set(rows.map((row) => row.manhwaId));
}

export async function getCompletedChapterIds(userId: number, manhwaId: number): Promise<Set<number>> {
  const rows = await db
    .select({ chapterId: readingHistory.chapterId })
    .from(readingHistory)
    .where(
      and(
        eq(readingHistory.userId, userId),
        eq(readingHistory.manhwaId, manhwaId),
        eq(readingHistory.completed, true),
      ),
    );
  return new Set(rows.map((row) => row.chapterId));
}

export async function getContinueForManhwa(userId: number, manhwaId: number) {
  const [row] = await db
    .select({
      chapterId: readingProgress.chapterId,
      chapterNumber: chapters.number,
      scrollPosition: readingProgress.scrollPosition,
    })
    .from(readingProgress)
    .innerJoin(chapters, eq(readingProgress.chapterId, chapters.id))
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.manhwaId, manhwaId)))
    .limit(1);
  return row ?? null;
}

export async function getReaderState(userId: number, manhwaId: number, chapterId: number) {
  const [progress] = await db
    .select({ chapterId: readingProgress.chapterId, scrollPosition: readingProgress.scrollPosition })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.manhwaId, manhwaId)))
    .limit(1);
  const [history] = await db
    .select({ completed: readingHistory.completed })
    .from(readingHistory)
    .where(and(eq(readingHistory.userId, userId), eq(readingHistory.chapterId, chapterId)))
    .limit(1);
  return {
    scrollPosition: progress && progress.chapterId === chapterId ? progress.scrollPosition : null,
    completed: history?.completed ?? false,
  };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function getAdminStats() {
  const result = await db.execute<{
    users: number;
    admins: number;
    newUsers: number;
    manhwa: number;
    chapters: number;
    bookmarks: number;
    views: number;
    completedReads: number;
    activeSessions: number;
  }>(sql`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where role = 'admin') as admins,
      (select count(*)::int from users where created_at > now() - interval '7 days') as "newUsers",
      (select count(*)::int from manhwa) as manhwa,
      (select count(*)::int from chapters) as chapters,
      (select count(*)::int from bookmarks) as bookmarks,
      (select coalesce(sum(views), 0)::int from manhwa) as views,
      (select count(*)::int from reading_history where completed = true) as "completedReads",
      (select count(*)::int from sessions where expires_at > now()) as "activeSessions"
  `);
  return result.rows[0];
}

export async function getAdminManhwaList() {
  return db
    .select({
      ...getTableColumns(manhwa),
      chapterCount: chapterCountSql,
    })
    .from(manhwa)
    .orderBy(desc(manhwa.createdAt), desc(manhwa.id));
}

export async function getAdminUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      bookmarkCount: sql<number>`(select count(*)::int from bookmarks b where b.user_id = ${users.id})`,
      chaptersRead: sql<number>`(select count(*)::int from reading_history h where h.user_id = ${users.id} and h.completed = true)`,
    })
    .from(users)
    .orderBy(desc(users.createdAt), desc(users.id));
}
