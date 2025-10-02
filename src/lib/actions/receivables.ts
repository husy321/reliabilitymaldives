'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  ReceivableFormData, 
  Receivable,
  GetReceivablesParams, 
  GetReceivablesResult, 
  ReceivableStatus,
  UserRole,
  PaymentData
} from '../../../types/receivable';
import { ActionResult } from '../../../types/document';
import { UserRole as PrismaUserRole, ReceivableStatus as PrismaReceivableStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Zod schemas for receivable data validation
 */
const ReceivableFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100, 'Invoice number must be less than 100 characters'),
  customerId: z.string().uuid('Invalid customer ID'),
  amount: z.number().positive('Amount must be positive').max(99999999.99, 'Amount too large'),
  invoiceDate: z.date(),
  paidAmount: z.number().min(0, 'Paid amount must be non-negative').optional().default(0),
  paymentReceivedDate: z.date().optional(),
  assignedTo: z.nativeEnum(UserRole)
});

const GetReceivablesParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
  searchTerm: z.string().optional(),
  statusFilter: z.array(z.nativeEnum(ReceivableStatus)).optional(),
  customerId: z.string().uuid().optional(),
  sortBy: z.enum(['invoiceNumber', 'customer', 'amount', 'invoiceDate', 'dueDate', 'status', 'assignedTo']).optional().default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  userRole: z.nativeEnum(UserRole)
});

const PaymentDataSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  date: z.date(),
  notes: z.string().optional()
});

/**
 * Role-based access control helper
 */
async function checkReceivableAccess(): Promise<{ success: false; error: string } | { success: true; userRole: UserRole }> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // Both Sales and Accounts teams can manage receivables
  if (![UserRole.SALES, UserRole.ACCOUNTS, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT].includes(session.user.role as UserRole)) {
    return {
      success: false,
      error: 'Access denied. Receivable management requires Sales or Accounts team permissions.'
    };
  }

  return {
    success: true,
    userRole: session.user.role as UserRole
  };
}

/**
 * Calculate due date based on customer payment terms
 */
async function calculateDueDate(customerId: string, invoiceDate: Date): Promise<Date> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { paymentTerms: true }
  });

  const paymentTerms = customer?.paymentTerms || 30; // Default to 30 days
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);

  return dueDate;
}

/**
 * Auto-complete follow-ups when a receivable is fully paid
 */
async function autoCompleteFollowUps(receivableId: string): Promise<void> {
  try {
    // Find all active (PENDING or IN_PROGRESS) follow-ups for this receivable
    const activeFollowUps = await prisma.followUp.findMany({
      where: {
        receivableId: receivableId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });

    // If there are active follow-ups, mark them as completed
    if (activeFollowUps.length > 0) {
      await prisma.followUp.updateMany({
        where: {
          receivableId: receivableId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      console.log(`Auto-completed ${activeFollowUps.length} follow-up(s) for receivable ${receivableId}`);
    }
  } catch (error) {
    // Log error but don't fail the payment operation
    console.error('Error auto-completing follow-ups:', error);
  }
}

/**
 * Create new receivable with automatic due date calculation
 */
export async function createReceivableAction(formData: ReceivableFormData): Promise<ActionResult<Receivable>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate form data
    const validatedData = ReceivableFormSchema.parse(formData);

    // Check if invoice number already exists
    const existingInvoice = await prisma.receivable.findUnique({
      where: { invoiceNumber: validatedData.invoiceNumber }
    });

    if (existingInvoice) {
      return {
        success: false,
        error: 'Invoice number already exists. Please use a unique invoice number.'
      };
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Calculate due date based on customer payment terms
    const dueDate = await calculateDueDate(validatedData.customerId, validatedData.invoiceDate);

    // Determine initial status
    const now = new Date();
    let status = ReceivableStatus.PENDING;
    if (validatedData.paidAmount && validatedData.paidAmount > 0) {
      status = validatedData.paidAmount >= validatedData.amount ? ReceivableStatus.PAID : ReceivableStatus.PARTIALLY_PAID;
    } else if (dueDate < now) {
      status = ReceivableStatus.OVERDUE;
    }

    // Create receivable
    const receivable = await prisma.receivable.create({
      data: {
        invoiceNumber: validatedData.invoiceNumber,
        customerId: validatedData.customerId,
        amount: validatedData.amount,
        invoiceDate: validatedData.invoiceDate,
        dueDate: dueDate,
        paidAmount: validatedData.paidAmount || 0,
        status: status as PrismaReceivableStatus,
        assignedTo: validatedData.assignedTo as PrismaUserRole
      },
      include: {
        customer: true
      }
    });

    // Revalidate receivable pages
    revalidatePath('/receivables');

    return {
      success: true,
      data: receivable as Receivable
    };
  } catch (error) {
    console.error('Error creating receivable:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to create receivable. Please try again.'
    };
  }
}

/**
 * Update existing receivable with proper authorization
 */
export async function updateReceivableAction(
  receivableId: string,
  formData: ReceivableFormData
): Promise<ActionResult<Receivable>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate receivable ID
    if (!receivableId || typeof receivableId !== 'string') {
      return {
        success: false,
        error: 'Valid receivable ID is required'
      };
    }

    // Validate form data
    const validatedData = ReceivableFormSchema.parse(formData);

    // Check if receivable exists
    const existingReceivable = await prisma.receivable.findUnique({
      where: { id: receivableId },
      include: { customer: true }
    });

    if (!existingReceivable) {
      return {
        success: false,
        error: 'Receivable not found'
      };
    }

    // Check if invoice number is unique (excluding current receivable)
    const duplicateInvoice = await prisma.receivable.findFirst({
      where: { 
        invoiceNumber: validatedData.invoiceNumber,
        NOT: { id: receivableId }
      }
    });

    if (duplicateInvoice) {
      return {
        success: false,
        error: 'Invoice number already exists. Please use a unique invoice number.'
      };
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Calculate due date if customer or invoice date changed
    let dueDate = existingReceivable.dueDate;
    if (validatedData.customerId !== existingReceivable.customerId || 
        validatedData.invoiceDate.getTime() !== existingReceivable.invoiceDate.getTime()) {
      dueDate = await calculateDueDate(validatedData.customerId, validatedData.invoiceDate);
    }

    // Determine status based on payment
    const now = new Date();
    let status = ReceivableStatus.PENDING;
    if (validatedData.paidAmount && validatedData.paidAmount > 0) {
      status = validatedData.paidAmount >= validatedData.amount ? ReceivableStatus.PAID : ReceivableStatus.PARTIALLY_PAID;
    } else if (dueDate < now) {
      status = ReceivableStatus.OVERDUE;
    }

    // Update receivable
    const updatedReceivable = await prisma.receivable.update({
      where: { id: receivableId },
      data: {
        invoiceNumber: validatedData.invoiceNumber,
        customerId: validatedData.customerId,
        amount: validatedData.amount,
        invoiceDate: validatedData.invoiceDate,
        dueDate: dueDate,
        paidAmount: validatedData.paidAmount || 0,
        status: status as PrismaReceivableStatus,
        assignedTo: validatedData.assignedTo as PrismaUserRole
      },
      include: {
        customer: true
      }
    });

    // Auto-complete follow-ups if invoice is now fully paid
    if (status === ReceivableStatus.PAID && existingReceivable.status !== 'PAID') {
      await autoCompleteFollowUps(receivableId);
    }

    // Revalidate receivable pages
    revalidatePath('/receivables');
    revalidatePath(`/receivables/${receivableId}`);
    revalidatePath('/receivables/followups');

    return {
      success: true,
      data: updatedReceivable as Receivable
    };
  } catch (error) {
    console.error('Error updating receivable:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to update receivable. Please try again.'
    };
  }
}

/**
 * Record payment against receivable with status updates
 */
export async function recordPaymentAction(
  receivableId: string,
  paymentData: PaymentData
): Promise<ActionResult<Receivable>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate receivable ID
    if (!receivableId || typeof receivableId !== 'string') {
      return {
        success: false,
        error: 'Valid receivable ID is required'
      };
    }

    // Validate payment data
    const validatedPayment = PaymentDataSchema.parse(paymentData);

    // Get existing receivable
    const existingReceivable = await prisma.receivable.findUnique({
      where: { id: receivableId },
      include: { customer: true }
    });

    if (!existingReceivable) {
      return {
        success: false,
        error: 'Receivable not found'
      };
    }

    // Calculate new paid amount
    const newPaidAmount = existingReceivable.paidAmount + validatedPayment.amount;

    // Validate payment doesn't exceed invoice amount
    if (newPaidAmount > existingReceivable.amount) {
      return {
        success: false,
        error: 'Payment amount exceeds remaining balance'
      };
    }

    // Determine new status
    let newStatus = ReceivableStatus.PENDING;
    if (newPaidAmount >= existingReceivable.amount) {
      newStatus = ReceivableStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = ReceivableStatus.PARTIALLY_PAID;
    } else {
      const now = new Date();
      newStatus = existingReceivable.dueDate < now ? ReceivableStatus.OVERDUE : ReceivableStatus.PENDING;
    }

    // Update receivable with payment
    const updatedReceivable = await prisma.receivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus as PrismaReceivableStatus
      },
      include: {
        customer: true
      }
    });

    // Auto-complete follow-ups if invoice is fully paid
    if (newStatus === ReceivableStatus.PAID) {
      await autoCompleteFollowUps(receivableId);
    }

    // Revalidate receivable pages
    revalidatePath('/receivables');
    revalidatePath(`/receivables/${receivableId}`);
    revalidatePath('/receivables/followups');

    return {
      success: true,
      data: updatedReceivable as Receivable
    };
  } catch (error) {
    console.error('Error recording payment:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to record payment. Please try again.'
    };
  }
}

/**
 * Get paginated receivables with search, filtering, and customer relationships
 */
export async function getReceivablesAction(params: GetReceivablesParams): Promise<ActionResult<GetReceivablesResult>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate parameters
    const validatedParams = GetReceivablesParamsSchema.parse({
      ...params,
      userRole: accessCheck.userRole
    });

    // Build where clause for filtering
    const where: any = {};

    // Customer filter
    if (validatedParams.customerId) {
      where.customerId = validatedParams.customerId;
    }

    // Status filter
    if (validatedParams.statusFilter && validatedParams.statusFilter.length > 0) {
      where.status = {
        in: validatedParams.statusFilter
      };
    }

    // Search functionality
    // Note: SQLite's LIKE is case-insensitive by default for ASCII characters
    if (validatedParams.searchTerm) {
      const searchTerm = validatedParams.searchTerm.trim();
      where.OR = [
        {
          invoiceNumber: {
            contains: searchTerm
          }
        },
        {
          customer: {
            name: {
              contains: searchTerm
            }
          }
        },
        {
          customer: {
            email: {
              contains: searchTerm
            }
          }
        }
      ];
    }

    // Build orderBy clause for sorting
    let orderBy: any = {};
    switch (validatedParams.sortBy) {
      case 'customer':
        orderBy = {
          customer: {
            name: validatedParams.sortOrder
          }
        };
        break;
      case 'invoiceNumber':
      case 'amount':
      case 'invoiceDate':
      case 'dueDate':
      case 'status':
      case 'assignedTo':
        orderBy = {
          [validatedParams.sortBy]: validatedParams.sortOrder
        };
        break;
      default:
        orderBy = {
          dueDate: validatedParams.sortOrder
        };
    }

    // Calculate offset for pagination
    const offset = (validatedParams.page - 1) * validatedParams.pageSize;

    // Execute queries in parallel
    const [receivables, totalCount] = await Promise.all([
      prisma.receivable.findMany({
        where,
        include: {
          customer: true
        },
        orderBy,
        skip: offset,
        take: validatedParams.pageSize
      }),
      prisma.receivable.count({
        where
      })
    ]);

    // Get document counts for each receivable
    const receivableIds = receivables.map(r => r.id);
    const documentCounts = await prisma.document.groupBy({
      by: ['linkedToReceivableId'],
      where: {
        linkedToReceivableId: { in: receivableIds }
      },
      _count: {
        id: true
      }
    });

    // Create a map of receivableId to document count
    const documentCountMap = new Map<string, number>();
    documentCounts.forEach(count => {
      if (count.linkedToReceivableId) {
        documentCountMap.set(count.linkedToReceivableId, count._count.id);
      }
    });

    // Map receivables to include document count
    const receivablesWithDocumentCount = receivables.map(receivable => ({
      id: receivable.id,
      invoiceNumber: receivable.invoiceNumber,
      customerId: receivable.customerId,
      amount: receivable.amount,
      invoiceDate: receivable.invoiceDate,
      dueDate: receivable.dueDate,
      paidAmount: receivable.paidAmount,
      status: receivable.status as ReceivableStatus,
      assignedTo: receivable.assignedTo as UserRole,
      createdAt: receivable.createdAt,
      updatedAt: receivable.updatedAt,
      customer: receivable.customer,
      documentCount: documentCountMap.get(receivable.id) || 0
    }));

    return {
      success: true,
      data: {
        receivables: receivablesWithDocumentCount,
        totalCount,
        page: validatedParams.page,
        pageSize: validatedParams.pageSize
      }
    };
  } catch (error) {
    console.error('Error fetching receivables:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to fetch receivables. Please try again.'
    };
  }
}

/**
 * Get single receivable with customer relationship for editing
 */
export async function getReceivableByIdAction(receivableId: string): Promise<ActionResult<Receivable>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate receivable ID
    if (!receivableId || typeof receivableId !== 'string') {
      return {
        success: false,
        error: 'Valid receivable ID is required'
      };
    }

    // Get receivable with customer relationship
    const receivable = await prisma.receivable.findUnique({
      where: { id: receivableId },
      include: {
        customer: true
      }
    });

    if (!receivable) {
      return {
        success: false,
        error: 'Receivable not found'
      };
    }

    return {
      success: true,
      data: receivable as Receivable
    };
  } catch (error) {
    console.error('Error fetching receivable:', error);
    
    return {
      success: false,
      error: 'Failed to fetch receivable. Please try again.'
    };
  }
}

/**
 * Update receivable status
 */
export async function updateReceivableStatusAction(
  receivableId: string, 
  status: ReceivableStatus
): Promise<ActionResult<Receivable>> {
  try {
    // Check access permissions
    const accessCheck = await checkReceivableAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate receivable ID
    if (!receivableId || typeof receivableId !== 'string') {
      return {
        success: false,
        error: 'Valid receivable ID is required'
      };
    }

    // Get existing receivable
    const existingReceivable = await prisma.receivable.findUnique({
      where: { id: receivableId },
      include: { customer: true }
    });

    if (!existingReceivable) {
      return {
        success: false,
        error: 'Receivable not found'
      };
    }

    // Update receivable status
    const updatedReceivable = await prisma.receivable.update({
      where: { id: receivableId },
      data: {
        status: status as PrismaReceivableStatus
      },
      include: {
        customer: true
      }
    });

    // Revalidate receivable pages
    revalidatePath('/receivables');
    revalidatePath(`/receivables/${receivableId}`);

    return {
      success: true,
      data: updatedReceivable as Receivable
    };
  } catch (error) {
    console.error('Error updating receivable status:', error);
    
    return {
      success: false,
      error: 'Failed to update receivable status. Please try again.'
    };
  }
}