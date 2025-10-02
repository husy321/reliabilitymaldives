import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { fastAuthCheck, getCached, setCache } from '@/lib/fast-auth';

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.enum(['DRAFT','SUBMITTED','APPROVED','REJECTED']).optional(),
  outletId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date','totalSales','createdAt','status']).optional().default('date'),
  sortOrder: z.enum(['asc','desc']).optional().default('desc')
});

export async function GET(request: NextRequest) {
  try {
    // Fast authentication check
    const session = await fastAuthCheck(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    
    // Create cache key from query parameters + user role
    const cacheKey = `sales-reports:${JSON.stringify(parsed)}:${session.user.role}:${session.user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const page = Math.max(1, parseInt(parsed.page));
    const limit = Math.max(1, Math.min(100, parseInt(parsed.limit)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (parsed.status) where.status = parsed.status;
    if (parsed.outletId) where.outletId = parsed.outletId;
    if (parsed.startDate || parsed.endDate) {
      where.date = {};
      if (parsed.startDate) where.date.gte = new Date(parsed.startDate);
      if (parsed.endDate) where.date.lte = new Date(parsed.endDate);
    }

    // Role-based scope with optimized query
    if (session.user.role === 'MANAGER') {
      const managerOutlets = await prisma.outlet.findMany({
        where: { managerId: session.user.id },
        select: { id: true }
      });
      where.outletId = where.outletId ?? { in: managerOutlets.map(o => o.id) };
    }

    const orderBy: any = {};
    orderBy[parsed.sortBy] = parsed.sortOrder;

    // Optimized query with minimal data selection
    const [reports, totalCount] = await Promise.all([
      prisma.salesReport.findMany({
        where,
        select: {
          id: true,
          outletId: true,
          date: true,
          cashDeposits: true,
          cardSettlements: true,
          totalSales: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          // Only fetch minimal required data from relations
          outlet: { 
            select: { 
              id: true, 
              name: true, 
              location: true 
            } 
          },
          submittedBy: { 
            select: { 
              id: true, 
              name: true, 
              email: true 
            } 
          },
          // Skip documents in list view for performance
          _count: {
            select: {
              documents: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.salesReport.count({ where })
    ]);

    const result = {
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    };

    // Cache the result
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: error.issues }, { status: 400 });
    }
    console.error('GET /api/sales-reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales reports' }, { status: 500 });
  }
}
