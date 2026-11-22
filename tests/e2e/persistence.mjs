/**
 * InkVerse persistence checks (phase 2). Run after the server has been stopped and started again
 * to prove that accounts, sessions-by-login, bookmarks, progress and uploads live in PostgreSQL.
 *
 *   TEST_DB=postgresql://... BASE_URL=http://127.0.0.1:3101 node tests/e2e/persistence.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3101";
const TEST_DB = process.env.TEST_DB;
const STATE_FILE = process.env.STATE_FILE ?? "/tmp/inkverse-e2e-state.json";
if (!TEST_DB) throw new Error("TEST_DB is required");

const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const db = (query) => execFileSync("psql", [TEST_DB, "-At", "-c", query], { encoding: "utf8" }).trim();

class Client {
  constructor() {
    this.jar = new Map();
  }
  get cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async call(path, options = {}) {
    const headers = {};
    if (this.cookieHeader) headers.cookie = this.cookieHeader;
    let body;
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.json);
    }
    const res = await fetch(BASE + path, { method: options.method ?? "GET", headers, body, redirect: "manual" });
    for (const raw of res.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value === "" || attrs.some((a) => a.trim().toLowerCase() === "max-age=0")) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, location: res.headers.get("location") ?? "", text, json, res };
  }
}

const health = await new Client().call("/api/health");
check("Application healthy after restart", health.status === 200 && health.json?.ok === true);

const reader = new Client();
let r = await reader.call("/api/auth/login", {
  method: "POST",
  json: { identifier: state.readerName, password: state.finalPassword },
});
check("Account credentials persist across restart", r.status === 200, r.json?.error);

r = await reader.call("/library?tab=bookmarks");
check("Bookmarks persist across restart", r.status === 200 && r.text.includes("Moonlit Sword Saga"));

r = await reader.call("/");
check("Continue Reading position persists across restart", r.text.includes("/read/moonlit-sword-saga/2"));

r = await reader.call("/library?tab=history");
check("Reading history persists across restart", r.status === 200 && r.text.includes("Chapter 2"));

r = await reader.call("/profile");
check("Profile picture persists across restart", r.text.includes(state.avatarUrl));

const adminClient = new Client();
r = await adminClient.call("/api/auth/login", {
  method: "POST",
  json: { identifier: state.adminUser, password: state.adminPassword },
});
check("Administrator login persists across restart", r.status === 200);
r = await adminClient.call("/admin");
check("Administrator dashboard still reachable after restart", r.status === 200 && r.text.includes("Overview"));

r = await new Client().call(state.mediaUrl);
check("Uploaded media persists on disk and is served", r.status === 200);

r = await new Client().call("/setup");
check("Setup remains closed after restart", r.status === 307);

check("Seeded catalogue and QA chapters remain in PostgreSQL", Number(db("select count(*) from chapters")) >= 39);
check("Only one administrator exists", db("select count(*) from users where role='admin'") === "1");

console.log(`\nPhase 2 complete: ${passed} passed, ${failed} failed.`);
process.exitCode = failed === 0 ? 0 : 1;
