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

describe('Role Model', () => {
  const mockRole = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'ADMIN',
    description: 'Administrator with full system access',
    permissions: {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      audit: ['read'],
      system: ['configure', 'backup', 'restore']
    },
    createdAt: new Date('2025-09-02T10:00:00Z'),
    updatedAt: new Date('2025-09-02T10:00:00Z')
  }

  describe('Role Creation', () => {
    it('should create a role with valid data', async () => {
      prisma.role.create.mockResolvedValue(mockRole)

      const roleData = {
        name: 'ADMIN',
        description: 'Administrator with full system access',
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          roles: ['create', 'read', 'update', 'delete'],
          audit: ['read'],
          system: ['configure', 'backup', 'restore']
        }
      }

      const result = await prisma.role.create({ data: roleData })

      expect(result).toEqual(mockRole)
      expect(prisma.role.create).toHaveBeenCalledWith({ data: roleData })
    })

    it('should enforce name uniqueness', async () => {
      const duplicateNameError = new Error('Unique constraint failed on the fields: (`name`)')
      prisma.role.create.mockRejectedValue(duplicateNameError)

      const roleData = {
        name: 'ADMIN',
        description: 'Duplicate admin role'
      }

      await expect(prisma.role.create({ data: roleData })).rejects.toThrow('Unique constraint failed')
    })

    it('should handle JSON permissions field', async () => {
      const roleWithComplexPermissions = {
        ...mockRole,
        permissions: {
          module1: {
            submodule1: ['read', 'write'],
            submodule2: ['read']
          },
          module2: ['admin']
        }
      }
      prisma.role.create.mockResolvedValue(roleWithComplexPermissions)

      const roleData = {
        name: 'COMPLEX_ROLE',
        description: 'Role with complex permissions',
        permissions: {
          module1: {
            submodule1: ['read', 'write'],
            submodule2: ['read']
          },
          module2: ['admin']
        }
      }

      const result = await prisma.role.create({ data: roleData })

      expect(result.permissions).toEqual(roleData.permissions)
    })
  })

  describe('Role Queries', () => {
    it('should find role by name', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole)

      const result = await prisma.role.findUnique({
        where: { name: 'ADMIN' }
      })

      expect(result).toEqual(mockRole)
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'ADMIN' }
      })
    })

    it('should find role by id', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole)

      const result = await prisma.role.findUnique({
        where: { id: '456e7890-e89b-12d3-a456-426614174001' }
      })

      expect(result).toEqual(mockRole)
    })

    it('should find all roles', async () => {
      const mockRoles = [mockRole]
      prisma.role.findMany.mockResolvedValue(mockRoles)

      const result = await prisma.role.findMany()

      expect(result).toEqual(mockRoles)
      expect(prisma.role.findMany).toHaveBeenCalled()
    })
  })

  describe('Role Updates', () => {
    it('should update role permissions', async () => {
      const updatedPermissions = {
        users: ['read', 'update'],
        reports: ['read']
      }
      const updatedRole = { ...mockRole, permissions: updatedPermissions }
      prisma.role.update.mockResolvedValue(updatedRole)

      const result = await prisma.role.update({
        where: { id: '456e7890-e89b-12d3-a456-426614174001' },
        data: { permissions: updatedPermissions }
      })

      expect(result).toEqual(updatedRole)
      expect(result.permissions).toEqual(updatedPermissions)
    })

    it('should update role description', async () => {
      const updatedRole = { ...mockRole, description: 'Updated description' }
      prisma.role.update.mockResolvedValue(updatedRole)

      const result = await prisma.role.update({
        where: { id: '456e7890-e89b-12d3-a456-426614174001' },
        data: { description: 'Updated description' }
      })

      expect(result).toEqual(updatedRole)
      expect(result.description).toBe('Updated description')
    })
  })

  describe('Role-User Relationships', () => {
    it('should include associated users when queried', async () => {
      const mockUsers = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@reliabilitymaldives.com',
        name: 'Admin User',
        password_hash: '$2b$12$hashed',
        role: 'ADMIN',
        roleId: '456e7890-e89b-12d3-a456-426614174001',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]

      const roleWithUsers = { ...mockRole, users: mockUsers }
      prisma.role.findUnique.mockResolvedValue(roleWithUsers)

      const result = await prisma.role.findUnique({
        where: { id: '456e7890-e89b-12d3-a456-426614174001' },
        include: { users: true }
      })

      expect(result).toEqual(roleWithUsers)
      expect(result?.users).toBeDefined()
      expect(result?.users).toHaveLength(1)
    })
  })

  describe('Role Upsert Operations', () => {
    it('should upsert role (create when not exists)', async () => {
      prisma.role.upsert.mockResolvedValue(mockRole)

      const roleData = {
        name: 'ADMIN',
        description: 'Administrator with full system access',
        permissions: {
          users: ['create', 'read', 'update', 'delete']
        }
      }

      const result = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: roleData,
        create: roleData
      })

      expect(result).toEqual(mockRole)
      expect(prisma.role.upsert).toHaveBeenCalledWith({
        where: { name: 'ADMIN' },
        update: roleData,
        create: roleData
      })
    })

    it('should upsert role (update when exists)', async () => {
      const updatedRole = { 
        ...mockRole, 
        description: 'Updated administrator role'
      }
      prisma.role.upsert.mockResolvedValue(updatedRole)

      const roleData = {
        name: 'ADMIN',
        description: 'Updated administrator role',
        permissions: mockRole.permissions
      }

      const result = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: roleData,
        create: roleData
      })

      expect(result).toEqual(updatedRole)
      expect(result.description).toBe('Updated administrator role')
    })
  })
})