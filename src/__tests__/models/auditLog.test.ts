import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

const mockPrisma = mockDeep<PrismaClient>()
let prisma: DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(mockPrisma)
  prisma = mockPrisma as DeepMockProxy<PrismaClient>
})

describe('AuditLog Model', () => {
  const mockAuditLog = {
    id: '789e0123-e89b-12d3-a456-426614174002',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    action: 'CREATE',
    tableName: 'users',
    recordId: '123e4567-e89b-12d3-a456-426614174000',
    oldValues: null,
    newValues: {
      email: 'new@reliabilitymaldives.com',
      name: 'New User',
      role: 'SALES',
      isActive: true
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date('2025-09-02T10:00:00Z')
  }

  describe('AuditLog Creation', () => {
    it('should create audit log entry with all data', async () => {
      prisma.auditLog.create.mockResolvedValue(mockAuditLog)

      const auditData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'CREATE',
        tableName: 'users',
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        oldValues: null,
        newValues: {
          email: 'new@reliabilitymaldives.com',
          name: 'New User',
          role: 'SALES',
          isActive: true
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }

      const result = await prisma.auditLog.create({ data: auditData })

      expect(result).toEqual(mockAuditLog)
      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: auditData })
    })

    it('should create audit log for UPDATE action with old and new values', async () => {
      const updateAuditLog = {
        ...mockAuditLog,
        action: 'UPDATE',
        oldValues: {
          name: 'Old Name',
          isActive: true
        },
        newValues: {
          name: 'New Name',
          isActive: false
        }
      }
      prisma.auditLog.create.mockResolvedValue(updateAuditLog)

      const auditData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'UPDATE',
        tableName: 'users',
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        oldValues: {
          name: 'Old Name',
          isActive: true
        },
        newValues: {
          name: 'New Name',
          isActive: false
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }

      const result = await prisma.auditLog.create({ data: auditData })

      expect(result).toEqual(updateAuditLog)
      expect(result.action).toBe('UPDATE')
      expect(result.oldValues).toBeDefined()
      expect(result.newValues).toBeDefined()
    })

    it('should create audit log for DELETE action', async () => {
      const deleteAuditLog = {
        ...mockAuditLog,
        action: 'DELETE',
        oldValues: {
          email: 'deleted@reliabilitymaldives.com',
          name: 'Deleted User',
          isActive: true
        },
        newValues: null
      }
      prisma.auditLog.create.mockResolvedValue(deleteAuditLog)

      const auditData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'DELETE',
        tableName: 'users',
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        oldValues: {
          email: 'deleted@reliabilitymaldives.com',
          name: 'Deleted User',
          isActive: true
        },
        newValues: null,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }

      const result = await prisma.auditLog.create({ data: auditData })

      expect(result).toEqual(deleteAuditLog)
      expect(result.action).toBe('DELETE')
      expect(result.newValues).toBeNull()
    })

    it('should handle audit log without user ID (system actions)', async () => {
      const systemAuditLog = {
        ...mockAuditLog,
        userId: null,
        action: 'SYSTEM_BACKUP',
        tableName: 'system',
        recordId: null,
        oldValues: null,
        newValues: {
          backup_file: 'backup_2025_09_02.sql',
          status: 'completed'
        }
      }
      prisma.auditLog.create.mockResolvedValue(systemAuditLog)

      const auditData = {
        userId: null,
        action: 'SYSTEM_BACKUP',
        tableName: 'system',
        recordId: null,
        oldValues: null,
        newValues: {
          backup_file: 'backup_2025_09_02.sql',
          status: 'completed'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'System Process'
      }

      const result = await prisma.auditLog.create({ data: auditData })

      expect(result).toEqual(systemAuditLog)
      expect(result.userId).toBeNull()
      expect(result.action).toBe('SYSTEM_BACKUP')
    })
  })

  describe('AuditLog Queries', () => {
    it('should find audit logs by user ID', async () => {
      const mockAuditLogs = [mockAuditLog]
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const result = await prisma.auditLog.findMany({
        where: { userId: '123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(mockAuditLogs)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: '123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find audit logs by table name', async () => {
      const mockAuditLogs = [mockAuditLog]
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const result = await prisma.auditLog.findMany({
        where: { tableName: 'users' }
      })

      expect(result).toEqual(mockAuditLogs)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tableName: 'users' }
      })
    })

    it('should find audit logs by action type', async () => {
      const mockAuditLogs = [mockAuditLog]
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const result = await prisma.auditLog.findMany({
        where: { action: 'CREATE' }
      })

      expect(result).toEqual(mockAuditLogs)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'CREATE' }
      })
    })

    it('should find audit logs within date range', async () => {
      const mockAuditLogs = [mockAuditLog]
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const startDate = new Date('2025-09-02T00:00:00Z')
      const endDate = new Date('2025-09-02T23:59:59Z')

      const result = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      expect(result).toEqual(mockAuditLogs)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    })

    it('should order audit logs by timestamp descending', async () => {
      const mockAuditLogs = [mockAuditLog]
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const result = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' }
      })

      expect(result).toEqual(mockAuditLogs)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { timestamp: 'desc' }
      })
    })
  })

  describe('AuditLog-User Relationships', () => {
    it('should include user data when queried', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@reliabilitymaldives.com',
        name: 'Test User',
        password_hash: '$2b$12$hashed',
        role: 'SALES',
        roleId: '456e7890-e89b-12d3-a456-426614174001',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const auditLogWithUser = { ...mockAuditLog, user: mockUser }
      prisma.auditLog.findMany.mockResolvedValue([auditLogWithUser])

      const result = await prisma.auditLog.findMany({
        include: { user: true }
      })

      expect(result[0]).toEqual(auditLogWithUser)
      expect(result[0].user).toBeDefined()
      expect(result[0].user?.email).toBe('user@reliabilitymaldives.com')
    })

    it('should handle audit logs with null user (system actions)', async () => {
      const systemAuditLog = { ...mockAuditLog, userId: null, user: null }
      prisma.auditLog.findMany.mockResolvedValue([systemAuditLog])

      const result = await prisma.auditLog.findMany({
        include: { user: true }
      })

      expect(result[0]).toEqual(systemAuditLog)
      expect(result[0].user).toBeNull()
    })
  })

  describe('AuditLog JSON Fields', () => {
    it('should handle complex JSON in oldValues and newValues', async () => {
      const complexAuditLog = {
        ...mockAuditLog,
        oldValues: {
          user: {
            profile: { name: 'Old Name', preferences: { theme: 'light' } },
            settings: { notifications: true }
          }
        },
        newValues: {
          user: {
            profile: { name: 'New Name', preferences: { theme: 'dark' } },
            settings: { notifications: false }
          }
        }
      }
      prisma.auditLog.create.mockResolvedValue(complexAuditLog)

      const auditData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'UPDATE',
        tableName: 'user_profiles',
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        oldValues: {
          user: {
            profile: { name: 'Old Name', preferences: { theme: 'light' } },
            settings: { notifications: true }
          }
        },
        newValues: {
          user: {
            profile: { name: 'New Name', preferences: { theme: 'dark' } },
            settings: { notifications: false }
          }
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      }

      const result = await prisma.auditLog.create({ data: auditData })

      expect(result).toEqual(complexAuditLog)
      expect(result.oldValues).toEqual(auditData.oldValues)
      expect(result.newValues).toEqual(auditData.newValues)
    })
  })
})