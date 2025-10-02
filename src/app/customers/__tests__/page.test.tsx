import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import CustomersPage from '../page';
import * as customerActions from '@/lib/actions/customers';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock customer actions
jest.mock('@/lib/actions/customers', () => ({
  getCustomersAction: jest.fn(),
  toggleCustomerActiveAction: jest.fn(),
}));

// Mock components
jest.mock('@/components/business/CustomerListTable', () => ({
  CustomerListTable: ({ customers, loading, onPageChange, onSort, onSearch, onEdit, onToggleActive }: any) => (
    <div data-testid="customer-list-table">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div data-testid="customer-count">{customers.length} customers</div>
          <button onClick={() => onPageChange(2)}>Next Page</button>
          <button onClick={() => onSort('name', 'desc')}>Sort Name</button>
          <button onClick={() => onSearch('test search')}>Search</button>
          <button onClick={() => onEdit('customer-1')}>Edit</button>
          <button onClick={() => onToggleActive('customer-1')}>Toggle Active</button>
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/business/CustomerCreateDialog', () => ({
  CustomerCreateDialog: ({ onCustomerCreated }: any) => (
    <button data-testid="create-customer-dialog" onClick={onCustomerCreated}>
      Add Customer
    </button>
  )
}));

// Mock useToast hook
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  })
}));

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockGetCustomersAction = customerActions.getCustomersAction as jest.MockedFunction<typeof customerActions.getCustomersAction>;
const mockToggleCustomerActiveAction = customerActions.toggleCustomerActiveAction as jest.MockedFunction<typeof customerActions.toggleCustomerActiveAction>;

describe('CustomersPage', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  const mockCustomers = [
    {
      id: '1',
      name: 'ABC Company',
      email: 'abc@company.com',
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
      name: 'XYZ Corp',
      email: 'xyz@corp.com',
      phone: null,
      address: null,
      paymentTerms: 15,
      currentBalance: -250.00,
      isActive: false,
      createdAt: new Date('2025-08-15T14:30:00Z'),
      updatedAt: new Date('2025-08-15T14:30:00Z')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUsePathname.mockReturnValue('/customers');
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);
    
    // Default search params
    mockSearchParams.get.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        page: '1',
        pageSize: '10',
        search: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
      return params[key] || null;
    });

    // Default successful customer fetch
    mockGetCustomersAction.mockResolvedValue({
      success: true,
      data: {
        customers: mockCustomers,
        totalCount: 2,
        page: 1,
        pageSize: 10
      }
    });
  });

  describe('Page Rendering', () => {
    it('should render page header and create button', async () => {
      render(<CustomersPage />);

      expect(screen.getByText('Customer Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your customer database and track payment information')).toBeInTheDocument();
      expect(screen.getByTestId('create-customer-dialog')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockGetCustomersAction).toHaveBeenCalled();
      });
    });

    it('should render customers card with count', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('(2 total)')).toBeInTheDocument();
      });
    });

    it('should render stats cards', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Customers')).toBeInTheDocument();
        expect(screen.getByText('Active Customers')).toBeInTheDocument();
        expect(screen.getByText('Outstanding Balance')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton initially', () => {
      mockGetCustomersAction.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<CustomersPage />);

      expect(screen.getAllByTestId('loading-skeleton')).toBeTruthy();
    });

    it('should show table loading state when refetching', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      // Simulate loading state
      mockGetCustomersAction.mockImplementationOnce(() => new Promise(() => {}));
      
      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      // Should still show the table but in loading state
      expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockGetCustomersAction.mockResolvedValue({
        success: false,
        error: 'Failed to fetch customers'
      });

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch customers')).toBeInTheDocument();
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle unexpected errors', async () => {
      mockGetCustomersAction.mockRejectedValue(new Error('Network error'));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred while loading customers')).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      mockGetCustomersAction
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to fetch customers'
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            customers: mockCustomers,
            totalCount: 2,
            page: 1,
            pageSize: 10
          }
        });

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch customers')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('(2 total)')).toBeInTheDocument();
      });
    });
  });

  describe('URL State Management', () => {
    it('should initialize state from URL parameters', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          page: '2',
          pageSize: '20',
          search: 'test search',
          sortBy: 'paymentTerms',
          sortOrder: 'desc'
        };
        return params[key] || null;
      });

      render(<CustomersPage />);

      expect(mockGetCustomersAction).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 20,
          searchTerm: 'test search',
          sortBy: 'paymentTerms',
          sortOrder: 'desc'
        })
      );
    });

    it('should update URL when pagination changes', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByText('Next Page');
      fireEvent.click(nextPageButton);

      expect(mockRouter.replace).toHaveBeenCalledWith('/customers?page=2');
    });

    it('should update URL when sorting changes', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort Name');
      fireEvent.click(sortButton);

      expect(mockRouter.replace).toHaveBeenCalledWith('/customers?sortBy=name&sortOrder=desc&page=1');
    });

    it('should update URL when search changes', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const searchButton = screen.getByText('Search');
      fireEvent.click(searchButton);

      expect(mockRouter.replace).toHaveBeenCalledWith('/customers?search=test+search&page=1');
    });
  });

  describe('Customer Operations', () => {
    it('should handle customer creation success', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('create-customer-dialog')).toBeInTheDocument();
      });

      const createButton = screen.getByTestId('create-customer-dialog');
      fireEvent.click(createButton);

      // Should trigger refetch
      await waitFor(() => {
        expect(mockGetCustomersAction).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle toggle active status success', async () => {
      mockToggleCustomerActiveAction.mockResolvedValue({
        success: true,
        data: { ...mockCustomers[0], isActive: false }
      });

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const toggleButton = screen.getByText('Toggle Active');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(mockToggleCustomerActiveAction).toHaveBeenCalledWith('customer-1');
        expect(mockShowSuccess).toHaveBeenCalledWith('Customer status updated successfully');
      });

      // Should refetch customers
      await waitFor(() => {
        expect(mockGetCustomersAction).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle toggle active status error', async () => {
      mockToggleCustomerActiveAction.mockResolvedValue({
        success: false,
        error: 'Failed to update status'
      });

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const toggleButton = screen.getByText('Toggle Active');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to update status');
      });
    });

    it('should handle edit customer action', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-list-table')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // Currently just logs to console - in real implementation might open modal or navigate
      // This test just verifies the handler is called without errors
    });
  });

  describe('Data Display', () => {
    it('should display correct stats calculations', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        // Total customers
        expect(screen.getByText('2')).toBeInTheDocument();
        
        // Active customers (1 out of 2)
        expect(screen.getByText('1')).toBeInTheDocument();
        
        // Outstanding balance ($1,500.50 from positive balances only)
        expect(screen.getByText('$1,500.50')).toBeInTheDocument();
      });
    });

    it('should pass correct props to CustomerListTable', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-count')).toHaveTextContent('2 customers');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      render(<CustomersPage />);

      expect(screen.getByRole('heading', { name: /customer management/i, level: 1 })).toBeInTheDocument();
    });

    it('should have proper button labels', async () => {
      render(<CustomersPage />);

      expect(screen.getByTestId('create-customer-dialog')).toBeInTheDocument();
    });
  });
});