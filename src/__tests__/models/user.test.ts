import { PrismaClient, UserRole } from '@prisma/client'
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

describe('User Model', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@reliabilitymaldives.com',
    name: 'Test User',
    password_hash: '$2b$12$hashed_password',
    role: UserRole.SALES,
    roleId: '456e7890-e89b-12d3-a456-426614174001',
    isActive: true,
    createdAt: new Date('2025-09-02T10:00:00Z'),
    updatedAt: new Date('2025-09-02T10:00:00Z')
  }

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      prisma.user.create.mockResolvedValue(mockUser)

      const userData = {
        email: 'test@reliabilitymaldives.com',
        name: 'Test User',
        password_hash: '$2b$12$hashed_password',
        role: UserRole.SALES,
        roleId: '456e7890-e89b-12d3-a456-426614174001',
        isActive: true
      }

      const result = await prisma.user.create({ data: userData })

      expect(result).toEqual(mockUser)
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData })
    })

    it('should enforce email uniqueness', async () => {
      const duplicateEmailError = new Error('Unique constraint failed on the fields: (`email`)')
      prisma.user.create.mockRejectedValue(duplicateEmailError)

      const userData = {
        email: 'existing@reliabilitymaldives.com',
        name: 'Test User',
        password_hash: '$2b$12$hashed_password',
        role: UserRole.SALES,
        roleId: '456e7890-e89b-12d3-a456-426614174001',
        isActive: true
      }

      await expect(prisma.user.create({ data: userData })).rejects.toThrow('Unique constraint failed')
    })

    it('should require all mandatory fields', async () => {
      const validationError = new Error('Argument `name` is missing')
      prisma.user.create.mockRejectedValue(validationError)

      const incompleteData = {
        email: 'test@reliabilitymaldives.com',
        password_hash: '$2b$12$hashed_password',
        role: UserRole.SALES
      }

      await expect(prisma.user.create({ data: incompleteData as any })).rejects.toThrow('Argument `name` is missing')
    })
  })

  describe('User Queries', () => {
    it('should find user by email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await prisma.user.findUnique({
        where: { email: 'test@reliabilitymaldives.com' }
      })

      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@reliabilitymaldives.com' }
      })
    })

    it('should find user by id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await prisma.user.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find users by role', async () => {
      const mockUsers = [mockUser]
      prisma.user.findMany.mockResolvedValue(mockUsers)

      const result = await prisma.user.findMany({
        where: { role: UserRole.SALES }
      })

      expect(result).toEqual(mockUsers)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.SALES }
      })
    })
  })

  describe('User Updates', () => {
    it('should update user data', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' }
      prisma.user.update.mockResolvedValue(updatedUser)

      const result = await prisma.user.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { name: 'Updated Name' }
      })

      expect(result).toEqual(updatedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { name: 'Updated Name' }
      })
    })

    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false }
      prisma.user.update.mockResolvedValue(deactivatedUser)

      const result = await prisma.user.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { isActive: false }
      })

      expect(result).toEqual(deactivatedUser)
      expect(result.isActive).toBe(false)
    })
  })

  describe('User-Role Relationships', () => {
    it('should include role data when queried with include', async () => {
      const mockRole = {
        id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'SALES',
        description: 'Sales team',
        permissions: { sales: ['read', 'create'] },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const userWithRole = { ...mockUser, roleRef: mockRole }
      prisma.user.findUnique.mockResolvedValue(userWithRole)

      const result = await prisma.user.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        include: { roleRef: true }
      })

      expect(result).toEqual(userWithRole)
      expect(result?.roleRef).toBeDefined()
      expect(result?.roleRef?.name).toBe('SALES')
    })
  })
})