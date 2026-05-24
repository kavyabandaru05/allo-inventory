import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextRequest } from "next/server";

// General API rate limiter (60 requests per minute)
export const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit:general",
    })
  : null;

// Stricter rate limiter for reservation creation (10 requests per minute)
export const reservationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit:reservation",
    })
  : null;

// Rate limiter for product creation / updates (20 requests per minute)
export const productLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit:product",
    })
  : null;

/**
 * Extracts the client IP from request headers.
 */
export function getIp(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  return ip.trim();
}

/**
 * Checks a rate limit for a request using the provided limiter.
 * Falls back to allowing the request if Redis/limiter is not configured.
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null,
  keyPrefix: string = "api"
) {
  if (!limiter) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      headers: new Headers(),
    };
  }

  try {
    const ip = getIp(request);
    const identifier = `${keyPrefix}:${ip}`;
    const result = await limiter.limit(identifier);

    const headers = new Headers({
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    });

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      headers,
    };
  } catch (error) {
    console.error(`[Rate Limiter] Error running rate limit:`, error);
    // Gracefully fail open in case of Redis / Upstash issues so the app doesn't crash
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      headers: new Headers(),
    };
  }
}
