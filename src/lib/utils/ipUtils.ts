import { headers } from 'next/headers';

/**
 * Extracts client IP address from request headers
 * Supports various proxy configurations and load balancers
 */
export async function getClientIP(): Promise<string | null> {
  try {
    const headersList = await headers();
    
    // Try different header sources for IP address
    const ipSources = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'x-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    for (const source of ipSources) {
      const ip = headersList.get(source);
      if (ip) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const cleanIP = ip.split(',')[0].trim();
        if (cleanIP && cleanIP !== 'unknown') {
          return cleanIP;
        }
      }
    }

    // Fallback - this might not work in serverless environments
    return null;
  } catch (error) {
    console.warn('Failed to extract client IP:', error);
    return null;
  }
}

/**
 * Validates if an IP address is valid
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}