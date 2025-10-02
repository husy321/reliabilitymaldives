import { uploadDocumentAction, getDocumentsAction } from '@/lib/actions/documents';
import { DocumentCategory } from '../../../types/document';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma');
jest.mock('@/lib/validation/fileValidation');
jest.mock('@/lib/utils/ipUtils');
jest.mock('next/cache');
jest.mock('fs/promises');
jest.mock('fs');

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateFiles } from '@/lib/validation/fileValidation';
import { getClientIP } from '@/lib/utils/ipUtils';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockValidateFiles = validateFiles as jest.MockedFunction<typeof validateFiles>;
const mockGetClientIP = getClientIP as jest.MockedFunction<typeof getClientIP>;

// Mock file creation helper
function createMockFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe('Document Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocumentAction', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser };

    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetClientIP.mockReturnValue('192.168.1.100');
    });

    it('should fail when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      
      const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('category', DocumentCategory.INVOICE);

      const result = await uploadDocumentAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
      expect(mockValidateFiles).not.toHaveBeenCalled();
    });

    it('should fail when no files are provided', async () => {
      const formData = new FormData();
      formData.append('category', DocumentCategory.INVOICE);

      const result = await uploadDocumentAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No files provided');
    });

    it('should fail when file validation fails', async () => {
      const files = [createMockFile('invalid.exe', 1024, 'application/octet-stream')];
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('category', DocumentCategory.INVOICE);

      mockValidateFiles.mockResolvedValue({
        isValid: false,
        errors: [{
          type: 'FILE_TYPE',
          message: 'File type not allowed',
          fileName: 'invalid.exe'
        }],
        results: []
      });

      const result = await uploadDocumentAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File validation failed');
      expect(result.error).toContain('invalid.exe: File type not allowed');
      expect(mockPrisma.document.create).not.toHaveBeenCalled();
    });

    it('should capture client IP address for audit trail', async () => {
      const files = [createMockFile('test.pdf', 1024, 'application/pdf')];
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('category', DocumentCategory.INVOICE);

      mockValidateFiles.mockResolvedValue({
        isValid: true,
        errors: [],
        results: [{ fileName: 'test.pdf', isValid: true, errors: [], fileHash: 'hash1' }]
      });

      mockGetClientIP.mockReturnValue('10.0.0.1');
      mockPrisma.document.create.mockResolvedValue({ ipAddress: '10.0.0.1' } as unknown as any);

      await uploadDocumentAction(formData);

      expect(mockGetClientIP).toHaveBeenCalled();
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '10.0.0.1'
        })
      });
    });
  });

  describe('getDocumentsAction', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser };

    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
    });

    it('should retrieve user documents successfully', async () => {
      const mockDocs = [{
        id: 'doc-1',
        originalName: 'test.pdf',
        category: DocumentCategory.INVOICE,
        uploadedById: 'user-123',
        fileHash: 'hash1',
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockPrisma.document.findMany.mockResolvedValue(mockDocs as unknown as any);

      const result = await getDocumentsAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('doc-1');
    });

    it('should fail when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getDocumentsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });
});
