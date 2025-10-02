import { 
  uploadDocumentActionWithDetection,
  getReceivableDocumentsAction,
  linkDocumentToReceivableAction,
  unlinkDocumentFromReceivableAction
} from '@/lib/actions/documents';
import { getReceivablesAction } from '@/lib/actions/receivables';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { DocumentCategory } from '../../../types/document';
import { UserRole } from '../../../types/receivable';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    receivable: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/validation/fileValidation', () => ({
  validateFiles: jest.fn(),
}));

jest.mock('@/lib/utils/ipUtils', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'ADMIN',
    name: 'Test User',
  },
};

const mockUser = {
  id: 'user-1',
  role: 'ADMIN',
  name: 'Test User',
  email: 'test@example.com',
};

const mockReceivable = {
  id: 'receivable-1',
  invoiceNumber: 'INV-001',
  customerId: 'customer-1',
  amount: 1000.00,
  invoiceDate: new Date('2025-01-01'),
  dueDate: new Date('2025-01-31'),
  paidAmount: 0,
  status: 'PENDING',
  assignedTo: 'ADMIN',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  customer: {
    id: 'customer-1',
    name: 'Test Customer',
    email: 'customer@example.com',
  },
  _count: { linkedDocuments: 0 },
};

const mockDocument = {
  id: 'doc-1',
  originalName: 'invoice-001.pdf',
  storedPath: 'uploads/invoice/timestamp-invoice-001.pdf',
  category: 'INVOICE',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  fileHash: 'hash1',
  ipAddress: '127.0.0.1',
  uploadedById: 'user-1',
  linkedToCustomerId: null,
  linkedToReceivableId: null,
  linkedToSalesReportId: null,
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-01T10:00:00Z'),
  uploadedBy: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
};

describe('Document-Receivable Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('Complete workflow: Upload → Link → View → Unlink', () => {
    it('should handle complete document-receivable workflow', async () => {
      // Step 1: Upload document with receivable linking
      const mockFile = new File(['test content'], 'invoice-001.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('files', mockFile);
      formData.append('receivableId', 'receivable-1');

      const { validateFiles } = require('@/lib/validation/fileValidation');
      validateFiles.mockResolvedValue({
        isValid: true,
        results: [{ fileHash: 'hash1' }],
        errors: [],
      });

      (prisma.document.create as jest.Mock).mockResolvedValue({
        ...mockDocument,
        linkedToReceivableId: 'receivable-1',
      });

      const uploadResult = await uploadDocumentActionWithDetection(formData);
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data!.documents).toHaveLength(1);
      expect(uploadResult.data!.documents[0].linkedToReceivableId).toBe('receivable-1');

      // Step 2: Verify document appears in receivable documents list
      (prisma.document.findMany as jest.Mock).mockResolvedValue([{
        ...mockDocument,
        linkedToReceivableId: 'receivable-1',
      }]);

      const documentsResult = await getReceivableDocumentsAction('receivable-1');
      
      expect(documentsResult.success).toBe(true);
      expect(documentsResult.data).toHaveLength(1);
      expect(documentsResult.data![0].linkedToReceivableId).toBe('receivable-1');

      // Step 3: Verify receivable shows document count
      (prisma.receivable.findMany as jest.Mock).mockResolvedValue([{
        ...mockReceivable,
        _count: { linkedDocuments: 1 },
      }]);
      (prisma.receivable.count as jest.Mock).mockResolvedValue(1);
      (prisma.document.groupBy as jest.Mock).mockResolvedValue([
        { linkedToReceivableId: 'receivable-1', _count: { id: 1 } },
      ]);

      const receivablesResult = await getReceivablesAction({
        page: 1,
        pageSize: 10,
        userRole: UserRole.ADMIN,
      });

      expect(receivablesResult.success).toBe(true);
      expect(receivablesResult.data!.receivables).toHaveLength(1);
      expect(receivablesResult.data!.receivables[0].documentCount).toBe(1);

      // Step 4: Link additional document to same receivable
      const secondDocument = {
        ...mockDocument,
        id: 'doc-2',
        originalName: 'receipt-001.pdf',
        linkedToReceivableId: 'receivable-1',
      };

      (prisma.document.update as jest.Mock).mockResolvedValue(secondDocument);

      const linkResult = await linkDocumentToReceivableAction('doc-2', 'receivable-1');
      
      expect(linkResult.success).toBe(true);
      expect(linkResult.data!.linkedToReceivableId).toBe('receivable-1');

      // Step 5: Verify both documents are now linked
      (prisma.document.findMany as jest.Mock).mockResolvedValue([
        { ...mockDocument, linkedToReceivableId: 'receivable-1' },
        secondDocument,
      ]);

      const updatedDocumentsResult = await getReceivableDocumentsAction('receivable-1');
      
      expect(updatedDocumentsResult.success).toBe(true);
      expect(updatedDocumentsResult.data).toHaveLength(2);

      // Step 6: Unlink one document
      (prisma.document.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        linkedToReceivableId: 'receivable-1',
      });
      (prisma.document.update as jest.Mock).mockResolvedValue({
        ...mockDocument,
        linkedToReceivableId: null,
      });

      const unlinkResult = await unlinkDocumentFromReceivableAction('doc-1', 'receivable-1');
      
      expect(unlinkResult.success).toBe(true);

      // Step 7: Verify only one document remains linked
      (prisma.document.findMany as jest.Mock).mockResolvedValue([secondDocument]);

      const finalDocumentsResult = await getReceivableDocumentsAction('receivable-1');
      
      expect(finalDocumentsResult.success).toBe(true);
      expect(finalDocumentsResult.data).toHaveLength(1);
      expect(finalDocumentsResult.data![0].id).toBe('doc-2');
    });
  });

  describe('Document categorization and receivable integration', () => {
    it('should automatically categorize invoice documents for receivables', async () => {
      const mockFile = new File(['test content'], 'INV-001-invoice.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('files', mockFile);
      formData.append('receivableId', 'receivable-1');

      const { validateFiles } = require('@/lib/validation/fileValidation');
      validateFiles.mockResolvedValue({
        isValid: true,
        results: [{ fileHash: 'hash1' }],
        errors: [],
      });

      (prisma.document.create as jest.Mock).mockResolvedValue({
        ...mockDocument,
        originalName: 'INV-001-invoice.pdf',
        category: DocumentCategory.INVOICE,
        linkedToReceivableId: 'receivable-1',
      });

      const uploadResult = await uploadDocumentActionWithDetection(formData);
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data!.documents[0].category).toBe(DocumentCategory.INVOICE);
      expect(uploadResult.data!.categoryDetections[0].detectedCategory).toBe(DocumentCategory.INVOICE);
    });

    it('should handle multiple file types for receivables', async () => {
      const files = [
        new File(['invoice content'], 'INV-001.pdf', { type: 'application/pdf' }),
        new File(['po content'], 'PO-002.pdf', { type: 'application/pdf' }),
        new File(['receipt content'], 'receipt-001.jpg', { type: 'image/jpeg' }),
      ];
      
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('receivableId', 'receivable-1');

      const { validateFiles } = require('@/lib/validation/fileValidation');
      validateFiles.mockResolvedValue({
        isValid: true,
        results: files.map((_, index) => ({ fileHash: `hash${index + 1}` })),
        errors: [],
      });

      const mockDocuments = files.map((file, index) => ({
        ...mockDocument,
        id: `doc-${index + 1}`,
        originalName: file.name,
        category: file.name.includes('INV') ? DocumentCategory.INVOICE :
                 file.name.includes('PO') ? DocumentCategory.PURCHASE_ORDER :
                 DocumentCategory.SALES_RECEIPT,
        linkedToReceivableId: 'receivable-1',
        mimeType: file.type,
      }));

      (prisma.document.create as jest.Mock)
        .mockResolvedValueOnce(mockDocuments[0])
        .mockResolvedValueOnce(mockDocuments[1])
        .mockResolvedValueOnce(mockDocuments[2]);

      const uploadResult = await uploadDocumentActionWithDetection(formData);
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data!.documents).toHaveLength(3);
      expect(uploadResult.data!.documents[0].category).toBe(DocumentCategory.INVOICE);
      expect(uploadResult.data!.documents[1].category).toBe(DocumentCategory.PURCHASE_ORDER);
      expect(uploadResult.data!.documents[2].category).toBe(DocumentCategory.SALES_RECEIPT);
    });
  });

  describe('Error handling in workflow', () => {
    it('should handle upload failures gracefully', async () => {
      const mockFile = new File(['test content'], 'invalid-file.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', mockFile);
      formData.append('receivableId', 'receivable-1');

      const { validateFiles } = require('@/lib/validation/fileValidation');
      validateFiles.mockResolvedValue({
        isValid: false,
        results: [],
        errors: [{ fileName: 'invalid-file.txt', message: 'File type not supported' }],
      });

      const uploadResult = await uploadDocumentActionWithDetection(formData);
      
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('File validation failed');
    });

    it('should handle database connection errors', async () => {
      (prisma.document.findMany as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      const documentsResult = await getReceivableDocumentsAction('receivable-1');
      
      expect(documentsResult.success).toBe(false);
      expect(documentsResult.error).toBe('Connection timeout');
    });

    it('should handle unauthorized access attempts', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const documentsResult = await getReceivableDocumentsAction('receivable-1');
      
      expect(documentsResult.success).toBe(false);
      expect(documentsResult.error).toBe('Authentication required');
    });
  });
});