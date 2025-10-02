import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { updateFollowUpSchema } from '@/validators/followupValidator';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> } | { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Next.js App Router may pass params as a Promise
    const raw = 'then' in (context as any).params ? await (context as any).params : (context as any).params;
    const { id } = paramsSchema.parse(raw);

    const item = await prisma.followUp.findUnique({
      where: { id },
      include: {
        receivable: { select: { id: true, invoiceNumber: true, amount: true, dueDate: true } },
        customer: { select: { id: true, name: true } },
        logs: {
          orderBy: { contactDate: 'desc' },
        },
      },
    });

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid params', details: error.issues }, { status: 400 });
    console.error('GET /api/followups/:id error:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> } | { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = 'then' in (context as any).params ? await (context as any).params : (context as any).params;
    const { id } = paramsSchema.parse(raw);
    const body = await request.json();
    const parsed = updateFollowUpSchema.parse(body);

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        followupDate: parsed.followupDate,
        priority: parsed.priority,
        contactPerson: parsed.contactPerson,
        contactMethod: parsed.contactMethod,
        initialNotes: parsed.initialNotes,
        status: parsed.status,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid body', details: error.issues }, { status: 400 });
    console.error('PATCH /api/followups/:id error:', error);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}
