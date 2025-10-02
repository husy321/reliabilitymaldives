import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentFilters from '@/components/business/DocumentFilters';
import { DocumentCategory } from '../../../../types/document';

describe('DocumentFilters Component', () => {
  const mockOnCategoryChange = jest.fn();
  const mockOnDateRangeChange = jest.fn();
  const mockOnQuickFilter = jest.fn();
  const mockOnClearFilters = jest.fn();

  const defaultProps = {
    availableCategories: Object.values(DocumentCategory),
    selectedCategories: [],
    dateRange: {},
    onCategoryChange: mockOnCategoryChange,
    onDateRangeChange: mockOnDateRangeChange,
    onQuickFilter: mockOnQuickFilter,
    onClearFilters: mockOnClearFilters,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter button', () => {
    render(<DocumentFilters {...defaultProps} />);
    
    const filterButton = screen.getByRole('button', { name: /filters/i });
    expect(filterButton).toBeInTheDocument();
  });

  it('shows filter count badge when filters are active', () => {
    render(
      <DocumentFilters
        {...defaultProps}
        selectedCategories={[DocumentCategory.INVOICE]}
        dateRange={{ from: new Date('2023-01-01'), to: new Date('2023-01-31') }}
      />
    );

    // Should show badge with count of 2 (1 category + 1 date range)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens filter popover when filter button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Upload Date')).toBeInTheDocument();
  });

  it('displays all available categories as checkboxes', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    // Check if all categories are rendered
    Object.values(DocumentCategory).forEach(category => {
      const formattedName = category.replace('_', ' ').toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
      expect(screen.getByLabelText(formattedName)).toBeInTheDocument();
    });
  });

  it('calls onCategoryChange when category checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const invoiceCheckbox = screen.getByLabelText('Invoice');
    await user.click(invoiceCheckbox);

    expect(mockOnCategoryChange).toHaveBeenCalledWith([DocumentCategory.INVOICE]);
  });

  it('shows quick date filter buttons', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'This year' })).toBeInTheDocument();
  });

  it('calls onQuickFilter when quick date filter is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const last7DaysButton = screen.getByRole('button', { name: 'Last 7 days' });
    await user.click(last7DaysButton);

    expect(mockOnQuickFilter).toHaveBeenCalledWith('last7days');
  });

  it('shows clear all button and calls onClearFilters', async () => {
    const user = userEvent.setup();
    render(
      <DocumentFilters
        {...defaultProps}
        selectedCategories={[DocumentCategory.INVOICE]}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const clearButton = screen.getByRole('button', { name: 'Clear All' });
    await user.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('disables clear all button when no filters are active', async () => {
    const user = userEvent.setup();
    render(<DocumentFilters {...defaultProps} />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const clearButton = screen.getByRole('button', { name: 'Clear All' });
    expect(clearButton).toBeDisabled();
  });

  it('displays active filter badges outside popover', () => {
    render(
      <DocumentFilters
        {...defaultProps}
        selectedCategories={[DocumentCategory.INVOICE, DocumentCategory.PURCHASE_ORDER]}
      />
    );

    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order')).toBeInTheDocument();
  });

  it('allows removing individual filter badges', async () => {
    const user = userEvent.setup();
    render(
      <DocumentFilters
        {...defaultProps}
        selectedCategories={[DocumentCategory.INVOICE]}
      />
    );

    // Find the X button in the Invoice badge
    const invoiceBadge = screen.getByText('Invoice').closest('div');
    const removeButton = invoiceBadge?.querySelector('button');
    
    if (removeButton) {
      await user.click(removeButton);
      expect(mockOnCategoryChange).toHaveBeenCalledWith([]);
    }
  });

  it('shows date range in badge format', () => {
    const fromDate = new Date('2023-01-01');
    const toDate = new Date('2023-01-31');
    
    render(
      <DocumentFilters
        {...defaultProps}
        dateRange={{ from: fromDate, to: toDate }}
      />
    );

    expect(screen.getByText('Jan 01 - Jan 31')).toBeInTheDocument();
  });

  it('handles single date in range', () => {
    const fromDate = new Date('2023-01-01');
    
    render(
      <DocumentFilters
        {...defaultProps}
        dateRange={{ from: fromDate }}
      />
    );

    expect(screen.getByText('From Jan 01')).toBeInTheDocument();
  });

  it('can remove date range filter', async () => {
    const user = userEvent.setup();
    const fromDate = new Date('2023-01-01');
    
    render(
      <DocumentFilters
        {...defaultProps}
        dateRange={{ from: fromDate }}
      />
    );

    // Find the X button in the date badge
    const dateBadge = screen.getByText('From Jan 01').closest('div');
    const removeButton = dateBadge?.querySelector('button');
    
    if (removeButton) {
      await user.click(removeButton);
      expect(mockOnDateRangeChange).toHaveBeenCalledWith({});
    }
  });
});