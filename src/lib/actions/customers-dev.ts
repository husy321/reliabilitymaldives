'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ActionResult as BaseActionResult } from '../../../types/document';
import { CustomerFormData, Customer, GetCustomersParams, GetCustomersResult } from '../../../types/customer';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

/**
 * DEVELOPMENT VERSION - Bypasses authentication for testing
 * Use customers.ts for production with proper authentication
 */

// Form validation schema
const CustomerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name must be less than 255 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number must be less than 50 characters').optional().or(z.literal('')),
  address: z.string().max(1000, 'Address must be less than 1000 characters').optional().or(z.literal('')),
  paymentTerms: z.number().int('Payment terms must be a whole number').min(0, 'Payment terms must be non-negative').max(365, 'Payment terms cannot exceed 365 days'),
  isActive: z.boolean()
});

const GetCustomersParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
  searchTerm: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'paymentTerms', 'currentBalance', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  activeOnly: z.boolean().optional(),
  userRole: z.nativeEnum(UserRole)
});

/**
 * Development version - Create new customer without authentication
 */
export async function createCustomerActionDev(formData: CustomerFormData): Promise<BaseActionResult<Customer>> {
  try {
    // Validate form data
    const validatedData = CustomerFormSchema.parse({
      ...formData,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined
    });

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        paymentTerms: validatedData.paymentTerms,
        isActive: validatedData.isActive
      }
    });

    revalidatePath('/customers');

    return {
      success: true,
      data: customer
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to create customer. Please try again.'
    };
  }
}

/**
 * Development version - Get paginated customers without authentication
 */
export async function getCustomersActionDev(params: GetCustomersParams): Promise<BaseActionResult<GetCustomersResult>> {
  try {
    // Validate parameters
    const validatedParams = GetCustomersParamsSchema.parse({
      ...params,
      userRole: UserRole.ACCOUNTS // Default for development
    });

    // Build where clause for filtering
    const where: any = {};
    
    // Active status filter
    if (validatedParams.activeOnly !== undefined) {
      where.isActive = validatedParams.activeOnly;
    }

    // Search functionality
    if (validatedParams.searchTerm) {
      const searchTerm = validatedParams.searchTerm.trim();
      where.OR = [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          phone: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[validatedParams.sortBy] = validatedParams.sortOrder;

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.pageSize;

    // Execute queries in parallel
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: validatedParams.pageSize,
        include: {
          receivables: {
            select: {
              amount: true,
              paidAmount: true
            }
          }
        }
      }),
      prisma.customer.count({ where })
    ]);

    // Calculate invoice totals from included receivables (single query)
    const customersWithTotals = customers.map(customer => {
      const totalInvoiceAmount = customer.receivables.reduce((sum, r) => sum + r.amount, 0);
      const totalPaidAmount = customer.receivables.reduce((sum, r) => sum + r.paidAmount, 0);
      const totalOutstanding = totalInvoiceAmount - totalPaidAmount;

      // Remove receivables from the returned object to keep response clean
      const { receivables, ...customerData } = customer;

      return {
        ...customerData,
        totalInvoiceAmount,
        totalPaidAmount,
        totalOutstanding
      };
    });

    return {
      success: true,
      data: {
        customers: customersWithTotals,
        totalCount,
        page: validatedParams.page,
        pageSize: validatedParams.pageSize
      }
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to fetch customers. Please try again.'
    };
  }
}

/**
 * Development version - Toggle customer active status without authentication
 */
/**
 * Development version - Update existing customer without authentication
 */
export async function updateCustomerActionDev(
  customerId: string,
  formData: CustomerFormData
): Promise<BaseActionResult<Customer>> {
  try {
    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return {
        success: false,
        error: 'Valid customer ID is required'
      };
    }

    // Validate form data
    const validatedData = CustomerFormSchema.parse({
      ...formData,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined
    });

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existingCustomer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        paymentTerms: validatedData.paymentTerms,
        isActive: validatedData.isActive
      }
    });

    revalidatePath('/customers');

    return {
      success: true,
      data: updatedCustomer
    };
  } catch (error) {
    console.error('Error updating customer:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to update customer. Please try again.'
    };
  }
}

/**
 * Development version - Toggle customer active status without authentication
 */
export async function toggleCustomerActiveActionDev(customerId: string): Promise<BaseActionResult<Customer>> {
  try {
    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return {
        success: false,
        error: 'Valid customer ID is required'
      };
    }

    // Get current customer status
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existingCustomer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Toggle active status
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: !existingCustomer.isActive }
    });

    revalidatePath('/customers');

    return {
      success: true,
      data: updatedCustomer
    };
  } catch (error) {
    console.error('Error toggling customer status:', error);
    
    return {
      success: false,
      error: 'Failed to update customer status. Please try again.'
    };
  }
}

/**
 * Development version - Get customer with invoices/receivables
 */
export async function getCustomerWithInvoicesActionDev(customerId: string): Promise<BaseActionResult<any>> {
  try {
    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return {
        success: false,
        error: 'Valid customer ID is required'
      };
    }

    // Fetch customer with receivables
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        receivables: {
          orderBy: {
            invoiceDate: 'desc'
          },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            paidAmount: true,
            invoiceDate: true,
            dueDate: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    // Calculate totals
    const totalInvoiceAmount = customer.receivables.reduce((sum, r) => sum + r.amount, 0);
    const totalPaidAmount = customer.receivables.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalOutstanding = totalInvoiceAmount - totalPaidAmount;

    return {
      success: true,
      data: {
        ...customer,
        totalInvoiceAmount,
        totalPaidAmount,
        totalOutstanding
      }
    };
  } catch (error) {
    console.error('Error fetching customer with invoices:', error);

    return {
      success: false,
      error: 'Failed to fetch customer details. Please try again.'
    };
  }
}