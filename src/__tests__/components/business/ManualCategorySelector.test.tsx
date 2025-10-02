import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { ManualCategorySelector } from '@/components/business/ManualCategorySelector';
import { DocumentCategory } from '../../../../types/document';

describe('ManualCategorySelector', () => {
  const mockOnCategoryChange = jest.fn();

  beforeEach(() => {
    mockOnCategoryChange.mockClear();
  });

  const defaultProps = {
    filename: 'test-document.pdf',
    currentCategory: DocumentCategory.OTHER,
    onCategoryChange: mockOnCategoryChange,
  };

  it('renders with correct initial category', () => {
    render(<ManualCategorySelector {...defaultProps} />);
    
    expect(screen.getByText('Document Category')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays all document category options when opened', async () => {
    render(<ManualCategorySelector {...defaultProps} />);
    
    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    // Check that all categories are present (using getAllByText for non-unique text)
    expect(screen.getAllByText('Delivery Order')).toHaveLength(1);
    expect(screen.getAllByText('Purchase Order')).toHaveLength(1);
    expect(screen.getAllByText('Invoice')).toHaveLength(1);
    expect(screen.getAllByText('Sales Receipt')).toHaveLength(1);
    expect(screen.getAllByText('Other')).toHaveLength(2); // One in trigger, one in dropdown
  });

  it('shows category descriptions for each option', async () => {
    render(<ManualCategorySelector {...defaultProps} />);
    
    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    // Check that descriptions are present
    expect(screen.getByText('Documents like DO.1234/23')).toBeInTheDocument();
    expect(screen.getByText('Documents like PO.5678/24')).toBeInTheDocument();
    expect(screen.getByText('Documents like INV.9012/25')).toBeInTheDocument();
    expect(screen.getByText('Sales receipts and payment confirmations')).toBeInTheDocument();
    expect(screen.getAllByText('Unrecognized or miscellaneous documents')).toHaveLength(1);
  });

  it('calls onCategoryChange when a category is selected', async () => {
    render(<ManualCategorySelector {...defaultProps} />);
    
    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    // Select a different category
    fireEvent.click(screen.getByText('Delivery Order'));
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('test-document.pdf', DocumentCategory.DELIVERY_ORDER);
  });

  it('handles different initial categories correctly', () => {
    const propsWithInvoice = {
      ...defaultProps,
      currentCategory: DocumentCategory.INVOICE,
    };
    
    render(<ManualCategorySelector {...propsWithInvoice} />);
    
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('data-state', 'closed');
  });

  it('disables the selector when disabled prop is true', () => {
    const disabledProps = {
      ...defaultProps,
      disabled: true,
    };
    
    render(<ManualCategorySelector {...disabledProps} />);
    
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('data-disabled', '');
  });

  it('generates unique IDs for different filenames', () => {
    const { rerender } = render(<ManualCategorySelector {...defaultProps} />);
    
    const label1 = screen.getByText('Document Category');
    expect(label1).toHaveAttribute('for', 'category-test-document.pdf');
    
    rerender(
      <ManualCategorySelector 
        {...defaultProps} 
        filename="another-document.pdf" 
      />
    );
    
    const label2 = screen.getByText('Document Category');
    expect(label2).toHaveAttribute('for', 'category-another-document.pdf');
  });

  it('handles category changes for different document categories', () => {
    render(<ManualCategorySelector {...defaultProps} />);
    
    // Test each category
    const categories = [
      { text: 'Purchase Order', enum: DocumentCategory.PURCHASE_ORDER },
      { text: 'Invoice', enum: DocumentCategory.INVOICE },
      { text: 'Sales Receipt', enum: DocumentCategory.SALES_RECEIPT },
    ];
    
    categories.forEach(({ text, enum: categoryEnum }) => {
      // Open dropdown
      fireEvent.click(screen.getByRole('combobox'));
      
      // Select category
      fireEvent.click(screen.getByText(text));
      
      expect(mockOnCategoryChange).toHaveBeenCalledWith('test-document.pdf', categoryEnum);
      
      mockOnCategoryChange.mockClear();
    });
  });
});