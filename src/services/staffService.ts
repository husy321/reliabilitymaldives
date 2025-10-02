// Staff management service following architecture/coding-standards.md patterns
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import type { Staff, CreateStaffRequest, UpdateStaffRequest, StaffSearchParams, StaffSearchResult } from '../../types/staff';

// Validation schemas
export const createStaffSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Name is required'),
  department: z.string().min(1, 'Department is required'),
  shiftSchedule: z.string().min(1, 'Shift schedule is required'),
  userId: z.string().uuid('Valid user ID is required'),
  isActive: z.boolean().optional().default(true)
});

export const updateStaffSchema = z.object({
  id: z.string().uuid('Valid staff ID is required'),
  employeeId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  shiftSchedule: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

export const staffSearchSchema = z.object({
  query: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  sortBy: z.enum(['name', 'department', 'employeeId', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

export class StaffService {
  /**
   * Create a new staff member
   */
  async createStaff(data: CreateStaffRequest): Promise<Staff> {
    const validatedData = createStaffSchema.parse(data);
    
    try {
      // Check if employee ID already exists
      const existingStaff = await prisma.staff.findUnique({
        where: { employeeId: validatedData.employeeId }
      });
      
      if (existingStaff) {
        throw new Error(`Employee ID ${validatedData.employeeId} already exists`);
      }
      
      // Check if user ID already has a staff record
      const existingUserStaff = await prisma.staff.findUnique({
        where: { userId: validatedData.userId }
      });
      
      if (existingUserStaff) {
        throw new Error(`User already has a staff record`);
      }
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { 
          id: validatedData.userId,
          isActive: true 
        }
      });
      
      if (!user) {
        throw new Error('User not found or inactive');
      }
      
      const staff = await prisma.staff.create({
        data: validatedData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      return staff;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Get staff member by ID
   */
  async getStaffById(id: string): Promise<Staff | null> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      return staff;
    } catch (error) {
      throw new Error(`Failed to get staff member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get staff member by employee ID
   */
  async getStaffByEmployeeId(employeeId: string): Promise<Staff | null> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { employeeId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      return staff;
    } catch (error) {
      throw new Error(`Failed to get staff member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update staff member
   */
  async updateStaff(data: UpdateStaffRequest): Promise<Staff> {
    const validatedData = updateStaffSchema.parse(data);
    const { id, ...updateData } = validatedData;
    
    try {
      // Check if staff exists
      const existingStaff = await prisma.staff.findUnique({
        where: { id }
      });
      
      if (!existingStaff) {
        throw new Error('Staff member not found');
      }
      
      // If updating employee ID, check for conflicts
      if (updateData.employeeId && updateData.employeeId !== existingStaff.employeeId) {
        const conflictingStaff = await prisma.staff.findUnique({
          where: { employeeId: updateData.employeeId }
        });
        
        if (conflictingStaff) {
          throw new Error(`Employee ID ${updateData.employeeId} already exists`);
        }
      }
      
      const staff = await prisma.staff.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      return staff;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete staff member
   */
  async deleteStaff(id: string): Promise<void> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id }
      });
      
      if (!staff) {
        throw new Error('Staff member not found');
      }
      
      await prisma.staff.delete({
        where: { id }
      });
    } catch (error) {
      throw new Error(`Failed to delete staff member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search and filter staff members
   */
  async searchStaff(params: StaffSearchParams): Promise<StaffSearchResult> {
    const validatedParams = staffSearchSchema.parse(params);
    const { query, department, isActive, page, limit, sortBy, sortOrder } = validatedParams;
    
    try {
      // Build where clause
      const where: any = {};
      
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { employeeId: { contains: query, mode: 'insensitive' } }
        ];
      }
      
      if (department) {
        where.department = department;
      }
      
      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;
      
      // Execute queries in parallel
      const [staff, total] = await Promise.all([
        prisma.staff.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.staff.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        staff,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      throw new Error(`Failed to search staff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<string[]> {
    try {
      const departments = await prisma.staff.groupBy({
        by: ['department'],
        where: {
          isActive: true
        }
      });
      
      return departments.map(d => d.department).sort();
    } catch (error) {
      throw new Error(`Failed to get departments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get staff statistics
   */
  async getStaffStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byDepartment: { department: string; count: number }[];
  }> {
    try {
      const [total, active, inactive, byDepartment] = await Promise.all([
        prisma.staff.count(),
        prisma.staff.count({ where: { isActive: true } }),
        prisma.staff.count({ where: { isActive: false } }),
        prisma.staff.groupBy({
          by: ['department'],
          _count: {
            id: true
          },
          where: {
            isActive: true
          }
        })
      ]);
      
      return {
        total,
        active,
        inactive,
        byDepartment: byDepartment.map(d => ({
          department: d.department,
          count: d._count.id
        })).sort((a, b) => a.department.localeCompare(b.department))
      };
    } catch (error) {
      throw new Error(`Failed to get staff statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Default instance
export const staffService = new StaffService();