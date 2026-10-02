/**
 * Fixed-window failure counter kept in memory. Enough for one API process; move it to
 * Redis (or the database) before running several instances.
 */
export function createFailureLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const entry = (key: string, now: number) => {
    const e = hits.get(key);
    if (e && e.resetAt > now) return e;
    const fresh = { count: 0, resetAt: now + windowMs };
    hits.set(key, fresh);
    return fresh;
  };

  return {
    /** Seconds until the key may try again, or 0 when it is not blocked. */
    retryAfter(key: string, now = Date.now()) {
      const e = entry(key, now);
      return e.count >= max ? Math.ceil((e.resetAt - now) / 1000) : 0;
    },
    fail(key: string, now = Date.now()) {
      entry(key, now).count++;
      // Opportunistic clean-up so the map cannot grow without limit.
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
