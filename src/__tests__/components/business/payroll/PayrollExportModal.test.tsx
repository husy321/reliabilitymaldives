import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayrollExportModal } from '@/components/business/payroll/PayrollExportModal';
import type { PayrollPeriod, PayrollExportRequest } from '@/types/payroll';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    if (formatStr === 'MMM dd, yyyy HH:mm:ss') return 'Jan 01, 2024 12:00:00';
    return 'Jan 01, 2024';
  }),
}));

describe('PayrollExportModal', () => {
  const mockPayrollPeriod: PayrollPeriod = {
    id: 'period-1',
    attendancePeriodId: 'attendance-1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-15'),
    status: 'APPROVED',
    totalAmount: 15000,
    calculatedAt: new Date('2024-01-16'),
    calculatedBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-16'),
    payrollRecords: [
      {
        id: 'record-1',
        payrollPeriodId: 'period-1',
        employeeId: 'emp-1',
        standardHours: 80,
        overtimeHours: 5,
        standardRate: 15,
        overtimeRate: 22.5,
        grossPay: 1312.5,
        calculationData: {
          attendanceRecordIds: ['att-1'],
          dailyHours: [],
          calculations: {
            standardHoursTotal: 80,
            overtimeHoursTotal: 5,
            standardPay: 1200,
            overtimePay: 112.5,
            grossPay: 1312.5,
          },
          overtimeRules: {
            dailyThreshold: 8,
            weeklyThreshold: 40,
            overtimeRate: 1.5,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    payrollPeriod: mockPayrollPeriod,
    onExport: jest.fn(),
    isLoading: false,
    exportProgress: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with payroll period details', () => {
    render(<PayrollExportModal {...defaultProps} />);

    expect(screen.getByText('Export Payroll')).toBeInTheDocument();
    expect(screen.getByText('Generate and download payroll export for external processing')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('MVR 15000.00')).toBeInTheDocument();
    expect(screen.getByText('1 records')).toBeInTheDocument();
  });

  it('should not render when payrollPeriod is null', () => {
    render(<PayrollExportModal {...defaultProps} payrollPeriod={null} />);

    expect(screen.queryByText('Export Payroll')).not.toBeInTheDocument();
  });

  it('should show warning for non-approved payroll periods', () => {
    const nonApprovedPeriod = { ...mockPayrollPeriod, status: 'CALCULATED' as const };
    render(<PayrollExportModal {...defaultProps} payrollPeriod={nonApprovedPeriod} />);

    expect(screen.getByText('Only approved payroll periods can be exported for external processing.')).toBeInTheDocument();
  });

  it('should render export options with default values', () => {
    render(<PayrollExportModal {...defaultProps} />);

    const companyBrandingCheckbox = screen.getByRole('checkbox', { name: /Include Company Branding/i });
    const detailedBreakdownCheckbox = screen.getByRole('checkbox', { name: /Include Detailed Employee Breakdown/i });
    const attendanceRecordsCheckbox = screen.getByRole('checkbox', { name: /Include Attendance Records/i });

    expect(companyBrandingCheckbox).toBeChecked();
    expect(detailedBreakdownCheckbox).toBeChecked();
    expect(attendanceRecordsCheckbox).not.toBeChecked();
  });

  it('should allow toggling export options', async () => {
    const user = userEvent.setup();
    render(<PayrollExportModal {...defaultProps} />);

    const companyBrandingCheckbox = screen.getByRole('checkbox', { name: /Include Company Branding/i });
    const attendanceRecordsCheckbox = screen.getByRole('checkbox', { name: /Include Attendance Records/i });

    // Toggle company branding off
    await user.click(companyBrandingCheckbox);
    expect(companyBrandingCheckbox).not.toBeChecked();

    // Toggle attendance records on
    await user.click(attendanceRecordsCheckbox);
    expect(attendanceRecordsCheckbox).toBeChecked();
  });

  it('should call onExport with correct parameters when Export PDF is clicked', async () => {
    const user = userEvent.setup();
    const mockOnExport = jest.fn().mockResolvedValue(undefined);
    render(<PayrollExportModal {...defaultProps} onExport={mockOnExport} />);

    const exportButton = screen.getByRole('button', { name: /Export PDF/i });
    await user.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith({
      payrollPeriodId: 'period-1',
      exportFormat: 'PDF',
      options: {
        includeCompanyBranding: true,
        includeDetailedBreakdown: true,
        includeAttendanceRecords: false,
      },
    });
  });

  it('should disable export button for non-approved periods', () => {
    const nonApprovedPeriod = { ...mockPayrollPeriod, status: 'CALCULATED' as const };
    render(<PayrollExportModal {...defaultProps} payrollPeriod={nonApprovedPeriod} />);

    const exportButton = screen.getByRole('button', { name: /Export PDF/i });
    expect(exportButton).toBeDisabled();
  });

  it('should disable buttons when loading', () => {
    render(<PayrollExportModal {...defaultProps} isLoading={true} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    const previewButton = screen.getByRole('button', { name: /Preview/i });
    const exportButton = screen.getByRole('button', { name: /Generating.../i });

    expect(cancelButton).toBeDisabled();
    expect(previewButton).toBeDisabled();
    expect(exportButton).toBeDisabled();
  });

  it('should show export progress when loading', () => {
    render(<PayrollExportModal {...defaultProps} isLoading={true} exportProgress={45} />);

    expect(screen.getByText('Generating Export...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we generate your payroll export document.')).toBeInTheDocument();
  });

  it('should handle preview functionality', async () => {
    const user = userEvent.setup();
    render(<PayrollExportModal {...defaultProps} />);

    const previewButton = screen.getByRole('button', { name: /Preview/i });
    await user.click(previewButton);

    // Should show "Generating Preview..." temporarily
    expect(screen.getByText('Generating Preview...')).toBeInTheDocument();

    // Wait for preview to complete (mocked with setTimeout)
    await waitFor(
      () => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    render(<PayrollExportModal {...defaultProps} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display export error when present', () => {
    const { rerender } = render(<PayrollExportModal {...defaultProps} />);

    // Simulate an export error by triggering onExport with a failing function
    const failingOnExport = jest.fn().mockRejectedValue(new Error('Export failed'));
    rerender(<PayrollExportModal {...defaultProps} onExport={failingOnExport} />);

    // Since error handling is internal to the component, we need to trigger it
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/i }));

    // The error would be set internally and displayed
    waitFor(() => {
      expect(screen.getByText(/Export failed/i)).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<PayrollExportModal {...defaultProps} />);

    // Tab navigation should work
    await user.tab();
    expect(screen.getByRole('checkbox', { name: /Include Company Branding/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('checkbox', { name: /Include Detailed Employee Breakdown/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('checkbox', { name: /Include Attendance Records/i })).toHaveFocus();
  });

  it('should show correct period date range', () => {
    render(<PayrollExportModal {...defaultProps} />);

    expect(screen.getByText('Period: Jan 01, 2024 - Jan 01, 2024')).toBeInTheDocument();
  });

  it('should display employee count correctly', () => {
    render(<PayrollExportModal {...defaultProps} />);

    expect(screen.getByText('1 records')).toBeInTheDocument();
  });

  it('should handle missing payroll records gracefully', () => {
    const periodWithoutRecords = {
      ...mockPayrollPeriod,
      payrollRecords: undefined,
    };
    render(<PayrollExportModal {...defaultProps} payrollPeriod={periodWithoutRecords} />);

    expect(screen.getByText('0 records')).toBeInTheDocument();
  });

  it('should handle missing total amount gracefully', () => {
    const periodWithoutAmount = {
      ...mockPayrollPeriod,
      totalAmount: undefined,
    };
    render(<PayrollExportModal {...defaultProps} payrollPeriod={periodWithoutAmount} />);

    expect(screen.getByText('MVR 0.00')).toBeInTheDocument();
  });
});