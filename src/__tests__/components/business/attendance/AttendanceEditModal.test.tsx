import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceEditModal } from '../../../../components/business/attendance/AttendanceEditModal';
import type { AttendanceRecord, AttendanceEditRequest, AttendanceEditResult } from '../../../../../types/attendance';

// Mock the date-fns functions to make tests deterministic
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'HH:mm') {
      return new Date(date).toTimeString().slice(0, 5);
    }
    if (formatStr === 'yyyy-MM-dd') {
      return new Date(date).toISOString().slice(0, 10);
    }
    if (formatStr === 'MMM dd, yyyy') {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    }
    return jest.requireActual('date-fns').format(date, formatStr);
  }),
  parse: jest.fn((timeStr, format, referenceDate) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }),
  isValid: jest.fn(() => true),
  isBefore: jest.fn(() => false),
  isAfter: jest.fn((date1, date2) => {
    return new Date(date1).getTime() > new Date(date2).getTime();
  }),
  startOfDay: jest.fn((date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }),
  endOfDay: jest.fn((date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }),
}));

describe('AttendanceEditModal', () => {
  const mockRecord: AttendanceRecord = {
    id: 'record-123',
    staffId: 'staff-456',
    employeeId: 'EMP001',
    date: new Date('2024-01-15'),
    clockInTime: new Date('2024-01-15T09:00:00Z'),
    clockOutTime: new Date('2024-01-15T17:00:00Z'),
    totalHours: 8,
    zkTransactionId: 'zkt-123',
    fetchedAt: new Date('2024-01-15T18:00:00Z'),
    fetchedById: 'fetcher-123',
    createdAt: new Date('2024-01-15T18:00:00Z'),
    updatedAt: new Date('2024-01-15T18:00:00Z'),
    staff: {
      id: 'staff-456',
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'Engineering'
    },
    fetchedBy: {
      id: 'fetcher-123',
      name: 'Fetcher User',
      email: 'fetcher@example.com'
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    record: mockRecord,
    onSave: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with record information', () => {
    render(<AttendanceEditModal {...defaultProps} />);

    // Check employee information is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Employee ID: EMP001')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();

    // Check form fields exist
    expect(screen.getByLabelText(/Attendance Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clock In Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clock Out Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Manual Edit/i)).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('should initialize form with existing record data', () => {
    render(<AttendanceEditModal {...defaultProps} />);

    // Clock-in and clock-out inputs should show existing times
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    expect(clockInInput).toBeInTheDocument();
    expect(clockOutInput).toBeInTheDocument();
  });

  it('should validate required reason field', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Modify clock-in time to trigger change detection
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    // Try to save without reason
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Reason is required for manual edits/i)).toBeInTheDocument();
    });

    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('should validate time sequence (clock-in before clock-out)', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Set clock-in after clock-out
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.type(clockInInput, '18:00'); // After clock-out

    await user.clear(clockOutInput);
    await user.type(clockOutInput, '17:00');

    // Add reason
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    await waitFor(() => {
      expect(screen.getByText(/Clock-out time must be after clock-in time/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('should validate minimum working duration', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Set times with very short duration (5 minutes)
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.type(clockInInput, '09:00');

    await user.clear(clockOutInput);
    await user.type(clockOutInput, '09:05'); // Only 5 minutes

    // Add reason
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    await waitFor(() => {
      expect(screen.getByText(/Work duration must be at least 15 minutes/i)).toBeInTheDocument();
    });
  });

  it('should validate maximum working duration', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Set times with excessive duration (25 hours)
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.type(clockInInput, '00:00');

    await user.clear(clockOutInput);
    await user.type(clockOutInput, '23:59'); // This would be close to 24 hours but valid

    // For this test, we'll mock isAfter to return true to simulate 25+ hours
    const mockIsAfter = require('date-fns').isAfter as jest.Mock;
    mockIsAfter.mockImplementation((date1, date2) => {
      // Simulate 25 hour difference
      const time1 = new Date(date1).getTime();
      const time2 = new Date(date2).getTime();
      return (time1 - time2) > (24 * 60 * 60 * 1000);
    });

    // Add reason
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    await waitFor(() => {
      expect(screen.getByText(/Work duration cannot exceed 24 hours/i)).toBeInTheDocument();
    });
  });

  it('should require at least one time field', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Clear both time fields
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.clear(clockOutInput);

    // Add reason
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    await waitFor(() => {
      expect(screen.getByText(/At least one time \(clock-in or clock-out\) must be provided/i)).toBeInTheDocument();
    });
  });

  it('should show working hours preview when both times are valid', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Times should show 8 hours initially
    await waitFor(() => {
      expect(screen.getByText(/Working Hours Preview:/)).toBeInTheDocument();
      expect(screen.getByText(/8\.00 hours/)).toBeInTheDocument();
    });

    // Change to different valid times
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.type(clockInInput, '08:00');

    await user.clear(clockOutInput);
    await user.type(clockOutInput, '18:00');

    await waitFor(() => {
      expect(screen.getByText(/10\.00 hours/)).toBeInTheDocument();
    });
  });

  it('should show changes summary when modifications are made', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Modify clock-in time
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    // Add reason to enable save
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Corrected arrival time');

    await waitFor(() => {
      expect(screen.getByText(/Changes Summary:/)).toBeInTheDocument();
      expect(screen.getByText(/Clock In: 09:00 → 08:30/)).toBeInTheDocument();
    });
  });

  it('should call onSave with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn().mockResolvedValue({ success: true });

    render(<AttendanceEditModal {...defaultProps} onSave={mockOnSave} />);

    // Modify times
    const clockInInput = screen.getByDisplayValue('09:00');
    const clockOutInput = screen.getByDisplayValue('17:00');

    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    await user.clear(clockOutInput);
    await user.type(clockOutInput, '17:30');

    // Add reason
    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Corrected times');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        recordId: 'record-123',
        date: expect.any(Date),
        clockInTime: expect.any(Date),
        clockOutTime: expect.any(Date),
        reason: 'Corrected times'
      });
    });
  });

  it('should handle save errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn().mockResolvedValue({
      success: false,
      errors: ['Failed to save record']
    });

    render(<AttendanceEditModal {...defaultProps} onSave={mockOnSave} />);

    // Make valid changes
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save record/)).toBeInTheDocument();
    });

    // Modal should remain open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show loading state during save', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/Saving.../)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Saving.../i });
    expect(saveButton).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<AttendanceEditModal {...defaultProps} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should confirm before closing with unsaved changes', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn().mockReturnValue(true);

    render(<AttendanceEditModal {...defaultProps} onClose={mockOnClose} />);

    // Make changes
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    // Try to close
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
    expect(mockOnClose).toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should not close if user cancels confirmation dialog', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn().mockReturnValue(false);

    render(<AttendanceEditModal {...defaultProps} onClose={mockOnClose} />);

    // Make changes
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    // Try to close
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should handle null record gracefully', () => {
    render(<AttendanceEditModal {...defaultProps} record={null} />);

    // Modal should not render
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should handle record with only clock-in time', () => {
    const recordWithOnlyClockIn: AttendanceRecord = {
      ...mockRecord,
      clockOutTime: null,
      totalHours: null
    };

    render(<AttendanceEditModal {...defaultProps} record={recordWithOnlyClockIn} />);

    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument(); // Clock-in
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Empty clock-out
    expect(screen.getByText(/Original:.*Not recorded/)).toBeInTheDocument();
  });

  it('should handle record with only clock-out time', () => {
    const recordWithOnlyClockOut: AttendanceRecord = {
      ...mockRecord,
      clockInTime: null,
      totalHours: null
    };

    render(<AttendanceEditModal {...defaultProps} record={recordWithOnlyClockOut} />);

    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Empty clock-in
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument(); // Clock-out
    expect(screen.getByText(/Original:.*Not recorded/)).toBeInTheDocument();
  });

  it('should disable save button when form is invalid', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Make invalid change (clock-in after clock-out)
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '18:00');

    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Test edit');

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('should enable save button when form is valid and has changes', async () => {
    const user = userEvent.setup();
    render(<AttendanceEditModal {...defaultProps} />);

    // Make valid change
    const clockInInput = screen.getByDisplayValue('09:00');
    await user.clear(clockInInput);
    await user.type(clockInInput, '08:30');

    const reasonInput = screen.getByLabelText(/Reason for Manual Edit/i);
    await user.type(reasonInput, 'Valid edit');

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });
  });
});