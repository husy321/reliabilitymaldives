import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReceivableListTable } from '@/components/business/ReceivableListTable';
import { 
  Receivable, 
  ReceivableStatus, 
  UserRole
} from '../../../../types/receivable';

// Mock data for testing
const mockReceivables: Receivable[] = [
  {
    id: 'receivable-1',
    invoiceNumber: 'INV-001',
    customerId: 'customer-1',
    amount: 5000.00,
    invoiceDate: new Date('2025-09-01T00:00:00Z'),
    dueDate: new Date('2025-10-01T00:00:00Z'),
    paidAmount: 0,
    status: ReceivableStatus.PENDING,
    assignedTo: UserRole.SALES,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z'),
    customer: {
      id: 'customer-1',
      name: 'Test Company Ltd',
      email: 'contact@testcompany.com',
      phone: '+960-123-4567',
      address: 'Male, Maldives',
      paymentTerms: 30,
      currentBalance: 5000.00,
      isActive: true,
      createdAt: new Date('2025-09-01T00:00:00Z'),
      updatedAt: new Date('2025-09-01T00:00:00Z')
    }
  },
  {
    id: 'receivable-2',
    invoiceNumber: 'INV-002',
    customerId: 'customer-2',
    amount: 3000.00,
    invoiceDate: new Date('2025-08-15T00:00:00Z'),
    dueDate: new Date('2025-08-30T00:00:00Z'), // Overdue
    paidAmount: 1000.00,
    status: ReceivableStatus.PARTIALLY_PAID,
    assignedTo: UserRole.ACCOUNTS,
    createdAt: new Date('2025-08-15T00:00:00Z'),
    updatedAt: new Date('2025-09-05T00:00:00Z'),
    customer: {
      id: 'customer-2',
      name: 'Another Company',
      email: 'info@another.com',
      phone: '+960-987-6543',
      address: 'Hulhumale, Maldives',
      paymentTerms: 15,
      currentBalance: 2000.00,
      isActive: true,
      createdAt: new Date('2025-08-01T00:00:00Z'),
      updatedAt: new Date('2025-08-01T00:00:00Z')
    }
  },
  {
    id: 'receivable-3',
    invoiceNumber: 'INV-003',
    customerId: 'customer-1',
    amount: 2500.00,
    invoiceDate: new Date('2025-08-01T00:00:00Z'),
    dueDate: new Date('2025-09-01T00:00:00Z'),
    paidAmount: 2500.00,
    status: ReceivableStatus.PAID,
    assignedTo: UserRole.SALES,
    createdAt: new Date('2025-08-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z'),
    customer: {
      id: 'customer-1',
      name: 'Test Company Ltd',
      email: 'contact@testcompany.com',
      phone: '+960-123-4567',
      address: 'Male, Maldives',
      paymentTerms: 30,
      currentBalance: 5000.00,
      isActive: true,
      createdAt: new Date('2025-09-01T00:00:00Z'),
      updatedAt: new Date('2025-09-01T00:00:00Z')
    }
  }
];

describe('ReceivableListTable', () => {
  const defaultProps = {
    receivables: mockReceivables,
    currentUserRole: UserRole.SALES,
    totalCount: mockReceivables.length,
    page: 1,
    pageSize: 10,
    onPageChange: jest.fn(),
    onSort: jest.fn(),
    onSearch: jest.fn(),
    onFilter: jest.fn(),
    onEdit: jest.fn(),
    onStatusUpdate: jest.fn(),
    onRecordPayment: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table with all receivables', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // Check if all receivables are displayed
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('INV-003')).toBeInTheDocument();
      
      // Check customer names
      expect(screen.getByText('Test Company Ltd')).toBeInTheDocument();
      expect(screen.getByText('Another Company')).toBeInTheDocument();
    });

    it('should display correct currency formatting', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      expect(screen.getByText('$3,000.00')).toBeInTheDocument();
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });

    it('should show payment information for partially paid receivables', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // INV-002 has partial payment
      expect(screen.getByText('Paid: $1,000.00')).toBeInTheDocument();
      expect(screen.getByText('Balance: $2,000.00')).toBeInTheDocument();
    });

    it('should display status badges with correct styling', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Partially Paid')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('should show overdue indicators for overdue receivables', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // INV-002 is overdue (due date in the past)
      const overdueElements = screen.getAllByText('Overdue');
      expect(overdueElements.length).toBeGreaterThan(0);
    });

    it('should display team member assignments', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should render search input and handle search', async () => {
      const user = userEvent.setup();
      const mockOnSearch = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search invoices or customers...');
      expect(searchInput).toBeInTheDocument();
      
      await user.type(searchInput, 'INV-001');
      
      // Search should be debounced, so we wait
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('INV-001');
      }, { timeout: 600 });
    });

    it('should render status filter dropdown', async () => {
      const user = userEvent.setup();
      render(<ReceivableListTable {...defaultProps} />);
      
      const statusFilter = screen.getByRole('combobox');
      expect(statusFilter).toBeInTheDocument();
      
      await user.click(statusFilter);
      
      // Check if status options are available
      expect(screen.getByText('All Status')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('should handle status filter changes', async () => {
      const user = userEvent.setup();
      const mockOnFilter = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onFilter={mockOnFilter} />);
      
      const statusFilter = screen.getByRole('combobox');
      await user.click(statusFilter);
      
      const pendingOption = screen.getByText('Pending');
      await user.click(pendingOption);
      
      expect(mockOnFilter).toHaveBeenCalledWith({
        statusFilter: [ReceivableStatus.PENDING]
      });
    });
  });

  describe('Sorting', () => {
    it('should handle column sorting', async () => {
      const user = userEvent.setup();
      const mockOnSort = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onSort={mockOnSort} />);
      
      const amountHeader = screen.getByText('Amount');
      await user.click(amountHeader);
      
      expect(mockOnSort).toHaveBeenCalledWith('amount', 'desc');
    });

    it('should show sort indicators on sorted columns', () => {
      render(
        <ReceivableListTable 
          {...defaultProps} 
          sortBy="dueDate" 
          sortOrder="asc" 
        />
      );
      
      // Should show ascending sort indicator on due date column
      const dueDateHeader = screen.getByRole('button', { name: /due date/i });
      expect(dueDateHeader).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action dropdown for each receivable', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // Should have action buttons for each receivable
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      expect(actionButtons).toHaveLength(mockReceivables.length);
    });

    it('should handle edit action', async () => {
      const user = userEvent.setup();
      const mockOnEdit = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onEdit={mockOnEdit} />);
      
      // Open first receivable's action menu
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(actionButtons[0]);
      
      // Click edit option
      const editOption = screen.getByText('Edit');
      await user.click(editOption);
      
      expect(mockOnEdit).toHaveBeenCalledWith('receivable-1');
    });

    it('should handle record payment action', async () => {
      const user = userEvent.setup();
      const mockOnRecordPayment = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onRecordPayment={mockOnRecordPayment} />);
      
      // Open first receivable's action menu (should show record payment since it's not fully paid)
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(actionButtons[0]);
      
      // Click record payment option
      const recordPaymentOption = screen.getByText('Record Payment');
      await user.click(recordPaymentOption);
      
      expect(mockOnRecordPayment).toHaveBeenCalledWith('receivable-1');
    });

    it('should not show record payment for fully paid receivables', async () => {
      const user = userEvent.setup();
      
      render(<ReceivableListTable {...defaultProps} />);
      
      // Open third receivable's action menu (INV-003 is fully paid)
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(actionButtons[2]);
      
      // Record payment should not be available
      expect(screen.queryByText('Record Payment')).not.toBeInTheDocument();
    });

    it('should handle status update action', async () => {
      const user = userEvent.setup();
      const mockOnStatusUpdate = jest.fn();
      
      render(<ReceivableListTable {...defaultProps} onStatusUpdate={mockOnStatusUpdate} />);
      
      // Open first receivable's action menu
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(actionButtons[0]);
      
      // Click mark as disputed option
      const disputedOption = screen.getByText('Mark as Disputed');
      await user.click(disputedOption);
      
      expect(mockOnStatusUpdate).toHaveBeenCalledWith('receivable-1', ReceivableStatus.DISPUTED);
    });
  });

  describe('Pagination', () => {
    it('should display pagination information', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      expect(screen.getByText('Showing 1-3 of 3 receivables')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    it('should handle page changes', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = jest.fn();
      
      render(
        <ReceivableListTable 
          {...defaultProps} 
          page={1}
          totalCount={20}
          pageSize={10}
          onPageChange={mockOnPageChange} 
        />
      );
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should disable pagination buttons appropriately', () => {
      render(
        <ReceivableListTable 
          {...defaultProps} 
          page={1}
          totalCount={3}
          pageSize={10}
        />
      );
      
      const prevButton = screen.getByText('Previous');
      const nextButton = screen.getByText('Next');
      
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should show loading message when loading', () => {
      render(<ReceivableListTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading receivables...')).toBeInTheDocument();
    });

    it('should disable pagination during loading', () => {
      render(
        <ReceivableListTable 
          {...defaultProps} 
          loading={true}
          page={2}
          totalCount={20}
        />
      );
      
      const prevButton = screen.getByText('Previous');
      const nextButton = screen.getByText('Next');
      
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Empty States', () => {
    it('should show empty message when no receivables', () => {
      render(
        <ReceivableListTable 
          {...defaultProps} 
          receivables={[]}
          totalCount={0}
        />
      );
      
      expect(screen.getByText('No receivables found.')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display dates in correct format', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // Check for formatted dates (format: MMM dd, yyyy)
      expect(screen.getByText('Sep 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Oct 1, 2025')).toBeInTheDocument();
      expect(screen.getByText('Aug 15, 2025')).toBeInTheDocument();
    });

    it('should highlight overdue dates', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      // INV-002 has overdue due date, should be styled differently
      const dueDateCells = screen.getAllByText(/Aug 30, 2025/);
      expect(dueDateCells.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain table structure on different screen sizes', () => {
      render(<ReceivableListTable {...defaultProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check that all essential columns are present
      expect(screen.getByText('Invoice #')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });
});