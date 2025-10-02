// Attendance repository following architecture patterns
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import type { 
  AttendanceRecord, 
  CreateAttendanceRecordRequest, 
  AttendanceSearchParams, 
  AttendanceSearchResult,
  AttendanceStats 
} from '../../types/attendance';

// Validation schemas
export const createAttendanceRecordSchema = z.object({
  staffId: z.string().uuid('Valid staff ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.date(),
  clockInTime: z.date().optional(),
  clockOutTime: z.date().optional(),
  zkTransactionId: z.string().min(1, 'ZK transaction ID is required')
});

export const attendanceSearchSchema = z.object({
  staffId: z.string().uuid().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['date', 'clockInTime', 'clockOutTime', 'totalHours']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export class AttendanceRepository {
  /**
   * Create a new attendance record
   */
  async createAttendanceRecord(
    data: CreateAttendanceRecordRequest, 
    fetchedById: string
  ): Promise<AttendanceRecord> {
    const validatedData = createAttendanceRecordSchema.parse(data);
    
    try {
      // Calculate total hours if both clock in and out times are provided
      let totalHours: number | null = null;
      if (validatedData.clockInTime && validatedData.clockOutTime) {
        const diffMs = validatedData.clockOutTime.getTime() - validatedData.clockInTime.getTime();
        totalHours = Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
      }

      const attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          staffId: validatedData.staffId,
          employeeId: validatedData.employeeId,
          date: validatedData.date,
          clockInTime: validatedData.clockInTime,
          clockOutTime: validatedData.clockOutTime,
          totalHours,
          zkTransactionId: validatedData.zkTransactionId,
          fetchedById
        },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true
            }
          },
          fetchedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      return attendanceRecord;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      
      // Handle unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('Attendance record already exists for this staff member, date, and transaction ID');
      }
      
      throw error;
    }
  }

  /**
   * Create multiple attendance records in a transaction
   */
  async createAttendanceRecordsBatch(
    records: CreateAttendanceRecordRequest[], 
    fetchedById: string
  ): Promise<{
    created: AttendanceRecord[];
    errors: { record: CreateAttendanceRecordRequest; error: string }[];
  }> {
    const created: AttendanceRecord[] = [];
    const errors: { record: CreateAttendanceRecordRequest; error: string }[] = [];

    // Process records in batches to avoid database timeout
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(record => this.createAttendanceRecord(record, fetchedById))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          created.push(result.value);
        } else {
          errors.push({
            record: batch[index],
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          });
        }
      });
    }

    return { created, errors };
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceRecordById(id: string): Promise<AttendanceRecord | null> {
    try {
      const record = await prisma.attendanceRecord.findUnique({
        where: { id },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true
            }
          },
          fetchedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      return record;
    } catch (error) {
      throw new Error(`Failed to get attendance record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search and filter attendance records
   */
  async searchAttendanceRecords(params: AttendanceSearchParams): Promise<AttendanceSearchResult> {
    const validatedParams = attendanceSearchSchema.parse(params);
    const { 
      staffId, 
      employeeId, 
      department, 
      startDate, 
      endDate, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    } = validatedParams;
    
    try {
      // Build where clause
      const where: any = {};
      
      if (staffId) {
        where.staffId = staffId;
      }
      
      if (employeeId) {
        where.employeeId = employeeId;
      }
      
      if (department) {
        where.staff = {
          department
        };
      }
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;
      
      // Execute queries in parallel
      const [records, total] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where,
          include: {
            staff: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                department: true
              }
            },
            fetchedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.attendanceRecord.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        records,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      throw new Error(`Failed to search attendance records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if attendance record exists
   */
  async attendanceRecordExists(
    staffId: string, 
    date: Date, 
    zkTransactionId: string
  ): Promise<boolean> {
    try {
      const record = await prisma.attendanceRecord.findFirst({
        where: {
          staffId,
          date,
          zkTransactionId
        }
      });
      
      return record !== null;
    } catch (error) {
      throw new Error(`Failed to check attendance record existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(): Promise<AttendanceStats> {
    try {
      const [
        totalRecords,
        recordsByMonth,
        recordsByDepartment,
        recentFetches
      ] = await Promise.all([
        // Total records count
        prisma.attendanceRecord.count(),
        
        // Records by month (last 6 months)
        prisma.$queryRaw<{ month: string; count: bigint }[]>`
          SELECT 
            strftime('%Y-%m', date) as month,
            COUNT(*) as count
          FROM attendance_records 
          WHERE date >= date('now', '-6 months')
          GROUP BY strftime('%Y-%m', date)
          ORDER BY month DESC
        `,
        
        // Records by department
        prisma.$queryRaw<{ department: string; count: bigint }[]>`
          SELECT 
            s.department,
            COUNT(*) as count
          FROM attendance_records ar
          INNER JOIN staff s ON ar.staffId = s.id
          GROUP BY s.department
          ORDER BY count DESC
        `,
        
        // Recent fetches (last 10)
        prisma.$queryRaw<{ fetchedAt: Date; recordCount: bigint; fetchedBy: string }[]>`
          SELECT 
            DATE(fetchedAt) as fetchedAt,
            COUNT(*) as recordCount,
            u.name as fetchedBy
          FROM attendance_records ar
          INNER JOIN users u ON ar.fetchedById = u.id
          GROUP BY DATE(fetchedAt), u.name
          ORDER BY fetchedAt DESC
          LIMIT 10
        `
      ]);

      return {
        totalRecords,
        recordsByMonth: recordsByMonth.map(r => ({
          month: r.month,
          count: Number(r.count)
        })),
        recordsByDepartment: recordsByDepartment.map(r => ({
          department: r.department,
          count: Number(r.count)
        })),
        recentFetches: recentFetches.map(r => ({
          fetchedAt: r.fetchedAt,
          recordCount: Number(r.recordCount),
          fetchedBy: r.fetchedBy
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get attendance statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete attendance records older than specified date
   */
  async deleteOldAttendanceRecords(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.attendanceRecord.deleteMany({
        where: {
          date: {
            lt: olderThan
          }
        }
      });
      
      return result.count;
    } catch (error) {
      throw new Error(`Failed to delete old attendance records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get staff by employee ID for mapping validation
   */
  async getStaffByEmployeeId(employeeId: string): Promise<{
    id: string;
    employeeId: string;
    name: string;
    department: string;
    isActive: boolean;
  } | null> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { employeeId },
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          isActive: true
        }
      });
      
      return staff;
    } catch (error) {
      throw new Error(`Failed to get staff by employee ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Default instance
export const attendanceRepository = new AttendanceRepository();