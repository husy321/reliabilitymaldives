import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter that allows 5 requests per 1 minute window
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// Rate limiter for authentication endpoints
export const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
  analytics: true,
  prefix: "auth",
});

// Rate limiter for failed login attempts (stricter)
export const failedLoginRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "30 m"), // 3 failed attempts per 30 minutes
  analytics: true,
  prefix: "failed-auth",
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit = ratelimit
) {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  
  if (!success) {
    const retryAfter = Math.floor((reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(reset).toISOString(),
        "Retry-After": retryAfter.toString(),
      },
    };
  }
  
  return {
    success: true,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": new Date(reset).toISOString(),
    },
  };
}

// Helper to get client IP address
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return ip;
}