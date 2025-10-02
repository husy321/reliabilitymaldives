import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerForm } from '../CustomerForm';
import { CustomerFormData, Customer } from '../../../../types/customer';

// Mock useToast hook
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn()
  })
}));

describe('CustomerForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockCustomer: Customer = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company Ltd',
    email: 'contact@testcompany.com',
    phone: '+960-123-4567',
    address: 'Male, Maldives',
    paymentTerms: 30,
    currentBalance: 1000.50,
    isActive: true,
    createdAt: new Date('2025-09-09T10:00:00Z'),
    updatedAt: new Date('2025-09-09T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render form in create mode', () => {
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
      expect(screen.getByText('Create Customer')).toBeInTheDocument();
      expect(screen.getByLabelText('Customer Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Payment Terms *')).toBeInTheDocument();
      
      // Should not show status field in create mode
      expect(screen.queryByLabelText('Customer Status')).not.toBeInTheDocument();
    });

    it('should have empty default values in create mode', () => {
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Customer Name *')).toHaveValue('');
      expect(screen.getByLabelText('Email Address')).toHaveValue('');
      expect(screen.getByLabelText('Phone Number')).toHaveValue('');
      expect(screen.getByLabelText('Address')).toHaveValue('');
    });

    it('should submit form with valid data in create mode', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Customer Name *'), 'New Test Company');
      await user.type(screen.getByLabelText('Email Address'), 'new@testcompany.com');
      await user.type(screen.getByLabelText('Phone Number'), '+960-987-6543');
      await user.type(screen.getByLabelText('Address'), 'New Address, Maldives');
      
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Test Company',
          email: 'new@testcompany.com',
          phone: '+960-987-6543',
          address: 'New Address, Maldives',
          paymentTerms: 30,
          isActive: true
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('should render form in edit mode with customer data', () => {
      render(
        <CustomerForm
          customer={mockCustomer}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Customer')).toBeInTheDocument();
      expect(screen.getByText('Update Customer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Company Ltd')).toBeInTheDocument();
      expect(screen.getByDisplayValue('contact@testcompany.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+960-123-4567')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Male, Maldives')).toBeInTheDocument();
      
      // Should show status field in edit mode
      expect(screen.getByLabelText('Customer Status')).toBeInTheDocument();
    });

    it('should submit form with updated data in edit mode', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          customer={mockCustomer}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText('Customer Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Company Ltd');

      await user.click(screen.getByText('Update Customer'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Company Ltd'
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      await user.type(screen.getByLabelText('Email Address'), 'invalid-email');
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should validate name length constraints', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Test maximum length validation
      const longName = 'A'.repeat(256);
      await user.type(screen.getByLabelText('Customer Name *'), longName);
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(screen.getByText('Customer name must be less than 255 characters')).toBeInTheDocument();
      });
    });

    it('should validate phone number length', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      await user.type(screen.getByLabelText('Phone Number'), 'A'.repeat(51));
      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(screen.getByText('Phone number must be less than 50 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Terms Selection', () => {
    it('should show payment terms dropdown with options', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const paymentTermsSelect = screen.getByLabelText('Payment Terms *');
      await user.click(paymentTermsSelect);

      expect(screen.getByText('15 days')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText('45 days')).toBeInTheDocument();
      expect(screen.getByText('60 days')).toBeInTheDocument();
    });

    it('should select different payment terms', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      
      const paymentTermsSelect = screen.getByLabelText('Payment Terms *');
      await user.click(paymentTermsSelect);
      await user.click(screen.getByText('45 days'));

      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentTerms: 45
          })
        );
      });
    });
  });

  describe('Loading and Disabled States', () => {
    it('should disable form fields when loading', () => {
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText('Customer Name *')).toBeDisabled();
      expect(screen.getByLabelText('Email Address')).toBeDisabled();
      expect(screen.getByLabelText('Phone Number')).toBeDisabled();
      expect(screen.getByLabelText('Address')).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('should show loading state with spinner', () => {
      render(
        <CustomerForm
          mode="edit"
          customer={mockCustomer}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Updating...')).toBeInTheDocument();
      // Check for spinner (Loader2 component is rendered as svg with animate-spin class)
      const loadingButton = screen.getByText('Updating...').closest('button');
      expect(loadingButton).toHaveClass('disabled');
    });
  });

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should clean empty string values before submission', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText('Customer Name *'), 'Test Company');
      // Leave email and phone empty, but type spaces in address then clear
      await user.type(screen.getByLabelText('Address'), '   ');
      await user.clear(screen.getByLabelText('Address'));

      await user.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Company',
          email: undefined,
          phone: undefined,
          address: undefined,
          paymentTerms: 30,
          isActive: true
        });
      });
    });
  });

  describe('Customer Status in Edit Mode', () => {
    it('should show active status dropdown in edit mode', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          customer={mockCustomer}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelect = screen.getByLabelText('Customer Status');
      await user.click(statusSelect);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should submit with updated active status', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomerForm
          customer={mockCustomer}
          mode="edit"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelect = screen.getByLabelText('Customer Status');
      await user.click(statusSelect);
      await user.click(screen.getByText('Inactive'));

      await user.click(screen.getByText('Update Customer'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: false
          })
        );
      });
    });
  });
});