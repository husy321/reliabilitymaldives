import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createFollowUpLogSchema } from '@/validators/followupValidator';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const { id } = paramsSchema.parse(params);

    const logs = await prisma.followUpLog.findMany({
      where: { followUpId: id },
      orderBy: { contactDate: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid params', details: error.issues }, { status: 400 });
    console.error('GET /api/followups/:id/logs error:', error);
    return NextResponse.json({ error: 'Failed to list logs' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const { id } = paramsSchema.parse(params);
    const body = await request.json();
    const parsed = createFollowUpLogSchema.parse(body);

    const exists = await prisma.followUp.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });

    const created = await prisma.followUpLog.create({
      data: {
        followUpId: id,
        contactDate: parsed.contactDate,
        contactMethod: parsed.contactMethod,
        personContacted: parsed.personContacted,
        outcome: parsed.outcome,
        nextStep: parsed.nextStep,
        nextStepDate: parsed.nextStepDate,
        loggedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid body', details: error.issues }, { status: 400 });
    console.error('POST /api/followups/:id/logs error:', error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}
