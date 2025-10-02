import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Fast authentication check using JWT token directly
export async function fastAuthCheck(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      return null;
    }
    
    return {
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
        role: token.role,
      }
    };
  } catch (error) {
    console.error('Fast auth check failed:', error);
    return null;
  }
}

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export function getCached(key: string) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

export function setCache(key: string, data: any) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (item.expires <= now) {
      cache.delete(key);
    }
  }
}, 60000); // Clear every minute
