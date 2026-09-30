import type { NextRequest } from "next/server";

/**
 * Límite de pedidos por ventana de tiempo, en memoria.
 *
 * Es una primera barrera barata: en Vercel cada instancia tiene su propia
 * memoria, así que no es exacta. El límite que importa (costo de OpenAI) se
 * verifica además contra la base, por usuario, en /api/recommend.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Solo para tests. */
export function resetRateLimits(): void {
  buckets.clear();
}

export function clientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function tooManyRequests(message: string, retryAfterSeconds: number): Response {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) } }
  );
}

/** Límites por acción: [pedidos, ventana en ms]. */
export const LIMITS = {
  recommendPerIp: [20, 60 * 60 * 1000],
  recommendPerUserWindowMs: 10 * 60 * 1000,
  recommendPerUser: 5,
  pricesPerIp: [30, 60 * 60 * 1000],
  groupCreatePerIp: [15, 60 * 60 * 1000],
  groupActionPerIp: [120, 60 * 1000],
} as const;
