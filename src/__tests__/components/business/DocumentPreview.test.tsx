import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentPreview from '../../../components/business/DocumentPreview';
import { DocumentWithUser, DocumentCategory } from '../../../../types/document';

// Mock the UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h1 data-testid="dialog-title">{children}</h1>,
  DialogClose: ({ children }: any) => <div data-testid="dialog-close">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value}></div>,
}));

const mockDocument: DocumentWithUser = {
  id: 'test-doc-1',
  originalName: 'test-document.pdf',
  storedPath: '/uploads/test-document.pdf',
  category: DocumentCategory.INVOICE,
  fileSize: 1024000,
  mimeType: 'application/pdf',
  fileHash: 'abc123',
  ipAddress: '127.0.0.1',
  uploadedById: 'user-1',
  linkedToCustomerId: null,
  linkedToReceivableId: null,
  linkedToSalesReportId: null,
  createdAt: new Date('2025-09-09T10:00:00Z'),
  updatedAt: new Date('2025-09-09T10:00:00Z'),
  uploadedBy: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  }
};

const defaultProps = {
  document: mockDocument,
  isOpen: true,
  onClose: jest.fn(),
  onDownload: jest.fn(),
  currentUserRole: 'ADMIN'
};

describe('DocumentPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document preview dialog when open', () => {
    render(<DocumentPreview {...defaultProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('test-document.pdf');
    expect(screen.getByTestId('badge')).toHaveTextContent('INVOICE');
  });

  it('does not render dialog when closed', () => {
    render(<DocumentPreview {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays document metadata correctly', () => {
    render(<DocumentPreview {...defaultProps} />);
    
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('application/pdf')).toBeInTheDocument();
  });

  it('calls onDownload when download button is clicked', async () => {
    const onDownloadMock = jest.fn().mockResolvedValue(undefined);
    render(<DocumentPreview {...defaultProps} onDownload={onDownloadMock} />);
    
    const downloadButton = screen.getByTitle('Download document');
    fireEvent.click(downloadButton);
    
    expect(onDownloadMock).toHaveBeenCalledWith('test-doc-1');
  });

  it('shows loading state during download', () => {
    const downloadProgress = {
      documentId: 'test-doc-1',
      progress: 50,
      status: 'downloading' as const,
      error: undefined
    };
    
    render(<DocumentPreview {...defaultProps} downloadProgress={downloadProgress} />);
    
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '50');
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows preview unavailable message for unsupported file types', () => {
    const docxDocument = {
      ...mockDocument,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalName: 'test-document.docx'
    };
    
    render(<DocumentPreview {...defaultProps} document={docxDocument} />);
    
    expect(screen.getByTestId('alert-description')).toHaveTextContent(
      'Preview not available for this file type. Use the download button to view the file.'
    );
  });

  it('renders PDF preview for PDF documents', () => {
    render(<DocumentPreview {...defaultProps} />);
    
    // PDF should attempt to render an iframe (mocked in this test environment)
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('renders image preview for image documents', () => {
    const imageDocument = {
      ...mockDocument,
      mimeType: 'image/jpeg',
      originalName: 'test-image.jpg'
    };
    
    render(<DocumentPreview {...defaultProps} document={imageDocument} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('formats file size correctly', () => {
    const largeDocument = {
      ...mockDocument,
      fileSize: 2048576 // 2 MB
    };
    
    render(<DocumentPreview {...defaultProps} document={largeDocument} />);
    
    expect(screen.getByText('2 MB')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<DocumentPreview {...defaultProps} />);
    
    expect(screen.getByText(/Sep 9, 2025/)).toBeInTheDocument();
  });

  it('disables download button when downloading', () => {
    const downloadProgress = {
      documentId: 'test-doc-1',
      progress: 25,
      status: 'downloading' as const,
      error: undefined
    };
    
    render(<DocumentPreview {...defaultProps} downloadProgress={downloadProgress} />);
    
    const downloadButton = screen.getByTitle('Download document');
    expect(downloadButton).toBeDisabled();
  });
});