import { uploadDocumentActionWithDetection } from '../../lib/actions/documents';
import { DocumentCategory } from '../../../types/document';
import { detectCategoriesForFiles } from '../../lib/services/documentCategorization';

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../../lib/prisma');
jest.mock('../../lib/validation/fileValidation');
jest.mock('../../lib/utils/ipUtils');
jest.mock('../../lib/services/documentCategorization');
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('next/cache');

const mockGetSession = require('../../lib/auth').getSession as jest.MockedFunction<typeof import('../../lib/auth').getSession>;
const mockPrisma = require('../../lib/prisma').prisma;
const mockValidateFiles = require('../../lib/validation/fileValidation').validateFiles as jest.MockedFunction<typeof import('../../lib/validation/fileValidation').validateFiles>;
const mockGetClientIP = require('../../lib/utils/ipUtils').getClientIP as jest.MockedFunction<typeof import('../../lib/utils/ipUtils').getClientIP>;
const mockDetectCategoriesForFiles = detectCategoriesForFiles as jest.MockedFunction<typeof detectCategoriesForFiles>;
const mockWriteFile = require('fs/promises').writeFile as jest.MockedFunction<typeof import('fs/promises').writeFile>;
const mockMkdir = require('fs/promises').mkdir as jest.MockedFunction<typeof import('fs/promises').mkdir>;
const mockExistsSync = require('fs').existsSync as jest.MockedFunction<typeof import('fs').existsSync>;
const mockRevalidatePath = require('next/cache').revalidatePath as jest.MockedFunction<typeof import('next/cache').revalidatePath>;

describe('uploadDocumentActionWithDetection', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockSession = {
    user: mockUser,
    expires: '2024-12-31'
  };

  const mockFiles = [
    new File(['content1'], 'DO.1234/23.pdf', { type: 'application/pdf' }),
    new File(['content2'], 'PO.5678/24.pdf', { type: 'application/pdf' }),
    new File(['content3'], 'unknown-file.pdf', { type: 'application/pdf' })
  ];

  const mockCategoryDetections = [
    {
      filename: 'DO.1234/23.pdf',
      detectedCategory: DocumentCategory.DELIVERY_ORDER,
      confidence: 'HIGH' as const,
      isAmbiguous: false,
      pattern: '^DO\\.\\d{4}\\/\\d{2}$'
    },
    {
      filename: 'PO.5678/24.pdf',
      detectedCategory: DocumentCategory.PURCHASE_ORDER,
      confidence: 'HIGH' as const,
      isAmbiguous: false,
      pattern: '^PO\\.\\d{4}\\/\\d{2}$'
    },
    {
      filename: 'unknown-file.pdf',
      detectedCategory: DocumentCategory.OTHER,
      confidence: 'LOW' as const,
      isAmbiguous: false
    }
  ];

  const mockValidationResult = {
    isValid: true,
    errors: [],
    results: [
      { fileHash: 'hash1' },
      { fileHash: 'hash2' },
      { fileHash: 'hash3' }
    ]
  };

  const mockDocuments = [
    {
      id: 'doc-1',
      originalName: 'DO.1234/23.pdf',
      storedPath: 'uploads/delivery_order/timestamp-DO_1234_23.pdf',
      category: DocumentCategory.DELIVERY_ORDER,
      fileSize: 1000,
      mimeType: 'application/pdf',
      fileHash: 'hash1',
      ipAddress: '127.0.0.1',
      uploadedById: 'user-123',
      linkedToCustomerId: null,
      linkedToReceivableId: null,
      linkedToSalesReportId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'doc-2',
      originalName: 'PO.5678/24.pdf',
      storedPath: 'uploads/purchase_order/timestamp-PO_5678_24.pdf',
      category: DocumentCategory.PURCHASE_ORDER,
      fileSize: 2000,
      mimeType: 'application/pdf',
      fileHash: 'hash2',
      ipAddress: '127.0.0.1',
      uploadedById: 'user-123',
      linkedToCustomerId: null,
      linkedToReceivableId: null,
      linkedToSalesReportId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'doc-3',
      originalName: 'unknown-file.pdf',
      storedPath: 'uploads/other/timestamp-unknown-file.pdf',
      category: DocumentCategory.OTHER,
      fileSize: 3000,
      mimeType: 'application/pdf',
      fileHash: 'hash3',
      ipAddress: '127.0.0.1',
      uploadedById: 'user-123',
      linkedToCustomerId: null,
      linkedToReceivableId: null,
      linkedToSalesReportId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetSession.mockResolvedValue(mockSession);
    mockGetClientIP.mockReturnValue('127.0.0.1');
    mockValidateFiles.mockResolvedValue(mockValidationResult);
    mockDetectCategoriesForFiles.mockReturnValue(mockCategoryDetections);
    mockExistsSync.mockReturnValue(false);
    mockWriteFile.mockResolvedValue();
    mockMkdir.mockResolvedValue(undefined);
    mockRevalidatePath.mockImplementation(() => {});
    
    // Mock Prisma user lookup
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    
    // Mock Prisma document creation
    mockPrisma.document.create
      .mockResolvedValueOnce(mockDocuments[0])
      .mockResolvedValueOnce(mockDocuments[1])
      .mockResolvedValueOnce(mockDocuments[2]);
  });

  describe('Authentication and Validation', () => {
    test('requires authentication', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const formData = new FormData();
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('requires files to be provided', async () => {
      const formData = new FormData();
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No files provided');
    });

    test('handles file validation failures', async () => {
      mockValidateFiles.mockResolvedValue({
        isValid: false,
        errors: [
          { fileName: 'test.pdf', message: 'File too large' }
        ],
        results: []
      });
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File validation failed');
    });
  });

  describe('Pattern Recognition Integration', () => {
    test('performs automatic category detection', async () => {
      const formData = new FormData();
      mockFiles.forEach(file => formData.append('files', file));
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(mockDetectCategoriesForFiles).toHaveBeenCalledWith(mockFiles);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryDetections).toEqual(mockCategoryDetections);
      }
    });

    test('uses automatic detection when no confirmed categories provided', async () => {
      const formData = new FormData();
      mockFiles.forEach(file => formData.append('files', file));
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documents[0].category).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.data.documents[1].category).toBe(DocumentCategory.PURCHASE_ORDER);
        expect(result.data.documents[2].category).toBe(DocumentCategory.OTHER);
      }
    });

    test('uses confirmed categories when provided', async () => {
      const formData = new FormData();
      mockFiles.forEach(file => formData.append('files', file));
      
      const confirmedCategories = [
        { filename: 'DO.1234/23.pdf', category: DocumentCategory.INVOICE },
        { filename: 'PO.5678/24.pdf', category: DocumentCategory.SALES_RECEIPT },
        { filename: 'unknown-file.pdf', category: DocumentCategory.DELIVERY_ORDER }
      ];
      
      // Mock document creation with confirmed categories
      const mockConfirmedDocs = [
        { ...mockDocuments[0], category: DocumentCategory.INVOICE },
        { ...mockDocuments[1], category: DocumentCategory.SALES_RECEIPT },
        { ...mockDocuments[2], category: DocumentCategory.DELIVERY_ORDER }
      ];
      
      mockPrisma.document.create
        .mockResolvedValueOnce(mockConfirmedDocs[0])
        .mockResolvedValueOnce(mockConfirmedDocs[1])
        .mockResolvedValueOnce(mockConfirmedDocs[2]);
      
      const result = await uploadDocumentActionWithDetection(formData, confirmedCategories);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documents[0].category).toBe(DocumentCategory.INVOICE);
        expect(result.data.documents[1].category).toBe(DocumentCategory.SALES_RECEIPT);
        expect(result.data.documents[2].category).toBe(DocumentCategory.DELIVERY_ORDER);
        // Should still return original detection results for UI feedback
        expect(result.data.categoryDetections).toEqual(mockCategoryDetections);
      }
    });
  });

  describe('File Storage Organization', () => {
    test('stores files in category-specific directories', async () => {
      const formData = new FormData();
      mockFiles.forEach(file => formData.append('files', file));
      
      await uploadDocumentActionWithDetection(formData);
      
      // Verify directories were created for each category
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/delivery_order'),
        { recursive: true }
      );
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/purchase_order'),
        { recursive: true }
      );
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/other'),
        { recursive: true }
      );
    });

    test('skips directory creation if directory exists', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      await uploadDocumentActionWithDetection(formData);
      
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    test('generates safe filenames with timestamps', async () => {
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      // Mock Date.now to return consistent timestamp
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      await uploadDocumentActionWithDetection(formData);
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(`${mockTimestamp}-DO_1234_23.pdf`),
        expect.any(Buffer)
      );
      
      Date.now = jest.fn().mockRestore();
    });
  });

  describe('Database Integration', () => {
    test('creates documents with detected categories', async () => {
      const formData = new FormData();
      mockFiles.forEach(file => formData.append('files', file));
      formData.append('customerId', 'customer-123');
      
      await uploadDocumentActionWithDetection(formData);
      
      expect(mockPrisma.document.create).toHaveBeenCalledTimes(3);
      
      // Verify first document creation
      expect(mockPrisma.document.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          originalName: 'DO.1234/23.pdf',
          category: DocumentCategory.DELIVERY_ORDER,
          linkedToCustomerId: 'customer-123',
          uploadedById: 'user-123'
        })
      });
    });

    test('handles database user lookup failure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User account not found');
    });

    test('revalidates relevant paths after successful upload', async () => {
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      await uploadDocumentActionWithDetection(formData);
      
      expect(mockRevalidatePath).toHaveBeenCalledWith('/documents');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Error Handling', () => {
    test('handles foreign key constraint errors', async () => {
      const fkError = new Error('Foreign key constraint failed');
      mockPrisma.document.create.mockRejectedValue(fkError);
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication error');
    });

    test('handles uploadedById constraint errors', async () => {
      const uploadError = new Error('uploadedById constraint failed');
      mockPrisma.document.create.mockRejectedValue(uploadError);
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    test('handles general errors gracefully', async () => {
      const generalError = new Error('Something went wrong');
      mockPrisma.document.create.mockRejectedValue(generalError);
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    test('handles unknown errors', async () => {
      mockPrisma.document.create.mockRejectedValue('Unknown error');
      
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload documents');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles empty confirmed categories array', async () => {
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const result = await uploadDocumentActionWithDetection(formData, []);
      
      expect(result.success).toBe(true);
      // Should fall back to automatic detection
      expect(mockDetectCategoriesForFiles).toHaveBeenCalled();
    });

    test('handles mismatched filename in confirmed categories', async () => {
      const formData = new FormData();
      formData.append('files', mockFiles[0]);
      
      const confirmedCategories = [
        { filename: 'different-file.pdf', category: DocumentCategory.INVOICE }
      ];
      
      const result = await uploadDocumentActionWithDetection(formData, confirmedCategories);
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Should fall back to OTHER category for unmatched file
        expect(result.data.documents[0].category).toBe(DocumentCategory.OTHER);
      }
    });

    test('processes large number of files efficiently', async () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => 
        new File(['content'], `DO.${String(i).padStart(4, '0')}/23.pdf`, { type: 'application/pdf' })
      );
      
      const manyDetections = manyFiles.map(file => ({
        filename: file.name,
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'HIGH' as const,
        isAmbiguous: false,
        pattern: '^DO\\.\\d{4}\\/\\d{2}$'
      }));
      
      mockDetectCategoriesForFiles.mockReturnValue(manyDetections);
      
      // Mock many document creations
      const manyDocs = manyFiles.map((file, i) => ({
        ...mockDocuments[0],
        id: `doc-${i}`,
        originalName: file.name
      }));
      
      manyDocs.forEach(doc => {
        mockPrisma.document.create.mockResolvedValueOnce(doc);
      });
      
      const formData = new FormData();
      manyFiles.forEach(file => formData.append('files', file));
      
      const startTime = Date.now();
      const result = await uploadDocumentActionWithDetection(formData);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time
      if (result.success) {
        expect(result.data.documents).toHaveLength(100);
        expect(result.data.categoryDetections).toHaveLength(100);
      }
    });
  });
});


