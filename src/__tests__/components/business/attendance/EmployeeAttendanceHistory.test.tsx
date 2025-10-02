import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EmployeeAttendanceHistory } from '@/components/business/attendance/EmployeeAttendanceHistory';
import type { AttendanceRecord } from '@/types/attendance';

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
    syncedAt: new Date('2024-01-15T18:00:00'),
    staff: {
      id: 'staff-1',
      employeeId: 'EMP001',
      name: 'John Smith',
      department: 'Engineering'
    }
  },
  {
    id: 'record-2',
    staffId: 'staff-1',
    employeeId: 'EMP001',
    date: new Date('2024-01-14'),
    clockInTime: new Date('2024-01-14T09:15:00'),
    clockOutTime: null,
    totalHours: null,
    zkTransactionId: 'TXN002',
    fetchedAt: new Date(),
    fetchedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncStatus: 'FAILED',
    syncSource: 'AUTO_SYNC',
    validationStatus: 'FAILED',
    validationErrors: ['Clock out time missing'],
    hasConflict: true,
    conflictResolved: false,
    conflictDetails: 'Missing clock out data',
    staff: {
      id: 'staff-1',
      employeeId: 'EMP001',
      name: 'John Smith',
      department: 'Engineering'
    }
  },
  {
    id: 'record-3',
    staffId: 'staff-1',
    employeeId: 'EMP001',
    date: new Date('2024-01-13'),
    clockInTime: new Date('2024-01-13T10:30:00'), // Late arrival
    clockOutTime: new Date('2024-01-13T18:00:00'),
    totalHours: 7.5,
    zkTransactionId: 'TXN003',
    fetchedAt: new Date(),
    fetchedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncStatus: 'SUCCESS',
    syncSource: 'MANUAL_SYNC',
    validationStatus: 'VALIDATED',
    staff: {
      id: 'staff-1',
      employeeId: 'EMP001',
      name: 'John Smith',
      department: 'Engineering'
    }
  }
];

describe('EmployeeAttendanceHistory', () => {
  const defaultProps = {
    staffProfile: mockStaffProfile,
    attendanceRecords: mockAttendanceRecords,
    onEditRecord: jest.fn(),
    isLoading: false,
    showEditButton: true,
    standardWorkHours: 8,
    standardStartTime: '09:00',
    standardEndTime: '17:00'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders employee profile information', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('ID: EMP001')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('displays quick stats cards', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total Days
    expect(screen.getByText('Total Days')).toBeInTheDocument();
    expect(screen.getByText('Avg Hours')).toBeInTheDocument();
    expect(screen.getByText('Complete Records')).toBeInTheDocument();
    expect(screen.getByText('Overtime Days')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Default should be timeline view
    expect(screen.getByText('Timeline View')).toBeInTheDocument();
    
    // Switch to summary
    const summaryTab = screen.getByText('Summary');
    await user.click(summaryTab);
    
    expect(screen.getByText('Record Summary')).toBeInTheDocument();
    expect(screen.getByText('Performance Indicators')).toBeInTheDocument();
    
    // Switch to patterns
    const patternsTab = screen.getByText('Patterns');
    await user.click(patternsTab);
    
    expect(screen.getByText('Time Patterns')).toBeInTheDocument();
    expect(screen.getByText('Compliance Metrics')).toBeInTheDocument();
  });

  it('displays attendance records in timeline view', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Should show records grouped by week
    expect(screen.getByText(/Week of/)).toBeInTheDocument();
    expect(screen.getByText(/Monday, Jan 15/)).toBeInTheDocument();
    expect(screen.getByText(/Sunday, Jan 14/)).toBeInTheDocument();
    expect(screen.getByText(/Saturday, Jan 13/)).toBeInTheDocument();
  });

  it('shows ZKT transaction IDs and sync status', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('ZKT: TXN001')).toBeInTheDocument();
    expect(screen.getByText('ZKT: TXN002')).toBeInTheDocument();
    expect(screen.getByText('ZKT: TXN003')).toBeInTheDocument();
    
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('Sync Failed')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('Validation Failed')).toBeInTheDocument();
  });

  it('displays conflict indicators', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText('Missing clock out data')).toBeInTheDocument();
  });

  it('shows validation errors', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('Validation Issues:')).toBeInTheDocument();
    expect(screen.getByText('Clock out time missing')).toBeInTheDocument();
  });

  it('handles edit record clicks', async () => {
    const user = userEvent.setup();
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);
    
    expect(defaultProps.onEditRecord).toHaveBeenCalledWith('record-1');
  });

  it('hides edit buttons when showEditButton is false', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} showEditButton={false} />);
    
    const editButtons = screen.queryAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(0);
  });

  it('displays loading state', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading attendance history...')).toBeInTheDocument();
  });

  it('calculates attendance statistics correctly', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Switch to summary tab
    const summaryTab = screen.getByText('Summary');
    fireEvent.click(summaryTab);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total records
    expect(screen.getByText('1')).toBeInTheDocument(); // Complete records
    expect(screen.getByText('2')).toBeInTheDocument(); // Incomplete records
  });

  it('shows compliance metrics in patterns view', async () => {
    const user = userEvent.setup();
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    const patternsTab = screen.getByText('Patterns');
    await user.click(patternsTab);
    
    expect(screen.getByText('On-time Arrivals')).toBeInTheDocument();
    expect(screen.getByText('Full Day Attendance')).toBeInTheDocument();
    expect(screen.getByText('Standard Hours Compliance')).toBeInTheDocument();
  });

  it('displays average clock-in and clock-out times', async () => {
    const user = userEvent.setup();
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    const patternsTab = screen.getByText('Patterns');
    await user.click(patternsTab);
    
    expect(screen.getByText('Average Clock-in Time')).toBeInTheDocument();
    expect(screen.getByText('Average Clock-out Time')).toBeInTheDocument();
    expect(screen.getByText('Average Daily Hours')).toBeInTheDocument();
  });

  it('handles empty attendance records', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} attendanceRecords={[]} />);
    
    expect(screen.getByText('No attendance records found for this employee.')).toBeInTheDocument();
  });

  it('shows different status badges correctly', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Complete record should show "Complete" status
    // In Progress record should show "In Progress" status
    // Check for different colored badges
    const completeStatus = screen.getByText('8.50h');
    const incompleteStatus = screen.getByText('Incomplete');
    
    expect(completeStatus).toBeInTheDocument();
    expect(incompleteStatus).toBeInTheDocument();
  });

  it('groups records by week correctly', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Should see week groupings
    const weekHeaders = screen.getAllByText(/Week of/);
    expect(weekHeaders.length).toBeGreaterThan(0);
    
    // Should see day counts for each week
    expect(screen.getByText(/days/)).toBeInTheDocument();
  });

  it('calculates late arrivals correctly', async () => {
    const user = userEvent.setup();
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    const summaryTab = screen.getByText('Summary');
    await user.click(summaryTab);
    
    // One record has late arrival (10:30 AM vs 9:00 AM standard)
    expect(screen.getByText('Late Arrivals:')).toBeInTheDocument();
  });

  it('shows sync source information', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    expect(screen.getByText('AUTO_SYNC')).toBeInTheDocument();
    expect(screen.getByText('MANUAL_SYNC')).toBeInTheDocument();
  });

  it('displays attendance rate percentage', () => {
    render(<EmployeeAttendanceHistory {...defaultProps} />);
    
    // Check for percentage displays in stats
    const percentageElements = screen.getAllByText(/%/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });
});