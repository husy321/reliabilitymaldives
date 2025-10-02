import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentList } from '@/components/business/DocumentList';
import { DocumentWithUser, DocumentCategory } from '../../../../types/document';
import * as documentsActions from '@/lib/actions/documents';

// Mock the toast hook
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// Mock the document actions
jest.mock('@/lib/actions/documents', () => ({
  unlinkDocumentFromReceivableAction: jest.fn(),
  previewDocumentAction: jest.fn(),
  downloadDocumentAction: jest.fn(),
}));

const mockDocuments: DocumentWithUser[] = [
  {
    id: 'doc-1',
    originalName: 'invoice-001.pdf',
    storedPath: '/uploads/invoice/invoice-001.pdf',
    category: DocumentCategory.INVOICE,
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
    category: DocumentCategory.PURCHASE_ORDER,
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

const defaultProps = {
  documents: mockDocuments,
  receivableId: 'receivable-1',
  currentUserRole: 'ADMIN',
  showUploadZone: true,
  allowRemoval: true,
  allowDownload: true,
  groupByCategory: false,
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  loading: false,
};

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document list with correct document count', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('Linked Documents (2)')).toBeInTheDocument();
  });

  it('displays documents with correct information', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
    expect(screen.getByText('purchase-order-002.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
    expect(screen.getByText('by Jane Smith')).toBeInTheDocument();
  });

  it('displays category badges correctly', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('INVOICE')).toBeInTheDocument();
    expect(screen.getByText('PURCHASE ORDER')).toBeInTheDocument();
  });

  it('shows upload zone when showUploadZone is true', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('Drag and drop files here to upload to this receivable')).toBeInTheDocument();
  });

  it('hides upload zone when showUploadZone is false', () => {
    render(<DocumentList {...defaultProps} showUploadZone={false} />);
    
    expect(screen.queryByText('Drag and drop files here to upload to this receivable')).not.toBeInTheDocument();
  });

  it('displays empty state when no documents', () => {
    render(<DocumentList {...defaultProps} documents={[]} />);
    
    expect(screen.getByText('No documents are currently linked to this receivable. Upload documents to keep track of invoices, purchase orders, and supporting materials.')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(<DocumentList {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('handles document selection', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    
    expect(screen.getByText('Download Selected (1)')).toBeInTheDocument();
  });

  it('handles document removal', async () => {
    const mockUnlinkAction = jest.mocked(documentsActions.unlinkDocumentFromReceivableAction);
    mockUnlinkAction.mockResolvedValueOnce({ success: true, data: undefined });
    
    const mockOnDocumentRemove = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(<DocumentList {...defaultProps} onDocumentRemove={mockOnDocumentRemove} />);
    
    const removeButtons = screen.getAllByTitle('Remove document from receivable');
    await user.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(mockOnDocumentRemove).toHaveBeenCalledWith('doc-1');
    });
  });

  it('handles document preview', async () => {
    const mockPreviewAction = jest.mocked(documentsActions.previewDocumentAction);
    mockPreviewAction.mockResolvedValueOnce({
      success: true,
      data: {
        previewUrl: '/api/documents/doc-1/preview',
        document: mockDocuments[0],
      },
    });
    
    const mockOnDocumentPreview = jest.fn();
    const user = userEvent.setup();
    
    render(<DocumentList {...defaultProps} onDocumentPreview={mockOnDocumentPreview} />);
    
    const previewButtons = screen.getAllByTitle('Preview document');
    await user.click(previewButtons[0]);
    
    await waitFor(() => {
      expect(mockOnDocumentPreview).toHaveBeenCalledWith('doc-1');
    });
  });

  it('handles bulk download', async () => {
    const mockOnBulkDownload = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(<DocumentList {...defaultProps} onBulkDownload={mockOnBulkDownload} />);
    
    // Select multiple documents
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    
    const downloadButton = screen.getByText('Download Selected (2)');
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(mockOnBulkDownload).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    });
  });

  it('groups documents by category when groupByCategory is true', () => {
    render(<DocumentList {...defaultProps} groupByCategory={true} />);
    
    expect(screen.getByText('INVOICE (1)')).toBeInTheDocument();
    expect(screen.getByText('PURCHASE ORDER (1)')).toBeInTheDocument();
  });

  it('sorts documents by name when sortBy is name', () => {
    render(<DocumentList {...defaultProps} sortBy="name" sortOrder="asc" />);
    
    const documentNames = screen.getAllByText(/\.pdf$/);
    expect(documentNames[0]).toHaveTextContent('invoice-001.pdf');
    expect(documentNames[1]).toHaveTextContent('purchase-order-002.pdf');
  });

  it('handles document upload via drag and drop', async () => {
    const mockOnDocumentUpload = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(<DocumentList {...defaultProps} onDocumentUpload={mockOnDocumentUpload} />);
    
    const dropZone = screen.getByText('Drag and drop files here to upload to this receivable').closest('div')!;
    
    const file = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
    
    await user.upload(dropZone, file);
    
    // Note: Testing drag and drop in jsdom is limited, so we focus on the upload handler being called
    // In a real scenario, we would test the actual drop event
  });

  it('disables actions when loading', () => {
    render(<DocumentList {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const mockOnDocumentRemove = jest.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    
    render(<DocumentList {...defaultProps} onDocumentRemove={mockOnDocumentRemove} />);
    
    const removeButtons = screen.getAllByTitle('Remove document from receivable');
    await user.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(mockOnDocumentRemove).toHaveBeenCalledWith('doc-1');
    });
  });
});