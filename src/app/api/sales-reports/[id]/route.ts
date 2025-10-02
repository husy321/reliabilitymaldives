import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { fastAuthCheck, getCached, setCache } from '@/lib/fast-auth';

// use shared prisma instance

// Validation schema for updating sales reports
const updateSalesReportSchema = z.object({
  cashDeposits: z.number().min(0, 'Cash deposits cannot be negative').optional(),
  cardSettlements: z.number().min(0, 'Card settlements cannot be negative').optional(),
  totalSales: z.number().min(0, 'Total sales cannot be negative').optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional()
});

/**
 * GET /api/sales-reports/[id] - Get a specific sales report by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Fast authentication check
    const session = await fastAuthCheck(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const reportId = params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(reportId).success) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `sales-report:${reportId}:${session.user.role}:${session.user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch the sales report
    const salesReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: {
          select: {
            id: true,
            name: true,
            location: true,
            managerId: true
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          select: {
            id: true,
            originalName: true,
            category: true,
            fileSize: true,
            mimeType: true,
            createdAt: true
          }
        }
      }
    });

    if (!salesReport) {
      return NextResponse.json({ error: 'Sales report not found' }, { status: 404 });
    }

    // Role-based access control
    if (session.user.role === 'MANAGER') {
      // Managers can only access reports from their outlets
      if (salesReport.outlet.managerId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    // ADMIN and ACCOUNTS can access all reports

    const result = {
      success: true,
      data: salesReport
    };

    // Cache the result
    setCache(cacheKey, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('GET /api/sales-reports/[id] error:', error);
    return NextResponse.json({
      error: 'Failed to fetch sales report'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/sales-reports/[id] - Update a specific sales report
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const reportId = params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(reportId).success) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateSalesReportSchema.parse(body);

    // Fetch the existing sales report
    const existingSalesReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: {
          select: {
            managerId: true
          }
        }
      }
    });

    if (!existingSalesReport) {
      return NextResponse.json({ error: 'Sales report not found' }, { status: 404 });
    }

    // Role-based access control for updates
    const canEdit = (
      // Managers can edit their own draft/rejected reports
      (session.user.role === 'MANAGER' && 
       existingSalesReport.outlet.managerId === session.user.id &&
       ['DRAFT', 'REJECTED'].includes(existingSalesReport.status)) ||
      // Accounts can approve/reject submitted reports
      (session.user.role === 'ACCOUNTS' &&
       existingSalesReport.status === 'SUBMITTED' &&
       ['APPROVED', 'REJECTED'].includes(validatedData.status || '')) ||
      // Admins can edit any report
      session.user.role === 'ADMIN'
    );

    if (!canEdit) {
      return NextResponse.json({
        error: 'You do not have permission to edit this report in its current state'
      }, { status: 403 });
    }

    // Prevent editing approved reports (except by admin)
    if (existingSalesReport.status === 'APPROVED' && session.user.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'Cannot edit approved reports'
      }, { status: 403 });
    }

    // Update the sales report
    const updatedSalesReport = await prisma.salesReport.update({
      where: { id: reportId },
      data: validatedData,
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
        },
        documents: {
          select: {
            id: true,
            originalName: true,
            category: true,
            fileSize: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedSalesReport,
      message: 'Sales report updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/sales-reports/[id] error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update sales report'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/sales-reports/[id] - Delete a specific sales report
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const reportId = params.id;

    // Validate UUID format
    if (!z.string().uuid().safeParse(reportId).success) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    // Fetch the existing sales report
    const existingSalesReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: {
          select: {
            managerId: true
          }
        }
      }
    });

    if (!existingSalesReport) {
      return NextResponse.json({ error: 'Sales report not found' }, { status: 404 });
    }

    // Role-based access control for deletion
    const canDelete = (
      // Managers can delete their own draft reports
      (session.user.role === 'MANAGER' && 
       existingSalesReport.outlet.managerId === session.user.id &&
       existingSalesReport.status === 'DRAFT') ||
      // Admins can delete any non-approved report
      (session.user.role === 'ADMIN' && existingSalesReport.status !== 'APPROVED')
    );

    if (!canDelete) {
      return NextResponse.json({
        error: 'You do not have permission to delete this report'
      }, { status: 403 });
    }

    // Delete the sales report
    await prisma.salesReport.delete({
      where: { id: reportId }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales report deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/sales-reports/[id] error:', error);
    return NextResponse.json({
      error: 'Failed to delete sales report'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
