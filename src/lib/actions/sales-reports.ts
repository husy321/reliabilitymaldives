'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import type { 
  SalesReportFormData, 
  SalesReportStatus,
  BatchSalesReportFormData,
  BatchSubmissionResult 
} from '@/types/sales-report';

// shared prisma instance imported

// Validation schemas
const submitSalesReportSchema = z.object({
  outletId: z.string().uuid('Valid outlet ID required'),
  date: z.date(),
  cashDeposits: z.number().min(0, 'Cash deposits cannot be negative'),
  cardSettlements: z.number().min(0, 'Card settlements cannot be negative'),
  totalSales: z.number().min(0, 'Total sales cannot be negative'),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional().default('DRAFT')
});

/**
 * Check if user has the required role
 */
async function requireRole(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }
  
  return session.user;
}

/**
 * Submit a new sales report
 */
export async function submitSalesReportAction(data: SalesReportFormData) {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);
    
    // Validate the input data
    const validatedData = submitSalesReportSchema.parse({
      ...data,
      date: new Date(data.date)
    });

    // Check if manager has access to the outlet
    if (user.role === 'MANAGER') {
      const outlet = await prisma.outlet.findFirst({
        where: {
          id: validatedData.outletId,
          managerId: user.id
        }
    });

    if (!outlet) {
      return {
        success: false,
          error: 'You do not have access to this outlet'
        };
      }
    }

    // Check for duplicate report
    const existingReport = await prisma.salesReport.findUnique({
      where: {
        unique_outlet_date: {
          outletId: validatedData.outletId,
          date: validatedData.date
        }
      }
    });

    if (existingReport) {
      return {
        success: false,
        error: 'A sales report for this outlet and date already exists'
      };
    }

    // Create the sales report
    const salesReport = await prisma.salesReport.create({
      data: {
        outletId: validatedData.outletId,
        date: validatedData.date,
        cashDeposits: validatedData.cashDeposits,
        cardSettlements: validatedData.cardSettlements,
        totalSales: validatedData.totalSales,
        submittedById: user.id,
        status: validatedData.status
      }
    });

    // Revalidate the sales reports page
    revalidatePath('/sales-reports');
    revalidatePath('/dashboard/sales-reports');

    return {
      success: true,
      data: salesReport,
      message: 'Sales report submitted successfully'
    };

  } catch (error) {
    console.error('Submit sales report error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid data provided',
        details: error.errors
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit sales report'
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Update an existing sales report
 */
export async function updateSalesReportAction(
  reportId: string, 
  data: Partial<SalesReportFormData>
) {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN', 'ACCOUNTS']);

    // Fetch the existing report
    const existingReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: {
          select: { managerId: true }
        }
      }
    });

    if (!existingReport) {
      return {
        success: false,
        error: 'Sales report not found'
      };
    }

    // Role-based access control
    const canEdit = (
      (user.role === 'MANAGER' && 
       existingReport.outlet.managerId === user.id &&
       ['DRAFT', 'REJECTED'].includes(existingReport.status)) ||
      (user.role === 'ACCOUNTS' &&
       existingReport.status === 'SUBMITTED') ||
      user.role === 'ADMIN'
    );

    if (!canEdit) {
      return {
        success: false,
        error: 'You do not have permission to edit this report'
      };
    }

    // Update the report
    const updatedReport = await prisma.salesReport.update({
      where: { id: reportId },
      data: {
        ...(data.cashDeposits !== undefined && { cashDeposits: data.cashDeposits }),
        ...(data.cardSettlements !== undefined && { cardSettlements: data.cardSettlements }),
        ...(data.totalSales !== undefined && { totalSales: data.totalSales }),
        ...(data.status && { status: data.status })
      }
    });

    // Revalidate pages
    revalidatePath('/sales-reports');
    revalidatePath('/dashboard/sales-reports');
    revalidatePath(`/sales-reports/${reportId}`);

    return {
      success: true,
      data: updatedReport,
      message: 'Sales report updated successfully'
    };

  } catch (error) {
    console.error('Update sales report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sales report'
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Approve a sales report (Accounts role)
 */
export async function approveSalesReportAction(reportId: string, comments?: string) {
  try {
    const user = await requireRole(['ACCOUNTS', 'ADMIN']);

    const updatedReport = await prisma.salesReport.update({
      where: { 
        id: reportId,
        status: 'SUBMITTED' // Can only approve submitted reports
      },
      data: {
        status: 'APPROVED'
      },
      include: {
        outlet: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } }
      }
    });

    // TODO: Send notification to manager about approval
    console.log(`Sales report approved for ${updatedReport.outlet.name} by ${user.name}`);

    // Revalidate pages
    revalidatePath('/sales-reports');
    revalidatePath('/dashboard/sales-reports');

    return {
      success: true,
      data: updatedReport,
      message: 'Sales report approved successfully'
    };

  } catch (error) {
    console.error('Approve sales report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve sales report'
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Reject a sales report (Accounts role)
 */
export async function rejectSalesReportAction(
  reportId: string, 
  rejectionReason: string
) {
  try {
    const user = await requireRole(['ACCOUNTS', 'ADMIN']);

    if (!rejectionReason.trim()) {
      return {
        success: false,
        error: 'Rejection reason is required'
      };
    }

    const updatedReport = await prisma.salesReport.update({
      where: { 
        id: reportId,
        status: 'SUBMITTED' // Can only reject submitted reports
      },
      data: {
        status: 'REJECTED'
      },
      include: {
        outlet: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } }
      }
    });

    // TODO: Send notification to manager about rejection with reason
    console.log(`Sales report rejected for ${updatedReport.outlet.name} by ${user.name}. Reason: ${rejectionReason}`);

    // Revalidate pages
    revalidatePath('/sales-reports');
    revalidatePath('/dashboard/sales-reports');

    return {
      success: true,
      data: updatedReport,
      message: 'Sales report rejected'
    };

  } catch (error) {
    console.error('Reject sales report error:', error);
      return {
        success: false,
      error: error instanceof Error ? error.message : 'Failed to reject sales report'
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Submit multiple sales reports (batch operation)
 */
export async function submitBatchSalesReportsAction(
  data: BatchSalesReportFormData
): Promise<BatchSubmissionResult> {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);

    const results: BatchSubmissionResult = {
      success: false,
      successfulSubmissions: [],
      failedSubmissions: [],
      totalProcessed: data.reports.length
    };

    // Process each report
    for (let i = 0; i < data.reports.length; i++) {
      const report = data.reports[i];
      
      try {
        // Validate individual report
        const validatedData = submitSalesReportSchema.parse({
          ...report,
          date: new Date(report.date)
        });

        // Check outlet access for managers
        if (user.role === 'MANAGER') {
          const outlet = await prisma.outlet.findFirst({
            where: {
              id: validatedData.outletId,
              managerId: user.id
            }
          });

          if (!outlet) {
            results.failedSubmissions.push({
              index: i,
              error: 'No access to outlet',
              entry: report
            });
            continue;
          }
        }

        // Check for duplicates
        const existingReport = await prisma.salesReport.findUnique({
          where: {
            unique_outlet_date: {
              outletId: validatedData.outletId,
              date: validatedData.date
            }
          }
        });

        if (existingReport) {
          results.failedSubmissions.push({
            index: i,
            error: 'Report already exists for this date',
            entry: report
          });
          continue;
        }

        // Create the report
        const salesReport = await prisma.salesReport.create({
          data: {
            outletId: validatedData.outletId,
            date: validatedData.date,
            cashDeposits: validatedData.cashDeposits,
            cardSettlements: validatedData.cardSettlements,
            totalSales: validatedData.totalSales,
            submittedById: user.id,
            status: validatedData.status
          }
        });

        results.successfulSubmissions.push(salesReport.id);

      } catch (error) {
        results.failedSubmissions.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          entry: report
        });
      }
    }

    results.success = results.successfulSubmissions.length > 0;

    // Revalidate pages
    if (results.success) {
      revalidatePath('/sales-reports');
      revalidatePath('/dashboard/sales-reports');
    }

    return results;

  } catch (error) {
    console.error('Batch submit sales reports error:', error);
    return {
      success: false,
      successfulSubmissions: [],
      failedSubmissions: data.reports.map((report, index) => ({
        index,
        error: 'Batch processing failed',
        entry: report
      })),
      totalProcessed: data.reports.length
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Delete a sales report
 */
export async function deleteSalesReportAction(reportId: string) {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN']);

    const existingReport = await prisma.salesReport.findUnique({
      where: { id: reportId },
      include: {
        outlet: { select: { managerId: true } }
      }
    });

    if (!existingReport) {
      return {
        success: false,
        error: 'Sales report not found'
      };
    }

    // Role-based access control
    const canDelete = (
      (user.role === 'MANAGER' && 
       existingReport.outlet.managerId === user.id &&
       existingReport.status === 'DRAFT') ||
      (user.role === 'ADMIN' && existingReport.status !== 'APPROVED')
    );

    if (!canDelete) {
      return {
        success: false,
        error: 'You do not have permission to delete this report'
      };
    }

    await prisma.salesReport.delete({
      where: { id: reportId }
    });

    // Revalidate pages
    revalidatePath('/sales-reports');
    revalidatePath('/dashboard/sales-reports');

    return {
      success: true,
      message: 'Sales report deleted successfully'
    };

  } catch (error) {
    console.error('Delete sales report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sales report'
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Return the current user's accessible outlets (for selection UIs)
 */
export async function getUserOutletsAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Admin/Accounts: all active outlets. Manager: only own outlets
    const whereClause = session.user.role === 'MANAGER'
      ? { managerId: session.user.id, isActive: true }
      : { isActive: true };

    const outlets = await prisma.outlet.findMany({
      where: whereClause,
      select: { id: true, name: true, location: true, isActive: true }
    });

    return { success: true, data: outlets };
  } catch (error) {
    console.error('getUserOutletsAction error:', error);
    return { success: false, error: 'Failed to load outlets' };
  } finally {
    await prisma.$disconnect();
  }
}