import { getDocumentsAction } from '@/lib/actions/documents';
import { DocumentCategory } from '../../../types/document';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma');

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDocumentsAction - Enhanced with Role-Based Access', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockUser = {
    id: 'test-user-id',
    role: UserRole.SALES
  };

  const mockDocuments = [
    {
      id: 'doc-1',
      originalName: 'test-invoice.pdf',
      storedPath: '/uploads/invoice/test-invoice.pdf',
      category: DocumentCategory.INVOICE,
      fileSize: 1024000,
      mimeType: 'application/pdf',
      fileHash: 'abc123',
      ipAddress: '127.0.0.1',
      uploadedById: 'test-user-id',
      linkedToCustomerId: null,
      linkedToReceivableId: null,
      linkedToSalesReportId: null,
      createdAt: new Date('2025-09-08T10:00:00Z'),
      updatedAt: new Date('2025-09-08T10:00:00Z'),
      uploadedBy: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    {
      id: 'doc-2',
      originalName: 'sales-receipt.pdf',
      storedPath: '/uploads/sales_receipt/sales-receipt.pdf',
      category: DocumentCategory.SALES_RECEIPT,
      fileSize: 512000,
      mimeType: 'application/pdf',
      fileHash: 'def456',
      ipAddress: '127.0.0.1',
      uploadedById: 'other-user-id',
      linkedToCustomerId: null,
      linkedToReceivableId: null,
      linkedToSalesReportId: null,
      createdAt: new Date('2025-09-07T15:30:00Z'),
      updatedAt: new Date('2025-09-07T15:30:00Z'),
      uploadedBy: {
        id: 'other-user-id',
        name: 'Other User',
        email: 'other@example.com'
      }
    }
  ];

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await getDocumentsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should require user to exist in database', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getDocumentsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.count.mockResolvedValue(2);
    });

    it('should allow admin to see all documents', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        ...mockUser, 
        role: UserRole.ADMIN 
      });
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {}, // No restrictions for admin
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should restrict sales user to sales documents and own uploads', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        ...mockUser, 
        role: UserRole.SALES 
      });
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { uploadedById: 'test-user-id' },
            { 
              category: {
                in: ['SALES_RECEIPT', 'DELIVERY_ORDER', 'PURCHASE_ORDER']
              }
            }
          ]
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should restrict accounts user to financial documents and own uploads', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        ...mockUser, 
        role: UserRole.ACCOUNTS 
      });
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { uploadedById: 'test-user-id' },
            { 
              category: {
                in: ['INVOICE', 'SALES_RECEIPT']
              }
            }
          ]
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should restrict manager user to most documents and own uploads', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        ...mockUser, 
        role: UserRole.MANAGER 
      });
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { uploadedById: 'test-user-id' },
            { 
              category: {
                in: ['INVOICE', 'SALES_RECEIPT', 'DELIVERY_ORDER', 'PURCHASE_ORDER']
              }
            }
          ]
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should restrict unknown roles to only own uploads', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        ...mockUser, 
        role: 'UNKNOWN' as UserRole
      });
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { uploadedById: 'test-user-id' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockPrisma.document.count.mockResolvedValue(25);
    });

    it('should handle pagination correctly', async () => {
      const result = await getDocumentsAction({
        page: 2,
        pageSize: 5
      });

      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(5);
      expect(result.data.totalCount).toBe(25);
      
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 5, // (page - 1) * pageSize = (2 - 1) * 5
        take: 5
      });
    });

    it('should default pagination values correctly', async () => {
      const result = await getDocumentsAction({});

      expect(result.success).toBe(true);
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
      
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockPrisma.document.count.mockResolvedValue(2);
    });

    it('should sort by filename in ascending order', async () => {
      const result = await getDocumentsAction({
        sortBy: 'originalName',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { originalName: 'asc' },
        skip: 0,
        take: 10
      });
    });

    it('should sort by upload date in descending order (default)', async () => {
      const result = await getDocumentsAction({});

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should sort by uploaded user name', async () => {
      const result = await getDocumentsAction({
        sortBy: 'uploadedBy',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { uploadedBy: { name: 'asc' } },
        skip: 0,
        take: 10
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockPrisma.document.count.mockResolvedValue(2);
    });

    it('should filter by category', async () => {
      const result = await getDocumentsAction({
        filters: { category: DocumentCategory.INVOICE }
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          category: DocumentCategory.INVOICE
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });
    });

    it('should filter by filename', async () => {
      const result = await getDocumentsAction({
        filters: { filename: 'invoice' }
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          originalName: {
            contains: 'invoice',
            mode: 'insensitive'
          }
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');
      
      const result = await getDocumentsAction({
        filters: { 
          dateRange: { 
            start: startDate, 
            end: endDate 
          } 
        }
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });
    });

    it('should combine multiple filters', async () => {
      const result = await getDocumentsAction({
        filters: { 
          category: DocumentCategory.INVOICE,
          filename: 'test',
          uploadedBy: 'specific-user-id'
        }
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          category: DocumentCategory.INVOICE,
          originalName: {
            contains: 'test',
            mode: 'insensitive'
          },
          uploadedById: 'specific-user-id'
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });
    });
  });

  describe('Data Mapping', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.document.count.mockResolvedValue(2);
    });

    it('should properly map document data with user information', async () => {
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(result.data.documents).toHaveLength(2);
      
      const firstDoc = result.data.documents[0];
      expect(firstDoc.id).toBe('doc-1');
      expect(firstDoc.originalName).toBe('test-invoice.pdf');
      expect(firstDoc.category).toBe(DocumentCategory.INVOICE);
      expect(firstDoc.uploadedBy.name).toBe('Test User');
      expect(firstDoc.uploadedBy.email).toBe('test@example.com');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.document.findMany.mockRejectedValue(dbError);

      const result = await getDocumentsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle unknown errors', async () => {
      mockPrisma.document.findMany.mockRejectedValue('Unknown error');

      const result = await getDocumentsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve documents');
    });
  });
});