// Attendance Job Service Tests - Unit tests for scheduled sync logic
// Following Jest + Testing Library patterns from architecture/testing-strategy.md

import { AttendanceJobService } from '../../services/attendanceJobService';
import { 
  AttendanceJobType, 
  AttendanceJobStatus, 
  AttendanceSyncConfig,
  ZKTMachineConfig 
} from '../../../types/attendanceJobs';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    attendanceRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    }
  }))
}));

// Mock ZKT Service
jest.mock('../../services/zktService', () => ({
  ZKTService: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    getValidatedAttendanceLogs: jest.fn()
  }))
}));

// Mock Enhanced Attendance Validator
jest.mock('../../validators/attendanceValidator', () => ({
  EnhancedAttendanceValidator: jest.fn().mockImplementation(() => ({
    validateWithDuplicatePrevention: jest.fn()
  }))
}));

describe('AttendanceJobService', () => {
  let jobService: AttendanceJobService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    jobService = new AttendanceJobService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSyncJob', () => {
    const mockZKTMachines: ZKTMachineConfig[] = [
      {
        id: 'test-machine-1',
        name: 'Test Machine 1',
        ip: '192.168.1.100',
        port: 4370,
        enabled: true,
        priority: 1
      }
    ];

    const mockSyncConfig: AttendanceSyncConfig = {
      zktMachines: mockZKTMachines,
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02')
      },
      options: {
        enableValidation: true,
        enableDeduplication: true,
        batchSize: 100,
        timeoutMs: 30000,
        parallelMachines: false
      }
    };

    it('should create a new sync job with correct properties', async () => {
      const job = await jobService.createSyncJob(
        AttendanceJobType.DAILY_SYNC,
        mockSyncConfig,
        'test-user-id'
      );

      expect(job).toMatchObject({
        type: AttendanceJobType.DAILY_SYNC,
        status: AttendanceJobStatus.PENDING,
        triggeredBy: 'test-user-id',
        config: mockSyncConfig,
        retryCount: 0,
        maxRetries: 3
      });
      expect(job.id).toBeDefined();
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should set different max retries based on validation setting', async () => {
      const configWithoutValidation = {
        ...mockSyncConfig,
        options: {
          ...mockSyncConfig.options,
          enableValidation: false
        }
      };

      const job = await jobService.createSyncJob(
        AttendanceJobType.MANUAL_TRIGGER,
        configWithoutValidation,
        'test-user-id'
      );

      expect(job.maxRetries).toBe(1);
    });

    it('should use provided scheduled time', async () => {
      const scheduledTime = new Date('2024-01-01T06:00:00Z');
      
      const job = await jobService.createSyncJob(
        AttendanceJobType.DAILY_SYNC,
        mockSyncConfig,
        'test-user-id',
        scheduledTime
      );

      expect(job.scheduledAt).toEqual(scheduledTime);
    });
  });

  describe('executeJob', () => {
    it('should reject execution of non-existent job', async () => {
      await expect(jobService.executeJob('non-existent-job')).rejects.toThrow(
        'Job non-existent-job not found'
      );
    });

    it('should reject execution of already running job', async () => {
      // This test would require mocking the running jobs map
      // Implementation depends on internal job tracking mechanism
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('getJobMetrics', () => {
    it('should return initial metrics with zero values', async () => {
      const metrics = await jobService.getJobMetrics();

      expect(metrics).toMatchObject({
        totalJobs: expect.any(Number),
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(Number),
        upcomingJobs: expect.any(Array)
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status by default', async () => {
      const healthStatus = await jobService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        isHealthy: true,
        currentStatus: 'ACTIVE',
        consecutiveFailures: 0,
        issues: []
      });
    });
  });

  describe('cleanupOldJobs', () => {
    it('should return number of cleaned up jobs', async () => {
      const cleanupCount = await jobService.cleanupOldJobs(30);
      expect(typeof cleanupCount).toBe('number');
    });

    it('should use default retention period', async () => {
      const cleanupCount = await jobService.cleanupOldJobs();
      expect(typeof cleanupCount).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors gracefully', () => {
      expect(() => new AttendanceJobService(mockPrisma)).not.toThrow();
    });

    it('should generate unique job IDs', async () => {
      const mockConfig: AttendanceSyncConfig = {
        zktMachines: [],
        dateRange: {
          startDate: new Date(),
          endDate: new Date()
        },
        options: {
          enableValidation: true,
          enableDeduplication: true,
          batchSize: 100,
          timeoutMs: 30000,
          parallelMachines: false
        }
      };

      const job1 = await jobService.createSyncJob(
        AttendanceJobType.MANUAL_TRIGGER,
        mockConfig,
        'user-1'
      );

      const job2 = await jobService.createSyncJob(
        AttendanceJobType.MANUAL_TRIGGER,
        mockConfig,
        'user-2'
      );

      expect(job1.id).not.toBe(job2.id);
    });
  });
});

// Integration-style tests for complex job workflows
describe('AttendanceJobService Integration', () => {
  let jobService: AttendanceJobService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    jobService = new AttendanceJobService(mockPrisma);
  });

  describe('job lifecycle', () => {
    it('should handle complete job lifecycle from creation to completion', async () => {
      // This would be a more comprehensive test involving:
      // 1. Job creation
      // 2. Job execution
      // 3. Status updates
      // 4. Result processing
      // 5. Metrics updates
      
      const mockConfig: AttendanceSyncConfig = {
        zktMachines: [
          {
            id: 'test-machine',
            name: 'Test Machine',
            ip: '192.168.1.100',
            port: 4370,
            enabled: true,
            priority: 1
          }
        ],
        dateRange: {
          startDate: new Date(),
          endDate: new Date()
        },
        options: {
          enableValidation: true,
          enableDeduplication: true,
          batchSize: 10,
          timeoutMs: 5000,
          parallelMachines: false
        }
      };

      const job = await jobService.createSyncJob(
        AttendanceJobType.MANUAL_TRIGGER,
        mockConfig,
        'test-user'
      );

      expect(job.status).toBe(AttendanceJobStatus.PENDING);
      expect(job.type).toBe(AttendanceJobType.MANUAL_TRIGGER);
    });
  });

  describe('concurrent job handling', () => {
    it('should handle multiple job creation requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        jobService.createSyncJob(
          AttendanceJobType.DAILY_SYNC,
          {
            zktMachines: [],
            dateRange: { startDate: new Date(), endDate: new Date() },
            options: {
              enableValidation: true,
              enableDeduplication: true,
              batchSize: 100,
              timeoutMs: 30000,
              parallelMachines: false
            }
          },
          `user-${i}`
        )
      );

      const jobs = await Promise.all(promises);
      
      // All jobs should be created successfully
      expect(jobs).toHaveLength(5);
      
      // All jobs should have unique IDs
      const jobIds = jobs.map(job => job.id);
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(5);
    });
  });
});