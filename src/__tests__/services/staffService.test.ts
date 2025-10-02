import { StaffService } from '../../services/staffService';
import { prisma } from '../../lib/prisma';
import type { CreateStaffRequest, UpdateStaffRequest, StaffSearchParams } from '../../../types/staff';

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    staff: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

const mockPrisma = prisma as any;

describe('StaffService', () => {
  let staffService: StaffService;

  beforeEach(() => {
    staffService = new StaffService();
    jest.clearAllMocks();
  });

  describe('createStaff', () => {
    const createRequest: CreateStaffRequest = {
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'IT',
      shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      isActive: true
    };

    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@company.com',
      name: 'John Doe',
      isActive: true
    };

    const mockStaff = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      ...createRequest,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser
    };

    it('should create staff member successfully', async () => {
      mockPrisma.staff.findUnique
        .mockResolvedValueOnce(null) // No existing employeeId
        .mockResolvedValueOnce(null); // No existing userId
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.staff.create.mockResolvedValueOnce(mockStaff);

      const result = await staffService.createStaff(createRequest);

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.staff.create).toHaveBeenCalledWith({
        data: createRequest,
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
    });

    it('should throw error if employee ID already exists', async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff);

      await expect(staffService.createStaff(createRequest))
        .rejects.toThrow('Employee ID EMP001 already exists');
    });

    it('should throw error if user already has staff record', async () => {
      mockPrisma.staff.findUnique
        .mockResolvedValueOnce(null) // No existing employeeId
        .mockResolvedValueOnce(mockStaff); // Existing userId

      await expect(staffService.createStaff(createRequest))
        .rejects.toThrow('User already has a staff record');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.staff.findUnique
        .mockResolvedValueOnce(null) // No existing employeeId
        .mockResolvedValueOnce(null); // No existing userId
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.createStaff(createRequest))
        .rejects.toThrow('User not found or inactive');
    });

    it('should throw validation error for invalid data', async () => {
      const invalidRequest = { ...createRequest, employeeId: '' };

      await expect(staffService.createStaff(invalidRequest))
        .rejects.toThrow('Employee ID is required');
    });
  });

  describe('getStaffById', () => {
    it('should return staff member by ID', async () => {
      const mockStaff = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        shiftSchedule: 'Day Shift',
        isActive: true,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@company.com',
          name: 'John Doe',
          role: 'ADMIN'
        }
      };

      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff);

      const result = await staffService.getStaffById('223e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
        where: { id: '223e4567-e89b-12d3-a456-426614174000' },
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
    });

    it('should return null if staff not found', async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);

      const result = await staffService.getStaffById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStaff', () => {
    const updateRequest: UpdateStaffRequest = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      name: 'John Smith',
      department: 'HR'
    };

    const existingStaff = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'IT',
      shiftSchedule: 'Day Shift',
      isActive: true,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update staff member successfully', async () => {
      const updatedStaff = { ...existingStaff, ...updateRequest };
      
      mockPrisma.staff.findUnique.mockResolvedValueOnce(existingStaff);
      mockPrisma.staff.update.mockResolvedValueOnce(updatedStaff);

      const result = await staffService.updateStaff(updateRequest);

      expect(result).toEqual(updatedStaff);
      expect(mockPrisma.staff.update).toHaveBeenCalledWith({
        where: { id: updateRequest.id },
        data: { name: updateRequest.name, department: updateRequest.department },
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
    });

    it('should throw error if staff not found', async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.updateStaff(updateRequest))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('searchStaff', () => {
    const searchParams: StaffSearchParams = {
      query: 'John',
      department: 'IT',
      isActive: true,
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    const mockStaffArray = [
      {
        id: '223e4567-e89b-12d3-a456-426614174000',
        employeeId: 'EMP001',
        name: 'John Doe',
        department: 'IT',
        shiftSchedule: 'Day Shift',
        isActive: true,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@company.com',
          name: 'John Doe',
          role: 'ADMIN'
        }
      }
    ];

    it('should search staff with all filters', async () => {
      mockPrisma.staff.findMany.mockResolvedValueOnce(mockStaffArray);
      mockPrisma.staff.count.mockResolvedValueOnce(1);

      const result = await staffService.searchStaff(searchParams);

      expect(result).toEqual({
        staff: mockStaffArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'John', mode: 'insensitive' } },
            { employeeId: { contains: 'John', mode: 'insensitive' } }
          ],
          department: 'IT',
          isActive: true
        },
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
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10
      });
    });

    it('should handle empty search results', async () => {
      mockPrisma.staff.findMany.mockResolvedValueOnce([]);
      mockPrisma.staff.count.mockResolvedValueOnce(0);

      const result = await staffService.searchStaff({ page: 1, limit: 10 });

      expect(result).toEqual({
        staff: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });

    it('should validate search parameters', async () => {
      const invalidParams = { page: 0, limit: -1 } as StaffSearchParams;

      await expect(staffService.searchStaff(invalidParams))
        .rejects.toThrow();
    });
  });

  describe('deleteStaff', () => {
    it('should delete staff member successfully', async () => {
      const staffId = '223e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        employeeId: 'EMP001',
        name: 'John Doe'
      };

      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff);
      mockPrisma.staff.delete.mockResolvedValueOnce(mockStaff);

      await staffService.deleteStaff(staffId);

      expect(mockPrisma.staff.delete).toHaveBeenCalledWith({
        where: { id: staffId }
      });
    });

    it('should throw error if staff not found', async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.deleteStaff('nonexistent-id'))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('getDepartments', () => {
    it('should return list of departments', async () => {
      const mockDepartments = [
        { department: 'IT' },
        { department: 'HR' },
        { department: 'Finance' }
      ];

      mockPrisma.staff.groupBy.mockResolvedValueOnce(mockDepartments);

      const result = await staffService.getDepartments();

      expect(result).toEqual(['Finance', 'HR', 'IT']); // Should be sorted
      expect(mockPrisma.staff.groupBy).toHaveBeenCalledWith({
        by: ['department'],
        where: {
          isActive: true
        }
      });
    });
  });

  describe('getStaffStats', () => {
    it('should return staff statistics', async () => {
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        byDepartment: [
          { department: 'IT', _count: { id: 5 } },
          { department: 'HR', _count: { id: 3 } }
        ]
      };

      mockPrisma.staff.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2); // inactive
      
      mockPrisma.staff.groupBy.mockResolvedValueOnce(mockStats.byDepartment);

      const result = await staffService.getStaffStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byDepartment: [
          { department: 'HR', count: 3 },
          { department: 'IT', count: 5 }
        ]
      });
    });
  });
});