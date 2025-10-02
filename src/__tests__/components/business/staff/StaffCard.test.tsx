import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffCard } from '../../../../components/business/staff/StaffCard';
import type { Staff } from '../../../../../types/staff';

describe('StaffCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnView = jest.fn();

  const mockActiveStaff: Staff = {
    id: '323e4567-e89b-12d3-a456-426614174000',
    employeeId: 'EMP001',
    name: 'John Doe',
    department: 'IT',
    shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
    isActive: true,
    userId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2025-09-14T10:00:00Z'),
    updatedAt: new Date('2025-09-14T10:00:00Z'),
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@company.com',
      name: 'John Doe',
      role: 'ADMIN'
    }
  };

  const mockInactiveStaff: Staff = {
    ...mockActiveStaff,
    id: '423e4567-e89b-12d3-a456-426614174000',
    employeeId: 'EMP002',
    name: 'Jane Smith',
    department: 'HR',
    isActive: false,
    user: {
      id: '223e4567-e89b-12d3-a456-426614174000',
      email: 'jane.smith@company.com',
      name: 'Jane Smith',
      role: 'SALES'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Staff Information Display', () => {
    it('should render staff information correctly', () => {
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('ID: EMP001')).toBeInTheDocument();
      expect(screen.getByText('IT')).toBeInTheDocument();
      expect(screen.getByText('Day Shift (9:00 AM - 5:00 PM)')).toBeInTheDocument();
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('Created: 9/14/2025')).toBeInTheDocument();
    });

    it('should show active badge for active staff', () => {
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Active')).toHaveClass('bg-primary');
    });

    it('should show inactive badge for inactive staff', () => {
      render(
        <StaffCard
          staff={mockInactiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should render without user information if not provided', () => {
      const staffWithoutUser = { ...mockActiveStaff, user: undefined };
      
      render(
        <StaffCard
          staff={staffWithoutUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('ID: EMP001')).toBeInTheDocument();
      expect(screen.queryByText('@company.com')).not.toBeInTheDocument();
    });
  });

  describe('Actions Menu', () => {
    it('should show dropdown menu when clicking more options', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      // Click the more options button
      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onView when View Details is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('View Details'));

      expect(mockOnView).toHaveBeenCalledWith(mockActiveStaff);
    });

    it('should call onEdit when Edit is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Edit'));

      expect(mockOnEdit).toHaveBeenCalledWith(mockActiveStaff);
    });

    it('should call onDelete when Delete is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Delete'));

      expect(mockOnDelete).toHaveBeenCalledWith(mockActiveStaff);
    });

    it('should show delete option in destructive color', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));
      
      const deleteOption = screen.getByText('Delete');
      expect(deleteOption).toHaveClass('text-destructive');
    });
  });

  describe('Conditional Action Rendering', () => {
    it('should only show View Details when only onView is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should only show Edit when only onEdit is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should only show Delete when only onDelete is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show all actions when all handlers are provided', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('should have hover effect on card', () => {
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const card = screen.getByText('John Doe').closest('[class*="hover:shadow-md"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('hover:shadow-md', 'transition-shadow');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dropdown trigger button', () => {
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have accessible menu items', async () => {
      const user = userEvent.setup();
      
      render(
        <StaffCard
          staff={mockActiveStaff}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      await user.click(screen.getByRole('button'));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
      
      menuItems.forEach(item => {
        expect(item).toBeInTheDocument();
      });
    });
  });
});