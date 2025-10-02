import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayrollCalculationModal } from '@/components/business/payroll/PayrollCalculationModal';
import type { AttendancePeriod, PayrollPreviewData } from '@/types/payroll';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, format: string) => {
    if (format === 'MMM dd, yyyy') {
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    return date.toISOString();
  }),
}));

describe('PayrollCalculationModal', () => {
  const mockAttendancePeriods: AttendancePeriod[] = [
    {
      id: 'period-1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      status: 'FINALIZED',
      attendancePeriodId: 'att-period-1',
      totalHours: 0,
      totalOvertimeHours: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'period-2',
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-01-14'),
      status: 'FINALIZED',
      attendancePeriodId: 'att-period-2',
      totalHours: 0,
      totalOvertimeHours: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPreviewData: PayrollPreviewData[] = [
    {
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      department: 'Engineering',
      standardHours: 40.0,
      overtimeHours: 5.0,
      standardRate: 10.00,
      overtimeRate: 15.00,
      grossPay: 475.00,
      attendanceRecords: 5,
    },
    {
      employeeId: 'emp-2',
      employeeName: 'Jane Smith',
      department: 'Marketing',
      standardHours: 35.0,
      overtimeHours: 0.0,
      standardRate: 12.00,
      overtimeRate: 18.00,
      grossPay: 420.00,
      attendanceRecords: 5,
    },
  ];

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    attendancePeriods: mockAttendancePeriods,
    onValidateEligibility: vi.fn(),
    onGetPreview: vi.fn(),
    onCalculatePayroll: vi.fn(),
    onApprovePayroll: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Period Selection Step', () => {
    it('should render period selection interface', () => {
      render(<PayrollCalculationModal {...mockProps} />);

      expect(screen.getByText('Select Period for Payroll Calculation')).toBeInTheDocument();
      expect(screen.getByText('Choose an attendance period...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show only finalized periods in selection', async () => {
      const user = userEvent.setup();
      render(<PayrollCalculationModal {...mockProps} />);

      // Open select dropdown
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      // Should show finalized periods
      expect(screen.getByText('Jan 01, 2024 - Jan 07, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 08, 2024 - Jan 14, 2024')).toBeInTheDocument();
    });

    it('should validate eligibility when period is selected', async () => {
      const user = userEvent.setup();
      const mockEligibilityResult = {
        eligible: true,
        attendancePeriod: {
          employeeCount: 10,
          totalRecords: 50,
          status: 'FINALIZED',
        },
        existingPayroll: null,
      };

      mockProps.onValidateEligibility.mockResolvedValueOnce(mockEligibilityResult);

      render(<PayrollCalculationModal {...mockProps} />);

      // Select a period
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await waitFor(() => {
        expect(mockProps.onValidateEligibility).toHaveBeenCalledWith('period-1');
      });

      // Should show period information
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Employee count
        expect(screen.getByText('50')).toBeInTheDocument(); // Total records
        expect(screen.getByText('Period is eligible for payroll calculation.')).toBeInTheDocument();
      });
    });

    it('should show error when period is not eligible', async () => {
      const user = userEvent.setup();
      const mockEligibilityResult = {
        eligible: false,
        reason: 'Payroll already exists',
        attendancePeriod: { employeeCount: 10, totalRecords: 50, status: 'FINALIZED' },
        existingPayroll: null,
      };

      mockProps.onValidateEligibility.mockResolvedValueOnce(mockEligibilityResult);

      render(<PayrollCalculationModal {...mockProps} />);

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await waitFor(() => {
        expect(screen.getByText('Payroll already exists')).toBeInTheDocument();
      });

      // Preview button should be disabled
      const previewButton = screen.getByRole('button', { name: /preview calculation/i });
      expect(previewButton).toBeDisabled();
    });

    it('should proceed to preview when eligible period is selected', async () => {
      const user = userEvent.setup();
      const mockEligibilityResult = {
        eligible: true,
        attendancePeriod: { employeeCount: 10, totalRecords: 50, status: 'FINALIZED' },
        existingPayroll: null,
      };

      mockProps.onValidateEligibility.mockResolvedValueOnce(mockEligibilityResult);
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);

      render(<PayrollCalculationModal {...mockProps} />);

      // Select period
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText('Period is eligible for payroll calculation.')).toBeInTheDocument();
      });

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview calculation/i });
      expect(previewButton).toBeEnabled();
      await user.click(previewButton);

      await waitFor(() => {
        expect(mockProps.onGetPreview).toHaveBeenCalledWith('period-1');
      });
    });
  });

  describe('Preview Step', () => {
    it('should render payroll preview with employee data', async () => {
      const user = userEvent.setup();

      // Mock the flow to get to preview step
      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 2, totalRecords: 10, status: 'FINALIZED' },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);

      render(<PayrollCalculationModal {...mockProps} />);

      // Navigate to preview
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /preview calculation/i })).toBeEnabled();
      });

      await user.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => {
        expect(screen.getByText('Payroll Calculation Preview')).toBeInTheDocument();
      });

      // Should show summary statistics
      expect(screen.getByText('2')).toBeInTheDocument(); // Total employees
      expect(screen.getByText('75.0')).toBeInTheDocument(); // Total standard hours
      expect(screen.getByText('5.0')).toBeInTheDocument(); // Total overtime hours
      expect(screen.getByText('$895.00')).toBeInTheDocument(); // Total gross pay

      // Should show employee table
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should proceed to confirmation step', async () => {
      const user = userEvent.setup();

      // Set up component in preview state
      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 2, totalRecords: 10, status: 'FINALIZED' },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);

      render(<PayrollCalculationModal {...mockProps} />);

      // Navigate through the flow
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /preview calculation/i })).toBeEnabled();
      });

      await user.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => {
        expect(screen.getByText('Payroll Calculation Preview')).toBeInTheDocument();
      });

      // Click proceed to calculate
      const proceedButton = screen.getByRole('button', { name: /proceed to calculate/i });
      await user.click(proceedButton);

      expect(screen.getByText('Confirm Payroll Calculation')).toBeInTheDocument();
    });

    it('should allow going back to period selection', async () => {
      const user = userEvent.setup();

      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 2, totalRecords: 10, status: 'FINALIZED' },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);

      render(<PayrollCalculationModal {...mockProps} />);

      // Navigate to preview
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await user.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => {
        expect(screen.getByText('Payroll Calculation Preview')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(screen.getByText('Select Period for Payroll Calculation')).toBeInTheDocument();
    });
  });

  describe('Confirmation Step', () => {
    it('should show confirmation details', async () => {
      const user = userEvent.setup();

      // Navigate to confirmation step
      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: {
          employeeCount: 2,
          totalRecords: 10,
          status: 'FINALIZED',
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);

      render(<PayrollCalculationModal {...mockProps} />);

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await user.click(screen.getByRole('button', { name: /preview calculation/i }));
      await user.click(screen.getByRole('button', { name: /proceed to calculate/i }));

      expect(screen.getByText('Confirm Payroll Calculation')).toBeInTheDocument();
      expect(screen.getByText(/Ready to Calculate/)).toBeInTheDocument();
      expect(screen.getByText('Total Employees:')).toBeInTheDocument();
      expect(screen.getByText('Total Gross Pay:')).toBeInTheDocument();
    });

    it('should calculate payroll when confirmed', async () => {
      const user = userEvent.setup();

      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 2, totalRecords: 10, status: 'FINALIZED' },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockResolvedValueOnce(mockPreviewData);
      mockProps.onCalculatePayroll.mockResolvedValueOnce(undefined);

      render(<PayrollCalculationModal {...mockProps} />);

      // Navigate to confirmation
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await user.click(screen.getByRole('button', { name: /preview calculation/i }));
      await user.click(screen.getByRole('button', { name: /proceed to calculate/i }));

      // Calculate payroll
      const calculateButton = screen.getByRole('button', { name: /calculate payroll/i });
      await user.click(calculateButton);

      expect(mockProps.onCalculatePayroll).toHaveBeenCalledWith({
        periodId: 'period-1',
        confirmCalculation: true,
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during validation', () => {
      render(<PayrollCalculationModal {...mockProps} isLoading={true} />);

      // Any button should be disabled when loading
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should disable buttons during calculation', async () => {
      const user = userEvent.setup();

      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 2, totalRecords: 10, status: 'FINALIZED' },
        existingPayroll: null,
      });

      render(<PayrollCalculationModal {...mockProps} isLoading={true} />);

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      await waitFor(() => {
        const previewButton = screen.getByRole('button', { name: /validating.../i });
        expect(previewButton).toBeDisabled();
      });
    });
  });

  describe('Modal Lifecycle', () => {
    it('should reset state when modal closes and reopens', async () => {
      const { rerender } = render(<PayrollCalculationModal {...mockProps} isOpen={false} />);

      // Modal closed, no content should be visible
      expect(screen.queryByText('Select Period for Payroll Calculation')).not.toBeInTheDocument();

      // Reopen modal
      rerender(<PayrollCalculationModal {...mockProps} isOpen={true} />);

      // Should be back to initial state
      expect(screen.getByText('Select Period for Payroll Calculation')).toBeInTheDocument();
      expect(screen.getByText('Choose an attendance period...')).toBeInTheDocument();
    });

    it('should call onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<PayrollCalculationModal {...mockProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const user = userEvent.setup();

      mockProps.onValidateEligibility.mockRejectedValueOnce(new Error('Validation failed'));

      render(<PayrollCalculationModal {...mockProps} />);

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      // Should not crash and validation should be called
      await waitFor(() => {
        expect(mockProps.onValidateEligibility).toHaveBeenCalled();
      });
    });

    it('should handle preview loading errors', async () => {
      const user = userEvent.setup();

      mockProps.onValidateEligibility.mockResolvedValueOnce({
        eligible: true,
        attendancePeriod: { employeeCount: 10, totalRecords: 50, status: 'FINALIZED' },
        existingPayroll: null,
      });
      mockProps.onGetPreview.mockRejectedValueOnce(new Error('Preview failed'));

      render(<PayrollCalculationModal {...mockProps} />);

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByText('Jan 01, 2024 - Jan 07, 2024'));

      const previewButton = screen.getByRole('button', { name: /preview calculation/i });
      await user.click(previewButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockProps.onGetPreview).toHaveBeenCalled();
      });
    });
  });
});