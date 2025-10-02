import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffForm } from '../../../../components/business/staff/StaffForm';
import type { Staff, CreateStaffRequest } from '../../../../../types/staff';

describe('StaffForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockUsers = [
    { id: '123e4567-e89b-12d3-a456-426614174000', email: 'john@company.com', name: 'John Doe' },
    { id: '223e4567-e89b-12d3-a456-426614174000', email: 'jane@company.com', name: 'Jane Smith' }
  ];

  const mockDepartments = ['IT', 'HR', 'Finance', 'Sales'];

  const mockStaff: Staff = {
    id: '323e4567-e89b-12d3-a456-426614174000',
    employeeId: 'EMP001',
    name: 'John Doe',
    department: 'IT',
    shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
    isActive: true,
    userId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2025-09-14T10:00:00Z'),
    updatedAt: new Date('2025-09-14T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render form in create mode', () => {
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create Staff Member')).toBeInTheDocument();
      expect(screen.getByText('Create Staff Member')).toBeInTheDocument();
      expect(screen.getByLabelText('Employee ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Shift Schedule')).toBeInTheDocument();
      expect(screen.getByLabelText('User Account')).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in the form
      await user.type(screen.getByLabelText('Employee ID'), 'EMP002');
      await user.type(screen.getByLabelText('Full Name'), 'Jane Smith');
      
      // Select department
      await user.click(screen.getByRole('combobox', { name: /department/i }));
      await user.click(screen.getByRole('option', { name: 'HR' }));
      
      // Select shift schedule
      await user.click(screen.getByRole('combobox', { name: /shift schedule/i }));
      await user.click(screen.getByRole('option', { name: /Day Shift/i }));
      
      // Select user account
      await user.click(screen.getByRole('combobox', { name: /user account/i }));
      await user.click(screen.getByRole('option', { name: /Jane Smith/ }));

      // Submit form
      await user.click(screen.getByRole('button', { name: /Create Staff Member/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          employeeId: 'EMP002',
          name: 'Jane Smith',
          department: 'HR',
          shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
          userId: '223e4567-e89b-12d3-a456-426614174000',
          isActive: true
        });
      });
    });

    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /Create Staff Member/i }));

      await waitFor(() => {
        expect(screen.getByText('Employee ID is required')).toBeInTheDocument();
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Department is required')).toBeInTheDocument();
        expect(screen.getByText('Shift schedule is required')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('should render form in edit mode with pre-filled data', () => {
      render(
        <StaffForm
          mode="edit"
          staff={mockStaff}
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Staff Member')).toBeInTheDocument();
      expect(screen.getByDisplayValue('EMP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Update Staff Member')).toBeInTheDocument();
    });

    it('should disable user account field in edit mode', () => {
      render(
        <StaffForm
          mode="edit"
          staff={mockStaff}
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const userAccountField = screen.getByRole('combobox', { name: /user account/i });
      expect(userAccountField).toBeDisabled();
      expect(screen.getByText('User account cannot be changed after creation')).toBeInTheDocument();
    });

    it('should submit updated data in edit mode', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="edit"
          staff={mockStaff}
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Update the name
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Smith');

      // Update department
      await user.click(screen.getByRole('combobox', { name: /department/i }));
      await user.click(screen.getByRole('option', { name: 'HR' }));

      // Submit form
      await user.click(screen.getByRole('button', { name: /Update Staff Member/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          id: '323e4567-e89b-12d3-a456-426614174000',
          employeeId: 'EMP001',
          name: 'John Smith',
          department: 'HR',
          shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          isActive: true
        });
      });
    });

    it('should toggle active status', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="edit"
          staff={mockStaff}
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Toggle active status
      const activeSwitch = screen.getByRole('switch');
      expect(activeSwitch).toBeChecked();
      
      await user.click(activeSwitch);
      expect(activeSwitch).not.toBeChecked();

      // Submit form
      await user.click(screen.getByRole('button', { name: /Update Staff Member/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: false
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should disable form fields when loading', () => {
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText('Employee ID')).toBeDisabled();
      expect(screen.getByLabelText('Full Name')).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /department/i })).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /shift schedule/i })).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /user account/i })).toBeDisabled();
      expect(screen.getByRole('switch')).toBeDisabled();
      
      const submitButton = screen.getByRole('button', { name: /Create Staff Member/i });
      expect(submitButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading spinner in submit button', () => {
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      // Check for loading spinner (Loader2 component)
      const submitButton = screen.getByRole('button', { name: /Create Staff Member/i });
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Department Options', () => {
    it('should show provided departments and default options', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={['Engineering', 'Design']}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('combobox', { name: /department/i }));

      // Check for provided departments
      expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Design' })).toBeInTheDocument();
      
      // Check for default departments
      expect(screen.getByRole('option', { name: 'HR' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Finance' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Operations' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'IT' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Management' })).toBeInTheDocument();
    });
  });

  describe('Shift Schedule Options', () => {
    it('should show all shift schedule options', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffForm
          mode="create"
          users={mockUsers}
          departments={mockDepartments}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('combobox', { name: /shift schedule/i }));

      // Check for shift options
      expect(screen.getByRole('option', { name: 'Day Shift (9:00 AM - 5:00 PM)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Night Shift (5:00 PM - 1:00 AM)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Early Shift (6:00 AM - 2:00 PM)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Late Shift (2:00 PM - 10:00 PM)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Flexible Hours' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Part-time Morning' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Part-time Evening' })).toBeInTheDocument();
    });
  });
});