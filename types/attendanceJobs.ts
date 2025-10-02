// Attendance job management types following coding standards type sharing patterns

import { ZKTError, ZKTServiceResponse } from './zkt';
import { AttendanceFetchResult } from './attendance';

// Core job types
export enum AttendanceJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AttendanceJobType {
  DAILY_SYNC = 'DAILY_SYNC',
  MANUAL_TRIGGER = 'MANUAL_TRIGGER',
  BACKFILL = 'BACKFILL'
}

export interface AttendanceSyncJob {
  id: string;
  type: AttendanceJobType;
  status: AttendanceJobStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  triggeredBy: string; // user ID
  config: AttendanceSyncConfig;
  result?: AttendanceSyncResult;
  error?: AttendanceSyncError;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Job configuration types
export interface AttendanceSyncConfig {
  zktMachines: ZKTMachineConfig[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  options: {
    enableValidation: boolean;
    enableDeduplication: boolean;
    batchSize: number;
    timeoutMs: number;
    parallelMachines: boolean;
  };
}

export interface ZKTMachineConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  enabled: boolean;
  priority: number; // for processing order
}

// Job result types
export interface AttendanceSyncResult {
  totalMachines: number;
  successfulMachines: number;
  failedMachines: number;
  totalRecordsProcessed: number;
  recordsCreated: number;
  recordsSkipped: number;
  duplicatesFound: number;
  validationErrors: number;
  machineResults: MachineJobResult[];
  summary: {
    executionTimeMs: number;
    averageRecordsPerMachine: number;
    successRate: number;
  };
}

export interface MachineJobResult {
  machineId: string;
  machineName: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  recordsProcessed: number;
  recordsCreated: number;
  duplicatesFound: number;
  errors: AttendanceSyncError[];
  executionTimeMs: number;
  fetchResult?: AttendanceFetchResult;
}

// Error types
export interface AttendanceSyncError {
  code: string;
  message: string;
  machineId?: string;
  timestamp: Date;
  details?: unknown;
  recoverable: boolean;
}

// Job scheduling types
export interface JobScheduleConfig {
  enabled: boolean;
  cronExpression: string; // "0 6 * * *" for 6 AM daily
  timezone: string;
  autoRetry: boolean;
  maxRetries: number;
  retryDelayMinutes: number;
  alertOnFailure: boolean;
  alertRecipients: string[];
}

export interface ScheduledJobTrigger {
  nextRun: Date;
  lastRun?: Date;
  lastStatus?: AttendanceJobStatus;
  isActive: boolean;
  config: JobScheduleConfig;
}

// Job monitoring types
export interface JobExecutionMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  successRate: number;
  lastJobRun?: Date;
  upcomingJobs: {
    scheduledAt: Date;
    type: AttendanceJobType;
  }[];
}

export interface JobHealthStatus {
  isHealthy: boolean;
  lastSuccessfulRun?: Date;
  consecutiveFailures: number;
  currentStatus: 'ACTIVE' | 'DEGRADED' | 'DOWN';
  issues: string[];
}

// API request/response types
export interface CreateJobRequest {
  type: AttendanceJobType;
  config: AttendanceSyncConfig;
  scheduledAt?: Date;
  triggeredBy: string;
}

export interface JobListRequest {
  status?: AttendanceJobStatus;
  type?: AttendanceJobType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface JobListResponse {
  jobs: AttendanceSyncJob[];
  total: number;
  hasMore: boolean;
}

export interface TriggerJobRequest {
  machineIds?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  options?: {
    enableValidation?: boolean;
    enableDeduplication?: boolean;
  };
}

export interface JobStatusResponse {
  job: AttendanceSyncJob;
  isRunning: boolean;
  progress?: {
    completedMachines: number;
    totalMachines: number;
    currentMachine?: string;
    estimatedTimeRemaining?: number;
  };
}

// Configuration management types
export interface AttendanceSyncSystemConfig {
  scheduling: JobScheduleConfig;
  machines: ZKTMachineConfig[];
  defaults: {
    batchSize: number;
    timeoutMs: number;
    enableValidation: boolean;
    enableDeduplication: boolean;
    maxRetries: number;
    retryDelayMinutes: number;
  };
  notifications: {
    enabled: boolean;
    channels: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
    recipients: string[];
    webhookUrl?: string;
  };
}

// Job queue types for background processing
export interface JobQueueItem {
  jobId: string;
  priority: number;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  data: AttendanceSyncJob;
}

export interface JobProcessorResponse {
  success: boolean;
  result?: AttendanceSyncResult;
  error?: AttendanceSyncError;
  shouldRetry: boolean;
  retryDelayMs?: number;
}

// Duplicate prevention types
export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingRecordId?: string;
  conflictType?: 'EXACT_MATCH' | 'TIME_CONFLICT' | 'TRANSACTION_ID_CONFLICT';
  resolution: 'SKIP' | 'UPDATE' | 'ERROR';
  details?: string;
}

export interface DeduplicationConfig {
  enabled: boolean;
  strategy: 'SKIP_DUPLICATES' | 'UPDATE_EXISTING' | 'ERROR_ON_DUPLICATE';
  matchCriteria: {
    useStaffId: boolean;
    useDate: boolean;
    useTransactionId: boolean;
    useTimeStamps: boolean;
  };
  timeToleranceMinutes: number; // for clock in/out time comparison
}

// Conflict resolution types
export interface AttendanceConflict {
  recordId: string;
  conflictType: 'MANUAL_VS_AUTO' | 'MACHINE_MISMATCH' | 'TIME_OVERLAP';
  existingRecord: {
    source: 'MANUAL' | 'AUTO_SYNC';
    lastModified: Date;
    modifiedBy: string;
    data: unknown;
  };
  incomingRecord: {
    source: 'AUTO_SYNC';
    machineId: string;
    data: unknown;
  };
  suggestedResolution: 'KEEP_EXISTING' | 'UPDATE_WITH_INCOMING' | 'MERGE' | 'FLAG_FOR_REVIEW';
  requiresManualReview: boolean;
}

export interface ConflictResolutionResult {
  resolved: boolean;
  action: 'SKIPPED' | 'UPDATED' | 'FLAGGED';
  finalRecord?: unknown;
  notes?: string;
}