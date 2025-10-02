'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Zod schemas for user data validation
 */
const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true)
});

const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

const GetUsersParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  searchTerm: z.string().optional(),
  roleFilter: z.nativeEnum(UserRole).optional().catch(undefined),
  activeOnly: z.boolean().optional()
});

/**
 * Check if user has admin access
 */
async function checkAdminAccess(): Promise<{ success: false; error: string } | { success: true }> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  if (session.user.role !== UserRole.ADMIN) {
    return {
      success: false,
      error: 'Access denied. Admin privileges required.'
    };
  }

  return { success: true };
}

/**
 * Get all users with pagination and filtering
 */
export async function getUsersAction(params: any): Promise<ActionResult<any>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate parameters
    const validatedParams = GetUsersParamsSchema.parse(params);

    // Build where clause
    const where: any = {};

    if (validatedParams.searchTerm) {
      const searchTerm = validatedParams.searchTerm.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (validatedParams.roleFilter) {
      where.role = validatedParams.roleFilter;
    }

    if (validatedParams.activeOnly !== undefined) {
      where.isActive = validatedParams.activeOnly;
    }

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.pageSize;

    // Execute queries in parallel
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validatedParams.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      success: true,
      data: {
        users,
        totalCount,
        page: validatedParams.page,
        pageSize: validatedParams.pageSize
      }
    };
  } catch (error) {
    console.error('Error fetching users:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to fetch users. Please try again.'
    };
  }
}

/**
 * Get single user by ID
 */
export async function getUserByIdAction(userId: string): Promise<ActionResult<any>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Valid user ID is required'
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      success: false,
      error: 'Failed to fetch user. Please try again.'
    };
  }
}

/**
 * Create new user
 */
export async function createUserAction(formData: any): Promise<ActionResult<any>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    // Validate form data
    const validatedData = CreateUserSchema.parse(formData);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email already exists'
      };
    }

    // Hash password
    const password_hash = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password_hash,
        role: validatedData.role,
        isActive: validatedData.isActive
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    revalidatePath('/users');

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to create user. Please try again.'
    };
  }
}

/**
 * Update existing user
 */
export async function updateUserAction(userId: string, formData: any): Promise<ActionResult<any>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Valid user ID is required'
      };
    }

    // Validate form data
    const validatedData = UpdateUserSchema.parse(formData);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // If email is being updated, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (emailExists) {
        return {
          success: false,
          error: 'A user with this email already exists'
        };
      }
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.email && { email: validatedData.email }),
      ...(validatedData.role && { role: validatedData.role }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
    };

    // Hash password if provided
    if (validatedData.password) {
      updateData.password_hash = await bcrypt.hash(validatedData.password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    revalidatePath('/users');

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error updating user:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors?.map(e => e.message).join(', ') || 'Invalid data'}`
      };
    }

    return {
      success: false,
      error: 'Failed to update user. Please try again.'
    };
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserActiveAction(userId: string): Promise<ActionResult<any>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Valid user ID is required'
      };
    }

    // Get current user status
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, email: true }
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Prevent deactivating self
    const session = await getSession();
    if (session?.user?.email === existingUser.email) {
      return {
        success: false,
        error: 'You cannot deactivate your own account'
      };
    }

    // Toggle active status
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !existingUser.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    revalidatePath('/users');

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error toggling user status:', error);

    return {
      success: false,
      error: 'Failed to update user status. Please try again.'
    };
  }
}

/**
 * Delete user (soft delete by marking as inactive)
 */
export async function deleteUserAction(userId: string): Promise<ActionResult<void>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Valid user ID is required'
      };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Prevent deleting self
    const session = await getSession();
    if (session?.user?.email === existingUser.email) {
      return {
        success: false,
        error: 'You cannot delete your own account'
      };
    }

    // Soft delete by marking as inactive
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    revalidatePath('/users');

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting user:', error);

    return {
      success: false,
      error: 'Failed to delete user. Please try again.'
    };
  }
}
