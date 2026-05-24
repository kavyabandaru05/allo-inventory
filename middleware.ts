import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  generalLimiter,
  reservationLimiter,
  productLimiter,
  checkRateLimit,
} from "./lib/rate-limit";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only apply rate limiting to API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Gracefully skip rate limiting if Upstash Redis is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.next();
  }

  // Determine which limiter to use
  let limiter = generalLimiter;
  let keyPrefix = "general";

  if (pathname === "/api/reservations" && request.method === "POST") {
    limiter = reservationLimiter;
    keyPrefix = "reservation";
  } else if (pathname === "/api/products" && request.method === "POST") {
    limiter = productLimiter;
    keyPrefix = "product";
  }

  const { success, headers } = await checkRateLimit(request, limiter, keyPrefix);

  if (!success) {
    const retryAfter = headers.get("X-RateLimit-Reset");
    const response = NextResponse.json(
      {
        error: "Too Many Requests",
        message: "You have exceeded the rate limit. Please try again later.",
      },
      {
        status: 429,
        headers: headers,
      }
    );
    if (retryAfter) {
      // Convert Unix timestamp (ms) to seconds for standard Retry-After header
      const secondsLeft = Math.max(0, Math.ceil((parseInt(retryAfter, 10) - Date.now()) / 1000));
      response.headers.set("Retry-After", secondsLeft.toString());
    }
    return response;
  }

  // If rate limit checks pass, proceed and inject rate limiting headers into the response
  const response = NextResponse.next();
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure which paths middleware runs on
export const config = {
  matcher: "/api/:path*",
};
