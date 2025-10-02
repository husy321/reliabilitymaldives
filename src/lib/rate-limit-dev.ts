// Development-only in-memory rate limiter
// In production, use the actual Upstash rate limiter

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class InMemoryRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // Clean up old records
    if (record && now > record.resetTime) {
      this.attempts.delete(identifier);
    }

    const current = this.attempts.get(identifier);
    
    if (!current) {
      // First attempt
      const resetTime = now + this.windowMs;
      this.attempts.set(identifier, { count: 1, resetTime });
      
      return {
        success: true,
        limit: this.maxAttempts,
        remaining: this.maxAttempts - 1,
        reset: resetTime,
      };
    }

    if (current.count >= this.maxAttempts) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.maxAttempts,
        remaining: 0,
        reset: current.resetTime,
      };
    }

    // Increment count
    current.count++;
    this.attempts.set(identifier, current);

    return {
      success: true,
      limit: this.maxAttempts,
      remaining: this.maxAttempts - current.count,
      reset: current.resetTime,
    };
  }
}

// Export singleton instances
export const authRateLimit = new InMemoryRateLimiter(5, 15); // 5 attempts per 15 minutes
export const failedLoginRateLimit = new InMemoryRateLimiter(3, 30); // 3 failed attempts per 30 minutes

export async function checkRateLimit(
  identifier: string,
  limiter = authRateLimit
) {
  const result = await limiter.limit(identifier);
  
  if (!result.success) {
    const retryAfter = Math.floor((result.reset - Date.now()) / 1000);
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.reset).toISOString(),
        "Retry-After": retryAfter.toString(),
      },
    };
  }
  
  return {
    success: true,
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": new Date(result.reset).toISOString(),
    },
  };
}

// Helper to get client IP address
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return ip;
}