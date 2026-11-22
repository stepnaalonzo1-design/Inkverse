"use client";

export const SESSION_STORAGE_KEY = "inkverse_session_token";
export const CLIENT_COOKIE_NAME = "inkverse_session_client";

type ApiData = { ok?: boolean; error?: string; message?: string };

export type ApiResponse<T extends object> = {
  ok: boolean;
  status: number;
  data: T & ApiData;
};

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const local = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (local) return local;
  } catch {
    // ignore storage errors
  }
  try {
    const session = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (session) return session;
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setStoredSessionToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!token) {
    clearStoredSessionToken();
    return;
  }
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // ignore
  }
  try {
    const isHttps = window.location.protocol === "https:";
    const attrs = isHttps
      ? "Path=/; Max-Age=2592000; SameSite=None; Secure; Partitioned"
      : "Path=/; Max-Age=2592000; SameSite=Lax";
    document.cookie = `${CLIENT_COOKIE_NAME}=${encodeURIComponent(token)}; ${attrs}`;
  } catch {
    // ignore
  }
}

export function clearStoredSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    const isHttps = window.location.protocol === "https:";
    const attrs = isHttps
      ? "Path=/; Max-Age=0; SameSite=None; Secure; Partitioned"
      : "Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = `${CLIENT_COOKIE_NAME}=; ${attrs}`;
  } catch {
    // ignore
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredSessionToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "X-Session-Token": token,
  };
}

/** Small fetch wrapper for client components. Sends cookies + Bearer token, JSON or FormData bodies, and never throws. */
export async function api<T extends object = object>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  const init: RequestInit = { method, credentials: "include", headers };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, init);
    const data = (await response.json().catch(() => ({}))) as T & ApiData;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {
        ok: false,
        error: "Network error. Check your connection and try again.",
      } as unknown as T & ApiData,
    };
  }
}
