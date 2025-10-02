import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerListTable } from '../CustomerListTable';
import { Customer } from '../../../../types/customer';

// Mock customer actions and components
jest.mock('../CustomerEditDialog', () => ({
  CustomerEditDialog: ({ customer, triggerButton }: any) => (
    <div data-testid={`edit-dialog-${customer.id}`}>
      {triggerButton}
    </div>
  )
}));

jest.mock('../CustomerSearch', () => ({
  CustomerSearch: ({ searchTerm, onSearch, placeholder }: any) => (
    <div data-testid="customer-search">
      <input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearch({ searchTerm: e.target.value })}
      />
    </div>
  )
}));

jest.mock('../CustomerFilters', () => ({
  CustomerFilters: ({ filters, onFiltersChange }: any) => (
    <div data-testid="customer-filters">
      <button onClick={() => onFiltersChange({ ...filters, activeOnly: !filters.activeOnly })}>
        Toggle Filter
      </button>
    </div>
  )
}));

describe('CustomerListTable', () => {
  const mockCustomers: Customer[] = [
    {
      id: '1',
      name: 'ABC Company Ltd',
      email: 'contact@abc.com',
      phone: '+960-123-4567',
      address: 'Male, Maldives',
      paymentTerms: 30,
      currentBalance: 1500.50,
      isActive: true,
      createdAt: new Date('2025-09-01T10:00:00Z'),
      updatedAt: new Date('2025-09-01T10:00:00Z')
    },
    {
      id: '2',
      name: 'XYZ Corporation',
      email: 'info@xyz.com',
      phone: '+960-987-6543',
      address: null,
      paymentTerms: 15,
      currentBalance: -250.00,
      isActive: false,
      createdAt: new Date('2025-08-15T14:30:00Z'),
      updatedAt: new Date('2025-08-15T14:30:00Z')
    },
    {
      id: '3',
      name: 'Quick Pay Services',
      email: null,
      phone: null,
      address: 'Hulhumale, Maldives',
      paymentTerms: 0,
      currentBalance: 0,
      isActive: true,
      createdAt: new Date('2025-09-05T09:15:00Z'),
      updatedAt: new Date('2025-09-05T09:15:00Z')
    }
  ];

  const mockProps = {
    customers: mockCustomers,
    currentUserRole: 'ACCOUNTS',
    totalCount: 3,
    page: 1,
    pageSize: 10,
    searchTerm: '',
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    onPageChange: jest.fn(),
    onSort: jest.fn(),
    onSearch: jest.fn(),
    onEdit: jest.fn(),
    onToggleActive: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Table Rendering', () => {
    it('should render customer table with data', () => {
      render(<CustomerListTable {...mockProps} />);

      // Check table headers
      expect(screen.getByText('Customer Name')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Payment Terms')).toBeInTheDocument();
      expect(screen.getByText('Current Balance')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check customer data
      expect(screen.getByText('ABC Company Ltd')).toBeInTheDocument();
      expect(screen.getByText('contact@abc.com')).toBeInTheDocument();
      expect(screen.getByText('XYZ Corporation')).toBeInTheDocument();
      expect(screen.getByText('Quick Pay Services')).toBeInTheDocument();
    });

    it('should display customer contact information correctly', () => {
      render(<CustomerListTable {...mockProps} />);

      // Customer with both phone and address
      expect(screen.getByText('+960-123-4567')).toBeInTheDocument();
      expect(screen.getByText('Male, Maldives')).toBeInTheDocument();

      // Customer with only address
      expect(screen.getByText('Hulhumale, Maldives')).toBeInTheDocument();
    });

    it('should display payment terms as badges', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText('15 days')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    it('should display current balance with appropriate styling', () => {
      render(<CustomerListTable {...mockProps} />);

      // Positive balance (owed by customer) - should be red
      const positiveBalance = screen.getByText('$1,500.50');
      expect(positiveBalance).toHaveClass('text-red-600');

      // Negative balance (credit) - should be green
      const negativeBalance = screen.getByText('-$250.00');
      expect(negativeBalance).toHaveClass('text-green-600');

      // Zero balance - should be muted
      const zeroBalance = screen.getByText('$0.00');
      expect(zeroBalance).toHaveClass('text-muted-foreground');
    });

    it('should display status badges correctly', () => {
      render(<CustomerListTable {...mockProps} />);

      const activeBadges = screen.getAllByText('Active');
      const inactiveBadges = screen.getAllByText('Inactive');

      expect(activeBadges).toHaveLength(2);
      expect(inactiveBadges).toHaveLength(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      render(<CustomerListTable {...mockProps} loading={true} />);

      expect(screen.getByText('Loading customers...')).toBeInTheDocument();
      expect(screen.getByRole('row')).toHaveClass('h-24');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no customers are provided', () => {
      render(<CustomerListTable {...mockProps} customers={[]} />);

      expect(screen.getByText('No customers found')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first customer')).toBeInTheDocument();
    });

    it('should show search-specific empty state when search term is provided', () => {
      render(<CustomerListTable {...mockProps} customers={[]} searchTerm="nonexistent" />);

      expect(screen.getByText('No customers found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should call onSort when column header is clicked', async () => {
      const user = userEvent.setup();
      render(<CustomerListTable {...mockProps} />);

      const nameHeader = screen.getByText('Customer Name').closest('button')!;
      await user.click(nameHeader);

      expect(mockProps.onSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('should show sort indicators', () => {
      render(<CustomerListTable {...mockProps} sortBy="name" sortOrder="asc" />);

      // Should show ascending sort icon for name column
      const nameHeader = screen.getByText('Customer Name').closest('button')!;
      expect(nameHeader.querySelector('svg')).toBeInTheDocument();
    });

    it('should handle multiple column sorting', async () => {
      const user = userEvent.setup();
      render(<CustomerListTable {...mockProps} />);

      // Click payment terms header
      const paymentTermsHeader = screen.getByText('Payment Terms').closest('button')!;
      await user.click(paymentTermsHeader);

      expect(mockProps.onSort).toHaveBeenCalledWith('paymentTerms', 'desc');
    });
  });

  describe('Actions', () => {
    it('should render edit buttons for each customer', () => {
      render(<CustomerListTable {...mockProps} />);

      const editButtons = screen.getAllByTestId(/edit-dialog-/);
      expect(editButtons).toHaveLength(3);
    });

    it('should render action dropdowns for each customer', () => {
      render(<CustomerListTable {...mockProps} />);

      const actionButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
      );
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('should call onToggleActive when toggle action is triggered', async () => {
      const user = userEvent.setup();
      render(<CustomerListTable {...mockProps} />);

      // Find and click the first dropdown menu
      const moreButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
      );
      
      if (moreButtons.length > 0) {
        await user.click(moreButtons[0]);
        
        // Look for deactivate option (since first customer is active)
        const deactivateOption = screen.queryByText('Deactivate');
        if (deactivateOption) {
          await user.click(deactivateOption);
          expect(mockProps.onToggleActive).toHaveBeenCalledWith('1');
        }
      }
    });
  });

  describe('Search Integration', () => {
    it('should render search component', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByTestId('customer-search')).toBeInTheDocument();
    });

    it('should call onSearch when search is triggered', async () => {
      const user = userEvent.setup();
      render(<CustomerListTable {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/Search customers/);
      await user.type(searchInput, 'ABC');

      expect(mockProps.onSearch).toHaveBeenCalledWith('ABC');
    });
  });

  describe('Filtering Integration', () => {
    it('should render filters component', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByTestId('customer-filters')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination information', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByText('Showing 1 to 3 of 3 customers')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    it('should call onPageChange when pagination buttons are clicked', async () => {
      const user = userEvent.setup();
      const propsWithMultiplePages = {
        ...mockProps,
        totalCount: 25,
        pageSize: 10
      };
      
      render(<CustomerListTable {...propsWithMultiplePages} />);

      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);

      expect(mockProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('should disable pagination buttons appropriately', () => {
      render(<CustomerListTable {...mockProps} page={1} />);

      const firstButton = screen.getByRole('button', { name: /go to first page/i });
      const prevButton = screen.getByRole('button', { name: /go to previous page/i });

      expect(firstButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });

    it('should show correct page size options', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByText('Rows per page')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(7);
      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
    });

    it('should have accessible sort buttons', () => {
      render(<CustomerListTable {...mockProps} />);

      const sortButtons = screen.getAllByRole('button').filter(
        button => button.textContent?.includes('Customer Name') || 
                 button.textContent?.includes('Payment Terms') ||
                 button.textContent?.includes('Current Balance')
      );

      expect(sortButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Formatting', () => {
    it('should format dates correctly', () => {
      render(<CustomerListTable {...mockProps} />);

      // Check if dates are formatted properly
      expect(screen.getByText(/Sep 1, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Aug 15, 2025/)).toBeInTheDocument();
    });

    it('should format currency correctly', () => {
      render(<CustomerListTable {...mockProps} />);

      expect(screen.getByText('$1,500.50')).toBeInTheDocument();
      expect(screen.getByText('-$250.00')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });
});