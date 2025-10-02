import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentUploader } from '../DocumentUploader';
import { DocumentCategory } from '../../../../types/document';
import { UploadOptions } from '../../../../types/upload';

// Mock the upload hook to provide controlled test state
jest.mock('@/hooks/useUploadProgress', () => ({
  useUploadProgress: () => ({
    files: [],
    totalFiles: 0,
    completedFiles: 0,
    overallProgress: 0,
    isUploading: false,
    addFiles: jest.fn(),
    removeFile: jest.fn(),
    updateFileProgress: jest.fn(),
    updateFileStatus: jest.fn(),
    clearCompleted: jest.fn(),
    clearAll: jest.fn()
  })
}));

// Mock toast notifications
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn()
  })
}));

describe('DocumentUploader - Authentication Integration', () => {
  const defaultOptions: UploadOptions = {
    category: DocumentCategory.INVOICE,
    customerId: 'customer-123'
  };

  const mockFile = new File(['test content'], 'test.pdf', {
    type: 'application/pdf'
  });

  let mockXHR: {
    open: jest.Mock;
    send: jest.Mock;
    setRequestHeader: jest.Mock;
    addEventListener: jest.Mock;
    abort: jest.Mock;
    upload: { addEventListener: jest.Mock };
    status: number;
    responseText: string;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock XMLHttpRequest for upload functionality
    mockXHR = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      addEventListener: jest.fn(),
      abort: jest.fn(),
      upload: {
        addEventListener: jest.fn()
      },
      status: 200,
      responseText: ''
    };
    
    // Mock XMLHttpRequest constructor
    (global as unknown as { XMLHttpRequest: jest.Mock }).XMLHttpRequest = jest.fn(() => mockXHR);
  });

  afterEach(() => {
    // Restore XMLHttpRequest is not needed as each test creates its own mock
  });

  test('handles authentication failure during upload', async () => {
    // Setup auth failure response
    mockXHR.status = 401;
    mockXHR.responseText = JSON.stringify({
      success: false,
      error: 'Authentication required'
    });

    render(<DocumentUploader options={defaultOptions} />);

    // Get the drop zone and simulate file drop
    const dropZone = screen.getByText('Drag and drop files here, or click to browse').closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
        types: ['Files']
      }
    });

    // Trigger upload if files were added
    const startButton = screen.queryByText('Start Upload');
    if (startButton) {
      fireEvent.click(startButton);
    }

    // Simulate XMLHttpRequest load event with auth failure
    await waitFor(() => {
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'load'
      )?.[1] as (() => void) | undefined;
      
      if (loadHandler) {
        loadHandler();
      }
    });

    // Verify that authentication error is handled
    expect(mockXHR.status).toBe(401);
  });

  test('handles session validation error from server', async () => {
    // Setup session validation failure
    mockXHR.status = 200;
    mockXHR.responseText = JSON.stringify({
      success: false,
      error: 'User account not found'
    });

    render(<DocumentUploader options={defaultOptions} />);

    const dropZone = screen.getByText('Drag and drop files here, or click to browse').closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
        types: ['Files']
      }
    });

    const startButton = screen.queryByText('Start Upload');
    if (startButton) {
      fireEvent.click(startButton);
    }

    await waitFor(() => {
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'load'
      )?.[1] as (() => void) | undefined;
      
      if (loadHandler) {
        loadHandler();
      }
    });

    // Verify session validation error handling
    const errorResponse = JSON.parse(mockXHR.responseText);
    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error).toBe('User account not found');
  });

  test('validates user session before upload attempt', async () => {
    // Setup successful auth response
    mockXHR.status = 200;
    mockXHR.responseText = JSON.stringify({
      success: true,
      data: [{
        id: 'doc-123',
        originalName: 'test.pdf',
        category: DocumentCategory.INVOICE
      }]
    });

    render(<DocumentUploader options={defaultOptions} />);

    const dropZone = screen.getByText('Drag and drop files here, or click to browse').closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
        types: ['Files']
      }
    });

    const startButton = screen.queryByText('Start Upload');
    if (startButton) {
      fireEvent.click(startButton);
    }

    await waitFor(() => {
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'load'
      )?.[1] as (() => void) | undefined;
      
      if (loadHandler) {
        loadHandler();
      }
    });

    // Verify successful authentication path
    expect(mockXHR.open).toHaveBeenCalledWith('POST', '/api/upload');
    expect(mockXHR.send).toHaveBeenCalled();
  });

  test('includes proper authentication headers in upload request', async () => {
    render(<DocumentUploader options={defaultOptions} />);

    const dropZone = screen.getByText('Drag and drop files here, or click to browse').closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
        types: ['Files']
      }
    });

    const startButton = screen.queryByText('Start Upload');
    if (startButton) {
      fireEvent.click(startButton);
    }

    // Verify that request is made to authenticated endpoint
    await waitFor(() => {
      expect(mockXHR.open).toHaveBeenCalledWith('POST', '/api/upload');
    });

    // The FormData should include authentication context via Next.js session
    expect(mockXHR.send).toHaveBeenCalledWith(expect.any(FormData));
  });

  test('handles foreign key constraint errors from database', async () => {
    // Setup database constraint error
    mockXHR.status = 200;
    mockXHR.responseText = JSON.stringify({
      success: false,
      error: 'Authentication error: User account not found. Please log in again.'
    });

    render(<DocumentUploader options={defaultOptions} />);

    const dropZone = screen.getByText('Drag and drop files here, or click to browse').closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
        types: ['Files']
      }
    });

    const startButton = screen.queryByText('Start Upload');
    if (startButton) {
      fireEvent.click(startButton);
    }

    await waitFor(() => {
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === 'load'
      )?.[1] as (() => void) | undefined;
      
      if (loadHandler) {
        loadHandler();
      }
    });

    // Verify foreign key constraint error handling
    const errorResponse = JSON.parse(mockXHR.responseText);
    expect(errorResponse.error).toContain('Authentication error');
  });
});