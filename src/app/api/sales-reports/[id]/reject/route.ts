import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

// use shared prisma instance

const rejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  comments: z.string().optional()
});

/**
 * POST /api/sales-reports/[id]/reject - Reject a sales report
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only accounts and admin can reject reports
    if (!['ACCOUNTS', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({
        error: 'Forbidden - Only accounts staff can reject reports'
      }, { status: 403 });
    }

    const params = await context.params;
    const reportId = params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(reportId).success) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { reason, comments } = rejectRequestSchema.parse(body);

    // Check if report exists and is in SUBMITTED status
    const existingReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: {
          select: {
            name: true,
            location: true
          }
        },
        submittedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Sales report not found' }, { status: 404 });
    }

    if (existingReport.status !== 'SUBMITTED') {
      return NextResponse.json({ 
        error: 'Only submitted reports can be rejected' 
      }, { status: 400 });
    }

    // Update report status to REJECTED
    const updatedReport = await prisma.salesReport.update({
      where: { id: reportId },
      data: {
        status: 'REJECTED'
      },
      include: {
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
        }
      }
    });

    // TODO: Create notification for the manager with rejection reason
    // TODO: Send email notification with rejection details
    console.log(`Sales report rejected by ${session.user.name} for ${existingReport.outlet.name}`);
    console.log(`Rejection reason: ${reason}`);
    if (comments) {
      console.log(`Additional comments: ${comments}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedReport,
      message: 'Sales report rejected',
      rejectionDetails: {
        reason,
        comments,
        rejectedBy: session.user.name,
        rejectedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('POST /api/sales-reports/[id]/reject error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to reject sales report'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
