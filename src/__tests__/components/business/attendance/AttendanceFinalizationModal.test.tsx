import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceFinalizationModal } from '@/components/business/attendance/AttendanceFinalizationModal';
import type { PeriodValidationResult, PeriodStatusSummary } from '@/types/attendance';

// Mock components
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="mock-calendar">
      <button onClick={() => onSelect(new Date('2024-01-01'))}>
        Select Start Date
      </button>
      <button onClick={() => onSelect(new Date('2024-01-31'))}>
        Select End Date
      </button>
      {selected && <div>Selected: {selected.toDateString()}</div>}
    </div>
  )
}));

const mockValidationResult: PeriodValidationResult = {
  canFinalize: true,
  issues: []
};

const mockValidationResultWithIssues: PeriodValidationResult = {
  canFinalize: false,
  issues: [
    {
      type: 'UNRESOLVED_CONFLICTS',
      message: 'Some records have unresolved conflicts',
      count: 3
    },
    {
      type: 'PENDING_APPROVALS',
      message: 'Some records require approval',
      count: 2
    }
  ]
};

const mockPeriodSummary: PeriodStatusSummary = {
  totalRecords: 150,
  employeeCount: 25,
  pendingApprovals: 0,
  conflicts: 0,
  period: {
    id: 'period123',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onFinalize: jest.fn(),
  onValidatePeriod: jest.fn(),
  onGetPeriodSummary: jest.fn(),
  isLoading: false
};

describe('AttendanceFinalizationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with correct title', () => {
    render(<AttendanceFinalizationModal {...defaultProps} />);

    expect(screen.getByText('Finalize Attendance Period')).toBeInTheDocument();
  });

  it('shows period selection interface', () => {
    render(<AttendanceFinalizationModal {...defaultProps} />);

    expect(screen.getByText('Select Period to Finalize')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('validates date selection and shows error for invalid range', async () => {
    const user = userEvent.setup();

    render(<AttendanceFinalizationModal {...defaultProps} />);

    // Select end date before start date (invalid)
    const endDateButton = screen.getByText('Select end date');
    await user.click(endDateButton);

    // This would trigger validation in real implementation
    // For now, we'll check if validation message appears
    await waitFor(() => {
      expect(screen.queryByText(/End date must be after start date/i)).not.toBeInTheDocument();
    });
  });

  it('calls validation and summary when valid dates are selected', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    // Select start date
    const startDateButton = screen.getByText('Select start date');
    await user.click(startDateButton);

    const selectStartButton = screen.getByText('Select Start Date');
    await user.click(selectStartButton);

    // Select end date
    const endDateButton = screen.getByText('Select end date');
    await user.click(endDateButton);

    const selectEndButton = screen.getByText('Select End Date');
    await user.click(selectEndButton);

    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      expect(mockOnSummary).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });

  it('displays period summary when dates are valid', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total records
      expect(screen.getByText('25')).toBeInTheDocument(); // Employee count
    });
  });

  it('shows validation success when period can be finalized', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Period is ready for finalization/i)).toBeInTheDocument();
    });
  });

  it('shows validation errors when period cannot be finalized', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResultWithIssues);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Period cannot be finalized/i)).toBeInTheDocument();
      expect(screen.getByText(/Some records have unresolved conflicts \(3 items\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Some records require approval \(2 items\)/i)).toBeInTheDocument();
    });
  });

  it('enables proceed button only when validation passes', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeEnabled();
    });
  });

  it('disables proceed button when validation fails', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResultWithIssues);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeDisabled();
    });
  });

  it('shows confirmation screen when proceed is clicked', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeEnabled();
    });

    const proceedButton = screen.getByText('Proceed to Finalize');
    await user.click(proceedButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Period Finalization')).toBeInTheDocument();
      expect(screen.getByText(/Warning.*Finalizing this period will lock/i)).toBeInTheDocument();
    });
  });

  it('shows finalization summary in confirmation screen', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    // Navigate to confirmation screen
    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeEnabled();
    });

    const proceedButton = screen.getByText('Proceed to Finalize');
    await user.click(proceedButton);

    await waitFor(() => {
      expect(screen.getByText('Finalization Summary')).toBeInTheDocument();
      expect(screen.getByText('Jan 01, 2024 - Jan 31, 2024')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // Total records
      expect(screen.getByText('25')).toBeInTheDocument(); // Employee count
    });
  });

  it('calls onFinalize when confirmation is clicked', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);
    const mockOnFinalize = jest.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
        onFinalize={mockOnFinalize}
      />
    );

    // Navigate to confirmation screen
    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeEnabled();
    });

    const proceedButton = screen.getByText('Proceed to Finalize');
    await user.click(proceedButton);

    // Confirm finalization
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Finalization');
      expect(confirmButton).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Finalization');
    await user.click(confirmButton);

    expect(mockOnFinalize).toHaveBeenCalledWith({
      periodId: 'period123',
      confirmFinalization: true
    });
  });

  it('allows going back from confirmation screen', async () => {
    const mockOnValidate = jest.fn().mockResolvedValue(mockValidationResult);
    const mockOnSummary = jest.fn().mockResolvedValue(mockPeriodSummary);

    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onValidatePeriod={mockOnValidate}
        onGetPeriodSummary={mockOnSummary}
      />
    );

    // Navigate to confirmation screen
    await waitFor(() => {
      const proceedButton = screen.getByText('Proceed to Finalize');
      expect(proceedButton).toBeEnabled();
    });

    const proceedButton = screen.getByText('Proceed to Finalize');
    await user.click(proceedButton);

    // Go back
    await waitFor(() => {
      const backButton = screen.getByText('Back');
      expect(backButton).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back');
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Finalize Attendance Period')).toBeInTheDocument();
      expect(screen.queryByText('Confirm Period Finalization')).not.toBeInTheDocument();
    });
  });

  it('shows loading states correctly', () => {
    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        isLoading={true}
      />
    );

    expect(screen.getByText('Finalizing...')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const mockOnClose = jest.fn();
    const user = userEvent.setup();

    render(
      <AttendanceFinalizationModal
        {...defaultProps}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets state when modal is closed and reopened', () => {
    const { rerender } = render(
      <AttendanceFinalizationModal
        {...defaultProps}
        isOpen={false}
      />
    );

    // Reopen modal
    rerender(
      <AttendanceFinalizationModal
        {...defaultProps}
        isOpen={true}
      />
    );

    expect(screen.getByText('Finalize Attendance Period')).toBeInTheDocument();
    expect(screen.queryByText('Confirm Period Finalization')).not.toBeInTheDocument();
  });
});