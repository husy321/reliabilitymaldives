import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentListTable from '@/components/business/DocumentListTable';
import { DocumentWithUser, DocumentCategory, DocumentFilters } from '../../../../types/document';

// Mock the search and filter components
jest.mock('@/components/business/DocumentSearch', () => {
  return function MockDocumentSearch({ onSearch, onClear, initialValue, placeholder }: any) {
    return (
      <input
        data-testid="document-search"
        placeholder={placeholder}
        defaultValue={initialValue}
        onChange={(e) => onSearch(e.target.value)}
      />
    );
  };
});

jest.mock('@/components/business/DocumentFilters', () => {
  return function MockDocumentFilters({ onCategoryChange, onDateRangeChange, selectedCategories }: any) {
    return (
      <div data-testid="document-filters">
        <button onClick={() => onCategoryChange([DocumentCategory.INVOICE])}>
          Mock Filter
        </button>
        <span>{selectedCategories.length} categories selected</span>
      </div>
    );
  };
});

// Mock data for testing
const mockDocuments: DocumentWithUser[] = [
  {
    id: '1',
    originalName: 'test-invoice.pdf',
    storedPath: '/uploads/invoice/test-invoice.pdf',
    category: DocumentCategory.INVOICE,
    fileSize: 1024000,
    mimeType: 'application/pdf',
    fileHash: 'abc123',
    ipAddress: '127.0.0.1',
    uploadedById: 'user-1',
    linkedToCustomerId: null,
    linkedToReceivableId: null,
    linkedToSalesReportId: null,
    createdAt: new Date('2025-09-08T10:00:00Z'),
    updatedAt: new Date('2025-09-08T10:00:00Z'),
    uploadedBy: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  {
    id: '2',
    originalName: 'purchase-order-001.pdf',
    storedPath: '/uploads/purchase_order/purchase-order-001.pdf',
    category: DocumentCategory.PURCHASE_ORDER,
    fileSize: 512000,
    mimeType: 'application/pdf',
    fileHash: 'def456',
    ipAddress: '127.0.0.1',
    uploadedById: 'user-2',
    linkedToCustomerId: null,
    linkedToReceivableId: null,
    linkedToSalesReportId: null,
    createdAt: new Date('2025-09-07T15:30:00Z'),
    updatedAt: new Date('2025-09-07T15:30:00Z'),
    uploadedBy: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  }
];

const mockFilters: DocumentFilters = {
  filenameSearch: '',
  categoryFilter: [],
  uploadDateRange: undefined,
};

const defaultProps = {
  documents: mockDocuments,
  totalCount: 2,
  page: 1,
  pageSize: 10,
  searchFilters: mockFilters,
  loading: false,
  onPageChange: jest.fn(),
  onPageSizeChange: jest.fn(),
  onSort: jest.fn(),
  onSearch: jest.fn(),
  onFilterChange: jest.fn(),
};

describe('DocumentListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders document table with correct data', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByText('test-invoice.pdf')).toBeInTheDocument();
      expect(screen.getByText('purchase-order-001.pdf')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays file sizes correctly', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByText('1000 KB')).toBeInTheDocument(); // 1024000 bytes
      expect(screen.getByText('500 KB')).toBeInTheDocument(); // 512000 bytes
    });

    it('displays document categories with correct badges', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByText('INVOICE')).toBeInTheDocument();
      expect(screen.getByText('PURCHASE ORDER')).toBeInTheDocument();
    });

    it('displays user avatars with correct initials', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
    });

    it('formats dates correctly', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      // Check for formatted date strings
      expect(screen.getByText(/Sep 8, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Sep 7, 2025/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no documents are provided', () => {
      render(
        <DocumentListTable 
          {...defaultProps} 
          documents={[]} 
          totalCount={0}
        />
      );
      
      expect(screen.getByText('No documents found.')).toBeInTheDocument();
    });
  });

  describe('Enhanced Search and Filtering', () => {
    it('renders search component with correct props', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByTestId('document-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search documents by filename...')).toBeInTheDocument();
    });

    it('renders filter component with correct props', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByTestId('document-filters')).toBeInTheDocument();
      expect(screen.getByText('0 categories selected')).toBeInTheDocument();
    });

    it('calls onSearch when search input changes', async () => {
      const onSearch = jest.fn();
      render(<DocumentListTable {...defaultProps} onSearch={onSearch} />);
      
      const searchInput = screen.getByTestId('document-search');
      fireEvent.change(searchInput, { target: { value: 'invoice' } });
      
      expect(onSearch).toHaveBeenCalledWith({
        ...mockFilters,
        filenameSearch: 'invoice'
      });
    });

    it('calls onFilterChange when filter selection changes', async () => {
      const onFilterChange = jest.fn();
      render(<DocumentListTable {...defaultProps} onFilterChange={onFilterChange} />);
      
      const filterButton = screen.getByText('Mock Filter');
      fireEvent.click(filterButton);
      
      expect(onFilterChange).toHaveBeenCalledWith({
        ...mockFilters,
        categoryFilter: [DocumentCategory.INVOICE]
      });
    });

    it('displays loading state correctly', () => {
      render(<DocumentListTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('passes search filters to components correctly', () => {
      const filtersWithData: DocumentFilters = {
        filenameSearch: 'test search',
        categoryFilter: [DocumentCategory.INVOICE],
        uploadDateRange: undefined,
      };
      
      render(
        <DocumentListTable 
          {...defaultProps} 
          searchFilters={filtersWithData}
        />
      );
      
      expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
      expect(screen.getByText('1 categories selected')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('calls onSort when filename column header is clicked', () => {
      const onSort = jest.fn();
      render(<DocumentListTable {...defaultProps} onSort={onSort} />);
      
      const filenameHeader = screen.getByRole('button', { name: /Filename/i });
      fireEvent.click(filenameHeader);
      
      expect(onSort).toHaveBeenCalledWith('originalName', 'desc');
    });

    it('calls onSort when category column header is clicked', () => {
      const onSort = jest.fn();
      render(<DocumentListTable {...defaultProps} onSort={onSort} />);
      
      const categoryHeader = screen.getByRole('button', { name: /Category/i });
      fireEvent.click(categoryHeader);
      
      expect(onSort).toHaveBeenCalledWith('category', 'desc');
    });

    it('calls onSort when uploaded by column header is clicked', () => {
      const onSort = jest.fn();
      render(<DocumentListTable {...defaultProps} onSort={onSort} />);
      
      const uploadedByHeader = screen.getByRole('button', { name: /Uploaded By/i });
      fireEvent.click(uploadedByHeader);
      
      expect(onSort).toHaveBeenCalledWith('uploadedBy', 'desc');
    });

    it('calls onSort when upload date column header is clicked', () => {
      const onSort = jest.fn();
      render(<DocumentListTable {...defaultProps} onSort={onSort} />);
      
      const dateHeader = screen.getByRole('button', { name: /Upload Date/i });
      fireEvent.click(dateHeader);
      
      expect(onSort).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('Pagination', () => {
    const paginationProps = {
      ...defaultProps,
      totalCount: 25,
      page: 2,
      pageSize: 10,
    };

    it('displays correct pagination information', () => {
      render(<DocumentListTable {...paginationProps} />);
      
      expect(screen.getByText('Showing 11 to 20 of 25 documents')).toBeInTheDocument();
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('calls onPageChange when previous button is clicked', () => {
      const onPageChange = jest.fn();
      render(
        <DocumentListTable 
          {...paginationProps} 
          onPageChange={onPageChange}
        />
      );
      
      const prevButton = screen.getByRole('button', { name: /Previous/i });
      fireEvent.click(prevButton);
      
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange when next button is clicked', () => {
      const onPageChange = jest.fn();
      render(
        <DocumentListTable 
          {...paginationProps} 
          onPageChange={onPageChange}
        />
      );
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);
      
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('disables previous button on first page', () => {
      render(
        <DocumentListTable 
          {...defaultProps}
          page={1}
          totalCount={25}
        />
      );
      
      const prevButton = screen.getByRole('button', { name: /Previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <DocumentListTable 
          {...defaultProps}
          page={3}
          totalCount={25}
          pageSize={10}
        />
      );
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).toBeDisabled();
    });

    it('calls onPageSizeChange when page size is changed', async () => {
      const onPageSizeChange = jest.fn();
      render(
        <DocumentListTable 
          {...defaultProps} 
          onPageSizeChange={onPageSizeChange}
        />
      );
      
      // Find the select trigger by text content
      const pageSizeSelect = screen.getByText('10');
      fireEvent.click(pageSizeSelect);
      
      await waitFor(() => {
        const option20 = screen.getByRole('option', { name: '20' });
        fireEvent.click(option20);
      });
      
      expect(onPageSizeChange).toHaveBeenCalledWith(20);
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
      expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 data rows
    });

    it('has sortable column headers with proper aria labels', () => {
      render(<DocumentListTable {...defaultProps} />);
      
      // Count only the sorting header buttons (not pagination buttons)
      const filenameButton = screen.getByRole('button', { name: /Filename/i });
      const categoryButton = screen.getByRole('button', { name: /Category/i });
      const uploadedByButton = screen.getByRole('button', { name: /Uploaded By/i });
      const dateButton = screen.getByRole('button', { name: /Upload Date/i });
      
      expect(filenameButton).toBeInTheDocument();
      expect(categoryButton).toBeInTheDocument();
      expect(uploadedByButton).toBeInTheDocument();  
      expect(dateButton).toBeInTheDocument();
    });
  });
});