import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/attendance/records/route';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@prisma/client');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = {
  attendanceRecord: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  $disconnect: jest.fn()
};

// Mock PrismaClient constructor
(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('/api/attendance/records', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/attendance/records', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'USER' }
      });

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('fetches attendance records with filters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      const mockRecords = [
        {
          id: 'record-1',
          staffId: 'staff-1',
          employeeId: 'EMP001',
          date: new Date('2024-01-15'),
          clockInTime: new Date('2024-01-15T09:00:00'),
          clockOutTime: new Date('2024-01-15T17:30:00'),
          totalHours: 8.5,
          zkTransactionId: 'TXN001',
          fetchedAt: new Date(),
          fetchedById: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          syncJobId: 'job-1',
          syncedAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          syncSource: 'AUTO_SYNC',
          validationStatus: 'VALIDATED',
          validationErrors: null,
          hasConflict: false,
          conflictResolved: null,
          conflictResolvedBy: null,
          conflictResolvedAt: null,
          conflictDetails: null,
          staff: {
            id: 'staff-1',
            employeeId: 'EMP001',
            name: 'John Smith',
            department: 'Engineering'
          },
          fetchedBy: {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@company.com'
          }
        }
      ];

      mockPrisma.attendanceRecord.findMany.mockResolvedValue(mockRecords);
      mockPrisma.attendanceRecord.count.mockResolvedValue(1);

      const searchParams = {
        staffId: 'staff-1',
        page: 1,
        limit: 25,
        sortBy: 'date',
        sortOrder: 'desc'
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.records).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(25);
      expect(data.totalPages).toBe(1);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith({
        where: { staffId: 'staff-1' },
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
        orderBy: { date: 'desc' },
        skip: 0,
        take: 25
      });
    });

    it('handles employee ID search filter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const searchParams = {
        employeeId: 'EMP001',
        page: 1,
        limit: 25
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      await POST(request);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            employeeId: {
              contains: 'EMP001',
              mode: 'insensitive'
            }
          }
        })
      );
    });

    it('handles department filter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const searchParams = {
        department: 'Engineering',
        page: 1,
        limit: 25
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      await POST(request);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            staff: {
              department: 'Engineering'
            }
          }
        })
      );
    });

    it('handles date range filter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const searchParams = {
        startDate,
        endDate,
        page: 1,
        limit: 25
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      await POST(request);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        })
      );
    });

    it('handles pagination correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(100);

      const searchParams = {
        page: 3,
        limit: 20
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page - 1) * limit = (3 - 1) * 20
          take: 20
        })
      );

      expect(data.totalPages).toBe(5); // Math.ceil(100 / 20)
    });

    it('handles custom sorting', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const searchParams = {
        sortBy: 'clockInTime',
        sortOrder: 'asc',
        page: 1,
        limit: 25
      };

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      await POST(request);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { clockInTime: 'asc' }
        })
      );
    });

    it('returns 500 on database error', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('disconnects from database after request', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/attendance/records', {
        method: 'POST',
        body: JSON.stringify({})
      });

      await POST(request);

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('GET /api/attendance/records', () => {
    it('handles GET request with query parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const url = 'http://localhost/api/attendance/records?staffId=staff-1&page=1&limit=25';
      const request = new NextRequest(url, { method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { staffId: 'staff-1' }
        })
      );
    });

    it('parses date query parameters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      });

      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0);

      const url = 'http://localhost/api/attendance/records?startDate=2024-01-01&endDate=2024-01-31';
      const request = new NextRequest(url, { method: 'GET' });

      await GET(request);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31')
            }
          }
        })
      );
    });
  });
});