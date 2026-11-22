import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { fail, isSameOrigin } from "@/lib/http";

export const SESSION_COOKIE_NAME = "inkverse_session";
export const CLIENT_SESSION_COOKIE_NAME = "inkverse_session_client";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type Role = "user" | "admin";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: Role;
  status: string;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  sessionId: string;
};

export type PublicUser = {
  id: number;
  username: string;
  email: string;
  role: Role;
  accountType: "administrator" | "client";
  roleLabel: "Administrator" | "Client";
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

/** Hashes a session/reset token so the database never stores usable bearer tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function defaultDashboardForRole(role: string): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

async function isSecureRequest(request?: Request): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  if (request) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
    const origin = request.headers.get("origin")?.toLowerCase();
    if (origin?.startsWith("https://")) return true;
    if (origin?.startsWith("http://")) return false;
    if (request.url.startsWith("https://")) return true;
  }

  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
    const origin = h.get("origin")?.toLowerCase();
    if (origin?.startsWith("https://")) return true;
  } catch {
    // outside request scope
  }

  return false;
}

function buildCookieOptions(expires: Date, secure: boolean, httpOnly: boolean) {
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  if (secure) {
    return {
      httpOnly,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
      expires,
      maxAge,
    };
  }
  return {
    httpOnly,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    expires,
    maxAge,
  };
}

/**
 * Creates a persistent database session and sets session cookies.
 * Returns the raw session token so the client can also persist it for cross-origin iframe environments.
 */
export async function createSession(
  userId: number,
  userAgent: string | null,
  request?: Request,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    userAgent: userAgent ? userAgent.slice(0, 255) : null,
    expiresAt,
  });

  const secure = await isSecureRequest(request);
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, token, buildCookieOptions(expiresAt, secure, true));
    store.set(CLIENT_SESSION_COOKIE_NAME, token, buildCookieOptions(expiresAt, secure, false));
  } catch {
    // Ignore if called where cookies cannot be mutated
  }

  return token;
}

async function collectCandidateTokens(request?: Request): Promise<string[]> {
  const tokens: string[] = [];
  const push = (val: string | null | undefined) => {
    const trimmed = val?.trim();
    if (trimmed && trimmed.length >= 16 && trimmed.length <= 200 && !tokens.includes(trimmed)) {
      tokens.push(trimmed);
    }
  };

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      push(authHeader.slice(7));
    }
    push(request.headers.get("x-session-token"));
  }

  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      push(authHeader.slice(7));
    }
    push(h.get("x-session-token"));
  } catch {
    // ignore outside request context
  }

  try {
    const store = await cookies();
    push(store.get(SESSION_COOKIE_NAME)?.value);
    push(store.get(CLIENT_SESSION_COOKIE_NAME)?.value);
  } catch {
    // ignore outside request context
  }

  return tokens;
}

/** Deletes all candidate session rows for the current request and expires session cookies. */
export async function endCurrentSession(request?: Request): Promise<void> {
  const tokens = await collectCandidateTokens(request);
  if (tokens.length > 0) {
    const hashes = tokens.map(hashToken);
    await db.delete(sessions).where(inArray(sessions.id, hashes));
  }

  const secure = await isSecureRequest(request);
  try {
    const store = await cookies();
    const expired = new Date(0);
    store.set(SESSION_COOKIE_NAME, "", { ...buildCookieOptions(expired, secure, true), maxAge: 0 });
    store.set(CLIENT_SESSION_COOKIE_NAME, "", {
      ...buildCookieOptions(expired, secure, false),
      maxAge: 0,
    });
  } catch {
    // ignore
  }
}

/**
 * Resolves the signed-in user from either the Authorization Bearer token, X-Session-Token header,
 * or session cookie against PostgreSQL. Returns null for missing, expired, or suspended sessions.
 */
export async function getCurrentUser(request?: Request): Promise<CurrentUser | null> {
  const tokens = await collectCandidateTokens(request);
  if (tokens.length === 0) return null;

  for (const token of tokens) {
    const sessionId = hashToken(token);
    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        sessionId: sessions.id,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (row && row.status === "active") {
      return { ...row, role: row.role === "admin" ? "admin" : "user" };
    }
  }

  return null;
}

export async function adminExists(): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  return Boolean(row);
}

/** Public-safe representation of a user (never includes password hashes or reset tokens). */
export function publicUser(user: {
  id: number;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
}): PublicUser {
  const role: Role = user.role === "admin" ? "admin" : "user";
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : typeof user.createdAt === "string"
        ? user.createdAt
        : new Date().toISOString();
  const lastLoginAt =
    user.lastLoginAt instanceof Date
      ? user.lastLoginAt.toISOString()
      : typeof user.lastLoginAt === "string"
        ? user.lastLoginAt
        : null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role,
    accountType: role === "admin" ? "administrator" : "client",
    roleLabel: role === "admin" ? "Administrator" : "Client",
    avatarUrl: user.avatarUrl,
    createdAt,
    lastLoginAt,
  };
}

type ApiAuthResult = { user: CurrentUser } | { response: Response };

/** Server-side authorization for route handlers. Checks origin, session, and (optionally) role. */
export async function requireApiUser(
  request: Request,
  options: { role?: Role } = {},
): Promise<ApiAuthResult> {
  if (!isSameOrigin(request)) {
    return { response: fail("Cross-site request blocked.", 403) };
  }
  const user = await getCurrentUser(request);
  if (!user) {
    return { response: fail("Please sign in to continue.", 401) };
  }
  if (options.role && user.role !== options.role) {
    return { response: fail("You do not have permission to perform this action.", 403) };
  }
  return { user };
}
