import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerCreateDialog } from '../CustomerCreateDialog';
import * as customerActions from '@/lib/actions/customers';

// Mock customer actions
jest.mock('@/lib/actions/customers', () => ({
  createCustomerAction: jest.fn()
}));

// Mock useToast hook
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: jest.fn()
  })
}));

const mockCreateCustomerAction = customerActions.createCustomerAction as jest.MockedFunction<typeof customerActions.createCustomerAction>;

describe('CustomerCreateDialog', () => {
  const mockOnCustomerCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Behavior', () => {
    it('should render trigger button and open dialog when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      const triggerButton = screen.getByRole('button', { name: /add customer/i });
      expect(triggerButton).toBeInTheDocument();

      await user.click(triggerButton);

      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
      expect(screen.getByLabelText('Customer Name *')).toBeInTheDocument();
    });

    it('should render custom trigger button when provided', () => {
      const customTrigger = <button>Custom Add Button</button>;
      
      render(
        <CustomerCreateDialog 
          onCustomerCreated={mockOnCustomerCreated}
          triggerButton={customTrigger}
        />
      );

      expect(screen.getByText('Custom Add Button')).toBeInTheDocument();
      expect(screen.queryByText('Add Customer')).not.toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      await user.click(screen.getByRole('button', { name: /add customer/i }));
      expect(screen.getByText('Create New Customer')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));

      // Dialog should close (form should not be visible)
      await waitFor(() => {
        expect(screen.queryByText('Create New Customer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Customer Creation', () => {
    it('should create customer successfully', async () => {
      const user = userEvent.setup();
      const mockCustomer = {
        id: '123',
        name: 'Test Company',
        email: 'test@company.com',
        phone: null,
        address: null,
        paymentTerms: 30,
        currentBalance: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCreateCustomerAction.mockResolvedValue({
        success: true,
        data: mockCustomer
      });

      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      // Open dialog
      await user.click(screen.getByRole('button', { name: /add customer/i }));

      // Fill form
      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      await user.type(screen.getByLabelText('Email Address'), 'test@company.com');

      // Submit form
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockCreateCustomerAction).toHaveBeenCalledWith({
          name: 'Test Company',
          email: 'test@company.com',
          phone: undefined,
          address: undefined,
          paymentTerms: 30,
          isActive: true
        });
      });

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Customer created successfully');
        expect(mockOnCustomerCreated).toHaveBeenCalled();
      });

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Create New Customer')).not.toBeInTheDocument();
      });
    });

    it('should handle creation error', async () => {
      const user = userEvent.setup();

      mockCreateCustomerAction.mockResolvedValue({
        success: false,
        error: 'Customer name already exists'
      });

      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      // Open dialog
      await user.click(screen.getByRole('button', { name: /add customer/i }));

      // Fill and submit form
      await user.type(screen.getByLabelText('Customer Name *'), 'Existing Company');
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Customer name already exists');
      });

      // Dialog should remain open on error
      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
      expect(mockOnCustomerCreated).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const user = userEvent.setup();

      mockCreateCustomerAction.mockRejectedValue(new Error('Network error'));

      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      // Open dialog
      await user.click(screen.getByRole('button', { name: /add customer/i }));

      // Fill and submit form
      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('An unexpected error occurred. Please try again.');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during creation', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockCreateCustomerAction.mockReturnValue(createPromise as any);

      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      // Open dialog and fill form
      await user.click(screen.getByRole('button', { name: /add customer/i }));
      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      
      // Start submission
      await user.click(screen.getByText('Create Customer'));

      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      
      // Cancel button should be disabled during loading
      expect(screen.getByText('Cancel')).toBeDisabled();

      // Resolve the promise
      resolveCreate!({
        success: true,
        data: { id: '123', name: 'Test Company' }
      });

      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      });
    });

    it('should prevent dialog close during loading', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockCreateCustomerAction.mockReturnValue(createPromise as any);

      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      // Open dialog and start creation
      await user.click(screen.getByRole('button', { name: /add customer/i }));
      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      await user.click(screen.getByText('Create Customer'));

      // Try to cancel during loading - button should be disabled
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();

      // Resolve to complete the test
      resolveCreate!({ success: true, data: { id: '123' } });
    });
  });

  describe('Form Integration', () => {
    it('should pass correct props to CustomerForm', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      await user.click(screen.getByRole('button', { name: /add customer/i }));

      // Verify form is in create mode
      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
      expect(screen.getByText('Create Customer')).toBeInTheDocument();
      
      // Verify customer status field is not shown (create mode)
      expect(screen.queryByLabelText('Customer Status')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerCreateDialog onCustomerCreated={mockOnCustomerCreated} />
      );

      const triggerButton = screen.getByRole('button', { name: /add customer/i });
      expect(triggerButton).toBeInTheDocument();

      await user.click(triggerButton);

      // Dialog should have proper role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Title should be accessible
      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
    });
  });
});