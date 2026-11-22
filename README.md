# InkVerse

A full-stack manhwa reading platform built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **PostgreSQL** and **Drizzle ORM**.

Readers can browse and search the catalogue, read chapters in a vertical-scroll reader, bookmark titles, and have their progress saved automatically. Administrators manage titles, chapters, page images, and user roles from a protected dashboard.

---

## 1. Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see section 2). The default .env points at the local PostgreSQL instance.

# 3. Apply database migrations (creates all 7 tables and indexes)
npx drizzle-kit migrate

# 4. Load the sample catalogue (8 titles, 39 chapters). Safe to re-run; it never creates user accounts.
npx tsx src/db/seed.ts

# 5a. Development server
npm run dev

# 5b. Production build and server
npm run build
npm run start
```

Open `http://localhost:3000`. On a fresh database, the first visit redirects to **`/setup`**, where you create the administrator account yourself. There is no default password anywhere in the codebase. Once an administrator exists, `/setup` and `POST /api/setup` are permanently closed.

---

## 2. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Only read on the server. |
| `ADMIN_SETUP_TOKEN` | No | If set, the first-time setup form also requires this secret. Recommended when the site is reachable from the internet before the owner completes setup. |
| `COOKIE_SECURE` | No | Set to `true` when serving over HTTPS so session cookies are sent only over TLS. Default `false` for local HTTP. |
| `APP_URL` | No | Public base URL used in password-reset links, for example `https://inkverse.example.com`. Defaults to the request origin. |
| `RESEND_API_KEY` + `MAIL_FROM` | No | Enables real password-reset email delivery through the Resend HTTP API. |
| `MAIL_DEV_LOG` | No | Set to `true` in local development to print reset links to the server log when no mail provider is configured. Never enable in production. |
| `UPLOAD_DIR` | No | Folder for uploaded covers, pages and avatars. Default `./uploads`. |

Secrets are read only in server code (route handlers and server components). Nothing secret is sent to the browser.

---

## 3. Features

**Readers**
- Homepage with featured title, trending, popular, recently updated chapters, latest releases, genre categories, search and a Continue Reading section.
- Browse page with search, genre, status filters, and sorting by popularity, latest update, newest release or title.
- Title pages with synopsis, authors, artists, genres, status, chapter list and bookmark button.
- Vertical-scroll chapter reader with chapter selector, previous and next buttons, a progress bar, and mobile bottom controls.
- Personal library (private to each user): Bookmarks, Currently reading, Completed, Recently read, Reading history, and Continue Reading.
- Profile page with username, email, profile picture, registration date, reading statistics, profile editing and password change.

**Accounts and security**
- First-time administrator setup (no hard-coded credentials; setup closes after first use; optional setup token).
- Registration and login by username or email. Passwords are hashed with **scrypt** (memory-hard, per-user salt).
- Sessions are stored in PostgreSQL. The browser holds a random token in an **HTTP-only, SameSite=Lax** cookie. Only the **SHA-256 hash** of the token is stored in the database.
- Logout deletes the server-side session. Changing or resetting a password signs out the other sessions.
- Password reset: 30-minute, single-use tokens, stored only as hashes. Responses do not reveal whether an email is registered.
- Login, registration, setup and reset requests are rate limited. Login errors use one generic message.
- Same-origin checks on all state-changing requests; input validated with Zod on the server.
- Role changes happen only on the server and only by administrators. Admins cannot change their own role or status, and the last administrator cannot be removed.

**Administrator dashboard (`/admin`)**
- Overview: users, administrators, titles, chapters, total views, bookmarks, completed reads, active sessions.
- Manhwa: create, edit, delete. Upload or link covers. Set status, genres, authors, alternative titles, and featured flag.
- Chapters: add, rename, renumber, delete. Manage pages (upload or add by URL, reorder, remove).
- Users: view all accounts, change role (user / administrator), suspend or reactivate, delete.

---

## 4. Project structure

```
src/
  app/
    layout.tsx                 Root layout (fonts, dark theme, toast provider)
    globals.css                Tailwind v4 theme and component classes
    (site)/                    Public site (shared header and footer)
      page.tsx                 Homepage
      browse/                  Catalogue search and filters
      manhwa/[slug]/           Title detail page
      read/[slug]/[number]/    Chapter reader
      library/                 Private library (protected)
      profile/                 Profile and security (protected)
      login/ register/         Authentication pages
      forgot-password/ reset-password/
      setup/                   First-time administrator setup
    admin/                     Administrator area (layout enforces role)
      page.tsx                 Overview statistics
      manhwa/                  Catalogue, editor, chapter page manager
      users/                   User and role management
    api/                       Route handlers (JSON API)
      setup/ auth/ profile/ bookmarks/ reading/ admin/
      media/[name]/            Serves uploaded images
      placeholder/             Generates original placeholder artwork (SVG)
      health/                  Database health check
  components/                  UI components (client and shared)
  db/
    index.ts                   Drizzle + pg pool (reads DATABASE_URL)
    schema.ts                  All tables, keys, relations, indexes, checks
    seed.ts                    Sample catalogue loader
  lib/
    auth.ts                    Sessions, current user, route authorization
    password.ts                scrypt hashing and verification
    validation.ts              Zod schemas for every input
    queries.ts                 Shared database queries
    uploads.ts                 Image validation (type, size, file signature) and storage
    rate-limit.ts              Sliding-window rate limiter
    mailer.ts                  Password-reset email delivery
    http.ts / client-api.ts    Response helpers and client fetch wrapper
drizzle/                       Generated SQL migrations
tests/e2e/                     End-to-end test scripts (see section 6)
```

### Database tables

| Table | Key points |
| --- | --- |
| `users` | Unique case-insensitive username, unique email, role `user`/`admin` (CHECK), status `active`/`suspended`, avatar, reset token hash and expiry. |
| `sessions` | Primary key = SHA-256 of the session token. FK to `users` with cascade delete. Indexed by user and expiry. |
| `manhwa` | Unique slug, arrays for alternative titles, authors, artists and genres (GIN index on genres), status CHECK, view counters, featured flag. |
| `chapters` | FK to `manhwa` (cascade). Unique `(manhwa_id, number)`. Ordered array of page URLs. |
| `bookmarks` | Unique `(user_id, manhwa_id)`. |
| `reading_history` | Unique `(user_id, chapter_id)`. Completed flag, read count, last-read time. |
| `reading_progress` | Unique `(user_id, manhwa_id)`. Current chapter and scroll position (0–1, CHECK). |

---

## 5. Maintenance

**Schema changes**
1. Edit `src/db/schema.ts`.
2. Generate a migration: `npx drizzle-kit generate --name short_description`.
3. Review the SQL in `drizzle/`, then apply it: `npx drizzle-kit migrate`.
4. In development only, `npx drizzle-kit push` syncs the schema directly without migration files.

**Backups**
- Back up PostgreSQL regularly. It holds all accounts, progress and catalogue data.
- Back up the `uploads/` folder (or `UPLOAD_DIR`). Images are stored on disk, not in the database.

**Reading progress and sessions**
- Expired sessions are removed on each login. Sessions last 30 days.
- Reader progress is saved on open, every 4 seconds while the reader changes, when the tab is hidden, and when navigating away.

**Weekly trending**
- The "Trending now" section sorts by `manhwa.weekly_views`. This counter increments on each chapter open but is not reset automatically. To make it a true weekly figure, schedule `UPDATE manhwa SET weekly_views = 0;` once a week (for example with cron).

**Email**
- Set `RESEND_API_KEY` and `MAIL_FROM` for real delivery. Other providers can be added in `src/lib/mailer.ts`.

**Scaling**
- The rate limiter (`src/lib/rate-limit.ts`) is in-memory and per process. Use a shared store such as Redis if you run several server instances.

---

## 6. Testing

The end-to-end scripts in `tests/e2e/` exercise the running server over HTTP and check PostgreSQL state directly. Use an empty, separate database so the administrator you create is not affected.

```bash
# Create and migrate a throwaway database
createdb inkverse_test   # or: psql ... -c "CREATE DATABASE inkverse_test"
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/inkverse_test npx drizzle-kit migrate
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/inkverse_test npx tsx src/db/seed.ts

# Start the server against it (MAIL_DEV_LOG lets the test read reset links from the log)
PORT=3101 DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/inkverse_test \
  UPLOAD_DIR=/tmp/inkverse-uploads MAIL_DEV_LOG=true npx next start -p 3101 > /tmp/inkverse-server.log 2>&1 &

# Phase 1: setup, auth, sessions, profile, bookmarks, progress, history, admin, password reset
TEST_DB=postgresql://postgres:postgres@127.0.0.1:5432/inkverse_test BASE_URL=http://127.0.0.1:3101 \
  SERVER_LOG=/tmp/inkverse-server.log node tests/e2e/phase1.mjs

# Restart the server, then verify that data persisted
TEST_DB=postgresql://postgres:postgres@127.0.0.1:5432/inkverse_test BASE_URL=http://127.0.0.1:3101 \
  node tests/e2e/persistence.mjs
```

Phase 1 must run on a database with no administrator; re-create the test database to run it again.

---

## 7. Security notes

- Never commit `.env`. Rotate `DATABASE_URL` credentials if they are ever exposed.
- Use HTTPS in production and set `COOKIE_SECURE=true`.
- Set `ADMIN_SETUP_TOKEN` on public deployments before the owner completes setup.
- Keep `MAIL_DEV_LOG` unset in production, because reset links would then appear in logs.
- Sample artwork is generated by `/api/placeholder` and is original. Upload only images you have rights to use.

---

## 8. Known limitations

- Without an email provider configured, password-reset emails are not delivered. Configure `RESEND_API_KEY` and `MAIL_FROM`.
- Rate limits are in-memory (see section 5).
- "Trending" uses a weekly counter that needs an external reset job (see section 5).
- Uploaded images are stored on the local filesystem. Use object storage (S3 or similar) for multi-server deployments.
