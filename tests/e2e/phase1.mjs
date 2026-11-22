/**
 * InkVerse end-to-end checks (phase 1). Run against a freshly migrated, empty test database
 * with the production server started. Uses real HTTP requests, cookies and PostgreSQL queries.
 *
 *   TEST_DB=postgresql://... BASE_URL=http://127.0.0.1:3101 node tests/e2e/phase1.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3101";
const TEST_DB = process.env.TEST_DB;
const SERVER_LOG = process.env.SERVER_LOG ?? "/tmp/inkverse-server.log";
const STATE_FILE = process.env.STATE_FILE ?? "/tmp/inkverse-e2e-state.json";
if (!TEST_DB) throw new Error("TEST_DB is required");

const ADMIN = { username: "alonzo", email: "qa-admin@example.com", password: "QaAdmin#2026pass" };
const READER = { username: "reader_one", email: "Reader.One@Example.com", password: "ReaderPass123" };
const STRANGER = { username: "stranger_x", email: "stranger@example.com", password: "StrangerPass1" };
const NEW_READER_PASS = "NewReaderPass456";
const FINAL_READER_PASS = "ThirdPass789";
const READER_PRO = "reader_pro";
const SLUG = "moonlit-sword-saga";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

function db(query) {
  return execFileSync("psql", [TEST_DB, "-At", "-c", query], { encoding: "utf8" }).trim();
}

function pngForm(name = "page.png", bytes = Buffer.from(PNG_BASE64, "base64")) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), name);
  return form;
}

class Client {
  constructor(name) {
    this.name = name;
    this.jar = new Map();
  }

  get cookieHeader() {
    return [...this.jar].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  async call(path, options = {}) {
    const headers = {};
    if (this.cookieHeader) headers.cookie = this.cookieHeader;
    let body;
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.json);
    }
    if (options.form) body = options.form;

    const res = await fetch(BASE + path, {
      method: options.method ?? "GET",
      headers,
      body,
      redirect: "manual",
    });

    const setCookie = res.headers.getSetCookie();
    for (const raw of setCookie) {
      const [pair, ...attributes] = raw.split(";");
      const index = pair.indexOf("=");
      const cookieName = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = value === "" || attributes.some((attr) => attr.trim().toLowerCase() === "max-age=0");
      if (expired) this.jar.delete(cookieName);
      else this.jar.set(cookieName, value);
    }

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, location: res.headers.get("location") ?? "", text, json, setCookie };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/* React inserts <!-- --> between adjacent text nodes in SSR output; strip it before text assertions. */
const strip = (text) => text.replace(/<!-- -->/g, "");

/* ================================================================== */
/* 1. Infrastructure and first-time administrator setup               */
/* ================================================================== */

const anon = new Client("anon");
let r = await anon.call("/api/health");
check("Health endpoint reports PostgreSQL connectivity", r.status === 200 && r.json?.ok === true);

r = await anon.call("/");
check("Before setup, the homepage redirects to /setup", r.status === 307 && r.location.endsWith("/setup"), `${r.status} ${r.location}`);

r = await anon.call("/setup");
check("Setup page is served while no administrator exists", r.status === 200 && r.text.includes("Set up InkVerse"));

r = await anon.call("/api/setup", {
  method: "POST",
  json: { username: "al", email: "not-an-email", password: "short", confirmPassword: "short" },
});
check("Setup rejects invalid username, email and password (422)", r.status === 422, r.json?.error);

r = await anon.call("/api/setup", {
  method: "POST",
  json: { username: ADMIN.username, email: ADMIN.email, password: ADMIN.password, confirmPassword: "Mismatch#2026x" },
});
check("Setup rejects mismatched password confirmation", r.status === 422 && /do not match/i.test(r.json?.error ?? ""), r.json?.error);
check("Rejected setup attempts create no administrator", db("select count(*) from users where role = 'admin'") === "0");

const admin = new Client("admin");
r = await admin.call("/api/setup", {
  method: "POST",
  json: { username: ADMIN.username, email: ADMIN.email, password: ADMIN.password, confirmPassword: ADMIN.password },
});
check("First-time setup creates the administrator (HTTP 201)", r.status === 201, r.json?.message);
check("Setup response does not echo the password or any hash", !r.text.includes(ADMIN.password) && !r.text.includes("scrypt$"));
check(
  "Session cookie is HTTP-only and SameSite=Lax",
  r.setCookie.some((c) => c.startsWith("inkverse_session=") && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)),
);
check("Administrator role is assigned on the server (PostgreSQL)", db(`select role from users where username='${ADMIN.username}'`) === "admin");
check("Password is stored as a scrypt hash, not plaintext", db(`select left(password_hash, 7) from users where username='${ADMIN.username}'`) === "scrypt$");
check("Session tokens are stored hashed (64-char SHA-256 ids)", db("select length(id) from sessions limit 1") === "64");

const adminId = Number(db(`select id from users where username='${ADMIN.username}'`));

r = await new Client("second-setup").call("/api/setup", {
  method: "POST",
  json: { username: "intruder", email: "intruder@example.com", password: "IntruderPass1", confirmPassword: "IntruderPass1" },
});
check("Setup endpoint is closed after an administrator exists (404)", r.status === 404);
check("Closed setup cannot create a second administrator", db("select count(*) from users where role = 'admin'") === "1");

r = await new Client("setup-page").call("/setup");
check("Setup page redirects to sign-in after setup", r.status === 307 && r.location.endsWith("/login"));

r = await admin.call("/");
check("Administrator's homepage renders with the header account menu", r.status === 200 && r.text.includes(ADMIN.username) && r.text.includes("Trending now"));

r = await admin.call("/admin");
check("Administrator can open the admin dashboard", r.status === 200 && r.text.includes("Overview"));

r = await anon.call("/admin");
check("Anonymous visitors are redirected to sign-in from /admin", r.status === 307 && r.location.includes("/login"));

/* ================================================================== */
/* 2. Registration, login, persistent sessions                        */
/* ================================================================== */

let reader = new Client("reader");
r = await reader.call("/api/auth/register", {
  method: "POST",
  json: { username: READER.username, email: READER.email, password: READER.password, confirmPassword: READER.password },
});
check("Regular user registration succeeds (HTTP 201)", r.status === 201, r.json?.message);
check("Registered user has role 'user' and a normalised email", db(`select role || ' ' || email from users where username='${READER.username}'`) === "user reader.one@example.com");

r = await new Client("dup").call("/api/auth/register", {
  method: "POST",
  json: { username: "READER_ONE", email: READER.email, password: READER.password, confirmPassword: READER.password },
});
check("Duplicate username/email is rejected case-insensitively (409)", r.status === 409, r.json?.error);

r = await new Client("escalate").call("/api/auth/register", {
  method: "POST",
  json: { username: "sneaky_user", email: "sneaky@example.com", password: "SneakyPass123", confirmPassword: "SneakyPass123", role: "admin" },
});
check("Client-supplied role=admin during registration is ignored", r.status === 201 && db("select role from users where username='sneaky_user'") === "user");

r = await new Client("bad-login").call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER.username, password: "WrongPass999" },
});
check("Login with a wrong password is rejected (401)", r.status === 401 && r.json?.error === "Invalid username/email or password.");

r = await new Client("unknown-login").call("/api/auth/login", {
  method: "POST",
  json: { identifier: "nobody_here", password: "WrongPass999" },
});
check("Unknown account gets the same generic error (no enumeration)", r.status === 401 && r.json?.error === "Invalid username/email or password.");

r = await reader.call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER.username, password: READER.password },
});
check("Login with username succeeds and returns a welcome message", r.status === 200 && /Welcome back, reader_one/.test(r.json?.message ?? ""), r.json?.message);
check("Login response never exposes password hashes", !r.text.includes("scrypt$") && !r.text.includes(READER.password));

const byEmail = new Client("by-email");
r = await byEmail.call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER.email, password: READER.password },
});
check("Login with email succeeds", r.status === 200);

r = await reader.call("/");
check("Session persists across page loads (header shows username)", r.status === 200 && r.text.includes(READER.username));

/* ================================================================== */
/* 3. Profile                                                         */
/* ================================================================== */

r = await reader.call("/profile");
check("Profile shows username, email and registration date", r.status === 200 && r.text.includes(READER.username) && r.text.includes("reader.one@example.com") && r.text.includes("Registered"));

r = await reader.call("/api/profile", {
  method: "PATCH",
  json: { username: READER_PRO, email: "reader.one@example.com" },
});
check("Profile username update succeeds", r.status === 200 && db(`select username from users where email='reader.one@example.com'`) === READER_PRO, r.json?.error);

r = await reader.call("/api/profile", {
  method: "PATCH",
  json: { username: READER_PRO, email: "changed.mail@example.com" },
});
check("Changing email without the current password is refused (422)", r.status === 422, r.json?.error);

r = await reader.call("/api/profile", {
  method: "PATCH",
  json: { username: READER_PRO, email: "changed.mail@example.com", currentPassword: "WrongPass999" },
});
check("Changing email with a wrong current password is refused (403)", r.status === 403);

r = await reader.call("/api/profile", {
  method: "PATCH",
  json: { username: READER_PRO, email: "reader.one@example.com", role: "admin" },
});
check("Profile update cannot change the role (ignored by validation)", db(`select role from users where username='${READER_PRO}'`) === "user");

/* ================================================================== */
/* 4. Bookmarks, reading progress, history, continue reading          */
/* ================================================================== */

const manhwaId = Number(db(`select id from manhwa where slug='${SLUG}'`));
const chapter1 = Number(db(`select c.id from chapters c join manhwa m on m.id = c.manhwa_id where m.slug='${SLUG}' and c.number = 1`));
const chapter2 = Number(db(`select c.id from chapters c join manhwa m on m.id = c.manhwa_id where m.slug='${SLUG}' and c.number = 2`));

r = await reader.call("/api/bookmarks", { method: "POST", json: { manhwaId } });
check("Bookmarking a title succeeds (HTTP 201)", r.status === 201, r.json?.message);
r = await reader.call("/library?tab=bookmarks");
check("Bookmarked title appears in the personal library", r.status === 200 && r.text.includes("Moonlit Sword Saga"));
r = await reader.call(`/manhwa/${SLUG}`);
check("Title page shows the bookmarked state", r.status === 200 && r.text.includes("Bookmarked"));
check("Bookmark row is stored in PostgreSQL", db(`select count(*) from bookmarks b join users u on u.id = b.user_id where u.username='${READER_PRO}' and b.manhwa_id = ${manhwaId}`) === "1");

r = await reader.call("/api/reading/progress", {
  method: "POST",
  json: { chapterId: chapter1, scrollPosition: 0.5, opened: true },
});
check("Reading progress is recorded at 50% scroll", r.status === 200);
check("Reading progress row stored with chapter and position", db(`select p.scroll_position || ' ' || p.chapter_id from reading_progress p join users u on u.id = p.user_id where u.username='${READER_PRO}'`) === `0.5 ${chapter1}`);
check("Reading history row created with read count 1", db(`select read_count from reading_history h join users u on u.id = h.user_id where u.username='${READER_PRO}' and h.chapter_id = ${chapter1}`) === "1");

r = await reader.call(`/read/${SLUG}/1`);
check("Reader restores the saved scroll position (initialScroll 0.5)", r.status === 200 && /initialScroll\\?"\s*:\s*0\.5/.test(r.text));

r = await reader.call("/api/reading/progress", {
  method: "POST",
  json: { chapterId: chapter1, scrollPosition: 0.95, completed: true },
});
check("Chapter completion is accepted at 95% scroll", r.status === 200 && r.json?.completed === true);
check("Completed flag is persisted in reading_history", db(`select completed from reading_history h join users u on u.id = h.user_id where u.username='${READER_PRO}' and h.chapter_id = ${chapter1}`) === "t");

r = await reader.call("/api/reading/progress", {
  method: "POST",
  json: { chapterId: chapter2, scrollPosition: 0.2, completed: true },
});
check("Server refuses completion when scroll position is too early", r.status === 200 && r.json?.completed === false);

r = await reader.call("/api/reading/progress", {
  method: "POST",
  json: { chapterId: chapter2, scrollPosition: 0.3, opened: true },
});
check("Opening chapter 2 moves the continue-reading pointer", r.status === 200);

r = await reader.call("/");
check("Homepage shows Continue Reading with the last-read chapter", r.text.includes("Continue reading") && r.text.includes(`/read/${SLUG}/2`));

r = await reader.call("/library?tab=reading");
check("Library 'Currently reading' lists the title", r.status === 200 && r.text.includes("Moonlit Sword Saga"));

r = await reader.call("/library?tab=history");
check("Reading history lists chapters read", r.status === 200 && strip(r.text).includes("Chapter 1") && strip(r.text).includes("Chapter 2"));

r = await reader.call("/library?tab=completed");
check("Completed tab is empty until every chapter is finished", r.status === 200 && !r.text.includes("View title</a>"));

r = await reader.call("/api/auth/logout", { method: "POST" });
check("Logout succeeds and clears the session cookie", r.status === 200 && r.setCookie.some((c) => /Max-Age=0/i.test(c)));

r = await reader.call("/library");
check("After logout, the private library redirects to sign-in", r.status === 307 && r.location.includes("/login"));

reader = new Client("reader-again");
r = await reader.call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER_PRO, password: READER.password },
});
check("User logs back in with the same credentials", r.status === 200, r.json?.message);

r = await reader.call("/");
check("Continue Reading survives logout and login", r.text.includes(`/read/${SLUG}/2`));
r = await reader.call("/library?tab=bookmarks");
check("Bookmarks survive logout and login", r.text.includes("Moonlit Sword Saga"));

/* ================================================================== */
/* 5. Isolation and authorization                                     */
/* ================================================================== */

const stranger = new Client("stranger");
r = await stranger.call("/api/auth/register", {
  method: "POST",
  json: { username: STRANGER.username, email: STRANGER.email, password: STRANGER.password, confirmPassword: STRANGER.password },
});
check("Second user registers", r.status === 201);
const strangerId = Number(db(`select id from users where username='${STRANGER.username}'`));

r = await stranger.call("/library?tab=bookmarks");
check("Users only see their own library (no leakage)", r.status === 200 && !r.text.includes("Moonlit Sword Saga"));

r = await stranger.call("/admin");
check("Regular users see the 403 panel on /admin", r.status === 200 && r.text.includes("Administrator access required"));

r = await stranger.call("/api/admin/manhwa", { method: "POST", json: { title: "Hacked Title" } });
check("Regular users cannot create manhwa via API (403)", r.status === 403);

r = await stranger.call(`/api/admin/users/${adminId}`, { method: "PATCH", json: { role: "user" } });
check("Regular users cannot change roles (403)", r.status === 403 && db(`select role from users where id=${adminId}`) === "admin");

r = await stranger.call(`/api/admin/manhwa/${manhwaId}`, { method: "DELETE" });
check("Regular users cannot delete manhwa (403)", r.status === 403 && db(`select count(*) from manhwa where id=${manhwaId}`) === "1");

r = await stranger.call("/api/admin/upload", { method: "POST", form: pngForm() });
check("Regular users cannot upload admin images (403)", r.status === 403);

r = await stranger.call("/api/bookmarks", { method: "POST", json: { manhwaId: 999999 } });
check("Bookmarking a missing title returns 404", r.status === 404);

/* ================================================================== */
/* 6. Administrator capabilities                                      */
/* ================================================================== */

r = await admin.call("/api/admin/manhwa", {
  method: "POST",
  json: { title: "QA Test Title", genres: ["Action", "Drama"], status: "ongoing", synopsis: "Testing.", alternativeTitles: ["QA"], authors: ["QA Author"], artists: [], isFeatured: false },
});
check("Administrator creates a manhwa with generated slug (201)", r.status === 201 && r.json?.slug === "qa-test-title", r.json?.error);
const qaId = r.json?.id;

r = await admin.call("/api/admin/manhwa", {
  method: "POST",
  json: { title: "QA Test Title" },
});
check("Duplicate slug is rejected (409)", r.status === 409);

r = await admin.call("/api/admin/manhwa", { method: "POST", json: { title: "" } });
check("Empty title is rejected by validation (422)", r.status === 422, r.json?.error);

r = await admin.call("/api/admin/chapters", {
  method: "POST",
  json: { manhwaId: qaId, number: 1, title: "Start", pages: ["/api/placeholder?kind=page&title=QA&label=Chapter%201"] },
});
check("Administrator adds a chapter (201)", r.status === 201, r.json?.error);
const qaChapter = r.json?.id;

r = await admin.call("/api/admin/chapters", { method: "POST", json: { manhwaId: qaId, number: 1 } });
check("Duplicate chapter number is rejected (409)", r.status === 409);

r = await admin.call("/api/admin/upload", { method: "POST", form: pngForm() });
check("Administrator uploads an image (201)", r.status === 201 && /^\/api\/media\/[a-f0-9]{32}\.png$/.test(r.json?.url ?? ""), r.json?.error);
const mediaUrl = r.json?.url ?? "";

const media = await fetch(BASE + mediaUrl);
check("Uploaded image is served with the correct MIME type", media.status === 200 && media.headers.get("content-type") === "image/png");

const fakeForm = new FormData();
fakeForm.append("file", new Blob([Buffer.from("definitely not a png")], { type: "image/png" }), "fake.png");
r = await admin.call("/api/admin/upload", { method: "POST", form: fakeForm });
check("Upload rejects files whose contents do not match the type (422)", r.status === 422, r.json?.error);

r = await admin.call(`/api/admin/manhwa/${qaId}`, {
  method: "PATCH",
  json: { synopsis: "Updated synopsis", isFeatured: true, coverUrl: mediaUrl },
});
check("Administrator edits a manhwa", r.status === 200 && db(`select synopsis from manhwa where id=${qaId}`) === "Updated synopsis");
check("Cover image is saved on the manhwa", db(`select cover_url from manhwa where id=${qaId}`) === mediaUrl);

r = await admin.call(`/api/admin/chapters/${qaChapter}`, {
  method: "PATCH",
  json: { title: "Renamed", pages: [mediaUrl, "/api/placeholder?kind=page&title=QA&label=Page%202"] },
});
check("Administrator manages chapter pages (reorder/replace)", r.status === 200 && db(`select array_length(pages, 1) from chapters where id=${qaChapter}`) === "2");

r = await anon.call(`/read/qa-test-title/1`);
check("New chapter is publicly readable", r.status === 200 && r.text.includes("QA Test Title"));

r = await admin.call("/admin/manhwa");
check("Admin catalogue lists the new title", r.status === 200 && r.text.includes("QA Test Title"));

r = await admin.call(`/api/admin/users/${readerId()}`, { method: "PATCH", json: { role: "admin" } });
check("Administrator promotes a user to admin", r.status === 200 && db(`select role from users where username='${READER_PRO}'`) === "admin");

r = await reader.call("/admin");
check("Promoted user gains dashboard access immediately", r.status === 200 && r.text.includes("Overview"));

r = await admin.call(`/api/admin/users/${readerId()}`, { method: "PATCH", json: { role: "user" } });
check("Administrator demotes the user back to 'user'", r.status === 200 && db(`select role from users where username='${READER_PRO}'`) === "user");

r = await reader.call("/admin");
check("Demoted user loses dashboard access", r.status === 200 && r.text.includes("Administrator access required"));

r = await admin.call(`/api/admin/users/${adminId}`, { method: "PATCH", json: { role: "user" } });
check("Administrator cannot demote themselves (400)", r.status === 400);

r = await admin.call(`/api/admin/users/${adminId}`, { method: "PATCH", json: { status: "suspended" } });
check("Administrator cannot suspend themselves (400)", r.status === 400);

r = await admin.call(`/api/admin/users/${strangerId}`, { method: "PATCH", json: { status: "suspended" } });
check("Administrator suspends a user (200)", r.status === 200);
r = await new Client("suspended-login").call("/api/auth/login", {
  method: "POST",
  json: { identifier: STRANGER.username, password: STRANGER.password },
});
check("Suspended account cannot sign in (403)", r.status === 403);
r = await admin.call(`/api/admin/users/${strangerId}`, { method: "PATCH", json: { status: "active" } });
check("Administrator reactivates the user", r.status === 200);

r = await admin.call("/admin/users");
check("Admin user table does not expose password hashes", r.status === 200 && r.text.includes("reader.one@example.com") && !r.text.includes("scrypt$"));

r = await admin.call("/api/admin/manhwa/" + qaId, { method: "DELETE" });
check("Administrator deletes a manhwa (cascades chapters)", r.status === 200 && db(`select count(*) from chapters where manhwa_id=${qaId}`) === "0");

/* ================================================================== */
/* 7. Password reset                                                  */
/* ================================================================== */

r = await new Client("forgot").call("/api/auth/forgot-password", {
  method: "POST",
  json: { email: READER.email },
});
check("Forgot-password returns a generic confirmation", r.status === 200 && /reset link has been sent/i.test(r.json?.message ?? ""));

r = await new Client("forgot-unknown").call("/api/auth/forgot-password", {
  method: "POST",
  json: { email: "nobody-here@example.com" },
});
check("Forgot-password response is identical for unknown emails", r.status === 200 && r.json?.message === (await new Client("x").call("/api/auth/forgot-password", { method: "POST", json: { email: "another-unknown@example.com" } })).json?.message);

await sleep(400);
const logText = readFileSync(SERVER_LOG, "utf8");
const tokenMatches = [...logText.matchAll(/Password reset link for reader\.one@example\.com: \S*token=([A-Za-z0-9_-]+)/g)];
const tokenMatch = tokenMatches.at(-1) ?? null;
check("Reset link is delivered by the mail transport", Boolean(tokenMatch));
check("Reset token is stored only as a hash in the database", db(`select length(reset_token_hash) from users where email='reader.one@example.com'`) === "64");

const resetToken = tokenMatch?.[1] ?? "";
r = await new Client("bad-token").call("/api/auth/reset-password", {
  method: "POST",
  json: { token: "x".repeat(30), password: NEW_READER_PASS, confirmPassword: NEW_READER_PASS },
});
check("Invalid reset token is rejected (400)", r.status === 400, r.json?.error);

r = await new Client("reset").call("/api/auth/reset-password", {
  method: "POST",
  json: { token: resetToken, password: NEW_READER_PASS, confirmPassword: NEW_READER_PASS },
});
check("Valid reset token sets a new password", r.status === 200, r.json?.message);

r = await reader.call("/library");
check("Password reset signs out existing sessions", r.status === 307);

r = await new Client("old-pass").call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER_PRO, password: READER.password },
});
check("Old password no longer works (401)", r.status === 401);

r = await new Client("new-pass").call("/api/auth/login", {
  method: "POST",
  json: { identifier: READER_PRO, password: NEW_READER_PASS },
});
check("New password works", r.status === 200);

r = await new Client("reuse").call("/api/auth/reset-password", {
  method: "POST",
  json: { token: resetToken, password: "AnotherPass999", confirmPassword: "AnotherPass999" },
});
check("Reset token cannot be reused", r.status === 400);

/* ================================================================== */
/* 8. Password change, avatar and public pages                        */
/* ================================================================== */

reader = new Client("reader-after-reset");
r = await reader.call("/api/auth/login", { method: "POST", json: { identifier: READER_PRO, password: NEW_READER_PASS } });
check("Reader signs in after reset", r.status === 200);

r = await reader.call("/api/profile/password", {
  method: "POST",
  json: { currentPassword: "WrongOne123", newPassword: FINAL_READER_PASS, confirmPassword: FINAL_READER_PASS },
});
check("Password change with wrong current password is refused (403)", r.status === 403);

r = await reader.call("/api/profile/password", {
  method: "POST",
  json: { currentPassword: NEW_READER_PASS, newPassword: FINAL_READER_PASS, confirmPassword: FINAL_READER_PASS },
});
check("Password change succeeds with the correct current password", r.status === 200, r.json?.message);

r = await new Client("after-change").call("/api/auth/login", { method: "POST", json: { identifier: READER_PRO, password: FINAL_READER_PASS } });
check("Login works with the changed password", r.status === 200);

r = await reader.call("/api/profile/avatar", { method: "POST", form: pngForm("avatar.png") });
check("Profile picture upload succeeds", r.status === 200 && /\/api\/media\//.test(r.json?.url ?? ""), r.json?.error);
const avatarUrl = r.json?.url ?? "";
check("Avatar is stored on the user record", db(`select avatar_url from users where username='${READER_PRO}'`) === avatarUrl);

r = await reader.call("/profile");
check("Profile page displays the new picture", r.text.includes(avatarUrl));

r = await reader.call("/api/reading/history", { method: "DELETE" });
check("Reader can clear their reading history", r.status === 200 && db(`select count(*) from reading_history h join users u on u.id=h.user_id where u.username='${READER_PRO}'`) === "0");

r = await reader.call("/api/bookmarks?manhwaId=" + manhwaId, { method: "DELETE" });
check("Reader can remove a bookmark", r.status === 200 && db(`select count(*) from bookmarks b join users u on u.id=b.user_id where u.username='${READER_PRO}'`) === "0");
r = await reader.call("/api/bookmarks", { method: "POST", json: { manhwaId } });
check("Reader re-bookmarks the title for persistence checks", r.status === 201);

r = await reader.call(`/api/reading/progress`, { method: "POST", json: { chapterId: chapter2, scrollPosition: 0.4, opened: true } });
check("Reader records fresh progress for persistence checks", r.status === 200);

r = await anon.call("/browse");
check("Browse page lists sample titles", r.status === 200 && r.text.includes("Moonlit Sword Saga") && r.text.includes("Starfall Academy"));
r = await anon.call("/browse?genre=Romance");
check("Genre filter returns only matching titles", r.status === 200 && r.text.includes("Starfall Academy") && !r.text.includes("Crimson Tide Hunter"));
r = await anon.call("/browse?q=lotus");
check("Search filters by title", r.status === 200 && r.text.includes("Lotus Requiem") && !r.text.includes("Neon Dungeon Diary"));
r = await anon.call("/browse?status=completed&sort=latest");
check("Status filter and sorting work together", r.status === 200 && r.text.includes("Crimson Tide Hunter"));
r = await anon.call(`/manhwa/${SLUG}`);
check("Title detail page lists chapters and genres", r.status === 200 && strip(r.text).includes("Chapters") && strip(r.text).includes("Chapter 6"));
r = await anon.call("/manhwa/no-such-title");
check("Unknown title returns 404", r.status === 404);
r = await anon.call(`/read/${SLUG}/99`);
check("Unknown chapter returns 404", r.status === 404);
r = await anon.call(`/read/${SLUG}/3`);
check("Anonymous reader can open a chapter with pages", r.status === 200 && r.text.includes("Moonlit Sword Saga, chapter 3, page 1"));
r = await anon.call("/api/placeholder?kind=cover&title=Test");
check("Generated placeholder cover is served as SVG", r.status === 200 && r.text.includes("<svg"));
r = await anon.call("/api/media/passwd");
check("Media route rejects arbitrary file names (404)", r.status === 404);

r = await admin.call("/admin/users");
check("Admin pages do not leak password hashes", !r.text.includes("scrypt$"));

writeFileSync(
  STATE_FILE,
  JSON.stringify({ readerName: READER_PRO, finalPassword: FINAL_READER_PASS, adminUser: ADMIN.username, adminPassword: ADMIN.password, mediaUrl, avatarUrl }, null, 2),
);

console.log(`\nPhase 1 complete: ${passed} passed, ${failed} failed.`);
process.exitCode = failed === 0 ? 0 : 1;

function readerId() {
  return Number(db(`select id from users where username='${READER_PRO}'`));
}
