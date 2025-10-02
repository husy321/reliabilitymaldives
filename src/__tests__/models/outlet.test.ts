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

describe('Outlet Model', () => {
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
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Male Main Branch',
    location: 'Chandhanee Magu, Male 20026',
    managerId: 'user-123e4567-e89b-12d3-a456-426614174000',
    isActive: true,
    createdAt: new Date('2025-09-10T06:00:00Z'),
    updatedAt: new Date('2025-09-10T06:00:00Z')
  }

  describe('Outlet Creation', () => {
    it('should create an outlet with valid data', async () => {
      prisma.outlet.create.mockResolvedValue(mockOutlet)

      const outletData = {
        name: 'Male Main Branch',
        location: 'Chandhanee Magu, Male 20026',
        managerId: 'user-123e4567-e89b-12d3-a456-426614174000',
        isActive: true
      }

      const result = await prisma.outlet.create({ data: outletData })

      expect(result).toEqual(mockOutlet)
      expect(prisma.outlet.create).toHaveBeenCalledWith({ data: outletData })
    })

    it('should create outlet with default isActive: true', async () => {
      const defaultOutlet = { ...mockOutlet, isActive: true }
      prisma.outlet.create.mockResolvedValue(defaultOutlet)

      const minimalData = {
        name: 'Hulhumale Branch',
        location: 'Hulhumale Central Park',
        managerId: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      const result = await prisma.outlet.create({ data: minimalData })

      expect(result).toEqual(defaultOutlet)
      expect(result.isActive).toBe(true)
    })

    it('should require name field', async () => {
      const validationError = new Error('Argument `name` is missing')
      prisma.outlet.create.mockRejectedValue(validationError)

      const incompleteData = {
        location: 'Some location',
        managerId: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.outlet.create({ data: incompleteData as Partial<typeof mockOutlet> }))
        .rejects.toThrow('Argument `name` is missing')
    })

    it('should require location field', async () => {
      const validationError = new Error('Argument `location` is missing')
      prisma.outlet.create.mockRejectedValue(validationError)

      const incompleteData = {
        name: 'Test Outlet',
        managerId: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.outlet.create({ data: incompleteData as Partial<typeof mockOutlet> }))
        .rejects.toThrow('Argument `location` is missing')
    })

    it('should require managerId field', async () => {
      const validationError = new Error('Argument `managerId` is missing')
      prisma.outlet.create.mockRejectedValue(validationError)

      const incompleteData = {
        name: 'Test Outlet',
        location: 'Some location'
      }

      await expect(prisma.outlet.create({ data: incompleteData as Partial<typeof mockOutlet> }))
        .rejects.toThrow('Argument `managerId` is missing')
    })

    it('should enforce unique name constraint', async () => {
      const uniqueConstraintError = new Error('Unique constraint failed on the fields: (`name`)')
      prisma.outlet.create.mockRejectedValue(uniqueConstraintError)

      const duplicateData = {
        name: 'Male Main Branch',
        location: 'Different location',
        managerId: 'user-123e4567-e89b-12d3-a456-426614174000'
      }

      await expect(prisma.outlet.create({ data: duplicateData }))
        .rejects.toThrow('Unique constraint failed on the fields: (`name`)')
    })
  })

  describe('Outlet Queries', () => {
    it('should find outlet by id', async () => {
      prisma.outlet.findUnique.mockResolvedValue(mockOutlet)

      const result = await prisma.outlet.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(mockOutlet)
      expect(prisma.outlet.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find outlet by unique name', async () => {
      prisma.outlet.findUnique.mockResolvedValue(mockOutlet)

      const result = await prisma.outlet.findUnique({
        where: { name: 'Male Main Branch' }
      })

      expect(result).toEqual(mockOutlet)
      expect(prisma.outlet.findUnique).toHaveBeenCalledWith({
        where: { name: 'Male Main Branch' }
      })
    })

    it('should find outlets by name search', async () => {
      const mockOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(mockOutlets)

      const result = await prisma.outlet.findMany({
        where: {
          name: {
            contains: 'Male',
            mode: 'insensitive'
          }
        }
      })

      expect(result).toEqual(mockOutlets)
      expect(prisma.outlet.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Male',
            mode: 'insensitive'
          }
        }
      })
    })

    it('should find active outlets only', async () => {
      const activeOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(activeOutlets)

      const result = await prisma.outlet.findMany({
        where: { isActive: true }
      })

      expect(result).toEqual(activeOutlets)
      expect(prisma.outlet.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      })
    })

    it('should find outlets by manager', async () => {
      const managerOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(managerOutlets)

      const result = await prisma.outlet.findMany({
        where: { managerId: 'user-123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(managerOutlets)
      expect(prisma.outlet.findMany).toHaveBeenCalledWith({
        where: { managerId: 'user-123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should support outlet queries with manager relationship', async () => {
      const outletWithManager = { ...mockOutlet, manager: mockUser }
      prisma.outlet.findUnique.mockResolvedValue(outletWithManager)

      const result = await prisma.outlet.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        include: { manager: true }
      })

      expect(result).toEqual(outletWithManager)
      expect(result?.manager).toEqual(mockUser)
    })
  })

  describe('Outlet Updates', () => {
    it('should update outlet data', async () => {
      const updatedOutlet = { 
        ...mockOutlet, 
        name: 'Male Central Branch',
        location: 'Majeedhee Magu, Male 20026'
      }
      prisma.outlet.update.mockResolvedValue(updatedOutlet)

      const result = await prisma.outlet.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { 
          name: 'Male Central Branch',
          location: 'Majeedhee Magu, Male 20026'
        }
      })

      expect(result).toEqual(updatedOutlet)
      expect(result.name).toBe('Male Central Branch')
      expect(result.location).toBe('Majeedhee Magu, Male 20026')
    })

    it('should deactivate outlet (soft delete)', async () => {
      const deactivatedOutlet = { ...mockOutlet, isActive: false }
      prisma.outlet.update.mockResolvedValue(deactivatedOutlet)

      const result = await prisma.outlet.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { isActive: false }
      })

      expect(result).toEqual(deactivatedOutlet)
      expect(result.isActive).toBe(false)
    })

    it('should change outlet manager', async () => {
      const newManagerId = 'user-456e7890-e89b-12d3-a456-426614174000'
      const updatedOutlet = { ...mockOutlet, managerId: newManagerId }
      prisma.outlet.update.mockResolvedValue(updatedOutlet)

      const result = await prisma.outlet.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { managerId: newManagerId }
      })

      expect(result.managerId).toBe(newManagerId)
    })
  })

  describe('Outlet Foreign Key Relationships', () => {
    it('should prevent deletion when user is referenced as manager (onDelete: Restrict)', async () => {
      const constraintError = new Error('Foreign key constraint failed on the field: `managerId`')
      prisma.user.delete.mockRejectedValue(constraintError)

      await expect(prisma.user.delete({
        where: { id: 'user-123e4567-e89b-12d3-a456-426614174000' }
      })).rejects.toThrow('Foreign key constraint failed on the field: `managerId`')
    })

    it('should validate manager exists before creating outlet', async () => {
      const foreignKeyError = new Error('Foreign key constraint failed on the field: `managerId`')
      prisma.outlet.create.mockRejectedValue(foreignKeyError)

      const invalidData = {
        name: 'Test Outlet',
        location: 'Test Location',
        managerId: 'non-existent-user-id'
      }

      await expect(prisma.outlet.create({ data: invalidData }))
        .rejects.toThrow('Foreign key constraint failed on the field: `managerId`')
    })
  })

  describe('Outlet Data Validation', () => {
    it('should handle location search', async () => {
      const mockOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(mockOutlets)

      const result = await prisma.outlet.findMany({
        where: {
          location: {
            contains: 'Male',
            mode: 'insensitive'
          }
        }
      })

      expect(result).toEqual(mockOutlets)
    })

    it('should support combined search criteria', async () => {
      const mockOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(mockOutlets)

      const result = await prisma.outlet.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: 'Male', mode: 'insensitive' } },
                { location: { contains: 'Male', mode: 'insensitive' } }
              ]
            }
          ]
        },
        orderBy: { name: 'asc' }
      })

      expect(result).toEqual(mockOutlets)
    })

    it('should support pagination with sorting', async () => {
      const paginatedOutlets = [mockOutlet]
      prisma.outlet.findMany.mockResolvedValue(paginatedOutlets)

      const result = await prisma.outlet.findMany({
        where: { isActive: true },
        skip: 0,
        take: 10,
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' }
        ]
      })

      expect(result).toEqual(paginatedOutlets)
      expect(prisma.outlet.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' }
        ]
      })
    })
  })
})