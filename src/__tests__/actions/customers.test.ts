import { 
  createCustomerAction, 
  updateCustomerAction, 
  deleteCustomerAction, 
  getCustomersAction,
  getCustomerByIdAction,
  toggleCustomerActiveAction
} from '@/lib/actions/customers';
import { CustomerFormData } from '../../../types/customer';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn()
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    }
  }
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Customer Actions', () => {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should fail when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const customerData: CustomerFormData = {
        name: 'Test Company',
        email: 'test@company.com',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should fail when user lacks customer management permissions', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
      
      const customerData: CustomerFormData = {
        name: 'Test Company',
        email: 'test@company.com',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result).toEqual({
        success: false,
        error: 'Access denied. Customer management requires Accounts team permissions.'
      });
    });

    it('should allow access for ACCOUNTS role', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'accounts@example.com',
          role: UserRole.ACCOUNTS
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);
      
      const customerData: CustomerFormData = {
        name: 'Test Company Ltd',
        email: 'contact@testcompany.com',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result.success).toBe(true);
    });

    it('should allow access for ADMIN role', async () => {
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: UserRole.ADMIN
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);
      
      const customerData: CustomerFormData = {
        name: 'Test Company Ltd',
        email: 'contact@testcompany.com',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result.success).toBe(true);
    });
  });

  describe('createCustomerAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should create customer with valid data', async () => {
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);
      
      const customerData: CustomerFormData = {
        name: 'Test Company Ltd',
        email: 'contact@testcompany.com',
        phone: '+960-123-4567',
        address: 'Male, Maldives',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result).toEqual({
        success: true,
        data: mockCustomer
      });
      
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Company Ltd',
          email: 'contact@testcompany.com',
          phone: '+960-123-4567',
          address: 'Male, Maldives',
          paymentTerms: 30,
          isActive: true
        }
      });
    });

    it('should create customer with minimal data', async () => {
      const minimalCustomer = { ...mockCustomer, email: null, phone: null, address: null };
      mockPrisma.customer.create.mockResolvedValue(minimalCustomer);
      
      const customerData: CustomerFormData = {
        name: 'Minimal Company',
        paymentTerms: 15,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result.success).toBe(true);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'Minimal Company',
          email: null,
          phone: null,
          address: null,
          paymentTerms: 15,
          isActive: true
        }
      });
    });

    it('should fail validation with invalid data', async () => {
      const invalidData: any = {
        name: '', // Empty name should fail
        email: 'invalid-email',
        paymentTerms: -5, // Negative payment terms should fail
        isActive: true
      };

      const result = await createCustomerAction(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should handle database errors', async () => {
      mockPrisma.customer.create.mockRejectedValue(new Error('Database connection failed'));
      
      const customerData: CustomerFormData = {
        name: 'Test Company',
        paymentTerms: 30,
        isActive: true
      };

      const result = await createCustomerAction(customerData);

      expect(result).toEqual({
        success: false,
        error: 'Failed to create customer. Please try again.'
      });
    });
  });

  describe('updateCustomerAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should update customer with valid data', async () => {
      const updatedCustomer = { ...mockCustomer, name: 'Updated Company Ltd' };
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue(updatedCustomer);
      
      const updateData: CustomerFormData = {
        name: 'Updated Company Ltd',
        email: 'contact@testcompany.com',
        paymentTerms: 30,
        isActive: true
      };

      const result = await updateCustomerAction('123e4567-e89b-12d3-a456-426614174000', updateData);

      expect(result).toEqual({
        success: true,
        data: updatedCustomer
      });
    });

    it('should fail when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      const updateData: CustomerFormData = {
        name: 'Updated Company',
        paymentTerms: 30,
        isActive: true
      };

      const result = await updateCustomerAction('non-existent-id', updateData);

      expect(result).toEqual({
        success: false,
        error: 'Customer not found'
      });
    });

    it('should fail with invalid customer ID', async () => {
      const updateData: CustomerFormData = {
        name: 'Updated Company',
        paymentTerms: 30,
        isActive: true
      };

      const result = await updateCustomerAction('', updateData);

      expect(result).toEqual({
        success: false,
        error: 'Valid customer ID is required'
      });
    });
  });

  describe('deleteCustomerAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should soft delete customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue({ ...mockCustomer, isActive: false });
      
      const result = await deleteCustomerAction('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual({
        success: true,
        data: { success: true }
      });

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { isActive: false }
      });
    });

    it('should fail when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      const result = await deleteCustomerAction('non-existent-id');

      expect(result).toEqual({
        success: false,
        error: 'Customer not found'
      });
    });
  });

  describe('getCustomersAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should get customers with pagination', async () => {
      const mockCustomers = [mockCustomer];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(1);
      
      const params = {
        page: 1,
        pageSize: 10,
        userRole: UserRole.ACCOUNTS
      };

      const result = await getCustomersAction(params);

      expect(result).toEqual({
        success: true,
        data: {
          customers: mockCustomers,
          totalCount: 1,
          page: 1,
          pageSize: 10
        }
      });
    });

    it('should support search functionality', async () => {
      const mockCustomers = [mockCustomer];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(1);
      
      const params = {
        page: 1,
        pageSize: 10,
        searchTerm: 'Test Company',
        userRole: UserRole.ACCOUNTS
      };

      const result = await getCustomersAction(params);

      expect(result.success).toBe(true);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'Test Company', mode: 'insensitive' }
              })
            ])
          })
        })
      );
    });

    it('should support active-only filtering', async () => {
      const mockCustomers = [mockCustomer];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(1);
      
      const params = {
        page: 1,
        pageSize: 10,
        activeOnly: true,
        userRole: UserRole.ACCOUNTS
      };

      const result = await getCustomersAction(params);

      expect(result.success).toBe(true);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true
          })
        })
      );
    });

    it('should support sorting', async () => {
      const mockCustomers = [mockCustomer];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(1);
      
      const params = {
        page: 1,
        pageSize: 10,
        sortBy: 'name' as const,
        sortOrder: 'desc' as const,
        userRole: UserRole.ACCOUNTS
      };

      const result = await getCustomersAction(params);

      expect(result.success).toBe(true);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'desc' }
        })
      );
    });
  });

  describe('getCustomerByIdAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should get customer by ID', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      
      const result = await getCustomerByIdAction('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual({
        success: true,
        data: mockCustomer
      });
    });

    it('should fail when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      const result = await getCustomerByIdAction('non-existent-id');

      expect(result).toEqual({
        success: false,
        error: 'Customer not found'
      });
    });
  });

  describe('toggleCustomerActiveAction', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'accounts@example.com',
        role: UserRole.ACCOUNTS
      }
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should toggle customer active status', async () => {
      const inactiveCustomer = { ...mockCustomer, isActive: false };
      mockPrisma.customer.findUnique.mockResolvedValue(inactiveCustomer);
      mockPrisma.customer.update.mockResolvedValue({ ...inactiveCustomer, isActive: true });
      
      const result = await toggleCustomerActiveAction('123e4567-e89b-12d3-a456-426614174000');

      expect(result.success).toBe(true);
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: { isActive: true }
      });
    });

    it('should fail when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      const result = await toggleCustomerActiveAction('non-existent-id');

      expect(result).toEqual({
        success: false,
        error: 'Customer not found'
      });
    });
  });
});