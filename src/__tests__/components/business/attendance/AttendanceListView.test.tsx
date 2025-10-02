import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { AttendanceListView } from '@/components/business/attendance/AttendanceListView';
import type { AttendanceSearchResult, AttendanceRecord } from '@/types/attendance';

// Mock the date range picker component
jest.mock('@/components/ui/date-range-picker', () => ({
  DatePickerWithRange: ({ onDateChange, placeholder }: any) => (
    <div data-testid="date-range-picker" onClick={() => onDateChange({ from: new Date(), to: new Date() })}>
      {placeholder}
    </div>
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
  },
  {
    id: 'record-2',
    staffId: 'staff-2',
    employeeId: 'EMP002',
    date: new Date('2024-01-15'),
    clockInTime: new Date('2024-01-15T09:15:00'),
    clockOutTime: null,
    totalHours: null,
    zkTransactionId: 'TXN002',
    fetchedAt: new Date(),
    fetchedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncStatus: 'PENDING',
    syncSource: 'AUTO_SYNC',
    validationStatus: 'PENDING',
    staff: {
      id: 'staff-2',
      employeeId: 'EMP002',
      name: 'Sarah Johnson',
      department: 'Sales'
    }
  }
];

const mockAttendanceData: AttendanceSearchResult = {
  records: mockAttendanceRecords,
  total: 2,
  page: 1,
  limit: 25,
  totalPages: 1
};

const mockDepartments = ['Engineering', 'Sales', 'Marketing'];
const mockEmployees = [
  { id: 'staff-1', employeeId: 'EMP001', name: 'John Smith', department: 'Engineering' },
  { id: 'staff-2', employeeId: 'EMP002', name: 'Sarah Johnson', department: 'Sales' }
];

describe('AttendanceListView', () => {
  const defaultProps = {
    onFilterChange: jest.fn(),
    onExport: jest.fn(),
    isLoading: false,
    data: mockAttendanceData,
    departments: mockDepartments,
    employees: mockEmployees
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders attendance list view with filters', () => {
    render(<AttendanceListView {...defaultProps} />);
    
    expect(screen.getByText('Attendance Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter employee ID...')).toBeInTheDocument();
    expect(screen.getByText('Select date range...')).toBeInTheDocument();
    expect(screen.getByText('All Departments')).toBeInTheDocument();
    expect(screen.getByText('All Employees')).toBeInTheDocument();
  });

  it('displays attendance records in results', () => {
    render(<AttendanceListView {...defaultProps} />);
    
    expect(screen.getByText('Attendance Records (2 total)')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('handles employee ID search', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Enter employee ID...');
    await user.type(searchInput, 'EMP001');
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP001',
          page: 1
        })
      );
    });
  });

  it('handles department filter change', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const departmentSelect = screen.getByDisplayValue('All Departments');
    await user.click(departmentSelect);
    
    const engineeringOption = screen.getByText('Engineering');
    await user.click(engineeringOption);
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          department: 'Engineering',
          page: 1
        })
      );
    });
  });

  it('handles employee filter change', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const employeeSelect = screen.getByDisplayValue('All Employees');
    await user.click(employeeSelect);
    
    const johnOption = screen.getByText('John Smith (EMP001)');
    await user.click(johnOption);
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-1',
          page: 1
        })
      );
    });
  });

  it('handles date range selection', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const dateRangePicker = screen.getByTestId('date-range-picker');
    await user.click(dateRangePicker);
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          page: 1
        })
      );
    });
  });

  it('handles pagination', async () => {
    const user = userEvent.setup();
    const dataWithMultiplePages = {
      ...mockAttendanceData,
      page: 1,
      totalPages: 3,
      total: 75
    };
    
    render(<AttendanceListView {...defaultProps} data={dataWithMultiplePages} />);
    
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);
    
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2
      })
    );
  });

  it('handles export functionality', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const csvExportButton = screen.getByText('Export CSV');
    await user.click(csvExportButton);
    
    expect(defaultProps.onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 25,
        sortBy: 'date',
        sortOrder: 'desc'
      }),
      'csv'
    );
  });

  it('handles page size change', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    const pageSizeSelect = screen.getByDisplayValue('25 records');
    await user.click(pageSizeSelect);
    
    const option50 = screen.getByText('50 records');
    await user.click(option50);
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          page: 1
        })
      );
    });
  });

  it('handles clear filters', async () => {
    const user = userEvent.setup();
    
    // Render with some active filters
    const propsWithFilters = {
      ...defaultProps,
      onFilterChange: jest.fn()
    };
    
    render(<AttendanceListView {...propsWithFilters} />);
    
    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Enter employee ID...');
    await user.type(searchInput, 'EMP001');
    
    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(propsWithFilters.onFilterChange).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        sortBy: 'date',
        sortOrder: 'desc'
      });
    });
  });

  it('displays loading state', () => {
    render(<AttendanceListView {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading attendance records...')).toBeInTheDocument();
  });

  it('displays no results message', () => {
    const emptyData = {
      records: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0
    };
    
    render(<AttendanceListView {...defaultProps} data={emptyData} />);
    
    expect(screen.getByText('No attendance records found matching the current filters. Try adjusting your search criteria.')).toBeInTheDocument();
  });

  it('displays active filters count', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    // Add a filter
    const searchInput = screen.getByPlaceholderText('Enter employee ID...');
    await user.type(searchInput, 'EMP001');
    
    await waitFor(() => {
      expect(screen.getByText('1 active')).toBeInTheDocument();
    });
  });

  it('disables export buttons when no data', () => {
    const emptyData = {
      records: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0
    };
    
    render(<AttendanceListView {...defaultProps} data={emptyData} />);
    
    const csvButton = screen.getByText('Export CSV');
    const excelButton = screen.getByText('Export Excel');
    
    expect(csvButton).toBeDisabled();
    expect(excelButton).toBeDisabled();
  });

  it('shows pagination info correctly', () => {
    const dataWithPagination = {
      ...mockAttendanceData,
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2
    };
    
    render(<AttendanceListView {...defaultProps} data={dataWithPagination} />);
    
    expect(screen.getByText('Showing 2 to 2 of 2 records')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('filters employees by department when department is selected', async () => {
    const user = userEvent.setup();
    render(<AttendanceListView {...defaultProps} />);
    
    // First select a department
    const departmentSelect = screen.getByDisplayValue('All Departments');
    await user.click(departmentSelect);
    
    const engineeringOption = screen.getByText('Engineering');
    await user.click(engineeringOption);
    
    // Now check employee dropdown - should only show Engineering employees
    const employeeSelect = screen.getByDisplayValue('All Employees');
    await user.click(employeeSelect);
    
    expect(screen.getByText('John Smith (EMP001)')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Johnson (EMP002)')).not.toBeInTheDocument();
  });
});