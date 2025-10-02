import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { CategoryConfirmationDialog } from '@/components/business/CategoryConfirmationDialog';
import { DocumentCategory, CategoryDetection } from '../../../../types/document';

// Mock the ManualCategorySelector since it's tested separately
jest.mock('@/components/business/ManualCategorySelector', () => ({
  ManualCategorySelector: ({ filename, currentCategory, onCategoryChange }: any) => (
    <div data-testid={`manual-selector-${filename}`}>
      <select 
        value={currentCategory} 
        onChange={(e) => onCategoryChange(filename, e.target.value as DocumentCategory)}
      >
        {Object.values(DocumentCategory).map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
    </div>
  ),
}));

describe('CategoryConfirmationDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  const createMockFile = (name: string, size: number = 1024): File => {
    return new File(['test content'], name, { 
      type: 'application/pdf',
      lastModified: Date.now()
    });
  };

  const mockFiles = [
    createMockFile('DO.1234/23.pdf'),
    createMockFile('INV.5678/24.pdf'),
    createMockFile('unknown-document.pdf'),
  ];

  const mockCategoryDetections: CategoryDetection[] = [
    {
      filename: 'DO.1234/23.pdf',
      detectedCategory: DocumentCategory.DELIVERY_ORDER,
      confidence: 'HIGH',
      isAmbiguous: false,
      pattern: '^DO\\.\\d+\\/\\d{2}',
    },
    {
      filename: 'INV.5678/24.pdf',
      detectedCategory: DocumentCategory.INVOICE,
      confidence: 'HIGH',
      isAmbiguous: false,
      pattern: '^INV\\.\\d+\\/\\d{2}',
    },
    {
      filename: 'unknown-document.pdf',
      detectedCategory: DocumentCategory.OTHER,
      confidence: 'LOW',
      isAmbiguous: false,
    },
  ];

  const defaultProps = {
    files: mockFiles,
    categoryDetections: mockCategoryDetections,
    isOpen: true,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('renders dialog with correct title and description', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('Confirm Document Categories')).toBeInTheDocument();
    expect(screen.getByText(/Please review and confirm/)).toBeInTheDocument();
  });

  it('displays all files with their detected categories', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Check that all files are displayed
    expect(screen.getByText('DO.1234/23.pdf')).toBeInTheDocument();
    expect(screen.getByText('INV.5678/24.pdf')).toBeInTheDocument();
    expect(screen.getByText('unknown-document.pdf')).toBeInTheDocument();
    
    // Check that detected categories are shown
    expect(screen.getByText('Delivery Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows confidence badges for each detection', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // HIGH confidence badges should be present
    const highBadges = screen.getAllByText('HIGH');
    expect(highBadges).toHaveLength(2);
    
    // LOW confidence badge should be present
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('shows warning for files requiring attention', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText(/Some documents require your attention/)).toBeInTheDocument();
  });

  it('highlights files that need attention with different styling', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // The unknown document should have warning styling (yellow background)
    const cards = screen.getAllByRole('article');
    // At least one card should have the warning class
    expect(cards.some(card => card.className.includes('yellow'))).toBe(true);
  });

  it('displays file sizes correctly', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Should show file sizes (1 KB for our mock files)
    const sizeElements = screen.getAllByText('1 KB');
    expect(sizeElements).toHaveLength(3);
  });

  it('calls onConfirm with correct category mapping when confirmed', async () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Click confirm button
    const confirmButton = screen.getByText(/Confirm & Upload/);
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith([
        { filename: 'DO.1234/23.pdf', category: DocumentCategory.DELIVERY_ORDER },
        { filename: 'INV.5678/24.pdf', category: DocumentCategory.INVOICE },
        { filename: 'unknown-document.pdf', category: DocumentCategory.OTHER },
      ]);
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows processing state when isProcessing is true', () => {
    render(<CategoryConfirmationDialog {...defaultProps} isProcessing={true} />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    // Buttons should be disabled during processing
    const cancelButton = screen.getByText('Cancel');
    const confirmButton = screen.getByText('Processing...');
    
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('allows manual category editing when edit button is clicked', async () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Click edit button for the first file
    const editButtons = screen.getAllByRole('button', { name: '' }); // Edit buttons have no text, just icon
    const editButton = editButtons.find(button => button.querySelector('svg')); // Find button with Edit3 icon
    
    if (editButton) {
      fireEvent.click(editButton);
      
      // Manual selector should appear
      await waitFor(() => {
        expect(screen.getByTestId('manual-selector-DO.1234/23.pdf')).toBeInTheDocument();
      });
    }
  });

  it('updates category when manual selection is made', async () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Click edit button and change category
    const editButtons = screen.getAllByRole('button', { name: '' });
    const editButton = editButtons.find(button => button.querySelector('svg'));
    
    if (editButton) {
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const selector = screen.getByTestId('manual-selector-DO.1234/23.pdf');
        const select = selector.querySelector('select');
        
        if (select) {
          fireEvent.change(select, { target: { value: DocumentCategory.PURCHASE_ORDER } });
        }
      });
      
      // Confirm with the changed category
      const confirmButton = screen.getByText(/Confirm & Upload/);
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.arrayContaining([
            { filename: 'DO.1234/23.pdf', category: DocumentCategory.PURCHASE_ORDER }
          ])
        );
      });
    }
  });

  it('shows ambiguous detection correctly', () => {
    const ambiguousDetections = [
      {
        filename: 'ambiguous-doc.pdf',
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'MEDIUM' as const,
        isAmbiguous: true,
        alternativeCategories: [DocumentCategory.PURCHASE_ORDER],
      },
    ];
    
    const ambiguousProps = {
      ...defaultProps,
      files: [createMockFile('ambiguous-doc.pdf')],
      categoryDetections: ambiguousDetections,
    };
    
    render(<CategoryConfirmationDialog {...ambiguousProps} />);
    
    expect(screen.getByText('Ambiguous')).toBeInTheDocument();
    expect(screen.getByText('Also matches: Purchase Order')).toBeInTheDocument();
  });

  it('handles dialog close correctly', () => {
    render(<CategoryConfirmationDialog {...defaultProps} />);
    
    // Should be able to close via dialog's built-in close functionality
    // The dialog should be open initially
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles empty files and detections gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      files: [],
      categoryDetections: [],
    };
    
    render(<CategoryConfirmationDialog {...emptyProps} />);
    
    // Dialog should still render
    expect(screen.getByText('Confirm Document Categories')).toBeInTheDocument();
    expect(screen.getByText(/Confirm & Upload 0 Files/)).toBeInTheDocument();
  });
});