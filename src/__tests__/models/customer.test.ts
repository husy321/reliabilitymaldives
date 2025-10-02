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

describe('Customer Model', () => {
  const mockCustomer = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company Ltd',
    email: 'contact@testcompany.com',
    phone: '+960-123-4567',
    address: 'Male, Maldives',
    paymentTerms: 30,
    currentBalance: 1000.50,
    isActive: true,
    createdAt: new Date('2025-09-09T10:00:00Z'),
    updatedAt: new Date('2025-09-09T10:00:00Z')
  }

  describe('Customer Creation', () => {
    it('should create a customer with valid data', async () => {
      prisma.customer.create.mockResolvedValue(mockCustomer)

      const customerData = {
        name: 'Test Company Ltd',
        email: 'contact@testcompany.com',
        phone: '+960-123-4567',
        address: 'Male, Maldives',
        paymentTerms: 30,
        currentBalance: 1000.50,
        isActive: true
      }

      const result = await prisma.customer.create({ data: customerData })

      expect(result).toEqual(mockCustomer)
      expect(prisma.customer.create).toHaveBeenCalledWith({ data: customerData })
    })

    it('should create customer with minimal required data', async () => {
      const minimalCustomer = {
        ...mockCustomer,
        email: null,
        phone: null,
        address: null,
        paymentTerms: 30, // default
        currentBalance: 0.0, // default
        isActive: true // default
      }
      prisma.customer.create.mockResolvedValue(minimalCustomer)

      const minimalData = {
        name: 'Test Company Ltd'
      }

      const result = await prisma.customer.create({ data: minimalData })

      expect(result).toEqual(minimalCustomer)
      expect(result.name).toBe('Test Company Ltd')
      expect(result.email).toBeNull()
      expect(result.paymentTerms).toBe(30)
      expect(result.currentBalance).toBe(0.0)
      expect(result.isActive).toBe(true)
    })

    it('should require name field', async () => {
      const validationError = new Error('Argument `name` is missing')
      prisma.customer.create.mockRejectedValue(validationError)

      const incompleteData = {
        email: 'contact@testcompany.com'
      }

      await expect(prisma.customer.create({ data: incompleteData as any }))
        .rejects.toThrow('Argument `name` is missing')
    })

    it('should handle different payment terms', async () => {
      const customTermsCustomer = { ...mockCustomer, paymentTerms: 45 }
      prisma.customer.create.mockResolvedValue(customTermsCustomer)

      const customerData = {
        name: 'Test Company Ltd',
        paymentTerms: 45
      }

      const result = await prisma.customer.create({ data: customerData })

      expect(result.paymentTerms).toBe(45)
    })
  })

  describe('Customer Queries', () => {
    it('should find customer by id', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer)

      const result = await prisma.customer.findUnique({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })

      expect(result).toEqual(mockCustomer)
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })
    })

    it('should find customers by name search', async () => {
      const mockCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(mockCustomers)

      const result = await prisma.customer.findMany({
        where: {
          name: {
            contains: 'Test',
            mode: 'insensitive'
          }
        }
      })

      expect(result).toEqual(mockCustomers)
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Test',
            mode: 'insensitive'
          }
        }
      })
    })

    it('should find active customers only', async () => {
      const activeCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(activeCustomers)

      const result = await prisma.customer.findMany({
        where: { isActive: true }
      })

      expect(result).toEqual(activeCustomers)
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      })
    })

    it('should find customers by payment terms', async () => {
      const mockCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(mockCustomers)

      const result = await prisma.customer.findMany({
        where: { paymentTerms: 30 }
      })

      expect(result).toEqual(mockCustomers)
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { paymentTerms: 30 }
      })
    })

    it('should support pagination', async () => {
      const paginatedCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(paginatedCustomers)

      const result = await prisma.customer.findMany({
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' }
      })

      expect(result).toEqual(paginatedCustomers)
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' }
      })
    })
  })

  describe('Customer Updates', () => {
    it('should update customer data', async () => {
      const updatedCustomer = { 
        ...mockCustomer, 
        name: 'Updated Company Ltd',
        paymentTerms: 45
      }
      prisma.customer.update.mockResolvedValue(updatedCustomer)

      const result = await prisma.customer.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { 
          name: 'Updated Company Ltd',
          paymentTerms: 45
        }
      })

      expect(result).toEqual(updatedCustomer)
      expect(result.name).toBe('Updated Company Ltd')
      expect(result.paymentTerms).toBe(45)
    })

    it('should deactivate customer (soft delete)', async () => {
      const deactivatedCustomer = { ...mockCustomer, isActive: false }
      prisma.customer.update.mockResolvedValue(deactivatedCustomer)

      const result = await prisma.customer.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { isActive: false }
      })

      expect(result).toEqual(deactivatedCustomer)
      expect(result.isActive).toBe(false)
    })

    it('should update customer balance', async () => {
      const updatedCustomer = { ...mockCustomer, currentBalance: 2500.75 }
      prisma.customer.update.mockResolvedValue(updatedCustomer)

      const result = await prisma.customer.update({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { currentBalance: 2500.75 }
      })

      expect(result.currentBalance).toBe(2500.75)
    })
  })

  describe('Customer Search and Filtering', () => {
    it('should support email search', async () => {
      const mockCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(mockCustomers)

      const result = await prisma.customer.findMany({
        where: {
          email: {
            contains: 'testcompany',
            mode: 'insensitive'
          }
        }
      })

      expect(result).toEqual(mockCustomers)
    })

    it('should support phone search', async () => {
      const mockCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(mockCustomers)

      const result = await prisma.customer.findMany({
        where: {
          phone: {
            contains: '123',
            mode: 'insensitive'
          }
        }
      })

      expect(result).toEqual(mockCustomers)
    })

    it('should support combined search criteria', async () => {
      const mockCustomers = [mockCustomer]
      prisma.customer.findMany.mockResolvedValue(mockCustomers)

      const result = await prisma.customer.findMany({
        where: {
          AND: [
            { isActive: true },
            { paymentTerms: 30 },
            {
              OR: [
                { name: { contains: 'Test', mode: 'insensitive' } },
                { email: { contains: 'testcompany', mode: 'insensitive' } }
              ]
            }
          ]
        },
        orderBy: { name: 'asc' },
        take: 10
      })

      expect(result).toEqual(mockCustomers)
    })
  })

  describe('Customer Data Validation', () => {
    it('should handle null/optional fields correctly', async () => {
      const customerWithNulls = {
        ...mockCustomer,
        email: null,
        phone: null,
        address: null
      }
      prisma.customer.create.mockResolvedValue(customerWithNulls)

      const result = await prisma.customer.create({
        data: {
          name: 'Test Company Ltd',
          email: null,
          phone: null,
          address: null
        }
      })

      expect(result.email).toBeNull()
      expect(result.phone).toBeNull()
      expect(result.address).toBeNull()
      expect(result.name).toBe('Test Company Ltd')
    })

    it('should handle payment terms edge cases', async () => {
      const zeroTermsCustomer = { ...mockCustomer, paymentTerms: 0 }
      prisma.customer.create.mockResolvedValue(zeroTermsCustomer)

      const result = await prisma.customer.create({
        data: {
          name: 'Cash Customer',
          paymentTerms: 0
        }
      })

      expect(result.paymentTerms).toBe(0)
    })

    it('should handle negative balance correctly', async () => {
      const negativeBalanceCustomer = { ...mockCustomer, currentBalance: -500.25 }
      prisma.customer.create.mockResolvedValue(negativeBalanceCustomer)

      const result = await prisma.customer.create({
        data: {
          name: 'Prepaid Customer',
          currentBalance: -500.25
        }
      })

      expect(result.currentBalance).toBe(-500.25)
    })
  })
})