// Attendance Job Service - Scheduled sync management following service architecture patterns
// Following architecture/coding-standards.md service patterns

import { 
  AttendanceSyncJob, 
  AttendanceJobStatus, 
  AttendanceJobType,
  AttendanceSyncConfig, 
  AttendanceSyncResult,
  AttendanceSyncError,
  JobScheduleConfig,
  MachineJobResult,
  JobExecutionMetrics,
  JobHealthStatus,
  DuplicateDetectionResult,
  AttendanceConflict,
  ZKTMachineConfig
} from '../../types/attendanceJobs';
import { ZKTService } from './zktService';
import { AttendanceFetchResult } from '../../types/attendance';
import { ZKTConnectionConfig } from '../../types/zkt';
import { PrismaClient } from '@prisma/client';
import { EnhancedAttendanceValidator } from '../validators/attendanceValidator';

export class AttendanceJobService {
  private prisma: PrismaClient;
  private runningJobs: Map<string, Promise<AttendanceSyncResult>>;
  private jobMetrics: JobExecutionMetrics;
  private enhancedValidator: EnhancedAttendanceValidator;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.runningJobs = new Map();
    this.enhancedValidator = new EnhancedAttendanceValidator(prisma);
    this.jobMetrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageExecutionTime: 0,
      successRate: 0,
      upcomingJobs: []
    };
  }

  /**
   * Create and queue a new attendance sync job
   */
  async createSyncJob(
    type: AttendanceJobType,
    config: AttendanceSyncConfig,
    triggeredBy: string,
    scheduledAt?: Date
  ): Promise<AttendanceSyncJob> {
    const job: AttendanceSyncJob = {
      id: this.generateJobId(),
      type,
      status: AttendanceJobStatus.PENDING,
      scheduledAt: scheduledAt || new Date(),
      triggeredBy,
      config,
      retryCount: 0,
      maxRetries: config.options.enableValidation ? 3 : 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store job in database (would need job tracking table)
    // For now, using in-memory tracking
    await this.updateJobMetrics();
    
    return job;
  }

  /**
   * Execute attendance sync job with comprehensive error handling
   */
  async executeJob(jobId: string): Promise<AttendanceSyncResult> {
    if (this.runningJobs.has(jobId)) {
      throw new Error(`Job ${jobId} is already running`);
    }

    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const executionPromise = this.performJobExecution(job);
    this.runningJobs.set(jobId, executionPromise);

    try {
      const result = await executionPromise;
      await this.updateJobStatus(jobId, AttendanceJobStatus.COMPLETED, result);
      return result;
    } catch (error) {
      const syncError: AttendanceSyncError = {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown execution error',
        timestamp: new Date(),
        recoverable: true
      };
      await this.updateJobStatus(jobId, AttendanceJobStatus.FAILED, undefined, syncError);
      throw error;
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Perform the actual job execution with machine processing
   */
  private async performJobExecution(job: AttendanceSyncJob): Promise<AttendanceSyncResult> {
    const startTime = Date.now();
    await this.updateJobStatus(job.id, AttendanceJobStatus.RUNNING);

    const machineResults: MachineJobResult[] = [];
    let totalRecordsProcessed = 0;
    let recordsCreated = 0;
    let recordsSkipped = 0;
    let duplicatesFound = 0;
    let validationErrors = 0;

    // Process each ZKT machine
    for (const machineConfig of job.config.zktMachines) {
      if (!machineConfig.enabled) {
        continue;
      }

      try {
        const machineResult = await this.processMachine(
          machineConfig, 
          job.config,
          job.id
        );
        
        machineResults.push(machineResult);
        totalRecordsProcessed += machineResult.recordsProcessed;
        recordsCreated += machineResult.recordsCreated;
        duplicatesFound += machineResult.duplicatesFound;

        if (machineResult.fetchResult) {
          recordsSkipped += machineResult.fetchResult.recordsSkipped;
          validationErrors += machineResult.fetchResult.validationErrors;
        }
      } catch (error) {
        const failedResult: MachineJobResult = {
          machineId: machineConfig.id,
          machineName: machineConfig.name,
          status: 'FAILED',
          recordsProcessed: 0,
          recordsCreated: 0,
          duplicatesFound: 0,
          errors: [{
            code: 'MACHINE_PROCESSING_FAILED',
            message: error instanceof Error ? error.message : 'Unknown machine error',
            machineId: machineConfig.id,
            timestamp: new Date(),
            recoverable: true
          }],
          executionTimeMs: 0
        };
        machineResults.push(failedResult);
      }
    }

    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;

    const result: AttendanceSyncResult = {
      totalMachines: job.config.zktMachines.filter(m => m.enabled).length,
      successfulMachines: machineResults.filter(r => r.status === 'SUCCESS').length,
      failedMachines: machineResults.filter(r => r.status === 'FAILED').length,
      totalRecordsProcessed,
      recordsCreated,
      recordsSkipped,
      duplicatesFound,
      validationErrors,
      machineResults,
      summary: {
        executionTimeMs,
        averageRecordsPerMachine: totalRecordsProcessed / Math.max(1, machineResults.length),
        successRate: machineResults.filter(r => r.status === 'SUCCESS').length / Math.max(1, machineResults.length)
      }
    };

    await this.updateJobMetrics();
    return result;
  }

  /**
   * Process a single ZKT machine for attendance data
   */
  private async processMachine(
    machineConfig: ZKTMachineConfig,
    syncConfig: AttendanceSyncConfig,
    jobId: string
  ): Promise<MachineJobResult> {
    const startTime = Date.now();
    
    try {
      // Initialize ZKT service
      const zktConfig: ZKTConnectionConfig = {
        ip: machineConfig.ip,
        port: machineConfig.port,
        inport: 5000 // Default inbound port
      };

      const zktService = new ZKTService(zktConfig, {
        enableRetry: true,
        enableCircuitBreaker: true,
        enableValidation: syncConfig.options.enableValidation,
        timeout: syncConfig.options.timeoutMs
      });

      // Connect and fetch attendance data
      const connectionResult = await zktService.connect();
      if (!connectionResult.success) {
        throw new Error(`Failed to connect to ZKT machine: ${connectionResult.error?.message}`);
      }

      const logsResult = await zktService.getValidatedAttendanceLogs();
      if (!logsResult.success || !logsResult.data) {
        throw new Error(`Failed to get attendance logs: ${logsResult.error?.message}`);
      }

      // Process and store attendance records with duplicate prevention
      const processResult = await this.processAttendanceRecords(
        logsResult.data.validRecords,
        machineConfig.id,
        syncConfig,
        jobId
      );

      await zktService.disconnect();

      const endTime = Date.now();

      return {
        machineId: machineConfig.id,
        machineName: machineConfig.name,
        status: 'SUCCESS',
        recordsProcessed: logsResult.data.validRecords.length,
        recordsCreated: processResult.created,
        duplicatesFound: processResult.duplicates,
        errors: processResult.errors,
        executionTimeMs: endTime - startTime,
        fetchResult: {
          success: true,
          totalRecordsProcessed: logsResult.data.validRecords.length,
          recordsCreated: processResult.created,
          recordsSkipped: processResult.duplicates,
          recordsWithErrors: processResult.errors.length,
          employeeMappingErrors: 0,
          validationErrors: logsResult.data.invalidRecords.length,
          records: [],
          errors: [],
          summary: {
            startDate: syncConfig.dateRange.startDate,
            endDate: syncConfig.dateRange.endDate,
            fetchedAt: new Date(),
            fetchedById: jobId
          }
        }
      };

    } catch (error) {
      const endTime = Date.now();
      return {
        machineId: machineConfig.id,
        machineName: machineConfig.name,
        status: 'FAILED',
        recordsProcessed: 0,
        recordsCreated: 0,
        duplicatesFound: 0,
        errors: [{
          code: 'MACHINE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown machine processing error',
          machineId: machineConfig.id,
          timestamp: new Date(),
          recoverable: true
        }],
        executionTimeMs: endTime - startTime
      };
    }
  }

  /**
   * Process attendance records with enhanced duplicate prevention
   */
  private async processAttendanceRecords(
    records: unknown[],
    machineId: string,
    config: AttendanceSyncConfig,
    syncJobId: string
  ): Promise<{
    created: number;
    duplicates: number;
    errors: AttendanceSyncError[];
  }> {
    try {
      // Use enhanced validator with duplicate prevention
      const validationResult = await this.enhancedValidator.validateWithDuplicatePrevention(
        records as any[], // Type assertion for ZKTAttendanceLog[]
        syncJobId
      );

      let created = 0;
      const errors: AttendanceSyncError[] = [];

      // Process valid records
      for (const validRecord of validationResult.validRecords) {
        try {
          if (validRecord.record) {
            await this.createAttendanceRecord(validRecord.record, machineId, syncJobId);
            created++;
          }
        } catch (error) {
          errors.push({
            code: 'DATABASE_INSERT_ERROR',
            message: error instanceof Error ? error.message : 'Failed to insert attendance record',
            machineId,
            timestamp: new Date(),
            recoverable: true
          });
        }
      }

      // Log validation issues as errors for reporting
      validationResult.invalidRecords.forEach(invalidRecord => {
        invalidRecord.errors.forEach(error => {
          errors.push({
            code: 'VALIDATION_ERROR',
            message: error.message,
            machineId,
            timestamp: new Date(),
            recoverable: false,
            details: { 
              employeeId: error.employeeId,
              zkTransactionId: error.zkTransactionId
            }
          });
        });
      });

      validationResult.employeeMappingIssues.forEach(mappingIssue => {
        mappingIssue.errors.forEach(error => {
          errors.push({
            code: 'EMPLOYEE_MAPPING_ERROR',
            message: error.message,
            machineId,
            timestamp: new Date(),
            recoverable: true,
            details: { employeeId: error.employeeId }
          });
        });
      });

      // Handle conflicts (these require manual review)
      validationResult.conflictRecords.forEach(conflictRecord => {
        conflictRecord.errors.forEach(error => {
          errors.push({
            code: 'CONFLICT_DETECTED',
            message: `Manual review required: ${error.message}`,
            machineId,
            timestamp: new Date(),
            recoverable: true,
            details: { 
              conflictType: error.details,
              employeeId: conflictRecord.employeeMapping.zkEmployeeId
            }
          });
        });
      });

      return { 
        created, 
        duplicates: validationResult.duplicateCount, 
        errors 
      };

    } catch (error) {
      return {
        created: 0,
        duplicates: 0,
        errors: [{
          code: 'VALIDATION_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation service error',
          machineId,
          timestamp: new Date(),
          recoverable: false
        }]
      };
    }
  }

  /**
   * Check for duplicate attendance records
   */
  private async checkForDuplicate(
    record: unknown,
    machineId: string
  ): Promise<DuplicateDetectionResult> {
    // Implementation would check against existing records in database
    // Using (staffId, date, zkTransactionId) unique constraint
    
    // Placeholder implementation
    return {
      isDuplicate: false,
      resolution: 'SKIP'
    };
  }

  /**
   * Create attendance record in database
   */
  private async createAttendanceRecord(
    record: unknown,
    machineId: string,
    syncJobId: string
  ): Promise<void> {
    // Implementation would create record using Prisma
    // This is a placeholder - would need proper data mapping
  }

  /**
   * Get job by ID
   */
  private async getJob(jobId: string): Promise<AttendanceSyncJob | null> {
    // Implementation would fetch from database
    // Placeholder for now
    return null;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: AttendanceJobStatus,
    result?: AttendanceSyncResult,
    error?: AttendanceSyncError
  ): Promise<void> {
    // Implementation would update job in database
    console.log(`Job ${jobId} status: ${status}`);
  }

  /**
   * Update job execution metrics
   */
  private async updateJobMetrics(): Promise<void> {
    // Implementation would calculate metrics from database
    this.jobMetrics.totalJobs++;
  }

  /**
   * Get job execution metrics
   */
  async getJobMetrics(): Promise<JobExecutionMetrics> {
    return { ...this.jobMetrics };
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<JobHealthStatus> {
    // Implementation would check recent job statuses
    return {
      isHealthy: true,
      currentStatus: 'ACTIVE',
      consecutiveFailures: 0,
      issues: []
    };
  }

  /**
   * Cancel running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (this.runningJobs.has(jobId)) {
      // Would need to implement cancellation logic
      this.runningJobs.delete(jobId);
      await this.updateJobStatus(jobId, AttendanceJobStatus.CANCELLED);
      return true;
    }
    return false;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup completed jobs older than specified days
   */
  async cleanupOldJobs(daysToKeep: number = 30): Promise<number> {
    // Implementation would delete old job records from database
    return 0;
  }
}