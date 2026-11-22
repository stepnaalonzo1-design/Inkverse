import { z } from "zod";

/** Standard JSON error response. */
export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

/** Standard JSON success response. */
export function success(data: Record<string, unknown> = {}, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

/** Reads a JSON body without throwing. Invalid JSON becomes `undefined`, which fails validation. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { ok: true; data: z.output<T> } | { ok: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  return { ok: false, response: fail(issue?.message ?? "Invalid input.", 422) };
}

/**
 * Proxy-aware CSRF check: verifies that if an Origin header is present, it matches
 * the forwarded host, the request host, or a local reverse-proxy target.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const host = request.headers.get("host")?.split(",")[0]?.trim().toLowerCase();

  if (forwardedHost && originHost === forwardedHost) return true;
  if (host && originHost === host) return true;

  try {
    const reqUrlHost = new URL(request.url).host.toLowerCase();
    if (originHost === reqUrlHost) return true;
  } catch {
    // ignore URL parse error
  }

  // When running behind a container/sandbox reverse proxy that rewrites Host to localhost/127.0.0.1
  if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0"))) {
    return true;
  }

  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
