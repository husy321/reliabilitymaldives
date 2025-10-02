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

describe('Receivables CRUD Integration Flow', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'sales@example.com',
      role: UserRole.SALES
    }
  };

  const mockCustomer = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company Ltd',
    email: 'contact@testcompany.com',
    phone: '+960-123-4567',
    address: 'Male, Maldives',
    paymentTerms: 30,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z')
  };

  let createdReceivable: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(mockSession);
    mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
  });

  describe('Complete Receivable Lifecycle', () => {
    it('should successfully complete a full receivable lifecycle', async () => {
      // Step 1: Create a receivable
      const receivableData: ReceivableFormData = {
        invoiceNumber: 'INV-INTEGRATION-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 10000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      createdReceivable = {
        id: '234e4567-e89b-12d3-a456-426614174000',
        invoiceNumber: 'INV-INTEGRATION-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 10000.00,
        invoiceDate: new Date('2025-09-01T00:00:00Z'),
        dueDate: new Date('2025-10-01T00:00:00Z'),
        paidAmount: 0,
        status: PrismaReceivableStatus.PENDING,
        assignedTo: PrismaUserRole.SALES,
        createdAt: new Date('2025-09-09T10:00:00Z'),
        updatedAt: new Date('2025-09-09T10:00:00Z'),
        customer: mockCustomer
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(null); // Invoice number is unique
      mockPrisma.receivable.create.mockResolvedValue(createdReceivable);

      const createResult = await createReceivableAction(receivableData);

      expect(createResult.success).toBe(true);
      expect(createResult.data?.invoiceNumber).toBe('INV-INTEGRATION-001');
      expect(createResult.data?.amount).toBe(10000.00);
      expect(createResult.data?.status).toBe(PrismaReceivableStatus.PENDING);

      // Step 2: Record a partial payment
      const partialPayment: PaymentData = {
        amount: 4000.00,
        date: new Date('2025-09-15'),
        notes: 'First partial payment via bank transfer'
      };

      const partiallyPaidReceivable = {
        ...createdReceivable,
        paidAmount: 4000.00,
        status: PrismaReceivableStatus.PARTIALLY_PAID,
        updatedAt: new Date('2025-09-15T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(createdReceivable);
      mockPrisma.receivable.update.mockResolvedValue(partiallyPaidReceivable);

      const paymentResult = await recordPaymentAction(createdReceivable.id, partialPayment);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.data?.paidAmount).toBe(4000.00);
      expect(paymentResult.data?.status).toBe(PrismaReceivableStatus.PARTIALLY_PAID);

      // Step 3: Update receivable details (e.g., change assignment)
      const updateData: ReceivableFormData = {
        invoiceNumber: 'INV-INTEGRATION-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 10000.00,
        invoiceDate: new Date('2025-09-01'),
        paidAmount: 4000.00,
        assignedTo: UserRole.ACCOUNTS // Transfer to accounts team
      };

      const updatedReceivable = {
        ...partiallyPaidReceivable,
        assignedTo: PrismaUserRole.ACCOUNTS,
        updatedAt: new Date('2025-09-16T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(partiallyPaidReceivable);
      mockPrisma.receivable.findFirst.mockResolvedValue(null); // No duplicate invoice
      mockPrisma.receivable.update.mockResolvedValue(updatedReceivable);

      const updateResult = await updateReceivableAction(createdReceivable.id, updateData);

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.assignedTo).toBe(PrismaUserRole.ACCOUNTS);

      // Step 4: Record final payment
      const finalPayment: PaymentData = {
        amount: 6000.00,
        date: new Date('2025-09-20'),
        notes: 'Final payment completing invoice'
      };

      const fullyPaidReceivable = {
        ...updatedReceivable,
        paidAmount: 10000.00,
        status: PrismaReceivableStatus.PAID,
        updatedAt: new Date('2025-09-20T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(updatedReceivable);
      mockPrisma.receivable.update.mockResolvedValue(fullyPaidReceivable);

      const finalPaymentResult = await recordPaymentAction(createdReceivable.id, finalPayment);

      expect(finalPaymentResult.success).toBe(true);
      expect(finalPaymentResult.data?.paidAmount).toBe(10000.00);
      expect(finalPaymentResult.data?.status).toBe(PrismaReceivableStatus.PAID);

      // Step 5: Verify final state with getReceivableById
      mockPrisma.receivable.findUnique.mockResolvedValue(fullyPaidReceivable);

      const getResult = await getReceivableByIdAction(createdReceivable.id);

      expect(getResult.success).toBe(true);
      expect(getResult.data?.status).toBe(PrismaReceivableStatus.PAID);
      expect(getResult.data?.paidAmount).toBe(10000.00);
    });

    it('should handle dispute workflow correctly', async () => {
      // Create a receivable that will be disputed
      const disputedReceivable = {
        id: 'receivable-disputed-123',
        invoiceNumber: 'INV-DISPUTE-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01T00:00:00Z'),
        dueDate: new Date('2025-08-15T00:00:00Z'), // Overdue
        paidAmount: 0,
        status: PrismaReceivableStatus.OVERDUE,
        assignedTo: PrismaUserRole.SALES,
        createdAt: new Date('2025-09-01T00:00:00Z'),
        updatedAt: new Date('2025-09-01T00:00:00Z'),
        customer: mockCustomer
      };

      // Step 1: Mark as disputed
      const disputedReceivableUpdated = {
        ...disputedReceivable,
        status: PrismaReceivableStatus.DISPUTED,
        updatedAt: new Date('2025-09-10T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(disputedReceivable);
      mockPrisma.receivable.update.mockResolvedValue(disputedReceivableUpdated);

      const disputeResult = await updateReceivableStatusAction(
        disputedReceivable.id, 
        ReceivableStatus.DISPUTED
      );

      expect(disputeResult.success).toBe(true);
      expect(disputeResult.data?.status).toBe(PrismaReceivableStatus.DISPUTED);

      // Step 2: Later resolve dispute with payment
      const paymentAfterDispute: PaymentData = {
        amount: 5000.00,
        date: new Date('2025-09-25'),
        notes: 'Payment after dispute resolution'
      };

      const resolvedReceivable = {
        ...disputedReceivableUpdated,
        paidAmount: 5000.00,
        status: PrismaReceivableStatus.PAID,
        updatedAt: new Date('2025-09-25T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(disputedReceivableUpdated);
      mockPrisma.receivable.update.mockResolvedValue(resolvedReceivable);

      const resolutionResult = await recordPaymentAction(disputedReceivable.id, paymentAfterDispute);

      expect(resolutionResult.success).toBe(true);
      expect(resolutionResult.data?.status).toBe(PrismaReceivableStatus.PAID);
      expect(resolutionResult.data?.paidAmount).toBe(5000.00);
    });

    it('should handle complex search and filtering scenarios', async () => {
      const mockReceivables = [
        {
          id: 'receivable-1',
          invoiceNumber: 'INV-001',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 5000.00,
          invoiceDate: new Date('2025-09-01T00:00:00Z'),
          dueDate: new Date('2025-10-01T00:00:00Z'),
          paidAmount: 0,
          status: PrismaReceivableStatus.PENDING,
          assignedTo: PrismaUserRole.SALES,
          createdAt: new Date('2025-09-01T00:00:00Z'),
          updatedAt: new Date('2025-09-01T00:00:00Z'),
          customer: mockCustomer
        },
        {
          id: 'receivable-2',
          invoiceNumber: 'INV-002',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 3000.00,
          invoiceDate: new Date('2025-08-15T00:00:00Z'),
          dueDate: new Date('2025-08-30T00:00:00Z'),
          paidAmount: 1000.00,
          status: PrismaReceivableStatus.PARTIALLY_PAID,
          assignedTo: PrismaUserRole.ACCOUNTS,
          createdAt: new Date('2025-08-15T00:00:00Z'),
          updatedAt: new Date('2025-09-05T00:00:00Z'),
          customer: mockCustomer
        }
      ];

      // Test search functionality
      mockPrisma.receivable.findMany.mockResolvedValue([mockReceivables[0]]);
      mockPrisma.receivable.count.mockResolvedValue(1);

      const searchResult = await getReceivablesAction({
        page: 1,
        pageSize: 10,
        searchTerm: 'INV-001',
        userRole: UserRole.SALES
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data?.receivables).toHaveLength(1);
      expect(searchResult.data?.receivables[0].invoiceNumber).toBe('INV-001');

      // Test status filtering
      mockPrisma.receivable.findMany.mockResolvedValue([mockReceivables[1]]);
      mockPrisma.receivable.count.mockResolvedValue(1);

      const filterResult = await getReceivablesAction({
        page: 1,
        pageSize: 10,
        statusFilter: [ReceivableStatus.PARTIALLY_PAID],
        userRole: UserRole.SALES
      });

      expect(filterResult.success).toBe(true);
      expect(filterResult.data?.receivables).toHaveLength(1);
      expect(filterResult.data?.receivables[0].status).toBe(PrismaReceivableStatus.PARTIALLY_PAID);

      // Test pagination
      mockPrisma.receivable.findMany.mockResolvedValue(mockReceivables);
      mockPrisma.receivable.count.mockResolvedValue(20);

      const paginationResult = await getReceivablesAction({
        page: 2,
        pageSize: 10,
        userRole: UserRole.SALES
      });

      expect(paginationResult.success).toBe(true);
      expect(paginationResult.data?.page).toBe(2);
      expect(paginationResult.data?.totalCount).toBe(20);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test creating receivable with duplicate invoice number
      mockPrisma.receivable.findUnique.mockResolvedValue(createdReceivable); // Invoice exists

      const duplicateData: ReceivableFormData = {
        invoiceNumber: 'INV-INTEGRATION-001', // Same as existing
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const duplicateResult = await createReceivableAction(duplicateData);

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('Invoice number already exists');

      // Test recording payment exceeding remaining balance
      const excessivePayment: PaymentData = {
        amount: 15000.00, // More than invoice amount
        date: new Date('2025-09-15')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue(createdReceivable);

      const excessivePaymentResult = await recordPaymentAction(
        createdReceivable.id, 
        excessivePayment
      );

      expect(excessivePaymentResult.success).toBe(false);
      expect(excessivePaymentResult.error).toContain('exceeds remaining balance');

      // Test updating non-existent receivable
      mockPrisma.receivable.findUnique.mockResolvedValue(null);

      const updateData: ReceivableFormData = {
        invoiceNumber: 'INV-NONEXISTENT',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 5000.00,
        invoiceDate: new Date('2025-09-01'),
        assignedTo: UserRole.SALES
      };

      const nonExistentUpdateResult = await updateReceivableAction(
        'nonexistent-id', 
        updateData
      );

      expect(nonExistentUpdateResult.success).toBe(false);
      expect(nonExistentUpdateResult.error).toContain('not found');
    });

    it('should maintain data consistency across operations', async () => {
      // Simulate a sequence of operations and verify data consistency
      let currentReceivable = {
        id: 'consistency-test-123',
        invoiceNumber: 'INV-CONSISTENCY-001',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 8000.00,
        invoiceDate: new Date('2025-09-01T00:00:00Z'),
        dueDate: new Date('2025-10-01T00:00:00Z'),
        paidAmount: 0,
        status: PrismaReceivableStatus.PENDING,
        assignedTo: PrismaUserRole.SALES,
        createdAt: new Date('2025-09-01T00:00:00Z'),
        updatedAt: new Date('2025-09-01T00:00:00Z'),
        customer: mockCustomer
      };

      // Payment 1: $3000
      const payment1 = { amount: 3000.00, date: new Date('2025-09-10') };
      currentReceivable = {
        ...currentReceivable,
        paidAmount: 3000.00,
        status: PrismaReceivableStatus.PARTIALLY_PAID,
        updatedAt: new Date('2025-09-10T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue({
        ...currentReceivable,
        paidAmount: 0
      });
      mockPrisma.receivable.update.mockResolvedValue(currentReceivable);

      const payment1Result = await recordPaymentAction(
        currentReceivable.id, 
        payment1
      );

      expect(payment1Result.success).toBe(true);
      expect(payment1Result.data?.paidAmount).toBe(3000.00);

      // Payment 2: $2000 (Total: $5000)
      const payment2 = { amount: 2000.00, date: new Date('2025-09-15') };
      currentReceivable = {
        ...currentReceivable,
        paidAmount: 5000.00,
        updatedAt: new Date('2025-09-15T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue({
        ...currentReceivable,
        paidAmount: 3000.00
      });
      mockPrisma.receivable.update.mockResolvedValue(currentReceivable);

      const payment2Result = await recordPaymentAction(
        currentReceivable.id, 
        payment2
      );

      expect(payment2Result.success).toBe(true);
      expect(payment2Result.data?.paidAmount).toBe(5000.00);

      // Final payment: $3000 (Should complete the receivable)
      const finalPayment = { amount: 3000.00, date: new Date('2025-09-20') };
      currentReceivable = {
        ...currentReceivable,
        paidAmount: 8000.00,
        status: PrismaReceivableStatus.PAID,
        updatedAt: new Date('2025-09-20T00:00:00Z')
      };

      mockPrisma.receivable.findUnique.mockResolvedValue({
        ...currentReceivable,
        paidAmount: 5000.00,
        status: PrismaReceivableStatus.PARTIALLY_PAID
      });
      mockPrisma.receivable.update.mockResolvedValue(currentReceivable);

      const finalPaymentResult = await recordPaymentAction(
        currentReceivable.id, 
        finalPayment
      );

      expect(finalPaymentResult.success).toBe(true);
      expect(finalPaymentResult.data?.paidAmount).toBe(8000.00);
      expect(finalPaymentResult.data?.status).toBe(PrismaReceivableStatus.PAID);

      // Verify total payments equal invoice amount
      expect(finalPaymentResult.data?.paidAmount).toBe(finalPaymentResult.data?.amount);
    });
  });
});