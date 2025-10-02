import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authOptions } from '../../../auth/[...nextauth]/route';

// use shared prisma instance

const approveRequestSchema = z.object({
  comments: z.string().optional()
});

/**
 * POST /api/sales-reports/[id]/approve - Approve a sales report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only accounts and admin can approve reports
    if (!['ACCOUNTS', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only accounts staff can approve reports' 
      }, { status: 403 });
    }

    const reportId = params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(reportId).success) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { comments } = approveRequestSchema.parse(body);

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
        error: 'Only submitted reports can be approved' 
      }, { status: 400 });
    }

    // Update report status to APPROVED
    const updatedReport = await prisma.salesReport.update({
      where: { id: reportId },
      data: {
        status: 'APPROVED'
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

    // TODO: Create notification for the manager
    // TODO: Send email notification
    console.log(`Sales report approved by ${session.user.name} for ${existingReport.outlet.name}`);
    if (comments) {
      console.log(`Approval comments: ${comments}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedReport,
      message: 'Sales report approved successfully'
    });

  } catch (error) {
    console.error('POST /api/sales-reports/[id]/approve error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to approve sales report'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
