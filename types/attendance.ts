// Attendance management types following coding standards type sharing patterns

import { ZKTAttendanceLog } from './zkt';

// Core AttendanceRecord type matching Prisma schema
export interface AttendanceRecord {
  id: string;
  staffId: string;
  employeeId: string;
  date: Date;
  clockInTime: Date | null;
  clockOutTime: Date | null;
  totalHours: number | null;
  zkTransactionId: string;
  fetchedAt: Date;
  fetchedById: string;
  createdAt: Date;
  updatedAt: Date;
  // Sync tracking fields
  syncJobId?: string;
  syncedAt?: Date;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'PENDING';
  syncSource?: 'AUTO_SYNC' | 'MANUAL_SYNC' | 'MANUAL_ENTRY';
  validationStatus?: 'VALIDATED' | 'PENDING' | 'FAILED' | 'SKIPPED';
  validationErrors?: string[];
  // Conflict resolution fields
  hasConflict?: boolean;
  conflictResolved?: boolean;
  conflictResolvedBy?: string;
  conflictNotes?: string;
  // Finalization workflow fields
  periodId?: string;
  isFinalized?: boolean;
  staff?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
  };
  fetchedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

// Request types for attendance operations
export interface FetchAttendanceRequest {
  startDate: Date;
  endDate: Date;
  zktConfig?: {
    ip: string;
    port: number;
  };
}

export interface CreateAttendanceRecordRequest {
  staffId: string;
  employeeId: string;
  date: Date;
  clockInTime?: Date;
  clockOutTime?: Date;
  zkTransactionId: string;
}

// Response types for attendance fetch operations
export interface AttendanceFetchResult {
  success: boolean;
  totalRecordsProcessed: number;
  recordsCreated: number;
  recordsSkipped: number;
  recordsWithErrors: number;
  employeeMappingErrors: number;
  validationErrors: number;
  records: AttendanceRecord[];
  errors: AttendanceFetchError[];
  summary: {
    startDate: Date;
    endDate: Date;
    fetchedAt: Date;
    fetchedById: string;
  };
}

export interface AttendanceFetchError {
  type: 'EMPLOYEE_MAPPING' | 'VALIDATION' | 'DUPLICATE' | 'ZKT_COMMUNICATION' | 'DATABASE';
  message: string;
  details?: string;
  employeeId?: string;
  zkTransactionId?: string;
  rawRecord?: ZKTAttendanceLog;
}

// Search and filter types
export interface AttendanceSearchParams {
  staffId?: string;
  employeeId?: string;
  department?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'clockInTime' | 'clockOutTime' | 'totalHours';
  sortOrder?: 'asc' | 'desc';
}

export interface AttendanceSearchResult {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Validation and processing types
export interface ProcessedAttendanceRecord {
  isValid: boolean;
  record?: AttendanceRecord;
  errors: AttendanceFetchError[];
  employeeMapping: {
    zkEmployeeId: string;
    staffId?: string;
    staffName?: string;
    mapped: boolean;
  };
}

export interface AttendanceValidationResult {
  totalProcessed: number;
  validRecords: ProcessedAttendanceRecord[];
  invalidRecords: ProcessedAttendanceRecord[];
  employeeMappingIssues: ProcessedAttendanceRecord[];
}

// ZKT integration types
export interface ZKTAttendanceData {
  employeeId: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  transactionId: string;
}

export interface ZKTFetchConfig {
  ip: string;
  port: number;
  timeout?: number;
  retryAttempts?: number;
}

// Statistics and reporting types
export interface AttendanceStats {
  totalRecords: number;
  recordsByMonth: {
    month: string;
    count: number;
  }[];
  recordsByDepartment: {
    department: string;
    count: number;
  }[];
  recentFetches: {
    fetchedAt: Date;
    recordCount: number;
    fetchedBy: string;
  }[];
}

// Manual edit types
export interface AttendanceEditRequest {
  recordId: string;
  date: Date;
  clockInTime: Date | null;
  clockOutTime: Date | null;
  reason: string;
}

export interface AttendanceEditResult {
  success: boolean;
  updatedRecord?: AttendanceRecord;
  errors?: string[];
}

// Attendance Period Finalization Types
export type AttendancePeriodStatus = 'PENDING' | 'FINALIZED' | 'LOCKED';

export interface AttendancePeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  status: AttendancePeriodStatus;
  finalizedBy?: string;
  finalizedAt?: Date;
  unlockReason?: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  attendanceRecords?: AttendanceRecord[];
}

export interface FinalizationRequest {
  periodId: string;
  confirmFinalization: boolean;
}

export interface FinalizationResult {
  success: boolean;
  period?: AttendancePeriod;
  affectedRecordCount?: number;
  errors?: string[];
}

export interface PeriodStatusSummary {
  totalRecords: number;
  employeeCount: number;
  pendingApprovals: number;
  conflicts: number;
  period: AttendancePeriod;
}

export interface UnlockRequest {
  periodId: string;
  reason: string;
  confirmUnlock: boolean;
}

export interface PeriodValidationResult {
  canFinalize: boolean;
  issues: {
    type: 'PENDING_APPROVALS' | 'UNRESOLVED_CONFLICTS' | 'MISSING_DATA';
    message: string;
    count: number;
  }[];
}