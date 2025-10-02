import { 
  createReceivableAction, 
  updateReceivableAction, 
  recordPaymentAction, 
  getReceivablesAction,
  getReceivableByIdAction,
  updateReceivableStatusAction
} from '@/lib/actions/receivables';
import { ReceivableFormData, ReceivableStatus, UserRole, PaymentData } from '../../../types/receivable';
import { UserRole as PrismaUserRole, ReceivableStatus as PrismaReceivableStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn()
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    receivable: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    customer: {
      findUnique: jest.fn()
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

describe('Receivable Actions', () => {
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

  const mockReceivable = {
    id: '234e4567-e89b-12d3-a456-426614174000',
    invoiceNumber: 'INV-001',
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 5000.00,
    invoiceDate: new Date('2025-09-01T00:00:00Z'),
    dueDate: new Date('2025-10-01T00:00:00Z'),
    paidAmount: 0,
    status: PrismaReceivableStatus.PENDING,
    assignedTo: PrismaUserRole.SALES,
    createdAt: new Date('2025-09-09T10:00:00Z'),
    updatedAt: new Date('2025-09-09T10:00:00Z'),
    customer: mockCustomer
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should fail when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await createReceivableAction(receivableData);

      expect(result).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should allow access for SALES role', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.receivable.findUnique.mockResolvedValue(null); // Invoice number is unique
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.receivable.create.mockResolvedValue(mockReceivable);
      
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await createReceivableAction(receivableData);

      expect(result.success).toBe(true);
      expect(mockPrisma.receivable.create).toHaveBeenCalled();
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
      mockPrisma.receivable.findUnique.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.receivable.create.mockResolvedValue(mockReceivable);
      
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.ACCOUNTS
      };

      const result = await createReceivableAction(receivableData);

      expect(result.success).toBe(true);
    });
  });

  describe('createReceivableAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully create a receivable with valid data', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null); // Invoice number is unique
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.receivable.create.mockResolvedValue(mockReceivable);

      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await createReceivableAction(receivableData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReceivable);
      expect(mockPrisma.receivable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceNumber: 'INV-001',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 5000.00,
          paidAmount: 0,
          status: PrismaReceivableStatus.PENDING,
          assignedTo: PrismaUserRole.SALES
        }),
        include: { customer: true }
      });
    });

    it('should fail when invoice number already exists', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable); // Invoice exists
      
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await createReceivableAction(receivableData);

      expect(result).toEqual({
        success: false,
        error: 'Invoice number already exists. Please use a unique invoice number.'
      });
    });

    it('should fail when customer does not exist', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue(null); // Customer not found
      
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: 'nonexistent-customer',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await createReceivableAction(receivableData);

      expect(result).toEqual({
        success: false,
        error: 'Customer not found'
      });
    });

    it('should calculate due date based on customer payment terms', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue({
        ...mockCustomer,
        paymentTerms: 45 // 45 days payment terms
      });
      mockPrisma.receivable.create.mockResolvedValue(mockReceivable);

      const invoiceDate = new Date('2025-09-01');
      const expectedDueDate = new Date('2025-10-16'); // 45 days after invoice date

      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: invoiceDate,
        assignedTo: UserRole.SALES
      };

      await createReceivableAction(receivableData);

      expect(mockPrisma.receivable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: expectedDueDate
        }),
        include: { customer: true }
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        invoiceNumber: '', // Invalid: empty string
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: -100, // Invalid: negative amount
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      } as ReceivableFormData;

      const result = await createReceivableAction(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('updateReceivableAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully update a receivable', async () => {
      const updatedReceivable = {
        ...mockReceivable,
        amount: 6000.00,
        updatedAt: new Date()
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);
      mockPrisma.receivable.findFirst.mockResolvedValue(null); // No duplicate invoice number
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.receivable.update.mockResolvedValue(updatedReceivable);

      const updateData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 6000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await updateReceivableAction('receivable-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedReceivable);
    });

    it('should fail when receivable does not exist', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null);

      const updateData: ReceivableFormData = {
        invoiceNumber: 'INV-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 6000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const result = await updateReceivableAction('nonexistent-id', updateData);

      expect(result).toEqual({
        success: false,
        error: 'Receivable not found'
      });
    });
  });

  describe('recordPaymentAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'accounts@example.com',
          role: UserRole.ACCOUNTS
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully record a partial payment', async () => {
      const paymentAmount = 2000.00;
      const updatedReceivable = {
        ...mockReceivable,
        paidAmount: paymentAmount,
        status: PrismaReceivableStatus.PARTIALLY_PAID
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);
      mockPrisma.receivable.update.mockResolvedValue(updatedReceivable);

      const paymentData: PaymentData = {
        amount: paymentAmount,
        date: new Date('2025-09-15'),
        notes: 'Bank transfer payment'
      };

      const result = await recordPaymentAction('receivable-123', paymentData);

      expect(result.success).toBe(true);
      expect(result.data?.paidAmount).toBe(paymentAmount);
      expect(result.data?.status).toBe(PrismaReceivableStatus.PARTIALLY_PAID);
    });

    it('should successfully record a full payment', async () => {
      const fullPayment = 5000.00;
      const updatedReceivable = {
        ...mockReceivable,
        paidAmount: fullPayment,
        status: PrismaReceivableStatus.PAID
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);
      mockPrisma.receivable.update.mockResolvedValue(updatedReceivable);

      const paymentData: PaymentData = {
        amount: fullPayment,
        date: new Date('2025-09-15'),
        notes: 'Full payment received'
      };

      const result = await recordPaymentAction('receivable-123', paymentData);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(PrismaReceivableStatus.PAID);
    });

    it('should fail when payment exceeds remaining balance', async () => {
      const excessivePayment = 6000.00; // More than the invoice amount

      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);

      const paymentData: PaymentData = {
        amount: excessivePayment,
        date: new Date('2025-09-15')
      };

      const result = await recordPaymentAction('receivable-123', paymentData);

      expect(result).toEqual({
        success: false,
        error: 'Payment amount exceeds remaining balance'
      });
    });
  });

  describe('getReceivablesAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully fetch receivables with pagination', async () => {
      const mockReceivables = [mockReceivable];
      mockPrisma.receivable.findMany.mockResolvedValue(mockReceivables);
      mockPrisma.receivable.count.mockResolvedValue(1);

      const params = {
        page: 1,
        pageSize: 10,
        userRole: UserRole.SALES
      };

      const result = await getReceivablesAction(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        receivables: mockReceivables,
        totalCount: 1,
        page: 1,
        pageSize: 10
      });
    });

    it('should handle search functionality', async () => {
      mockPrisma.receivable.findMany.mockResolvedValue([mockReceivable]);
      mockPrisma.receivable.count.mockResolvedValue(1);

      const params = {
        page: 1,
        pageSize: 10,
        searchTerm: 'INV-001',
        userRole: UserRole.SALES
      };

      await getReceivablesAction(params);

      expect(mockPrisma.receivable.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              invoiceNumber: {
                contains: 'INV-001',
                mode: 'insensitive'
              }
            },
            {
              customer: {
                name: {
                  contains: 'INV-001',
                  mode: 'insensitive'
                }
              }
            },
            {
              customer: {
                email: {
                  contains: 'INV-001',
                  mode: 'insensitive'
                }
              }
            }
          ]
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
        skip: 0,
        take: 10
      });
    });

    it('should handle status filtering', async () => {
      mockPrisma.receivable.findMany.mockResolvedValue([]);
      mockPrisma.receivable.count.mockResolvedValue(0);

      const params = {
        page: 1,
        pageSize: 10,
        statusFilter: [ReceivableStatus.OVERDUE, ReceivableStatus.PENDING],
        userRole: UserRole.SALES
      };

      await getReceivablesAction(params);

      expect(mockPrisma.receivable.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [ReceivableStatus.OVERDUE, ReceivableStatus.PENDING]
          }
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('getReceivableByIdAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'sales@example.com',
          role: UserRole.SALES
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully fetch receivable by ID', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);

      const result = await getReceivableByIdAction('receivable-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReceivable);
    });

    it('should fail when receivable is not found', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null);

      const result = await getReceivableByIdAction('nonexistent-id');

      expect(result).toEqual({
        success: false,
        error: 'Receivable not found'
      });
    });
  });

  describe('updateReceivableStatusAction', () => {
    beforeEach(() => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'accounts@example.com',
          role: UserRole.ACCOUNTS
        }
      };
      mockGetSession.mockResolvedValue(mockSession);
    });

    it('should successfully update receivable status', async () => {
      const updatedReceivable = {
        ...mockReceivable,
        status: PrismaReceivableStatus.DISPUTED
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(mockReceivable);
      mockPrisma.receivable.update.mockResolvedValue(updatedReceivable);

      const result = await updateReceivableStatusAction('receivable-123', ReceivableStatus.DISPUTED);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(PrismaReceivableStatus.DISPUTED);
    });

    it('should fail when receivable is not found', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue(null);

      const result = await updateReceivableStatusAction('nonexistent-id', ReceivableStatus.DISPUTED);

      expect(result).toEqual({
        success: false,
        error: 'Receivable not found'
      });
    });
  });
});