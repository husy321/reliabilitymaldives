'use server';

import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActionResult, DocumentCategory, Document, UploadDocumentWithDetectionResult, DocumentWithUser, GetDocumentsParams, GetDocumentsResult, DocumentAccessType, DocumentAuditLog, DocumentAuditFilters } from '../../../types/document';
import { UserRole } from '@prisma/client';
import { validateFiles } from '@/lib/validation/fileValidation';
import { getClientIP } from '@/lib/utils/ipUtils';
import { detectCategoriesForFiles } from '@/lib/services/documentCategorization';

/**
 * Server Action for uploading documents with comprehensive validation and security
 */
export async function uploadDocumentAction(formData: FormData): Promise<ActionResult<Document[]>> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Extract form data
    const files = formData.getAll('files') as File[];
    const category = formData.get('category') as DocumentCategory;
    const customerId = formData.get('customerId') as string | null;
    const receivableId = formData.get('receivableId') as string | null;
    const salesReportId = formData.get('salesReportId') as string | null;

    // Get client IP for security audit
    const clientIP = await getClientIP();

    // Validate required fields
    if (!files || files.length === 0) {
      return {
        success: false,
        error: 'No files provided'
      };
    }

    if (!category || !Object.values(DocumentCategory).includes(category)) {
      return {
        success: false,
        error: 'Valid document category required'
      };
    }

    // Comprehensive file validation
    const validationResult = await validateFiles(files);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(error => 
        `${error.fileName}: ${error.message}`
      ).join('; ');
      return {
        success: false,
        error: `File validation failed: ${errorMessages}`
      };
    }

    // Process files and create database records
    const uploadedDocuments: Document[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationData = validationResult.results[i];

      // Generate safe filename
      const timestamp = Date.now();
      const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Create category directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'uploads', category.toLowerCase());
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, safeFileName);
      const storedPath = `uploads/${category.toLowerCase()}/${safeFileName}`;

      // Convert file to buffer and write to filesystem
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Verify user exists in database before creating document
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!userExists) {
        console.error('User not found in database:', session.user.id);
        return {
          success: false,
          error: 'User account not found'
        };
      }
      
      // Create database record with enhanced metadata
      const document = await prisma.document.create({
        data: {
          originalName: file.name,
          storedPath,
          category,
          fileSize: file.size,
          mimeType: file.type,
          fileHash: validationData.fileHash || null,
          ipAddress: clientIP,
          uploadedById: session.user.id,
          linkedToCustomerId: customerId || null,
          linkedToReceivableId: receivableId || null,
          linkedToSalesReportId: salesReportId || null
        }
      });

      uploadedDocuments.push({
        id: document.id,
        originalName: document.originalName,
        storedPath: document.storedPath,
        category: document.category as DocumentCategory,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        fileHash: document.fileHash,
        ipAddress: document.ipAddress,
        uploadedById: document.uploadedById,
        linkedToCustomerId: document.linkedToCustomerId,
        linkedToReceivableId: document.linkedToReceivableId,
        linkedToSalesReportId: document.linkedToSalesReportId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      });
    }

    // Revalidate relevant paths
    revalidatePath('/documents');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: uploadedDocuments
    };

  } catch (error) {
    console.error('Document upload error:', error);
    
    // Handle specific database constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          error: 'Authentication error: User account not found. Please log in again.'
        };
      }
      if (error.message.includes('uploadedById')) {
        return {
          success: false,
          error: 'Authentication required. Please log in to upload documents.'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload documents'
    };
  }
}

/**
 * Enhanced Server Action for uploading documents with automatic pattern recognition
 * This function detects document categories based on filename patterns and returns both
 * the uploaded documents and the category detection results for UI feedback
 */
export async function uploadDocumentActionWithDetection(
  formData: FormData,
  confirmedCategories?: { filename: string; category: DocumentCategory }[]
): Promise<ActionResult<UploadDocumentWithDetectionResult>> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Extract form data
    const files = formData.getAll('files') as File[];
    const customerId = formData.get('customerId') as string | null;
    const receivableId = formData.get('receivableId') as string | null;
    const salesReportId = formData.get('salesReportId') as string | null;

    // Get client IP for security audit
    const clientIP = await getClientIP();

    // Validate required fields
    if (!files || files.length === 0) {
      return {
        success: false,
        error: 'No files provided'
      };
    }

    // Comprehensive file validation
    const validationResult = await validateFiles(files);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(error => 
        `${error.fileName}: ${error.message}`
      ).join('; ');
      return {
        success: false,
        error: `File validation failed: ${errorMessages}`
      };
    }

    // Perform pattern recognition for category detection
    const categoryDetections = detectCategoriesForFiles(files);

    // Create category mapping from confirmed categories or detection results
    const categoryMap = new Map<string, DocumentCategory>();
    
    if (confirmedCategories && confirmedCategories.length > 0) {
      // Use confirmed categories from UI
      confirmedCategories.forEach(({ filename, category }) => {
        categoryMap.set(filename, category);
      });
    } else {
      // Use automatic detection results
      categoryDetections.forEach(detection => {
        categoryMap.set(detection.filename, detection.detectedCategory);
      });
    }

    // Process files and create database records
    const uploadedDocuments: Document[] = [];

    // Verify user exists in database before processing any files
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!userExists) {
      console.error('User not found in database:', session.user.id);
      return {
        success: false,
        error: 'User account not found'
      };
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationData = validationResult.results[i];
      const detectedCategory = categoryMap.get(file.name) || DocumentCategory.OTHER;

      // Generate safe filename
      const timestamp = Date.now();
      const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Create category directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'uploads', detectedCategory.toLowerCase());
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, safeFileName);
      const storedPath = `uploads/${detectedCategory.toLowerCase()}/${safeFileName}`;

      // Convert file to buffer and write to filesystem
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      // Create database record with detected/confirmed category
      const document = await prisma.document.create({
        data: {
          originalName: file.name,
          storedPath,
          category: detectedCategory,
          fileSize: file.size,
          mimeType: file.type,
          fileHash: validationData.fileHash || null,
          ipAddress: clientIP,
          uploadedById: session.user.id,
          linkedToCustomerId: customerId || null,
          linkedToReceivableId: receivableId || null,
          linkedToSalesReportId: salesReportId || null
        }
      });

      uploadedDocuments.push({
        id: document.id,
        originalName: document.originalName,
        storedPath: document.storedPath,
        category: document.category as DocumentCategory,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        fileHash: document.fileHash,
        ipAddress: document.ipAddress,
        uploadedById: document.uploadedById,
        linkedToCustomerId: document.linkedToCustomerId,
        linkedToReceivableId: document.linkedToReceivableId,
        linkedToSalesReportId: document.linkedToSalesReportId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      });
    }

    // Revalidate relevant paths
    revalidatePath('/documents');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        documents: uploadedDocuments,
        categoryDetections
      }
    };

  } catch (error) {
    console.error('Document upload with detection error:', error);
    
    // Handle specific database constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return {
          success: false,
          error: 'Authentication error: User account not found. Please log in again.'
        };
      }
      if (error.message.includes('uploadedById')) {
        return {
          success: false,
          error: 'Authentication required. Please log in to upload documents.'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload documents'
    };
  }
}

/**
 * Enhanced Server Action to get documents with role-based filtering, pagination and sorting
 */
export async function getDocumentsAction(params: GetDocumentsParams = {}): Promise<ActionResult<GetDocumentsResult>> {
  try {
    let session = await getSession();
    
    // Development fallback for authentication
    if (!session?.user?.id && process.env.NODE_ENV === 'development') {
      console.log('No session found, creating mock session for development');
      session = {
        user: {
          id: 'dev-user-1',
          name: 'Development User',
          email: 'dev@example.com',
          role: 'ADMIN'
        }
      } as any;
    }
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Development fallback - return mock data if database is not available
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      try {
        // Test database connection first
        await prisma.$connect();
      } catch {
        console.log('Database not available, returning mock data for development');
        // Return mock data for development
        const mockDocuments: DocumentWithUser[] = [
          {
            id: 'mock-1',
            originalName: 'sample-invoice.pdf',
            storedPath: '/uploads/invoice/sample-invoice.pdf',
            category: DocumentCategory.INVOICE,
            fileSize: 1024000,
            mimeType: 'application/pdf',
            fileHash: 'abc123',
            ipAddress: '127.0.0.1',
            uploadedById: session.user.id,
            linkedToCustomerId: null,
            linkedToReceivableId: null,
            linkedToSalesReportId: null,
            createdAt: new Date('2025-09-08T10:00:00Z'),
            updatedAt: new Date('2025-09-08T10:00:00Z'),
            uploadedBy: {
              id: session.user.id,
              name: session.user.name || 'Current User',
              email: session.user.email || 'user@example.com'
            }
          },
          {
            id: 'mock-2',
            originalName: 'purchase-order-001.pdf',
            storedPath: '/uploads/purchase_order/purchase-order-001.pdf',
            category: DocumentCategory.PURCHASE_ORDER,
            fileSize: 512000,
            mimeType: 'application/pdf',
            fileHash: 'def456',
            ipAddress: '127.0.0.1',
            uploadedById: 'other-user',
            linkedToCustomerId: null,
            linkedToReceivableId: null,
            linkedToSalesReportId: null,
            createdAt: new Date('2025-09-07T15:30:00Z'),
            updatedAt: new Date('2025-09-07T15:30:00Z'),
            uploadedBy: {
              id: 'other-user',
              name: 'Jane Smith',
              email: 'jane@example.com'
            }
          }
        ];

        return {
          success: true,
          data: {
            documents: mockDocuments,
            totalCount: mockDocuments.length,
            page: params.page || 1,
            pageSize: params.pageSize || 10
          }
        };
      }
    }

    const {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
      searchTerm,
      filenameSearch,
      categoryFilter,
      uploadDateRange,
      uploadedBySearch
    } = params;

    // Calculate offset for pagination
    const skip = (page - 1) * pageSize;

    // Build role-based WHERE clause  
    let whereClause: Record<string, any> = {};
    
    // Get current user with role information
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Role-based document access control
    switch (currentUser.role) {
      case UserRole.ADMIN:
        // Admin can see all documents
        break;
      case UserRole.SALES:
        // Sales can see sales-related documents + own uploads
        whereClause = {
          OR: [
            { uploadedById: session.user.id },
            { 
              category: {
                in: [DocumentCategory.SALES_RECEIPT, DocumentCategory.DELIVERY_ORDER, DocumentCategory.PURCHASE_ORDER]
              }
            }
          ]
        };
        break;
      case UserRole.ACCOUNTS:
      case UserRole.ACCOUNTANT:
        // Accounts can see financial documents + own uploads
        whereClause = {
          OR: [
            { uploadedById: session.user.id },
            { 
              category: {
                in: [DocumentCategory.INVOICE, DocumentCategory.SALES_RECEIPT]
              }
            }
          ]
        };
        break;
      case UserRole.MANAGER:
        // Managers can see all categories + own uploads
        whereClause = {
          OR: [
            { uploadedById: session.user.id },
            { 
              category: {
                in: [DocumentCategory.INVOICE, DocumentCategory.SALES_RECEIPT, DocumentCategory.DELIVERY_ORDER, DocumentCategory.PURCHASE_ORDER]
              }
            }
          ]
        };
        break;
      default:
        // Default: only own uploads
        whereClause = { uploadedById: session.user.id };
    }

    // Apply enhanced search filters
    const searchConditions: any[] = [];

    // Legacy filter support for backward compatibility
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        whereClause.category = { in: filters.category };
      } else {
        whereClause.category = filters.category;
      }
    }
    
    if (filters.uploadedBy) {
      whereClause.uploadedById = filters.uploadedBy;
    }
    
    if (filters.filename) {
      searchConditions.push({
        originalName: { contains: filters.filename }
      });
    }
    
    if (filters.dateRange) {
      whereClause.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    // Enhanced search parameters
    if (searchTerm) {
      // Search across filename and content
      searchConditions.push({
        originalName: { contains: searchTerm }
      });
    }

    if (filenameSearch || filters.filenameSearch) {
      const searchValue = filenameSearch || filters.filenameSearch;
      if (searchValue) {
        searchConditions.push({
          originalName: { contains: searchValue }
        });
      }
    }

    if (categoryFilter || filters.categoryFilter) {
      const categories = categoryFilter || filters.categoryFilter;
      if (categories && categories.length > 0) {
        whereClause.category = { in: categories };
      }
    }

    if (uploadDateRange || filters.uploadDateRange) {
      const dateRange = uploadDateRange || filters.uploadDateRange;
      if (dateRange && (dateRange.from || dateRange.to)) {
        whereClause.createdAt = {};
        if (dateRange.from) {
          whereClause.createdAt.gte = dateRange.from;
        }
        if (dateRange.to) {
          whereClause.createdAt.lte = dateRange.to;
        }
      }
    }

    if (uploadedBySearch) {
      // Search by uploader name or email
      whereClause.uploadedBy = {
        OR: [
          { name: { contains: uploadedBySearch } },
          { email: { contains: uploadedBySearch } }
        ]
      };
    }

    // Apply search conditions with OR logic for filename searches
    if (searchConditions.length > 0) {
      if (searchConditions.length === 1) {
        Object.assign(whereClause, searchConditions[0]);
      } else {
        whereClause.OR = searchConditions;
      }
    }

    // Build sort order
    const orderBy: Record<string, any> = {};
    if (sortBy === 'uploadedBy') {
      orderBy.uploadedBy = { name: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Fetch documents with user information
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy,
        skip,
        take: pageSize
      }),
      prisma.document.count({
        where: whereClause
      })
    ]);

    const mappedDocuments: DocumentWithUser[] = documents.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      storedPath: doc.storedPath,
      category: doc.category as DocumentCategory,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileHash: doc.fileHash,
      ipAddress: doc.ipAddress,
      uploadedById: doc.uploadedById,
      linkedToCustomerId: doc.linkedToCustomerId,
      linkedToReceivableId: doc.linkedToReceivableId,
      linkedToSalesReportId: doc.linkedToSalesReportId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: {
        id: doc.uploadedBy.id,
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email
      }
    }));

    // Build applied filters for client-side state management
    const appliedFilters: DocumentFilters = {
      ...filters,
      filenameSearch: filenameSearch || filters.filenameSearch,
      categoryFilter: categoryFilter || filters.categoryFilter,
      uploadDateRange: uploadDateRange || filters.uploadDateRange
    };

    return {
      success: true,
      data: {
        documents: mappedDocuments,
        totalCount,
        page,
        pageSize,
        appliedFilters
      }
    };

  } catch (error) {
    console.error('Get documents error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve documents'
    };
  }
}

/**
 * Server Action for document preview with role-based access control and audit logging
 */
export async function previewDocumentAction(
  documentId: string
): Promise<ActionResult<{
  previewUrl: string;
  document: DocumentWithUser;
}>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Get document with user information
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found'
      };
    }

    // Check user access permissions (same role-based logic as getDocuments)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Role-based access control
    let hasAccess = false;
    switch (currentUser.role) {
      case UserRole.ADMIN:
        hasAccess = true;
        break;
      case UserRole.SALES:
        hasAccess = document.uploadedById === session.user.id ||
          [DocumentCategory.SALES_RECEIPT, DocumentCategory.DELIVERY_ORDER, DocumentCategory.PURCHASE_ORDER].includes(document.category as DocumentCategory);
        break;
      case UserRole.ACCOUNTS:
      case UserRole.ACCOUNTANT:
        hasAccess = document.uploadedById === session.user.id ||
          [DocumentCategory.INVOICE, DocumentCategory.SALES_RECEIPT].includes(document.category as DocumentCategory);
        break;
      case UserRole.MANAGER:
        hasAccess = document.uploadedById === session.user.id ||
          [DocumentCategory.INVOICE, DocumentCategory.SALES_RECEIPT, DocumentCategory.DELIVERY_ORDER, DocumentCategory.PURCHASE_ORDER].includes(document.category as DocumentCategory);
        break;
      default:
        hasAccess = document.uploadedById === session.user.id;
    }

    if (!hasAccess) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    // Log the preview access
    await auditDocumentAccessAction(documentId, DocumentAccessType.PREVIEW);

    // Generate secure preview URL (temporary implementation)
    const previewUrl = `/api/documents/${documentId}/preview`;

    const documentWithUser: DocumentWithUser = {
      id: document.id,
      originalName: document.originalName,
      storedPath: document.storedPath,
      category: document.category as DocumentCategory,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      fileHash: document.fileHash,
      ipAddress: document.ipAddress,
      uploadedById: document.uploadedById,
      linkedToCustomerId: document.linkedToCustomerId,
      linkedToReceivableId: document.linkedToReceivableId,
      linkedToSalesReportId: document.linkedToSalesReportId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      uploadedBy: {
        id: document.uploadedBy.id,
        name: document.uploadedBy.name,
        email: document.uploadedBy.email
      }
    };

    return {
      success: true,
      data: {
        previewUrl,
        document: documentWithUser
      }
    };

  } catch (error) {
    console.error('Document preview error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview document'
    };
  }
}

/**
 * Server Action for document download with audit logging
 */
export async function downloadDocumentAction(
  documentId: string
): Promise<ActionResult<{
  downloadUrl: string;
  filename: string;
  fileSize: number;
}>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Get document with access control check (reuse preview logic)
    const previewResult = await previewDocumentAction(documentId);
    if (!previewResult.success) {
      return {
        success: false,
        error: previewResult.error
      };
    }

    const document = previewResult.data.document;

    // Log the download access
    await auditDocumentAccessAction(documentId, DocumentAccessType.DOWNLOAD);

    // Generate secure download URL (temporary implementation)
    const downloadUrl = `/api/documents/${documentId}/download`;

    return {
      success: true,
      data: {
        downloadUrl,
        filename: document.originalName,
        fileSize: document.fileSize
      }
    };

  } catch (error) {
    console.error('Document download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download document'
    };
  }
}

/**
 * Server Action for auditing document access
 */
export async function auditDocumentAccessAction(
  documentId: string,
  accessType: DocumentAccessType
): Promise<ActionResult<DocumentAuditLog>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Get client IP and user agent
    const clientIP = await getClientIP();
    const userAgent = process.env.NODE_ENV === 'development' ? 'Development Browser' : 'Unknown';

    // Get current user role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!currentUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Create audit log entry
    const auditLog = await prisma.documentAuditLog.create({
      data: {
        documentId,
        userId: session.user.id,
        accessType,
        userRole: currentUser.role,
        userAgent,
        ipAddress: clientIP
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

    return {
      success: true,
      data: {
        id: auditLog.id,
        documentId: auditLog.documentId,
        userId: auditLog.userId,
        accessType: auditLog.accessType as DocumentAccessType,
        accessedAt: auditLog.accessedAt,
        userRole: auditLog.userRole,
        userAgent: auditLog.userAgent || undefined,
        ipAddress: auditLog.ipAddress || undefined,
        document: {
          id: auditLog.document.id,
          originalName: auditLog.document.originalName,
          storedPath: auditLog.document.storedPath,
          category: auditLog.document.category as DocumentCategory,
          fileSize: auditLog.document.fileSize,
          mimeType: auditLog.document.mimeType,
          fileHash: auditLog.document.fileHash,
          ipAddress: auditLog.document.ipAddress,
          uploadedById: auditLog.document.uploadedById,
          linkedToCustomerId: auditLog.document.linkedToCustomerId,
          linkedToReceivableId: auditLog.document.linkedToReceivableId,
          linkedToSalesReportId: auditLog.document.linkedToSalesReportId,
          createdAt: auditLog.document.createdAt,
          updatedAt: auditLog.document.updatedAt
        },
        user: {
          id: auditLog.user.id,
          name: auditLog.user.name,
          email: auditLog.user.email
        }
      }
    };

  } catch (error) {
    console.error('Document audit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to audit document access'
    };
  }
}

/**
 * Server Action to get all documents linked to a specific receivable
 */
export async function getReceivableDocumentsAction(
  receivableId: string
): Promise<ActionResult<DocumentWithUser[]>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Get current user with role information for access control
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Fetch documents linked to the receivable with user information
    const documents = await prisma.document.findMany({
      where: {
        linkedToReceivableId: receivableId
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
      orderBy: { createdAt: 'desc' }
    });

    const mappedDocuments: DocumentWithUser[] = documents.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      storedPath: doc.storedPath,
      category: doc.category as DocumentCategory,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileHash: doc.fileHash,
      ipAddress: doc.ipAddress,
      uploadedById: doc.uploadedById,
      linkedToCustomerId: doc.linkedToCustomerId,
      linkedToReceivableId: doc.linkedToReceivableId,
      linkedToSalesReportId: doc.linkedToSalesReportId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: {
        id: doc.uploadedBy.id,
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email
      }
    }));

    return {
      success: true,
      data: mappedDocuments
    };

  } catch (error) {
    console.error('Get receivable documents error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve receivable documents'
    };
  }
}

/**
 * Server Action to link an existing document to a receivable
 */
export async function linkDocumentToReceivableAction(
  documentId: string,
  receivableId: string
): Promise<ActionResult<DocumentWithUser>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Update the document to link it to the receivable
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { linkedToReceivableId: receivableId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const documentWithUser: DocumentWithUser = {
      id: updatedDocument.id,
      originalName: updatedDocument.originalName,
      storedPath: updatedDocument.storedPath,
      category: updatedDocument.category as DocumentCategory,
      fileSize: updatedDocument.fileSize,
      mimeType: updatedDocument.mimeType,
      fileHash: updatedDocument.fileHash,
      ipAddress: updatedDocument.ipAddress,
      uploadedById: updatedDocument.uploadedById,
      linkedToCustomerId: updatedDocument.linkedToCustomerId,
      linkedToReceivableId: updatedDocument.linkedToReceivableId,
      linkedToSalesReportId: updatedDocument.linkedToSalesReportId,
      createdAt: updatedDocument.createdAt,
      updatedAt: updatedDocument.updatedAt,
      uploadedBy: {
        id: updatedDocument.uploadedBy.id,
        name: updatedDocument.uploadedBy.name,
        email: updatedDocument.uploadedBy.email
      }
    };

    // Revalidate relevant paths
    revalidatePath('/receivables');
    revalidatePath('/documents');

    return {
      success: true,
      data: documentWithUser
    };

  } catch (error) {
    console.error('Link document to receivable error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link document to receivable'
    };
  }
}

/**
 * Server Action to unlink a document from a receivable (remove the link, not delete the document)
 */
export async function unlinkDocumentFromReceivableAction(
  documentId: string,
  receivableId: string
): Promise<ActionResult<void>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Verify the document is actually linked to this receivable
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        linkedToReceivableId: receivableId
      }
    });

    if (!document) {
      return {
        success: false,
        error: 'Document not found or not linked to this receivable'
      };
    }

    // Update the document to remove the receivable link
    await prisma.document.update({
      where: { id: documentId },
      data: { linkedToReceivableId: null }
    });

    // Revalidate relevant paths
    revalidatePath('/receivables');
    revalidatePath('/documents');

    return {
      success: true,
      data: undefined
    };

  } catch (error) {
    console.error('Unlink document from receivable error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink document from receivable'
    };
  }
}

/**
 * Server Action for bulk document operations for receivables
 */
export async function bulkLinkDocumentsAction(
  documentIds: string[],
  receivableId: string
): Promise<ActionResult<DocumentWithUser[]>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    if (documentIds.length === 0) {
      return {
        success: false,
        error: 'No documents provided'
      };
    }

    // Update all documents to link them to the receivable
    await prisma.document.updateMany({
      where: {
        id: { in: documentIds }
      },
      data: { linkedToReceivableId: receivableId }
    });

    // Fetch the updated documents with user information
    const updatedDocuments = await prisma.document.findMany({
      where: {
        id: { in: documentIds }
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const documentsWithUser: DocumentWithUser[] = updatedDocuments.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      storedPath: doc.storedPath,
      category: doc.category as DocumentCategory,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileHash: doc.fileHash,
      ipAddress: doc.ipAddress,
      uploadedById: doc.uploadedById,
      linkedToCustomerId: doc.linkedToCustomerId,
      linkedToReceivableId: doc.linkedToReceivableId,
      linkedToSalesReportId: doc.linkedToSalesReportId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: {
        id: doc.uploadedBy.id,
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email
      }
    }));

    // Revalidate relevant paths
    revalidatePath('/receivables');
    revalidatePath('/documents');

    return {
      success: true,
      data: documentsWithUser
    };

  } catch (error) {
    console.error('Bulk link documents error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link documents to receivable'
    };
  }
}

/**
 * Server Action to get document audit logs for admin users
 */
export async function getDocumentAuditLogsAction(
  filters: DocumentAuditFilters = {}
): Promise<ActionResult<{
  auditLogs: DocumentAuditLog[];
  totalCount: number;
}>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }

    // Build where clause from filters
    const whereClause: any = {};
    
    if (filters.documentId) {
      whereClause.documentId = filters.documentId;
    }
    
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    
    if (filters.accessType) {
      whereClause.accessType = filters.accessType;
    }
    
    if (filters.dateRange) {
      whereClause.accessedAt = {};
      if (filters.dateRange.from) {
        whereClause.accessedAt.gte = filters.dateRange.from;
      }
      if (filters.dateRange.to) {
        whereClause.accessedAt.lte = filters.dateRange.to;
      }
    }

    // Fetch audit logs
    const [auditLogs, totalCount] = await Promise.all([
      prisma.documentAuditLog.findMany({
        where: whereClause,
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
        take: 100 // Limit for performance
      }),
      prisma.documentAuditLog.count({
        where: whereClause
      })
    ]);

    const mappedAuditLogs: DocumentAuditLog[] = auditLogs.map(log => ({
      id: log.id,
      documentId: log.documentId,
      userId: log.userId,
      accessType: log.accessType as DocumentAccessType,
      accessedAt: log.accessedAt,
      userRole: log.userRole,
      userAgent: log.userAgent || undefined,
      ipAddress: log.ipAddress || undefined,
      document: {
        id: log.document.id,
        originalName: log.document.originalName,
        storedPath: log.document.storedPath,
        category: log.document.category as DocumentCategory,
        fileSize: log.document.fileSize,
        mimeType: log.document.mimeType,
        fileHash: log.document.fileHash,
        ipAddress: log.document.ipAddress,
        uploadedById: log.document.uploadedById,
        linkedToCustomerId: log.document.linkedToCustomerId,
        linkedToReceivableId: log.document.linkedToReceivableId,
        linkedToSalesReportId: log.document.linkedToSalesReportId,
        createdAt: log.document.createdAt,
        updatedAt: log.document.updatedAt
      },
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email
      }
    }));

    return {
      success: true,
      data: {
        auditLogs: mappedAuditLogs,
        totalCount
      }
    };

  } catch (error) {
    console.error('Get audit logs error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve audit logs'
    };
  }
}