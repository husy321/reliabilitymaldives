import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReceivableForm } from '@/components/business/ReceivableForm';
import { 
  Receivable, 
  UserRole, 
  ReceivableStatus 
} from '../../../../types/receivable';
import { Customer } from '../../../../types/customer';

// Mock the DatePicker component since it has complex dependencies
jest.mock('@/components/ui/date-picker', () => {
  return function MockDatePicker({ value, onChange, placeholder, disabled }: any) {
    return (
      <input
        data-testid={placeholder}
        type="date"
        value={value ? value.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
        disabled={disabled}
      />
    );
  };
});

// Mock data for testing
const mockCustomers: Customer[] = [
  {
    id: 'customer-1',
    name: 'Test Company Ltd',
    email: 'contact@testcompany.com',
    phone: '+960-123-4567',
    address: 'Male, Maldives',
    paymentTerms: 30,
    currentBalance: 1000.50,
    isActive: true,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z')
  },
  {
    id: 'customer-2',
    name: 'Another Company',
    email: 'info@another.com',
    phone: '+960-987-6543',
    address: 'Hulhumale, Maldives',
    paymentTerms: 45,
    currentBalance: 2500.00,
    isActive: true,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z')
  }
];

const mockReceivable: Receivable = {
  id: 'receivable-1',
  invoiceNumber: 'INV-001',
  customerId: 'customer-1',
  amount: 5000.00,
  invoiceDate: new Date('2025-09-01T00:00:00Z'),
  dueDate: new Date('2025-10-01T00:00:00Z'),
  paidAmount: 1000.00,
  status: ReceivableStatus.PARTIALLY_PAID,
  assignedTo: UserRole.SALES,
  createdAt: new Date('2025-09-01T00:00:00Z'),
  updatedAt: new Date('2025-09-01T00:00:00Z'),
  customer: mockCustomers[0]
};

describe('ReceivableForm', () => {
  const defaultProps = {
    customers: mockCustomers,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
    mode: 'create' as const,
    currentUserRole: UserRole.SALES
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render create form with correct title', () => {
      render(<ReceivableForm {...defaultProps} />);
      
      expect(screen.getByText('Create New Receivable')).toBeInTheDocument();
      expect(screen.getByLabelText(/Invoice Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Customer/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Invoice Amount/)).toBeInTheDocument();
    });

    it('should render edit form with correct title and populated data', () => {
      render(
        <ReceivableForm 
          {...defaultProps} 
          receivable={mockReceivable}
          mode="edit"
        />
      );
      
      expect(screen.getByText('Edit Receivable')).toBeInTheDocument();
      expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('should display all required form fields', () => {
      render(<ReceivableForm {...defaultProps} />);
      
      // Required fields should have asterisk
      expect(screen.getByText('Invoice Number *')).toBeInTheDocument();
      expect(screen.getByText('Customer *')).toBeInTheDocument();
      expect(screen.getByText('Invoice Amount *')).toBeInTheDocument();
      expect(screen.getByText('Invoice Date *')).toBeInTheDocument();
      expect(screen.getByText('Assigned To *')).toBeInTheDocument();
      
      // Optional fields
      expect(screen.getByText('Paid Amount')).toBeInTheDocument();
      expect(screen.getByText('Payment Received Date')).toBeInTheDocument();
    });

    it('should show customer payment terms when customer is selected', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Open customer dropdown
      const customerSelect = screen.getByRole('combobox', { name: /customer/i });
      await user.click(customerSelect);
      
      // Select first customer
      const customerOption = screen.getByText('Test Company Ltd');
      await user.click(customerOption);
      
      await waitFor(() => {
        expect(screen.getByText('Payment Terms: 30 days')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Try to submit empty form
      const submitButton = screen.getByText('Create Receivable');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice number is required')).toBeInTheDocument();
        expect(screen.getByText('Customer selection is required')).toBeInTheDocument();
      });
    });

    it('should validate that paid amount does not exceed total amount', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Fill in basic fields
      await user.type(screen.getByLabelText(/Invoice Number/), 'INV-001');
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      await user.type(screen.getByLabelText(/Paid Amount/), '1500'); // More than total
      
      const submitButton = screen.getByText('Create Receivable');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Paid amount cannot exceed total amount')).toBeInTheDocument();
      });
    });

    it('should require payment date when paid amount is provided', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Fill in basic fields
      await user.type(screen.getByLabelText(/Invoice Number/), 'INV-001');
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      await user.type(screen.getByLabelText(/Paid Amount/), '500');
      
      const submitButton = screen.getByText('Create Receivable');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Payment received date is required when paid amount is specified')).toBeInTheDocument();
      });
    });

    it('should validate that invoice date is not in the future', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Fill in basic fields
      await user.type(screen.getByLabelText(/Invoice Number/), 'INV-001');
      
      // Set future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const invoiceDateInput = screen.getByTestId('Select invoice date');
      await user.clear(invoiceDateInput);
      await user.type(invoiceDateInput, futureDate.toISOString().split('T')[0]);
      
      const submitButton = screen.getByText('Create Receivable');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice date cannot be in the future')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should calculate and display due date when customer and invoice date are selected', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Select customer with 30-day payment terms
      const customerSelect = screen.getByRole('combobox', { name: /customer/i });
      await user.click(customerSelect);
      await user.click(screen.getByText('Test Company Ltd'));
      
      // Set invoice date
      const invoiceDateInput = screen.getByTestId('Select invoice date');
      await user.clear(invoiceDateInput);
      await user.type(invoiceDateInput, '2025-09-01');
      
      await waitFor(() => {
        expect(screen.getByText(/Due: 10\/1\/2025/)).toBeInTheDocument();
      });
    });

    it('should show remaining balance when amounts are entered', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Enter amounts
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      await user.type(screen.getByLabelText(/Paid Amount/), '300');
      
      await waitFor(() => {
        expect(screen.getByText('Remaining Balance: 700.00')).toBeInTheDocument();
      });
    });

    it('should disable payment date when no paid amount is entered', () => {
      render(<ReceivableForm {...defaultProps} />);
      
      const paymentDateInput = screen.getByTestId('Select payment date');
      expect(paymentDateInput).toBeDisabled();
    });

    it('should enable payment date when paid amount is entered', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/Paid Amount/), '500');
      
      await waitFor(() => {
        const paymentDateInput = screen.getByTestId('Select payment date');
        expect(paymentDateInput).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      
      render(<ReceivableForm {...defaultProps} onSubmit={mockOnSubmit} />);
      
      // Fill in all required fields
      await user.type(screen.getByLabelText(/Invoice Number/), 'INV-001');
      
      // Select customer
      const customerSelect = screen.getByRole('combobox', { name: /customer/i });
      await user.click(customerSelect);
      await user.click(screen.getByText('Test Company Ltd'));
      
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      
      // Set invoice date
      const invoiceDateInput = screen.getByTestId('Select invoice date');
      await user.clear(invoiceDateInput);
      await user.type(invoiceDateInput, '2025-09-01');
      
      // Submit form
      const submitButton = screen.getByText('Create Receivable');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          invoiceNumber: 'INV-001',
          customerId: 'customer-1',
          amount: 1000,
          invoiceDate: new Date('2025-09-01'),
          paidAmount: 0,
          paymentReceivedDate: undefined,
          assignedTo: UserRole.SALES
        });
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();
      
      render(<ReceivableForm {...defaultProps} onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable form during submission', () => {
      render(<ReceivableForm {...defaultProps} isLoading={true} />);
      
      expect(screen.getByLabelText(/Invoice Number/)).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /customer/i })).toBeDisabled();
      expect(screen.getByText('Create Receivable')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Summary Display', () => {
    it('should show summary card with correct calculations', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Enter amounts
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      await user.type(screen.getByLabelText(/Paid Amount/), '250');
      
      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText('1000.00')).toBeInTheDocument(); // Total amount
        expect(screen.getByText('250.00')).toBeInTheDocument();  // Paid amount
        expect(screen.getByText('750.00')).toBeInTheDocument();  // Remaining
      });
    });

    it('should show due date in summary when calculated', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Select customer and set dates
      const customerSelect = screen.getByRole('combobox', { name: /customer/i });
      await user.click(customerSelect);
      await user.click(screen.getByText('Test Company Ltd'));
      
      const invoiceDateInput = screen.getByTestId('Select invoice date');
      await user.clear(invoiceDateInput);
      await user.type(invoiceDateInput, '2025-09-01');
      
      await user.type(screen.getByLabelText(/Invoice Amount/), '1000');
      
      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText(/Due Date:/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode Specific Tests', () => {
    it('should populate form fields in edit mode', () => {
      render(
        <ReceivableForm 
          {...defaultProps} 
          receivable={mockReceivable}
          mode="edit"
        />
      );
      
      expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('should show update button text in edit mode', () => {
      render(
        <ReceivableForm 
          {...defaultProps} 
          receivable={mockReceivable}
          mode="edit"
        />
      );
      
      expect(screen.getByText('Update Receivable')).toBeInTheDocument();
    });
  });

  describe('Role-based Functionality', () => {
    it('should show appropriate team roles in assignment dropdown', async () => {
      const user = userEvent.setup();
      render(<ReceivableForm {...defaultProps} />);
      
      // Open assigned to dropdown
      const assignedToSelect = screen.getByRole('combobox', { name: /assigned to/i });
      await user.click(assignedToSelect);
      
      // Should show receivable-capable roles
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Accountant')).toBeInTheDocument();
    });
  });
});