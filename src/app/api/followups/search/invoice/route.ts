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
    const cacheKey = `invoice-search:${query}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const results = await prisma.receivable.findMany({
      where: { invoiceNumber: { contains: query } },
      select: { id: true, invoiceNumber: true, amount: true, dueDate: true, customerId: true },
      take: 10,
      orderBy: { invoiceNumber: 'asc' },
    });

    const result = { success: true, data: results };
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/followups/search/invoice error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
