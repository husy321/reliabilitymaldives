/**
 * @jest-environment node
 */

import { 
  previewDocumentAction, 
  downloadDocumentAction, 
  auditDocumentAccessAction,
  getDocumentAuditLogsAction 
} from '../../lib/actions/documents';
import { DocumentAccessType, DocumentCategory } from '../../../types/document';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../lib/auth', () => ({
  getSession: jest.fn()
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    document: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    documentAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}));

jest.mock('../../lib/utils/ipUtils', () => ({
  getClientIP: jest.fn(() => '127.0.0.1')
}));

import { getSession } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { getClientIP } from '../../lib/utils/ipUtils';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetClientIP = getClientIP as jest.MockedFunction<typeof getClientIP>;

const mockSession = {
  user: {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com'
  }
};

const mockDocument = {
  id: 'test-doc-1',
  originalName: 'test-document.pdf',
  storedPath: '/uploads/test-document.pdf',
  category: DocumentCategory.INVOICE,
  fileSize: 1024000,
  mimeType: 'application/pdf',
  fileHash: 'abc123',
  ipAddress: '127.0.0.1',
  uploadedById: 'test-user-1',
  linkedToCustomerId: null,
  linkedToReceivableId: null,
  linkedToSalesReportId: null,
  createdAt: new Date('2025-09-09T10:00:00Z'),
  updatedAt: new Date('2025-09-09T10:00:00Z'),
  uploadedBy: {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com'
  }
};

const mockUser = {
  id: 'test-user-1',
  role: UserRole.ADMIN,
  name: 'Test User',
  email: 'test@example.com'
};

describe('Document Preview and Download Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientIP.mockReturnValue('127.0.0.1');
  });

  describe('previewDocumentAction', () => {
    it('returns preview data for valid document and authorized user', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.documentAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.PREVIEW,
        accessedAt: new Date(),
        userRole: UserRole.ADMIN,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: mockUser
      });

      const result = await previewDocumentAction('test-doc-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.document.id).toBe('test-doc-1');
        expect(result.data.previewUrl).toBe('/api/documents/test-doc-1/preview');
      }
      expect(mockPrisma.documentAuditLog.create).toHaveBeenCalledWith({
        data: {
          documentId: 'test-doc-1',
          userId: 'test-user-1',
          accessType: DocumentAccessType.PREVIEW,
          userRole: UserRole.ADMIN,
          userAgent: 'Unknown',
          ipAddress: '127.0.0.1'
        },
        include: {
          document: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('returns error for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await previewDocumentAction('test-doc-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Authentication required');
      }
    });

    it('returns error for non-existent document', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue(null);

      const result = await previewDocumentAction('test-doc-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Document not found');
      }
    });

    it('checks role-based access for SALES user', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockDocument,
        category: DocumentCategory.INVOICE, // SALES user shouldn't access invoices they didn't upload
        uploadedById: 'other-user-1'
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.SALES
      });

      const result = await previewDocumentAction('test-doc-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Access denied');
      }
    });

    it('allows SALES user to access their own uploads', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.SALES
      });
      mockPrisma.documentAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.PREVIEW,
        accessedAt: new Date(),
        userRole: UserRole.SALES,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: { ...mockUser, role: UserRole.SALES }
      });

      const result = await previewDocumentAction('test-doc-1');

      expect(result.success).toBe(true);
    });
  });

  describe('downloadDocumentAction', () => {
    it('returns download data for valid document and authorized user', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.documentAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.DOWNLOAD,
        accessedAt: new Date(),
        userRole: UserRole.ADMIN,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: mockUser
      });

      const result = await downloadDocumentAction('test-doc-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filename).toBe('test-document.pdf');
        expect(result.data.fileSize).toBe(1024000);
        expect(result.data.downloadUrl).toBe('/api/documents/test-doc-1/download');
      }
    });

    it('creates audit log for download', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.documentAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.DOWNLOAD,
        accessedAt: new Date(),
        userRole: UserRole.ADMIN,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: mockUser
      });

      await downloadDocumentAction('test-doc-1');

      // Should call audit twice - once for preview (access check) and once for download
      expect(mockPrisma.documentAuditLog.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.documentAuditLog.create).toHaveBeenCalledWith({
        data: {
          documentId: 'test-doc-1',
          userId: 'test-user-1',
          accessType: DocumentAccessType.DOWNLOAD,
          userRole: UserRole.ADMIN,
          userAgent: 'Unknown',
          ipAddress: '127.0.0.1'
        },
        include: {
          document: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });
  });

  describe('auditDocumentAccessAction', () => {
    it('creates audit log entry successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.documentAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.PREVIEW,
        accessedAt: new Date(),
        userRole: UserRole.ADMIN,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: mockUser
      });

      const result = await auditDocumentAccessAction('test-doc-1', DocumentAccessType.PREVIEW);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documentId).toBe('test-doc-1');
        expect(result.data.accessType).toBe(DocumentAccessType.PREVIEW);
        expect(result.data.userRole).toBe(UserRole.ADMIN);
      }
    });

    it('returns error for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await auditDocumentAccessAction('test-doc-1', DocumentAccessType.PREVIEW);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Authentication required');
      }
    });
  });

  describe('getDocumentAuditLogsAction', () => {
    it('returns audit logs for admin user', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const mockAuditLogs = [{
        id: 'audit-1',
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        accessType: DocumentAccessType.PREVIEW,
        accessedAt: new Date(),
        userRole: UserRole.ADMIN,
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1',
        document: mockDocument,
        user: mockUser
      }];

      mockPrisma.documentAuditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrisma.documentAuditLog.count.mockResolvedValue(1);

      const result = await getDocumentAuditLogsAction({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.auditLogs).toHaveLength(1);
        expect(result.data.totalCount).toBe(1);
      }
    });

    it('returns error for non-admin user', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.SALES
      });

      const result = await getDocumentAuditLogsAction({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Admin access required');
      }
    });

    it('applies filters correctly', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.documentAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.documentAuditLog.count.mockResolvedValue(0);

      const filters = {
        documentId: 'test-doc-1',
        accessType: DocumentAccessType.DOWNLOAD
      };

      await getDocumentAuditLogsAction(filters);

      expect(mockPrisma.documentAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          documentId: 'test-doc-1',
          accessType: DocumentAccessType.DOWNLOAD
        },
        include: {
          document: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { accessedAt: 'desc' },
        take: 100
      });
    });
  });
});