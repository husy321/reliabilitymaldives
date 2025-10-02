import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock getSession
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' }
  })),
}));

// Mock Prisma with actual mock implementation
const prismaMock = mockDeep<PrismaClient>();
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Import after mocking
import { getDocumentsAction } from '@/lib/actions/documents';
import { DocumentCategory } from '../../../types/document';

describe('getDocumentsAction - Enhanced Search Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user lookup
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'test-user-1',
      role: 'ADMIN',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  describe('Filename Search', () => {
    it('should search documents by filename using contains query', async () => {
      const mockDocuments = [
        {
          id: '1',
          originalName: 'test-invoice.pdf',
          storedPath: '/uploads/test-invoice.pdf',
          category: 'INVOICE',
          fileSize: 1000,
          mimeType: 'application/pdf',
          fileHash: 'abc123',
          ipAddress: '127.0.0.1',
          uploadedById: 'test-user-1',
          linkedToCustomerId: null,
          linkedToReceivableId: null,
          linkedToSalesReportId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          uploadedBy: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      prismaMock.document.findMany.mockResolvedValue(mockDocuments as any);
      prismaMock.document.count.mockResolvedValue(1);

      const result = await getDocumentsAction({
        filenameSearch: 'invoice',
      });

      expect(result.success).toBe(true);
      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: 'invoice' },
          }),
        })
      );
    });

    it('should handle searchTerm parameter for backwards compatibility', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        searchTerm: 'test-document',
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: 'test-document' },
          }),
        })
      );
    });

    it('should handle filters.filenameSearch parameter', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        filters: { filenameSearch: 'filtered-search' },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: 'filtered-search' },
          }),
        })
      );
    });
  });

  describe('Category Filtering', () => {
    it('should filter by single category', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        categoryFilter: [DocumentCategory.INVOICE],
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: [DocumentCategory.INVOICE] },
          }),
        })
      );
    });

    it('should filter by multiple categories', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        categoryFilter: [DocumentCategory.INVOICE, DocumentCategory.PURCHASE_ORDER],
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: [DocumentCategory.INVOICE, DocumentCategory.PURCHASE_ORDER] },
          }),
        })
      );
    });

    it('should handle filters.categoryFilter parameter', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        filters: { categoryFilter: [DocumentCategory.SALES_RECEIPT] },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: [DocumentCategory.SALES_RECEIPT] },
          }),
        })
      );
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by date range with both from and to dates', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const fromDate = new Date('2023-01-01');
      const toDate = new Date('2023-01-31');

      await getDocumentsAction({
        uploadDateRange: { from: fromDate, to: toDate },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          }),
        })
      );
    });

    it('should filter by date range with only from date', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const fromDate = new Date('2023-01-01');

      await getDocumentsAction({
        uploadDateRange: { from: fromDate },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: fromDate,
            },
          }),
        })
      );
    });

    it('should filter by date range with only to date', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const toDate = new Date('2023-01-31');

      await getDocumentsAction({
        uploadDateRange: { to: toDate },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              lte: toDate,
            },
          }),
        })
      );
    });

    it('should handle filters.uploadDateRange parameter', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const dateRange = { from: new Date('2023-01-01'), to: new Date('2023-01-31') };

      await getDocumentsAction({
        filters: { uploadDateRange: dateRange },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          }),
        })
      );
    });
  });

  describe('Combined Search and Filter', () => {
    it('should handle multiple search parameters together', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        filenameSearch: 'invoice',
        categoryFilter: [DocumentCategory.INVOICE],
        uploadDateRange: { from: new Date('2023-01-01'), to: new Date('2023-01-31') },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: 'invoice' },
            category: { in: [DocumentCategory.INVOICE] },
            createdAt: {
              gte: new Date('2023-01-01'),
              lte: new Date('2023-01-31'),
            },
          }),
        })
      );
    });

    it('should prioritize direct parameters over filters object', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        filenameSearch: 'direct-search',
        filters: { filenameSearch: 'filter-search' },
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: 'direct-search' },
          }),
        })
      );
    });
  });

  describe('Role-Based Access with Search', () => {
    it('should maintain role-based filtering with search parameters for SALES role', async () => {
      // Mock user with SALES role
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'sales-user',
        role: 'SALES',
        name: 'Sales User',
        email: 'sales@example.com',
      } as any);

      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      await getDocumentsAction({
        filenameSearch: 'sales-doc',
        categoryFilter: [DocumentCategory.SALES_RECEIPT],
      });

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array), // Role-based access
            originalName: { contains: 'sales-doc' },
            category: { in: [DocumentCategory.SALES_RECEIPT] },
          }),
        })
      );
    });
  });

  describe('Return Data Structure', () => {
    it('should return appliedFilters in response', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const result = await getDocumentsAction({
        filenameSearch: 'test',
        categoryFilter: [DocumentCategory.INVOICE],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.appliedFilters).toEqual({
          filenameSearch: 'test',
          categoryFilter: [DocumentCategory.INVOICE],
          uploadDateRange: undefined,
        });
      }
    });

    it('should merge filters object with direct parameters in appliedFilters', async () => {
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.document.count.mockResolvedValue(0);

      const result = await getDocumentsAction({
        filenameSearch: 'direct',
        filters: {
          categoryFilter: [DocumentCategory.OTHER],
          uploadDateRange: { from: new Date('2023-01-01') },
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.appliedFilters).toEqual({
          categoryFilter: [DocumentCategory.OTHER],
          uploadDateRange: { from: new Date('2023-01-01') },
          filenameSearch: 'direct',
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaMock.document.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await getDocumentsAction({
        filenameSearch: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle user not found error', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await getDocumentsAction({
        filenameSearch: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});