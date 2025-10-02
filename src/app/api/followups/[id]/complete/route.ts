import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = paramsSchema.parse(await params);

    const updated = await prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: {
        receivable: { select: { id: true, invoiceNumber: true, amount: true, dueDate: true } },
        customer: { select: { id: true, name: true } },
        logs: {
          orderBy: { contactDate: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid params', details: error.issues }, { status: 400 });
    console.error('POST /api/followups/:id/complete error:', error);
    return NextResponse.json({ error: 'Failed to complete follow-up' }, { status: 500 });
  }
}
