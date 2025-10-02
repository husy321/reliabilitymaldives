import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fastAuthCheck, getCached, setCache } from '@/lib/fast-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await fastAuthCheck(request);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const query = url.searchParams.get('query') ?? '';
    
    // Skip search for very short queries to reduce load
    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Check cache first
    const cacheKey = `customer-search:${query}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const results = await prisma.customer.findMany({
      where: { name: { contains: query } },
      select: { id: true, name: true },
      take: 10,
      orderBy: { name: 'asc' },
    });

    const result = { success: true, data: results };
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/followups/search/customer error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
