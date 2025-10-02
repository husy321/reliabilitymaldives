import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { exportFollowupHistory } from '@/lib/pdf-export';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate') as string) : undefined;
  const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate') as string) : undefined;
  const customerId = url.searchParams.get('customerId') || undefined;
  const receivableId = url.searchParams.get('invoiceId') || undefined;

  const pdfBuffer = await exportFollowupHistory({ startDate, endDate, customerId, invoiceId: receivableId });
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="followups.pdf"'
    }
  });
}
