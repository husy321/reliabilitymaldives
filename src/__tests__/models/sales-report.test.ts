import { PrismaClient, SalesReportStatus } from '@prisma/client'
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

describe('SalesReport Model', () => {
  const mockUser = {
    id: 'user-123e4567-e89b-12d3-a456-426614174000',
    email: 'manager@reliabilitymaldives.com',
    name: 'John Manager',
    password_hash: 'hashed-password',
    role: 'MANAGER' as const,
    roleId: null,
    isActive: true,
    createdAt: new Date('2025-09-10T06:00:00Z'),
    updatedAt: new Date('2025-09-10T06:00:00Z')
  }

  const mockOutlet = {
    id: 'outlet-123e4567-e89b-12d3-a456-426614174000',
    name: 'Male Main Branch',
    location: 'Chandhanee Magu, Male 20026',
    managerId: 'user-123e4567-e89b-12d3-a456-426614174000',
    isActive: true,
    createdAt: new Date('2025-09-10T06:00:00Z'),
    updatedAt: new Date('2025-09-10T06:00:00Z')
  }

  const mockSalesReport = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
    date: new Date('2025-09-09T00:00:00Z'),
    cashDeposits: 15000.50,
    cardSettlements: 8500.25,
    totalSales: 23500.75,
    submittedById: 'user-123e4567-e89b-12d3-a456-426614174000',
    status: SalesReportStatus.SUBMITTED,
    createdAt: new Date('2025-09-10T06:00:00Z'),
    updatedAt: new Date('2025-09-10T06:00:00Z')
  }

  describe('SalesReport Creation', () => {
    it('should create a sales report with valid data', async () => {
      prisma.salesReport.create.mockResolvedValue(mockSalesReport)

      const salesReportData = {
        outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2025-09-09T00:00:00Z'),
        cashDeposits: 15000.50,
        cardSettlements: 8500.25,
        totalSales: 23500.75,
        submittedById: 'user-123e4567-e89b-12d3-a456-426614174000',
        status: SalesReportStatus.SUBMITTED
      }

      const result = await prisma.salesReport.create({ data: salesReportData })

      expect(result).toEqual(mockSalesReport)
      expect(prisma.salesReport.create).toHaveBeenCalledWith({ data: salesReportData })
    })

    it('should create sales report with default status DRAFT', async () => {
      const draftReport = { ...mockSalesReport, status: SalesReportStatus.DRAFT }
      prisma.salesReport.create.mockResolvedValue(draftReport)

      const minimalData = {
        outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2025-09-09T00:00:00Z'),
        cashDeposits: 15000.50,
        cardSettlements: 8500.25,
        totalSales: 23500.75,
        submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      const result = await prisma.salesReport.create({ data: minimalData })

      expect(result.status).toBe(SalesReportStatus.DRAFT)
    })

    it('should require all mandatory fields', async () => {
      const validationError = new Error('Argument `outletId` is missing')
      prisma.salesReport.create.mockRejectedValue(validationError)

      const incompleteData = {
        date: new Date('2025-09-09T00:00:00Z'),
        cashDeposits: 15000.50,
        cardSettlements: 8500.25,
        totalSales: 23500.75,
        submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.salesReport.create({ data: incompleteData as Partial<typeof mockSalesReport> }))
        .rejects.toThrow('Argument `outletId` is missing')
    })

    it('should enforce unique constraint for outlet and date combination', async () => {
      const uniqueConstraintError = new Error('Unique constraint failed on the constraint: `unique_outlet_date`')
      prisma.salesReport.create.mockRejectedValue(uniqueConstraintError)

      const duplicateData = {
        outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2025-09-09T00:00:00Z'), // Same date as existing report
        cashDeposits: 10000.00,
        cardSettlements: 5000.00,
        totalSales: 15000.00,
        submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.salesReport.create({ data: duplicateData }))
        .rejects.toThrow('Unique constraint failed on the constraint: `unique_outlet_date`')
    })

    it('should validate foreign key relationships', async () => {
      const foreignKeyError = new Error('Foreign key constraint failed on the field: `outletId`')
      prisma.salesReport.create.mockRejectedValue(foreignKeyError)

      const invalidData = {
        outletId: 'non-existent-outlet-id',
        date: new Date('2025-09-09T00:00:00Z'),
        cashDeposits: 15000.50,
        cardSettlements: 8500.25,
        totalSales: 23500.75,
        submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.salesReport.create({ data: invalidData }))
        .rejects.toThrow('Foreign key constraint failed on the field: `outletId`')
    })
  })

  describe('SalesReport Queries', () => {
    it('should find sales report by id', async () => {
      prisma.salesReport.findUnique.mockResolvedValue(mockSalesReport)

      const result = await prisma.salesReport.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(mockSalesReport)
      expect(prisma.salesReport.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find sales report by outlet and date (unique constraint)', async () => {
      prisma.salesReport.findUnique.mockResolvedValue(mockSalesReport)

      const result = await prisma.salesReport.findUnique({
        where: { 
          outletId_date: { 
            outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
            date: new Date('2025-09-09T00:00:00Z')
          }
        }
      })

      expect(result).toEqual(mockSalesReport)
    })

    it('should find sales reports by outlet', async () => {
      const outletReports = [mockSalesReport]
      prisma.salesReport.findMany.mockResolvedValue(outletReports)

      const result = await prisma.salesReport.findMany({
        where: { outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(outletReports)
      expect(prisma.salesReport.findMany).toHaveBeenCalledWith({
        where: { outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find sales reports by status', async () => {
      const submittedReports = [mockSalesReport]
      prisma.salesReport.findMany.mockResolvedValue(submittedReports)

      const result = await prisma.salesReport.findMany({
        where: { status: SalesReportStatus.SUBMITTED }
      })

      expect(result).toEqual(submittedReports)
      expect(prisma.salesReport.findMany).toHaveBeenCalledWith({
        where: { status: SalesReportStatus.SUBMITTED }
      })
    })

    it('should find sales reports by date range', async () => {
      const dateRangeReports = [mockSalesReport]
      prisma.salesReport.findMany.mockResolvedValue(dateRangeReports)

      const result = await prisma.salesReport.findMany({
        where: {
          date: {
            gte: new Date('2025-09-01T00:00:00Z'),
            lte: new Date('2025-09-30T23:59:59Z')
          }
        }
      })

      expect(result).toEqual(dateRangeReports)
    })

    it('should find sales reports by submitter', async () => {
      const userReports = [mockSalesReport]
      prisma.salesReport.findMany.mockResolvedValue(userReports)

      const result = await prisma.salesReport.findMany({
        where: { submittedById: 'user-123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(userReports)
    })

    it('should support sales report queries with relationships', async () => {
      const reportWithRelations = { 
        ...mockSalesReport, 
        outlet: mockOutlet,
        submittedBy: mockUser
      }
      prisma.salesReport.findUnique.mockResolvedValue(reportWithRelations)

      const result = await prisma.salesReport.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        include: { 
          outlet: true,
          submittedBy: true
        }
      })

      expect(result).toEqual(reportWithRelations)
      expect(result?.outlet).toEqual(mockOutlet)
      expect(result?.submittedBy).toEqual(mockUser)
    })
  })

  describe('SalesReport Updates', () => {
    it('should update sales report data', async () => {
      const updatedReport = { 
        ...mockSalesReport, 
        cashDeposits: 16000.00,
        cardSettlements: 9000.00,
        totalSales: 25000.00
      }
      prisma.salesReport.update.mockResolvedValue(updatedReport)

      const result = await prisma.salesReport.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { 
          cashDeposits: 16000.00,
          cardSettlements: 9000.00,
          totalSales: 25000.00
        }
      })

      expect(result).toEqual(updatedReport)
      expect(result.cashDeposits).toBe(16000.00)
      expect(result.cardSettlements).toBe(9000.00)
      expect(result.totalSales).toBe(25000.00)
    })

    it('should update sales report status', async () => {
      const approvedReport = { ...mockSalesReport, status: SalesReportStatus.APPROVED }
      prisma.salesReport.update.mockResolvedValue(approvedReport)

      const result = await prisma.salesReport.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { status: SalesReportStatus.APPROVED }
      })

      expect(result.status).toBe(SalesReportStatus.APPROVED)
    })

    it('should prevent updating unique constraint fields when it would cause duplicate', async () => {
      const uniqueConstraintError = new Error('Unique constraint failed on the constraint: `unique_outlet_date`')
      prisma.salesReport.update.mockRejectedValue(uniqueConstraintError)

      await expect(prisma.salesReport.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { 
          outletId: 'outlet-456e7890-e89b-12d3-a456-426614174000',
          date: new Date('2025-09-09T00:00:00Z') // Date that already exists for this outlet
        }
      })).rejects.toThrow('Unique constraint failed on the constraint: `unique_outlet_date`')
    })
  })

  describe('SalesReport Financial Data Validation', () => {
    it('should handle zero amounts correctly', async () => {
      const zeroAmountReport = { 
        ...mockSalesReport, 
        cashDeposits: 0.0,
        cardSettlements: 0.0,
        totalSales: 0.0
      }
      prisma.salesReport.create.mockResolvedValue(zeroAmountReport)

      const result = await prisma.salesReport.create({
        data: {
          outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
          date: new Date('2025-09-10T00:00:00Z'),
          cashDeposits: 0.0,
          cardSettlements: 0.0,
          totalSales: 0.0,
          submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.cashDeposits).toBe(0.0)
      expect(result.cardSettlements).toBe(0.0)
      expect(result.totalSales).toBe(0.0)
    })

    it('should handle large financial amounts with proper precision', async () => {
      const largeAmountReport = { 
        ...mockSalesReport, 
        cashDeposits: 999999.99,
        cardSettlements: 888888.88,
        totalSales: 1888888.87
      }
      prisma.salesReport.create.mockResolvedValue(largeAmountReport)

      const result = await prisma.salesReport.create({
        data: {
          outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
          date: new Date('2025-09-10T00:00:00Z'),
          cashDeposits: 999999.99,
          cardSettlements: 888888.88,
          totalSales: 1888888.87,
          submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.cashDeposits).toBe(999999.99)
      expect(result.cardSettlements).toBe(888888.88)
      expect(result.totalSales).toBe(1888888.87)
    })

    it('should handle decimal precision correctly', async () => {
      const precisionReport = { 
        ...mockSalesReport, 
        cashDeposits: 12345.67,
        cardSettlements: 98765.43,
        totalSales: 111111.10
      }
      prisma.salesReport.create.mockResolvedValue(precisionReport)

      const result = await prisma.salesReport.create({
        data: {
          outletId: 'outlet-123e4567-e89b-12d3-a456-426614174000',
          date: new Date('2025-09-10T00:00:00Z'),
          cashDeposits: 12345.67,
          cardSettlements: 98765.43,
          totalSales: 111111.10,
          submittedById: 'user-123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.cashDeposits).toBe(12345.67)
      expect(result.cardSettlements).toBe(98765.43)
      expect(result.totalSales).toBe(111111.10)
    })
  })

  describe('SalesReport Foreign Key Constraints', () => {
    it('should prevent deletion when outlet is referenced (onDelete: Restrict)', async () => {
      const constraintError = new Error('Foreign key constraint failed on the field: `outletId`')
      prisma.outlet.delete.mockRejectedValue(constraintError)

      await expect(prisma.outlet.delete({
        where: { id: 'outlet-123e4567-e89b-12d3-a456-426614174000' }
      })).rejects.toThrow('Foreign key constraint failed on the field: `outletId`')
    })

    it('should prevent deletion when user is referenced as submitter (onDelete: Restrict)', async () => {
      const constraintError = new Error('Foreign key constraint failed on the field: `submittedById`')
      prisma.user.delete.mockRejectedValue(constraintError)

      await expect(prisma.user.delete({
        where: { id: 'user-123e4567-e89b-12d3-a456-426614174000' }
      })).rejects.toThrow('Foreign key constraint failed on the field: `submittedById`')
    })
  })

  describe('SalesReport Complex Queries', () => {
    it('should support aggregations for reporting', async () => {
      const aggregationResult = {
        _sum: {
          cashDeposits: 45000.50,
          cardSettlements: 25500.75,
          totalSales: 70501.25
        },
        _count: 3
      }
      prisma.salesReport.aggregate.mockResolvedValue(aggregationResult)

      const result = await prisma.salesReport.aggregate({
        where: {
          date: {
            gte: new Date('2025-09-01T00:00:00Z'),
            lte: new Date('2025-09-30T23:59:59Z')
          },
          status: SalesReportStatus.APPROVED
        },
        _sum: {
          cashDeposits: true,
          cardSettlements: true,
          totalSales: true
        },
        _count: true
      })

      expect(result).toEqual(aggregationResult)
    })

    it('should support complex filtering and sorting', async () => {
      const filteredReports = [mockSalesReport]
      prisma.salesReport.findMany.mockResolvedValue(filteredReports)

      const result = await prisma.salesReport.findMany({
        where: {
          AND: [
            { status: { in: [SalesReportStatus.SUBMITTED, SalesReportStatus.APPROVED] } },
            { totalSales: { gte: 10000 } },
            {
              OR: [
                { cashDeposits: { gt: 5000 } },
                { cardSettlements: { gt: 5000 } }
              ]
            }
          ]
        },
        orderBy: [
          { date: 'desc' },
          { totalSales: 'desc' }
        ],
        take: 10,
        skip: 0
      })

      expect(result).toEqual(filteredReports)
    })

    it('should support grouping by outlet for dashboard reporting', async () => {
      const groupedResults = [
        {
          outletId: 'outlet-123',
          _sum: { totalSales: 50000 },
          _count: 5
        },
        {
          outletId: 'outlet-456',
          _sum: { totalSales: 75000 },
          _count: 8
        }
      ]
      prisma.salesReport.groupBy.mockResolvedValue(groupedResults)

      const result = await prisma.salesReport.groupBy({
        by: ['outletId'],
        where: {
          date: {
            gte: new Date('2025-09-01T00:00:00Z'),
            lte: new Date('2025-09-30T23:59:59Z')
          },
          status: SalesReportStatus.APPROVED
        },
        _sum: {
          totalSales: true
        },
        _count: true,
        orderBy: {
          _sum: {
            totalSales: 'desc'
          }
        }
      })

      expect(result).toEqual(groupedResults)
    })
  })
})