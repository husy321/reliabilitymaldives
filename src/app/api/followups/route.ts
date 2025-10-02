import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { followUpFiltersSchema, createFollowUpSchema } from '@/validators/followupValidator';
import { fastAuthCheck, getCached, setCache } from '@/lib/fast-auth';

export async function GET(request: NextRequest) {
  try {
    // Fast authentication check
    const session = await fastAuthCheck(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = followUpFiltersSchema.parse(raw);

    // Create cache key from query parameters
    const cacheKey = `followups:${JSON.stringify(parsed)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const page = parsed.page ?? 1;
    const pageSize = Math.min(parsed.pageSize ?? 20, 100); // Limit max page size
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (parsed.status && parsed.status !== 'all') {
      if (parsed.status === 'active') {
        where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      } else {
        where.status = parsed.status;
      }
    }
    if (parsed.customerId) where.customerId = parsed.customerId;
    if (parsed.receivableId) where.receivableId = parsed.receivableId;
    if (parsed.priority) where.priority = parsed.priority;
    if (parsed.startDate || parsed.endDate) {
      where.followupDate = {};
      if (parsed.startDate) where.followupDate.gte = parsed.startDate;
      if (parsed.endDate) where.followupDate.lte = parsed.endDate;
    }
    if (parsed.completionStartDate || parsed.completionEndDate) {
      where.completedAt = {};
      if (parsed.completionStartDate) where.completedAt.gte = parsed.completionStartDate;
      if (parsed.completionEndDate) where.completedAt.lte = parsed.completionEndDate;
    }

    const orderBy: any = {};
    orderBy[parsed.sortBy ?? 'followupDate'] = parsed.sortOrder ?? 'asc';

    // Optimized query with minimal data selection
    const [items, totalCount] = await Promise.all([
      prisma.followUp.findMany({
        where,
        select: {
          id: true,
          receivableId: true,
          customerId: true,
          followupDate: true,
          priority: true,
          contactPerson: true,
          contactMethod: true,
          initialNotes: true,
          status: true,
          createdAt: true,
          completedAt: true,
          updatedAt: true,
          // Only fetch minimal required data from relations
          receivable: {
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              dueDate: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true
            }
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.followUp.count({ where }),
    ]);

    const result = {
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
        hasPrev: page > 1,
      },
    };

    // Cache the result
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: error.issues }, { status: 400 });
    }
    console.error('GET /api/followups error:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Fast authentication check
    const session = await fastAuthCheck(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createFollowUpSchema.parse(body);

    const receivable = await prisma.receivable.findUnique({
      where: { id: parsed.receivableId },
      select: { id: true, invoiceNumber: true, amount: true, dueDate: true, customerId: true },
    });
    if (!receivable) {
      return NextResponse.json({ error: 'Receivable not found' }, { status: 404 });
    }

    if (receivable.customerId !== parsed.customerId) {
      return NextResponse.json({ error: 'Customer mismatch for receivable' }, { status: 400 });
    }

    const created = await prisma.followUp.create({
      data: {
        receivableId: parsed.receivableId,
        customerId: parsed.customerId,
        followupDate: parsed.followupDate,
        priority: parsed.priority,
        contactPerson: parsed.contactPerson,
        contactMethod: parsed.contactMethod,
        initialNotes: parsed.initialNotes,
        createdById: session.user.id,
      },
      include: {
        receivable: { select: { id: true, invoiceNumber: true, amount: true, dueDate: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/followups error:', error);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}
