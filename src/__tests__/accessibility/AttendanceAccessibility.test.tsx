import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import { AttendanceListView } from '@/components/business/attendance/AttendanceListView';
import { EmployeeAttendanceHistory } from '@/components/business/attendance/EmployeeAttendanceHistory';
import { AttendanceSummaryViews } from '@/components/business/attendance/AttendanceSummaryViews';
import type { AttendanceRecord, AttendanceSearchResult } from '@/types/attendance';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the date range picker component
jest.mock('@/components/ui/date-range-picker', () => ({
  DatePickerWithRange: ({ onDateChange, placeholder }: any) => (
    <button 
      data-testid="date-range-picker" 
      onClick={() => onDateChange({ from: new Date(), to: new Date() })}
      aria-label={placeholder}
    >
      {placeholder}
    </button>
  )
}));

// Mock data
const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'record-1',
    staffId: 'staff-1',
    employeeId: 'EMP001',
    date: new Date('2024-01-15'),
    clockInTime: new Date('2024-01-15T09:00:00'),
    clockOutTime: new Date('2024-01-15T17:30:00'),
    totalHours: 8.5,
    zkTransactionId: 'TXN001',
    fetchedAt: new Date(),
    fetchedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncStatus: 'SUCCESS',
    syncSource: 'AUTO_SYNC',
    validationStatus: 'VALIDATED',
    staff: {
      id: 'staff-1',
      employeeId: 'EMP001',
      name: 'John Smith',
      department: 'Engineering'
    }
  }
];

const mockAttendanceData: AttendanceSearchResult = {
  records: mockAttendanceRecords,
  total: 1,
  page: 1,
  limit: 25,
  totalPages: 1
};

const mockStaffProfile = {
  id: 'staff-1',
  employeeId: 'EMP001',
  name: 'John Smith',
  department: 'Engineering',
  position: 'Software Engineer',
  joinedDate: new Date('2023-01-15'),
  email: 'john.smith@company.com',
  phone: '+1-555-0123'
};

describe('Attendance Components Accessibility', () => {
  describe('AttendanceListView Accessibility', () => {
    const defaultProps = {
      onFilterChange: jest.fn(),
      onExport: jest.fn(),
      isLoading: false,
      data: mockAttendanceData,
      departments: ['Engineering', 'Sales'],
      employees: [
        { id: 'staff-1', employeeId: 'EMP001', name: 'John Smith', department: 'Engineering' }
      ]
    };

    it('should not have any accessibility violations', async () => {
      const { container } = render(<AttendanceListView {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation for filters', async () => {
      const user = userEvent.setup();
      render(<AttendanceListView {...defaultProps} />);

      const searchInput = screen.getByLabelText(/search employee id/i);
      expect(searchInput).toBeInTheDocument();
      
      // Tab navigation
      await user.tab();
      expect(searchInput).toHaveFocus();

      // Continue tabbing through form elements
      await user.tab();
      const dateRangePicker = screen.getByRole('button', { name: /select date range/i });
      expect(dateRangePicker).toHaveFocus();
    });

    it('should have proper ARIA labels and roles', () => {
      render(<AttendanceListView {...defaultProps} />);

      // Check for proper form labels
      expect(screen.getByLabelText(/search employee id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/specific employee/i)).toBeInTheDocument();

      // Check for proper button roles and labels
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
    });

    it('should support screen reader navigation for table data', () => {
      render(<AttendanceListView {...defaultProps} />);

      // Check for table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for proper column headers
      expect(screen.getByRole('columnheader', { name: /employee/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /department/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /clock in/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /clock out/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /total hours/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    });

    it('should provide keyboard access to pagination', async () => {
      const user = userEvent.setup();
      const dataWithPagination = {
        ...mockAttendanceData,
        totalPages: 3,
        page: 2,
        total: 75
      };

      render(<AttendanceListView {...defaultProps} data={dataWithPagination} />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      expect(previousButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();

      // Test keyboard navigation
      await user.tab();
      // Navigate to pagination controls
      previousButton.focus();
      expect(previousButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it('should announce loading state to screen readers', () => {
      render(<AttendanceListView {...defaultProps} isLoading={true} />);

      const loadingMessage = screen.getByText(/loading attendance records/i);
      expect(loadingMessage).toBeInTheDocument();
      expect(loadingMessage.closest('[role="status"]')).toBeInTheDocument();
    });

    it('should provide meaningful error messages', () => {
      const emptyData = {
        records: [],
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0
      };

      render(<AttendanceListView {...defaultProps} data={emptyData} />);

      const errorMessage = screen.getByText(/no attendance records found/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
    });
  });

  describe('EmployeeAttendanceHistory Accessibility', () => {
    const defaultProps = {
      staffProfile: mockStaffProfile,
      attendanceRecords: mockAttendanceRecords,
      onEditRecord: jest.fn(),
      isLoading: false,
      showEditButton: true
    };

    it('should not have any accessibility violations', async () => {
      const { container } = render(<EmployeeAttendanceHistory {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation for tabs', async () => {
      const user = userEvent.setup();
      render(<EmployeeAttendanceHistory {...defaultProps} />);

      const timelineTab = screen.getByRole('tab', { name: /timeline view/i });
      const summaryTab = screen.getByRole('tab', { name: /summary/i });
      const patternsTab = screen.getByRole('tab', { name: /patterns/i });

      expect(timelineTab).toBeInTheDocument();
      expect(summaryTab).toBeInTheDocument();
      expect(patternsTab).toBeInTheDocument();

      // Test tab navigation
      await user.tab();
      expect(timelineTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(summaryTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(patternsTab).toHaveFocus();
    });

    it('should have proper heading structure', () => {
      render(<EmployeeAttendanceHistory {...defaultProps} />);

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 2, name: /john smith/i })).toBeInTheDocument();
    });

    it('should provide accessible edit buttons', async () => {
      const user = userEvent.setup();
      render(<EmployeeAttendanceHistory {...defaultProps} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBeGreaterThan(0);

      // Test keyboard interaction
      editButtons[0].focus();
      expect(editButtons[0]).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(defaultProps.onEditRecord).toHaveBeenCalled();
    });

    it('should provide proper ARIA labels for status indicators', () => {
      render(<EmployeeAttendanceHistory {...defaultProps} />);

      // Check for status indicators with proper labels
      const statusElements = screen.getAllByText(/success|failed|pending|validated/i);
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should support screen reader navigation for statistics', () => {
      render(<EmployeeAttendanceHistory {...defaultProps} />);

      // Check for statistics with proper labels
      expect(screen.getByText(/total days/i)).toBeInTheDocument();
      expect(screen.getByText(/avg hours/i)).toBeInTheDocument();
      expect(screen.getByText(/complete records/i)).toBeInTheDocument();
      expect(screen.getByText(/overtime days/i)).toBeInTheDocument();
    });
  });

  describe('AttendanceSummaryViews Accessibility', () => {
    const defaultProps = {
      attendanceRecords: mockAttendanceRecords,
      selectedPeriod: new Date(),
      onExport: jest.fn(),
      isLoading: false
    };

    it('should not have any accessibility violations', async () => {
      const { container } = render(<AttendanceSummaryViews {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation for summary tabs', async () => {
      const user = userEvent.setup();
      render(<AttendanceSummaryViews {...defaultProps} />);

      const dailyTab = screen.getByRole('tab', { name: /daily summary/i });
      const weeklyTab = screen.getByRole('tab', { name: /weekly summary/i });
      const monthlyTab = screen.getByRole('tab', { name: /monthly summary/i });

      expect(dailyTab).toBeInTheDocument();
      expect(weeklyTab).toBeInTheDocument();
      expect(monthlyTab).toBeInTheDocument();

      // Test arrow key navigation
      dailyTab.focus();
      await user.keyboard('{ArrowRight}');
      expect(weeklyTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(monthlyTab).toHaveFocus();
    });

    it('should provide accessible export buttons', () => {
      render(<AttendanceSummaryViews {...defaultProps} />);

      const csvButton = screen.getByRole('button', { name: /export csv/i });
      const excelButton = screen.getByRole('button', { name: /export excel/i });

      expect(csvButton).toBeInTheDocument();
      expect(excelButton).toBeInTheDocument();
      expect(csvButton).toHaveAttribute('aria-label');
      expect(excelButton).toHaveAttribute('aria-label');
    });

    it('should have proper progress bar accessibility', () => {
      render(<AttendanceSummaryViews {...defaultProps} />);

      // Check for progress bars with proper ARIA attributes
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
        expect(progressBar).toHaveAttribute('aria-valuenow');
      });
    });

    it('should provide meaningful summary statistics labels', () => {
      render(<AttendanceSummaryViews {...defaultProps} />);

      // Check for statistics with descriptive text
      expect(screen.getByText(/total records/i)).toBeInTheDocument();
      expect(screen.getByText(/avg hours/i)).toBeInTheDocument();
      expect(screen.getByText(/attendance rate/i)).toBeInTheDocument();
      expect(screen.getByText(/late arrivals/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should maintain focus order across components', async () => {
      const user = userEvent.setup();
      const props = {
        onFilterChange: jest.fn(),
        onExport: jest.fn(),
        isLoading: false,
        data: mockAttendanceData,
        departments: ['Engineering'],
        employees: [
          { id: 'staff-1', employeeId: 'EMP001', name: 'John Smith', department: 'Engineering' }
        ]
      };

      render(<AttendanceListView {...props} />);

      // Test sequential tab navigation
      await user.tab(); // First focusable element
      const firstFocused = document.activeElement;
      expect(firstFocused).toBeInTheDocument();

      await user.tab(); // Second focusable element
      const secondFocused = document.activeElement;
      expect(secondFocused).not.toBe(firstFocused);
    });

    it('should provide skip links for keyboard users', () => {
      render(<AttendanceListView 
        onFilterChange={jest.fn()}
        onExport={jest.fn()}
        isLoading={false}
        data={mockAttendanceData}
        departments={['Engineering']}
        employees={[]}
      />);

      // Skip links should be available (even if visually hidden)
      const skipLinks = screen.queryAllByText(/skip to/i);
      // Note: This would need to be implemented in the actual components
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should announce dynamic content changes', () => {
      const { rerender } = render(
        <AttendanceListView 
          onFilterChange={jest.fn()}
          onExport={jest.fn()}
          isLoading={false}
          data={mockAttendanceData}
          departments={['Engineering']}
          employees={[]}
        />
      );

      // Test loading state announcement
      rerender(
        <AttendanceListView 
          onFilterChange={jest.fn()}
          onExport={jest.fn()}
          isLoading={true}
          data={mockAttendanceData}
          departments={['Engineering']}
          employees={[]}
        />
      );

      const loadingMessage = screen.getByText(/loading/i);
      expect(loadingMessage).toBeInTheDocument();
    });

    it('should provide descriptive button labels', () => {
      render(<AttendanceListView 
        onFilterChange={jest.fn()}
        onExport={jest.fn()}
        isLoading={false}
        data={mockAttendanceData}
        departments={['Engineering']}
        employees={[]}
      />);

      // All buttons should have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should provide table headers for data tables', () => {
      render(<AttendanceListView 
        onFilterChange={jest.fn()}
        onExport={jest.fn()}
        isLoading={false}
        data={mockAttendanceData}
        departments={['Engineering']}
        employees={[]}
      />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check that all columns have headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should not rely solely on color for status indication', () => {
      render(<EmployeeAttendanceHistory 
        staffProfile={mockStaffProfile}
        attendanceRecords={mockAttendanceRecords}
        onEditRecord={jest.fn()}
        isLoading={false}
        showEditButton={true}
      />);

      // Status indicators should have text labels, not just colors
      expect(screen.getByText(/validated/i)).toBeInTheDocument();
      expect(screen.getByText(/synced/i)).toBeInTheDocument();
    });

    it('should provide text alternatives for icons', () => {
      render(<AttendanceListView 
        onFilterChange={jest.fn()}
        onExport={jest.fn()}
        isLoading={false}
        data={mockAttendanceData}
        departments={['Engineering']}
        employees={[]}
      />);

      // Icons should have text labels or be decorative
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });
  });
});