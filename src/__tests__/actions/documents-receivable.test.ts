import { 
  getReceivableDocumentsAction,
  linkDocumentToReceivableAction,
  unlinkDocumentFromReceivableAction,
  bulkLinkDocumentsAction
} from '@/lib/actions/documents';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'ADMIN',
  },
};

const mockUser = {
  id: 'user-1',
  role: 'ADMIN',
};

const mockDocuments = [
  {
    id: 'doc-1',
    originalName: 'invoice-001.pdf',
    storedPath: '/uploads/invoice/invoice-001.pdf',
    category: 'INVOICE',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    fileHash: 'hash1',
    ipAddress: '127.0.0.1',
    uploadedById: 'user-1',
    linkedToCustomerId: null,
    linkedToReceivableId: 'receivable-1',
    linkedToSalesReportId: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    uploadedBy: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  {
    id: 'doc-2',
    originalName: 'purchase-order-002.pdf',
    storedPath: '/uploads/purchase_order/purchase-order-002.pdf',
    category: 'PURCHASE_ORDER',
    fileSize: 512000,
    mimeType: 'application/pdf',
    fileHash: 'hash2',
    ipAddress: '127.0.0.1',
    uploadedById: 'user-2',
    linkedToCustomerId: null,
    linkedToReceivableId: 'receivable-1',
    linkedToSalesReportId: null,
    createdAt: new Date('2025-01-01T11:00:00Z'),
    updatedAt: new Date('2025-01-01T11:00:00Z'),
    uploadedBy: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  },
];

describe('Document-Receivable Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('getReceivableDocumentsAction', () => {
    it('should return documents linked to a receivable', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await getReceivableDocumentsAction('receivable-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].originalName).toBe('invoice-001.pdf');
      expect(result.data![1].originalName).toBe('purchase-order-002.pdf');

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          linkedToReceivableId: 'receivable-1',
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no documents are linked', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getReceivableDocumentsAction('receivable-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return error when user is not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const result = await getReceivableDocumentsAction('receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should return error when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getReceivableDocumentsAction('receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      (prisma.document.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getReceivableDocumentsAction('receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('linkDocumentToReceivableAction', () => {
    const updatedDocument = {
      ...mockDocuments[0],
      linkedToReceivableId: 'receivable-2',
    };

    it('should link document to receivable successfully', async () => {
      (prisma.document.update as jest.Mock).mockResolvedValue(updatedDocument);

      const result = await linkDocumentToReceivableAction('doc-1', 'receivable-2');

      expect(result.success).toBe(true);
      expect(result.data!.linkedToReceivableId).toBe('receivable-2');

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { linkedToReceivableId: 'receivable-2' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return error when user is not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const result = await linkDocumentToReceivableAction('doc-1', 'receivable-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should handle document not found error', async () => {
      (prisma.document.update as jest.Mock).mockRejectedValue(new Error('Record not found'));

      const result = await linkDocumentToReceivableAction('doc-1', 'receivable-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });
  });

  describe('unlinkDocumentFromReceivableAction', () => {
    it('should unlink document from receivable successfully', async () => {
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocuments[0]);
      (prisma.document.update as jest.Mock).mockResolvedValue({
        ...mockDocuments[0],
        linkedToReceivableId: null,
      });

      const result = await unlinkDocumentFromReceivableAction('doc-1', 'receivable-1');

      expect(result.success).toBe(true);

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc-1',
          linkedToReceivableId: 'receivable-1',
        },
      });

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { linkedToReceivableId: null },
      });
    });

    it('should return error when document is not linked to receivable', async () => {
      (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await unlinkDocumentFromReceivableAction('doc-1', 'receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document not found or not linked to this receivable');
    });

    it('should return error when user is not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const result = await unlinkDocumentFromReceivableAction('doc-1', 'receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('bulkLinkDocumentsAction', () => {
    it('should link multiple documents to receivable successfully', async () => {
      (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await bulkLinkDocumentsAction(['doc-1', 'doc-2'], 'receivable-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      expect(prisma.document.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['doc-1', 'doc-2'] },
        },
        data: { linkedToReceivableId: 'receivable-1' },
      });

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['doc-1', 'doc-2'] },
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return error when no documents provided', async () => {
      const result = await bulkLinkDocumentsAction([], 'receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No documents provided');
    });

    it('should return error when user is not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const result = await bulkLinkDocumentsAction(['doc-1', 'doc-2'], 'receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      (prisma.document.updateMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await bulkLinkDocumentsAction(['doc-1', 'doc-2'], 'receivable-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});