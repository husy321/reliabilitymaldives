import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const whereClause = session.user.role === 'MANAGER'
      ? { managerId: session.user.id, isActive: true }
      : { isActive: true };

    const outlets = await (prisma as any).outlet.findMany({
      where: whereClause,
      select: { id: true, name: true, location: true, isActive: true }
    });

    return NextResponse.json({ success: true, data: outlets });
  } catch (error) {
    console.error('GET /api/outlets/user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load outlets' }, { status: 500 });
  }
}


