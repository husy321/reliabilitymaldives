import { NextRequest } from 'next/server';
import { PUT } from '../../../../../../app/api/attendance/[id]/edit/route';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    attendanceRecord: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/attendance/[id]/edit', () => {
  const mockUserId = 'user-123';
  const mockRecordId = 'record-456';
  const mockStaffId = 'staff-789';

  const mockExistingRecord = {
    id: mockRecordId,
    staffId: mockStaffId,
    employeeId: 'EMP001',
    date: new Date('2024-01-15'),
    clockInTime: new Date('2024-01-15T09:00:00Z'),
    clockOutTime: new Date('2024-01-15T17:00:00Z'),
    totalHours: 8,
    zkTransactionId: 'zkt-123',
    fetchedAt: new Date('2024-01-15T18:00:00Z'),
    fetchedById: 'fetcher-123',
    conflictResolved: false,
    conflictResolvedBy: null,
    conflictNotes: null,
    createdAt: new Date('2024-01-15T18:00:00Z'),
    updatedAt: new Date('2024-01-15T18:00:00Z'),
    staff: {
      id: mockStaffId,
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'Engineering'
    },
    fetchedBy: {
      id: 'fetcher-123',
      name: 'Fetcher User',
      email: 'fetcher@example.com'
    }
  };

  const mockUpdatedRecord = {
    ...mockExistingRecord,
    clockInTime: new Date('2024-01-15T08:30:00Z'),
    clockOutTime: new Date('2024-01-15T17:30:00Z'),
    totalHours: 9,
    conflictResolved: true,
    conflictResolvedBy: mockUserId,
    conflictNotes: 'Manual edit: Corrected clock-in time',
    updatedAt: new Date('2024-01-15T20:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful admin session
    mockGetSession.mockResolvedValue({
      user: {
        id: mockUserId,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    // Mock transaction to execute callback immediately
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });
  });

  describe('PUT /api/attendance/[id]/edit', () => {
    it('should successfully update attendance record with admin role', async () => {
      // Arrange
      const editRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:30:00Z',
        clockOutTime: '2024-01-15T17:30:00Z',
        reason: 'Corrected clock-in time'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);
      mockPrisma.attendanceRecord.update.mockResolvedValue(mockUpdatedRecord);
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        userId: mockUserId,
        action: 'MANUAL_EDIT',
        tableName: 'AttendanceRecord',
        recordId: mockRecordId,
        oldValues: expect.any(Object),
        newValues: expect.any(Object),
        timestamp: new Date()
      });

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(editRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.updatedRecord).toBeDefined();
      expect(result.updatedRecord.clockInTime).toBe(mockUpdatedRecord.clockInTime);
      expect(result.updatedRecord.clockOutTime).toBe(mockUpdatedRecord.clockOutTime);
      expect(result.updatedRecord.totalHours).toBe(9);
      expect(result.updatedRecord.conflictResolved).toBe(true);

      // Verify database operations
      expect(mockPrisma.attendanceRecord.findUnique).toHaveBeenCalledWith({
        where: { id: mockRecordId },
        include: expect.any(Object)
      });

      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: mockRecordId },
        data: expect.objectContaining({
          date: new Date('2024-01-15'),
          clockInTime: new Date('2024-01-15T08:30:00Z'),
          clockOutTime: new Date('2024-01-15T17:30:00Z'),
          totalHours: 9,
          conflictResolved: true,
          conflictResolvedBy: mockUserId,
          conflictNotes: 'Manual edit: Corrected clock-in time'
        }),
        include: expect.any(Object)
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          action: 'MANUAL_EDIT',
          tableName: 'AttendanceRecord',
          recordId: mockRecordId,
          oldValues: expect.any(Object),
          newValues: expect.any(Object)
        })
      });
    });

    it('should reject requests without authentication', async () => {
      // Arrange
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Authentication required');
    });

    it('should reject requests from non-admin users', async () => {
      // Arrange
      mockGetSession.mockResolvedValue({
        user: {
          id: mockUserId,
          email: 'user@example.com',
          name: 'Regular User',
          role: 'SALES'
        }
      });

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Admin role required for attendance editing');
    });

    it('should return 404 for non-existent attendance record', async () => {
      // Arrange
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      const editRequest = {
        recordId: 'non-existent',
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:30:00Z',
        clockOutTime: '2024-01-15T17:30:00Z',
        reason: 'Test edit'
      };

      const request = new NextRequest('http://localhost:3000/api/attendance/non-existent/edit', {
        method: 'PUT',
        body: JSON.stringify(editRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: 'non-existent' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Attendance record not found');
    });

    it('should validate time sequence (clock-in before clock-out)', async () => {
      // Arrange
      const invalidEditRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T18:00:00Z', // After clock-out
        clockOutTime: '2024-01-15T17:00:00Z',
        reason: 'Test edit'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Clock-in time must be before clock-out time')
      ]));
    });

    it('should validate future date restriction', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      const invalidEditRequest = {
        recordId: mockRecordId,
        date: futureDate.toISOString().split('T')[0],
        clockInTime: '2024-01-15T09:00:00Z',
        clockOutTime: '2024-01-15T17:00:00Z',
        reason: 'Test edit'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Cannot set attendance for future dates')
      ]));
    });

    it('should validate working hours limits (max 24 hours)', async () => {
      // Arrange
      const invalidEditRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:00:00Z',
        clockOutTime: '2024-01-16T09:00:00Z', // 25 hours later
        reason: 'Test edit'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Work duration cannot exceed 24 hours')
      ]));
    });

    it('should validate minimum working time (15 minutes)', async () => {
      // Arrange
      const invalidEditRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T09:00:00Z',
        clockOutTime: '2024-01-15T09:10:00Z', // Only 10 minutes
        reason: 'Test edit'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Work duration must be at least 15 minutes')
      ]));
    });

    it('should require at least one time (clock-in or clock-out)', async () => {
      // Arrange
      const invalidEditRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: null,
        clockOutTime: null,
        reason: 'Test edit'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('At least one time (clock-in or clock-out) must be provided')
      ]));
    });

    it('should require reason for manual edits', async () => {
      // Arrange
      const invalidEditRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:30:00Z',
        clockOutTime: '2024-01-15T17:30:00Z',
        reason: '' // Empty reason
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(invalidEditRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Reason is required for manual edits')
      ]));
    });

    it('should handle database transaction errors', async () => {
      // Arrange
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection failed'));

      const editRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:30:00Z',
        clockOutTime: '2024-01-15T17:30:00Z',
        reason: 'Test edit'
      };

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(editRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('An unexpected error occurred while updating attendance record');
    });

    it('should handle only clock-in time update', async () => {
      // Arrange
      const editRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: '2024-01-15T08:30:00Z',
        clockOutTime: null,
        reason: 'Corrected clock-in time only'
      };

      const expectedUpdate = {
        ...mockExistingRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z'),
        clockOutTime: null,
        totalHours: null,
        conflictResolved: true,
        conflictResolvedBy: mockUserId,
        conflictNotes: 'Manual edit: Corrected clock-in time only'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);
      mockPrisma.attendanceRecord.update.mockResolvedValue(expectedUpdate);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(editRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.updatedRecord.clockInTime).toBe(expectedUpdate.clockInTime);
      expect(result.updatedRecord.clockOutTime).toBe(null);
      expect(result.updatedRecord.totalHours).toBe(null);

      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: mockRecordId },
        data: expect.objectContaining({
          clockInTime: new Date('2024-01-15T08:30:00Z'),
          clockOutTime: null,
          totalHours: null
        }),
        include: expect.any(Object)
      });
    });

    it('should handle only clock-out time update', async () => {
      // Arrange
      const editRequest = {
        recordId: mockRecordId,
        date: '2024-01-15',
        clockInTime: null,
        clockOutTime: '2024-01-15T18:00:00Z',
        reason: 'Corrected clock-out time only'
      };

      const expectedUpdate = {
        ...mockExistingRecord,
        clockInTime: null,
        clockOutTime: new Date('2024-01-15T18:00:00Z'),
        totalHours: null,
        conflictResolved: true,
        conflictResolvedBy: mockUserId,
        conflictNotes: 'Manual edit: Corrected clock-out time only'
      };

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(mockExistingRecord);
      mockPrisma.attendanceRecord.update.mockResolvedValue(expectedUpdate);

      const request = new NextRequest('http://localhost:3000/api/attendance/record-456/edit', {
        method: 'PUT',
        body: JSON.stringify(editRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await PUT(request, { params: { id: mockRecordId } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.updatedRecord.clockInTime).toBe(null);
      expect(result.updatedRecord.clockOutTime).toBe(expectedUpdate.clockOutTime);
      expect(result.updatedRecord.totalHours).toBe(null);

      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalledWith({
        where: { id: mockRecordId },
        data: expect.objectContaining({
          clockInTime: null,
          clockOutTime: new Date('2024-01-15T18:00:00Z'),
          totalHours: null
        }),
        include: expect.any(Object)
      });
    });
  });
});