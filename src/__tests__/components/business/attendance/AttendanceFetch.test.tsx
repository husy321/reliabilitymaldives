import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceFetch } from '@/components/business/attendance/AttendanceFetch';
import { fetchZKTAttendanceAction, testZKTConnectionAction } from '@/actions/attendanceActions';

// Mock the actions
jest.mock('@/actions/attendanceActions');
const mockFetchZKTAttendanceAction = fetchZKTAttendanceAction as jest.MockedFunction<typeof fetchZKTAttendanceAction>;
const mockTestZKTConnectionAction = testZKTConnectionAction as jest.MockedFunction<typeof testZKTConnectionAction>;

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'PPP') {
      return date.toLocaleDateString();
    }
    if (formatStr === 'PPpp') {
      return date.toLocaleString();
    }
    return date.toISOString();
  }
}));

describe('AttendanceFetch Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with initial form fields', () => {
    render(<AttendanceFetch />);
    
    expect(screen.getByText('Manual Attendance Data Fetch')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Device IP Address')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Fetch Attendance Data')).toBeInTheDocument();
  });

  it('should have default values for date range', () => {
    render(<AttendanceFetch />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    expect(fetchButton).toBeInTheDocument();
    
    // Default port should be set
    const portInput = screen.getByDisplayValue('4370');
    expect(portInput).toBeInTheDocument();
  });

  it('should allow entering IP address and port', async () => {
    render(<AttendanceFetch />);
    
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    const portInput = screen.getByPlaceholderText('4370');
    
    await user.clear(ipInput);
    await user.type(ipInput, '192.168.1.200');
    
    await user.clear(portInput);
    await user.type(portInput, '5000');
    
    expect(ipInput).toHaveValue('192.168.1.200');
    expect(portInput).toHaveValue('5000');
  });

  it('should test ZKT connection successfully', async () => {
    mockTestZKTConnectionAction.mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Connection successful',
        responseTime: 150
      }
    });

    render(<AttendanceFetch />);
    
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    await user.type(ipInput, '192.168.1.200');
    
    const testButton = screen.getByText('Test Connection');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(mockTestZKTConnectionAction).toHaveBeenCalledWith({
        ip: '192.168.1.200',
        port: 4370
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
    });
  });

  it('should handle connection test failure', async () => {
    mockTestZKTConnectionAction.mockResolvedValue({
      success: false,
      error: 'Connection timeout'
    });

    render(<AttendanceFetch />);
    
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    await user.type(ipInput, '192.168.1.200');
    
    const testButton = screen.getByText('Test Connection');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Connection timeout/)).toBeInTheDocument();
    });
  });

  it('should disable test button when no IP is provided', () => {
    render(<AttendanceFetch />);
    
    const testButton = screen.getByText('Test Connection');
    expect(testButton).toBeDisabled();
  });

  it('should enable test button when IP is provided', async () => {
    render(<AttendanceFetch />);
    
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    const testButton = screen.getByText('Test Connection');
    
    expect(testButton).toBeDisabled();
    
    await user.type(ipInput, '192.168.1.200');
    
    expect(testButton).not.toBeDisabled();
  });

  it('should submit fetch request successfully', async () => {
    const mockFetchResult = {
      success: true,
      totalRecordsProcessed: 10,
      recordsCreated: 8,
      recordsSkipped: 1,
      recordsWithErrors: 1,
      employeeMappingErrors: 0,
      validationErrors: 1,
      records: [],
      errors: [],
      summary: {
        startDate: new Date('2025-09-10'),
        endDate: new Date('2025-09-11'),
        fetchedAt: new Date(),
        fetchedById: 'admin-123'
      }
    };

    mockFetchZKTAttendanceAction.mockResolvedValue({
      success: true,
      data: mockFetchResult
    });

    render(<AttendanceFetch />);
    
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    await user.type(ipInput, '192.168.1.200');
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    await waitFor(() => {
      expect(mockFetchZKTAttendanceAction).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        zktConfig: {
          ip: '192.168.1.200',
          port: 4370
        }
      });
    });

    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getByText('Fetch Results')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total Processed
      expect(screen.getByText('8')).toBeInTheDocument(); // Records Created
    });
  });

  it('should show loading state during fetch', async () => {
    // Mock a delayed response
    mockFetchZKTAttendanceAction.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<AttendanceFetch />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    expect(screen.getByText('Fetching Attendance Data...')).toBeInTheDocument();
    expect(fetchButton).toBeDisabled();
  });

  it('should handle fetch errors', async () => {
    mockFetchZKTAttendanceAction.mockResolvedValue({
      success: false,
      error: 'ZKT device not reachable'
    });

    render(<AttendanceFetch />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should call onFetchComplete callback when provided', async () => {
    const mockCallback = jest.fn();
    const mockFetchResult = {
      success: true,
      totalRecordsProcessed: 5,
      recordsCreated: 5,
      recordsSkipped: 0,
      recordsWithErrors: 0,
      employeeMappingErrors: 0,
      validationErrors: 0,
      records: [],
      errors: [],
      summary: {
        startDate: new Date(),
        endDate: new Date(),
        fetchedAt: new Date(),
        fetchedById: 'admin-123'
      }
    };

    mockFetchZKTAttendanceAction.mockResolvedValue({
      success: true,
      data: mockFetchResult
    });

    render(<AttendanceFetch onFetchComplete={mockCallback} />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(mockFetchResult);
    });
  });

  it('should validate form inputs', async () => {
    render(<AttendanceFetch />);
    
    // Try to submit with invalid IP
    const ipInput = screen.getByPlaceholderText('192.168.1.100');
    await user.type(ipInput, 'invalid-ip');
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Valid IP address is required/)).toBeInTheDocument();
    });
  });

  it('should show detailed error information', async () => {
    const mockFetchResult = {
      success: false,
      totalRecordsProcessed: 5,
      recordsCreated: 2,
      recordsSkipped: 0,
      recordsWithErrors: 3,
      employeeMappingErrors: 2,
      validationErrors: 1,
      records: [],
      errors: [
        {
          type: 'EMPLOYEE_MAPPING' as const,
          message: 'Employee not found: EMP999',
          employeeId: 'EMP999'
        },
        {
          type: 'VALIDATION' as const,
          message: 'Invalid timestamp format'
        }
      ],
      summary: {
        startDate: new Date(),
        endDate: new Date(),
        fetchedAt: new Date(),
        fetchedById: 'admin-123'
      }
    };

    mockFetchZKTAttendanceAction.mockResolvedValue({
      success: true,
      data: mockFetchResult
    });

    render(<AttendanceFetch />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Issues (2)')).toBeInTheDocument();
      expect(screen.getByText(/Employee not found: EMP999/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid timestamp format/)).toBeInTheDocument();
    });
  });

  it('should show progress bar based on success rate', async () => {
    const mockFetchResult = {
      success: true,
      totalRecordsProcessed: 10,
      recordsCreated: 8,
      recordsSkipped: 0,
      recordsWithErrors: 2,
      employeeMappingErrors: 0,
      validationErrors: 0,
      records: [],
      errors: [],
      summary: {
        startDate: new Date(),
        endDate: new Date(),
        fetchedAt: new Date(),
        fetchedById: 'admin-123'
      }
    };

    mockFetchZKTAttendanceAction.mockResolvedValue({
      success: true,
      data: mockFetchResult
    });

    render(<AttendanceFetch />);
    
    const fetchButton = screen.getByText('Fetch Attendance Data');
    await user.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });
});