import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const textArray = (name: string) =>
  text(name).array().notNull().default(sql`'{}'::text[]`);

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    status: text("status").notNull().default("active"),
    avatarUrl: text("avatar_url"),
    resetTokenHash: text("reset_token_hash"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex("users_username_lower_uidx").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_uidx").on(t.email),
    index("users_role_idx").on(t.role),
    index("users_reset_token_idx").on(t.resetTokenHash),
    check("users_role_check", sql`${t.role} in ('user', 'admin')`),
    check("users_status_check", sql`${t.status} in ('active', 'suspended')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hash of the random session token. The raw token only lives in the HTTP-only cookie. */
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export const manhwa = pgTable(
  "manhwa",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    alternativeTitles: textArray("alternative_titles"),
    synopsis: text("synopsis").notNull().default(""),
    authors: textArray("authors"),
    artists: textArray("artists"),
    genres: textArray("genres"),
    status: text("status").notNull().default("ongoing"),
    coverUrl: text("cover_url"),
    isFeatured: boolean("is_featured").notNull().default(false),
    views: integer("views").notNull().default(0),
    weeklyViews: integer("weekly_views").notNull().default(0),
    lastChapterAt: timestamp("last_chapter_at", { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex("manhwa_slug_uidx").on(t.slug),
    index("manhwa_title_idx").on(t.title),
    index("manhwa_views_idx").on(t.views),
    index("manhwa_weekly_views_idx").on(t.weeklyViews),
    index("manhwa_status_idx").on(t.status),
    index("manhwa_last_chapter_idx").on(t.lastChapterAt),
    index("manhwa_created_idx").on(t.createdAt),
    index("manhwa_featured_idx").on(t.isFeatured),
    index("manhwa_genres_gin_idx").using("gin", t.genres),
    check("manhwa_status_check", sql`${t.status} in ('ongoing', 'completed', 'hiatus')`),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    manhwaId: integer("manhwa_id")
      .notNull()
      .references(() => manhwa.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull().default(""),
    /** Ordered list of page image URLs for the chapter. */
    pages: textArray("pages"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex("chapters_manhwa_number_uidx").on(t.manhwaId, t.number),
    index("chapters_created_idx").on(t.createdAt),
    check("chapters_number_check", sql`${t.number} >= 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Personal library and reading activity                               */
/* ------------------------------------------------------------------ */

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manhwaId: integer("manhwa_id")
      .notNull()
      .references(() => manhwa.id, { onDelete: "cascade" }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_manhwa_uidx").on(t.userId, t.manhwaId),
    index("bookmarks_manhwa_idx").on(t.manhwaId),
  ],
);

export const readingHistory = pgTable(
  "reading_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manhwaId: integer("manhwa_id")
      .notNull()
      .references(() => manhwa.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    readCount: integer("read_count").notNull().default(1),
    firstReadAt: createdAtColumn(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reading_history_user_chapter_uidx").on(t.userId, t.chapterId),
    index("reading_history_user_last_read_idx").on(t.userId, t.lastReadAt),
    index("reading_history_user_manhwa_idx").on(t.userId, t.manhwaId),
  ],
);

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    manhwaId: integer("manhwa_id")
      .notNull()
      .references(() => manhwa.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    /** Vertical reading position as a ratio between 0 (top) and 1 (bottom). */
    scrollPosition: real("scroll_position").notNull().default(0),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reading_progress_user_manhwa_uidx").on(t.userId, t.manhwaId),
    index("reading_progress_user_last_read_idx").on(t.userId, t.lastReadAt),
    index("reading_progress_chapter_idx").on(t.chapterId),
    check(
      "reading_progress_scroll_check",
      sql`${t.scrollPosition} >= 0 and ${t.scrollPosition} <= 1`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Manhwa = typeof manhwa.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type ReadingHistory = typeof readingHistory.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
