// Job Monitoring Dashboard Component Tests
// Following React Testing Library patterns from architecture/testing-strategy.md

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobMonitoringDashboard } from '../../../../../components/business/attendance/JobMonitoringDashboard';
import { AttendanceJobStatus, AttendanceJobType } from '../../../../../../types/attendanceJobs';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('JobMonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  const mockMetricsResponse = {
    success: true,
    metrics: {
      totalJobs: 10,
      completedJobs: 8,
      failedJobs: 2,
      averageExecutionTime: 30000,
      successRate: 0.8,
      upcomingJobs: []
    },
    healthStatus: {
      isHealthy: true,
      currentStatus: 'ACTIVE',
      consecutiveFailures: 0,
      issues: []
    },
    configuration: {
      schedulingEnabled: true,
      cronExpression: '0 6 * * *',
      enabledMachines: 2,
      totalMachines: 3
    }
  };

  const mockJobsResponse = {
    success: true,
    jobs: [
      {
        id: 'job-1',
        type: AttendanceJobType.DAILY_SYNC,
        status: AttendanceJobStatus.COMPLETED,
        scheduledAt: new Date('2024-01-01T06:00:00Z'),
        duration: 45000
      },
      {
        id: 'job-2',
        type: AttendanceJobType.MANUAL_TRIGGER,
        status: AttendanceJobStatus.RUNNING,
        scheduledAt: new Date('2024-01-01T10:00:00Z'),
        config: {
          zktMachines: [
            { id: 'machine-1', name: 'Main Office' },
            { id: 'machine-2', name: 'Warehouse' }
          ]
        }
      }
    ]
  };

  it('should render dashboard with loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<JobMonitoringDashboard />);

    expect(screen.getByText('Attendance Sync Monitoring')).toBeInTheDocument();
    // Loading state would be shown during fetch
  });

  it('should display metrics and health status after loading', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    });

    // Check metrics display
    expect(screen.getByText('10')).toBeInTheDocument(); // Total jobs
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Success rate

    // Check health status
    expect(screen.getByText(/System Status: ACTIVE/)).toBeInTheDocument();
    expect(screen.getByText(/System is operating normally/)).toBeInTheDocument();
  });

  it('should display error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Monitoring Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should handle retry functionality', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Monitoring Error')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    });
  });

  it('should show running jobs progress section', async () => {
    const runningJobsResponse = {
      ...mockJobsResponse,
      jobs: [
        {
          id: 'running-job',
          type: AttendanceJobType.DAILY_SYNC,
          status: AttendanceJobStatus.RUNNING,
          scheduledAt: new Date(),
          config: {
            zktMachines: [
              { id: 'machine-1', name: 'Main Office' },
              { id: 'machine-2', name: 'Warehouse' }
            ]
          }
        }
      ]
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => runningJobsResponse
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Running Jobs')).toBeInTheDocument();
    });

    expect(screen.getByText('Job running-job')).toBeInTheDocument();
    expect(screen.getByText('0 / 2 machines')).toBeInTheDocument();
  });

  it('should call onTriggerManualSync when manual sync button is clicked', async () => {
    const mockTriggerManualSync = jest.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard onTriggerManualSync={mockTriggerManualSync} />);

    await waitFor(() => {
      expect(screen.getByText('Manual Sync')).toBeInTheDocument();
    });

    const manualSyncButton = screen.getByText('Manual Sync');
    fireEvent.click(manualSyncButton);

    expect(mockTriggerManualSync).toHaveBeenCalledTimes(1);
  });

  it('should call onConfigureScheduling when configure button is clicked', async () => {
    const mockConfigureScheduling = jest.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard onConfigureScheduling={mockConfigureScheduling} />);

    await waitFor(() => {
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });

    const configureButton = screen.getByText('Configure');
    fireEvent.click(configureButton);

    expect(mockConfigureScheduling).toHaveBeenCalledTimes(1);
  });

  it('should auto-refresh based on refresh interval', async () => {
    jest.useFakeTimers();

    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard refreshInterval={5} />);

    // Initial load
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    // Should trigger refresh
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 more calls
    });

    jest.useRealTimers();
  });

  it('should display unhealthy system status correctly', async () => {
    const unhealthyResponse = {
      ...mockMetricsResponse,
      healthStatus: {
        isHealthy: false,
        currentStatus: 'DEGRADED',
        consecutiveFailures: 3,
        issues: ['ZKT machine connection timeout', 'Database sync lag']
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => unhealthyResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobsResponse
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Status: DEGRADED')).toBeInTheDocument();
    });

    expect(screen.getByText('System issues detected. 3 consecutive failures.')).toBeInTheDocument();
    expect(screen.getByText('ZKT machine connection timeout')).toBeInTheDocument();
    expect(screen.getByText('Database sync lag')).toBeInTheDocument();
  });

  it('should format time durations correctly', async () => {
    const jobsWithDuration = {
      ...mockJobsResponse,
      jobs: [
        {
          id: 'job-1',
          type: AttendanceJobType.DAILY_SYNC,
          status: AttendanceJobStatus.COMPLETED,
          scheduledAt: new Date(),
          duration: 3661000 // 1 hour, 1 minute, 1 second
        },
        {
          id: 'job-2',
          type: AttendanceJobType.MANUAL_TRIGGER,
          status: AttendanceJobStatus.COMPLETED,
          scheduledAt: new Date(),
          duration: 65000 // 1 minute, 5 seconds
        }
      ]
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => jobsWithDuration
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Jobs')).toBeInTheDocument();
    });

    expect(screen.getByText('1h 1m')).toBeInTheDocument();
    expect(screen.getByText('1m 5s')).toBeInTheDocument();
  });

  it('should handle empty job history', async () => {
    const emptyJobsResponse = {
      success: true,
      jobs: []
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => emptyJobsResponse
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No recent jobs found')).toBeInTheDocument();
    });
  });

  it('should display correct job status badges', async () => {
    const mixedStatusJobs = {
      ...mockJobsResponse,
      jobs: [
        {
          id: 'completed-job',
          type: AttendanceJobType.DAILY_SYNC,
          status: AttendanceJobStatus.COMPLETED,
          scheduledAt: new Date()
        },
        {
          id: 'failed-job',
          type: AttendanceJobType.MANUAL_TRIGGER,
          status: AttendanceJobStatus.FAILED,
          scheduledAt: new Date()
        },
        {
          id: 'pending-job',
          type: AttendanceJobType.DAILY_SYNC,
          status: AttendanceJobStatus.PENDING,
          scheduledAt: new Date()
        }
      ]
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mixedStatusJobs
      } as Response);

    render(<JobMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Jobs')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});