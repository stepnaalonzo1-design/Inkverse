/**
 * In-memory sliding-window rate limiter for sensitive endpoints (login, setup, reset requests).
 * Suitable for a single server process; use a shared store (e.g. Redis) when scaling horizontally.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return { allowed: false, retryAfterSec: Math.ceil((recent[0] + windowMs - now) / 1000) };
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > 10_000) {
    for (const [storedKey, times] of buckets) {
      if (times.every((time) => now - time >= windowMs)) buckets.delete(storedKey);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}
