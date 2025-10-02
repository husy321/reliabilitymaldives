import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    if (!customerId) return NextResponse.json({ error: 'customerId is required' }, { status: 400 });

    const receivables = await prisma.receivable.findMany({
      where: { customerId, status: 'PENDING' },
      select: { id: true, invoiceNumber: true, amount: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: receivables });
  } catch (error) {
    console.error('GET /api/receivables/pending error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending receivables' }, { status: 500 });
  }
}


