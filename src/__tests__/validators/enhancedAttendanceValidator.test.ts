// Enhanced Attendance Validator Tests - Duplicate prevention and conflict resolution
// Following Jest + Testing Library patterns from architecture/testing-strategy.md

import { EnhancedAttendanceValidator } from '../../validators/attendanceValidator';
import { DeduplicationConfig } from '../../../types/attendanceJobs';
import { ZKTAttendanceLog } from '../../../types/zkt';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client with comprehensive attendance record operations
const mockPrismaClient = {
  attendanceRecord: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  }
} as unknown as jest.Mocked<PrismaClient>;

// Mock employee mapping service
const mockEmployeeMappingService = {
  mapZKTEmployeeToStaff: jest.fn()
};

describe('EnhancedAttendanceValidator', () => {
  let validator: EnhancedAttendanceValidator;
  
  const sampleZKTRecord: ZKTAttendanceLog = {
    uid: 12345,
    userid: 'EMP001',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    state: 1, // Check-in
    type: 0
  };

  const defaultDeduplicationConfig: DeduplicationConfig = {
    enabled: true,
    strategy: 'SKIP_DUPLICATES',
    matchCriteria: {
      useStaffId: true,
      useDate: true,
      useTransactionId: true,
      useTimeStamps: false
    },
    timeToleranceMinutes: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new EnhancedAttendanceValidator(
      mockPrismaClient,
      mockEmployeeMappingService,
      defaultDeduplicationConfig
    );
  });

  describe('validateWithDuplicatePrevention', () => {
    it('should validate records with successful employee mapping', async () => {
      // Mock successful employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'John Doe',
        mapped: true
      });

      // Mock no existing duplicates
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await validator.validateWithDuplicatePrevention([sampleZKTRecord], 'job-123');

      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.summary.successRate).toBe(1);
    });

    it('should detect duplicate records', async () => {
      // Mock successful employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'John Doe',
        mapped: true
      });

      // Mock existing duplicate record
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue({
        id: 'existing-record-123',
        clockInTime: new Date('2024-01-01T09:00:00Z'),
        clockOutTime: null,
        zkTransactionId: '12345',
        fetchedAt: new Date()
      });

      const result = await validator.validateWithDuplicatePrevention([sampleZKTRecord], 'job-123');

      expect(result.duplicateCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.duplicateRecords).toHaveLength(1);
      expect(result.duplicateRecords[0].errors[0].type).toBe('DUPLICATE');
    });

    it('should detect employee mapping issues', async () => {
      // Mock failed employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        mapped: false,
        error: 'Employee not found in staff records'
      });

      const result = await validator.validateWithDuplicatePrevention([sampleZKTRecord], 'job-123');

      expect(result.employeeMappingIssues).toHaveLength(1);
      expect(result.validCount).toBe(0);
      expect(result.employeeMappingIssues[0].errors[0].type).toBe('EMPLOYEE_MAPPING');
    });

    it('should detect conflicts with manual records', async () => {
      // Mock successful employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'John Doe',
        mapped: true
      });

      // Mock no duplicates but existing manual record (conflict)
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([
        {
          id: 'manual-record-123',
          clockInTime: new Date('2024-01-01T08:30:00Z'),
          clockOutTime: new Date('2024-01-01T17:30:00Z'),
          fetchedAt: new Date(),
          syncJobId: null, // Manual record
          fetchedBy: { id: 'user-123', name: 'Admin User' }
        }
      ]);

      const result = await validator.validateWithDuplicatePrevention([sampleZKTRecord], 'job-123');

      expect(result.conflictCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.conflictRecords[0].errors[0].type).toBe('VALIDATION');
    });

    it('should handle validation errors gracefully', async () => {
      // Invalid ZKT record (missing required fields)
      const invalidRecord = {
        uid: null,
        userid: '',
        timestamp: 'invalid-date',
        state: undefined,
        type: undefined
      } as unknown as ZKTAttendanceLog;

      const result = await validator.validateWithDuplicatePrevention([invalidRecord], 'job-123');

      expect(result.invalidCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.invalidRecords[0].errors).toBeTruthy();
    });

    it('should process multiple records with mixed results', async () => {
      const records: ZKTAttendanceLog[] = [
        sampleZKTRecord, // Valid record
        { ...sampleZKTRecord, userid: 'EMP002' }, // Different employee
        { ...sampleZKTRecord, userid: '' } // Invalid record
      ];

      // Mock employee mapping - first two succeed, third fails due to empty userid
      mockEmployeeMappingService.mapZKTEmployeeToStaff
        .mockResolvedValueOnce({
          staffId: 'staff-123',
          staffName: 'John Doe',
          mapped: true
        })
        .mockResolvedValueOnce({
          staffId: 'staff-456',
          staffName: 'Jane Smith',
          mapped: true
        });

      // Mock no duplicates or conflicts
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await validator.validateWithDuplicatePrevention(records, 'job-123');

      expect(result.totalProcessed).toBe(3);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.summary.successRate).toBeCloseTo(2/3);
    });
  });

  describe('deduplication configuration', () => {
    it('should skip duplicate checking when deduplication is disabled', async () => {
      const disabledConfig: DeduplicationConfig = {
        ...defaultDeduplicationConfig,
        enabled: false
      };

      const validatorWithDisabledDedup = new EnhancedAttendanceValidator(
        mockPrismaClient,
        mockEmployeeMappingService,
        disabledConfig
      );

      // Mock successful employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'John Doe',
        mapped: true
      });

      const result = await validatorWithDisabledDedup.validateWithDuplicatePrevention(
        [sampleZKTRecord], 
        'job-123'
      );

      // Should not call duplicate check methods
      expect(mockPrismaClient.attendanceRecord.findFirst).not.toHaveBeenCalled();
      expect(result.duplicateCount).toBe(0);
    });

    it('should handle different deduplication strategies', async () => {
      const errorOnDuplicateConfig: DeduplicationConfig = {
        ...defaultDeduplicationConfig,
        strategy: 'ERROR_ON_DUPLICATE'
      };

      const validatorWithErrorStrategy = new EnhancedAttendanceValidator(
        mockPrismaClient,
        mockEmployeeMappingService,
        errorOnDuplicateConfig
      );

      // Mock successful employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'John Doe',
        mapped: true
      });

      // Mock existing duplicate record
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue({
        id: 'existing-record-123',
        clockInTime: new Date('2024-01-01T09:00:00Z'),
        clockOutTime: null,
        zkTransactionId: '12345',
        fetchedAt: new Date()
      });

      const result = await validatorWithErrorStrategy.validateWithDuplicatePrevention(
        [sampleZKTRecord], 
        'job-123'
      );

      // With ERROR_ON_DUPLICATE strategy, duplicate should be treated as invalid
      expect(result.invalidCount).toBe(1);
      expect(result.duplicateCount).toBe(0);
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return deduplication statistics', async () => {
      // Mock database counts
      mockPrismaClient.attendanceRecord.count
        .mockResolvedValueOnce(100) // Total records
        .mockResolvedValueOnce(5);  // Unresolved conflicts

      const stats = await validator.getDeduplicationStats(7);

      expect(stats).toMatchObject({
        totalRecordsProcessed: 100,
        duplicatesFound: expect.any(Number),
        duplicateRate: expect.any(Number),
        conflictsFound: 5,
        conflictRate: 0.05,
        unresolvedConflicts: 5
      });

      // Verify correct database query parameters
      expect(mockPrismaClient.attendanceRecord.count).toHaveBeenCalledWith({
        where: { createdAt: { gte: expect.any(Date) } }
      });
    });

    it('should handle database errors in stats calculation', async () => {
      // Mock database error
      mockPrismaClient.attendanceRecord.count.mockRejectedValue(
        new Error('Database connection failed')
      );

      const stats = await validator.getDeduplicationStats(7);

      // Should return zero values on error
      expect(stats).toMatchObject({
        totalRecordsProcessed: 0,
        duplicatesFound: 0,
        duplicateRate: 0,
        conflictsFound: 0,
        conflictRate: 0,
        unresolvedConflicts: 0
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large batch processing efficiently', async () => {
      const largeRecordSet = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleZKTRecord,
        uid: i + 1,
        userid: `EMP${String(i + 1).padStart(3, '0')}`
      }));

      // Mock consistent employee mapping
      mockEmployeeMappingService.mapZKTEmployeeToStaff.mockResolvedValue({
        staffId: 'staff-123',
        staffName: 'Test Employee',
        mapped: true
      });

      // Mock no duplicates or conflicts
      mockPrismaClient.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrismaClient.attendanceRecord.findMany.mockResolvedValue([]);

      const startTime = Date.now();
      const result = await validator.validateWithDuplicatePrevention(largeRecordSet, 'job-123');
      const processingTime = Date.now() - startTime;

      expect(result.totalProcessed).toBe(1000);
      expect(result.summary.processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(processingTime).toBeLessThan(30000); // Test timeout safeguard
    });

    it('should handle empty record sets', async () => {
      const result = await validator.validateWithDuplicatePrevention([], 'job-123');

      expect(result.totalProcessed).toBe(0);
      expect(result.validCount).toBe(0);
      expect(result.summary.successRate).toBe(0);
    });

    it('should handle null and undefined records', async () => {
      const invalidRecords = [null, undefined] as unknown as ZKTAttendanceLog[];

      const result = await validator.validateWithDuplicatePrevention(invalidRecords, 'job-123');

      expect(result.invalidCount).toBe(2);
      expect(result.validCount).toBe(0);
    });
  });
});