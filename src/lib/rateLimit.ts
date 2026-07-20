type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(ip: string, opts?: { limit?: number; windowMs?: number }) {
  const limit = opts?.limit ?? 20; // 20 req / minute
  const windowMs = opts?.windowMs ?? 60_000;

  const now = Date.now();
  const current = buckets.get(ip);

  if (!current || now >= current.resetAtMs) {
    buckets.set(ip, { count: 1, resetAtMs: now + windowMs });
    return {
      limit,
      remaining: limit - 1,
      resetAtMs: now + windowMs,
    };
  }

  if (current.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAtMs - now) / 1000));
    const err = new Error("RATE_LIMITED");
    (err as any).status = 429;
    (err as any).retryAfterSec = retryAfterSec;
    (err as any).meta = { limit, remaining: 0, resetAtMs: current.resetAtMs };
    throw err;
  }

  current.count += 1;
  buckets.set(ip, current);

  return {
    limit,
    remaining: limit - current.count,
    resetAtMs: current.resetAtMs,
  };
}
