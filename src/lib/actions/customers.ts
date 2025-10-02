'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CustomerFormData, Customer, GetCustomersParams, GetCustomersResult } from '../../../types/customer';
import { ActionResult as BaseActionResult } from '../../../types/document';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

/**
 * Zod schemas for customer data validation
 */
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
  pageSize: z.number().int().min(1).max(2000).optional().default(10), // Increased limit to support dropdown usage
  searchTerm: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'paymentTerms', 'currentBalance', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  activeOnly: z.boolean().optional(),
  userRole: z.nativeEnum(UserRole)
});

/**
 * Role-based access control helper for full customer management
 */
async function checkCustomerManagementAccess(): Promise<{ success: false; error: string } | { success: true; userRole: UserRole }> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // Check if user has access to customer management (Accounts team members only)
  if (session.user.role !== UserRole.ACCOUNTS && session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
    return {
      success: false,
      error: 'Access denied. Customer management requires Accounts team permissions.'
    };
  }

  return {
    success: true,
    userRole: session.user.role
  };
}

/**
 * Role-based access control helper for customer reading (more permissive for receivables)
 */
async function checkCustomerReadAccess(): Promise<{ success: false; error: string } | { success: true; userRole: UserRole }> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // Allow SALES users to read customer data for receivables creation
  if (session.user.role !== UserRole.ACCOUNTS && 
      session.user.role !== UserRole.ADMIN && 
      session.user.role !== UserRole.MANAGER && 
      session.user.role !== UserRole.SALES &&
      session.user.role !== UserRole.ACCOUNTANT) {
    return {
      success: false,
      error: 'Access denied. Customer data access requires appropriate permissions.'
    };
  }

  return {
    success: true,
    userRole: session.user.role
  };
}

/**
 * Create new customer with validation
 */
export async function createCustomerAction(formData: CustomerFormData): Promise<BaseActionResult<Customer>> {
  try {
    // Check access permissions
    const accessCheck = await checkCustomerManagementAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

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

    // Revalidate customer pages
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
 * Update existing customer with proper authorization
 */
export async function updateCustomerAction(
  customerId: string,
  formData: CustomerFormData
): Promise<BaseActionResult<Customer>> {
  try {
    // Check access permissions
    const accessCheck = await checkCustomerManagementAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

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

    // Revalidate customer pages
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);

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
 * Soft delete customer (set isActive: false)
 */
export async function deleteCustomerAction(customerId: string): Promise<BaseActionResult<{ success: boolean }>> {
  try {
    // Check access permissions
    const accessCheck = await checkCustomerManagementAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return {
        success: false,
        error: 'Valid customer ID is required'
      };
    }

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

    // Soft delete customer
    await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false }
    });

    // Revalidate customer pages
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);

    return {
      success: true,
      data: { success: true }
    };
  } catch (error) {
    console.error('Error deleting customer:', error);
    
    return {
      success: false,
      error: 'Failed to delete customer. Please try again.'
    };
  }
}

/**
 * Get paginated customers with search and filtering capabilities
 */
export async function getCustomersAction(params: GetCustomersParams): Promise<BaseActionResult<GetCustomersResult>> {
  try {
    // Check access permissions (use read access for broader permissions)
    const accessCheck = await checkCustomerReadAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate parameters
    const validatedParams = GetCustomersParamsSchema.parse({
      ...params,
      userRole: accessCheck.userRole
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
        take: validatedParams.pageSize
      }),
      prisma.customer.count({ where })
    ]);

    return {
      success: true,
      data: {
        customers,
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
 * Get single customer by ID
 */
export async function getCustomerByIdAction(customerId: string): Promise<BaseActionResult<Customer>> {
  try {
    // Check access permissions (use read access for broader permissions)
    const accessCheck = await checkCustomerReadAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      return {
        success: false,
        error: 'Valid customer ID is required'
      };
    }

    // Fetch customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    return {
      success: true,
      data: customer
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    
    return {
      success: false,
      error: 'Failed to fetch customer. Please try again.'
    };
  }
}

/**
 * Toggle customer active status
 */
export async function toggleCustomerActiveAction(customerId: string): Promise<BaseActionResult<Customer>> {
  try {
    // Check access permissions
    const accessCheck = await checkCustomerManagementAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

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

    // Revalidate customer pages
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);

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