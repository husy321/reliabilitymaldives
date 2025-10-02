// Tests for attendance record validation logic
// Following architecture/testing-strategy.md backend testing patterns

import {
  validateAttendanceRecord,
  validateAttendanceRecordWithEmployee,
  validateAttendanceRecordsBatch,
  sanitizeZKTAttendanceData,
  validateAttendanceSequence,
  AttendanceType,
  AttendanceState
} from '../../validators/attendanceValidator';
import { EmployeeValidationService } from '../../services/employeeValidationService';

// Mock the employee validation service
jest.mock('../../services/employeeValidationService');
const MockEmployeeValidationService = EmployeeValidationService as jest.MockedClass<typeof EmployeeValidationService>;

describe('AttendanceValidator', () => {
  describe('validateAttendanceRecord', () => {
    test('should validate valid attendance record', () => {
      const validRecord = {
        uid: 12345,
        userid: 'john.doe',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      const result = validateAttendanceRecord(validRecord);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.uid).toBe(12345);
      expect(result.data?.userid).toBe('john.doe');
    });

    test('should reject invalid UID (negative)', () => {
      const invalidRecord = {
        uid: -1,
        userid: 'john.doe',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      const result = validateAttendanceRecord(invalidRecord);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject empty userid', () => {
      const invalidRecord = {
        uid: 12345,
        userid: '',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      const result = validateAttendanceRecord(invalidRecord);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject future timestamps (beyond 1 day)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const invalidRecord = {
        uid: 12345,
        userid: 'john.doe',
        timestamp: futureDate,
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      const result = validateAttendanceRecord(invalidRecord);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject very old timestamps (beyond 1 year)', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const invalidRecord = {
        uid: 12345,
        userid: 'john.doe',
        timestamp: oldDate,
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      const result = validateAttendanceRecord(invalidRecord);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should transform raw ZKT data correctly', () => {
      const rawData = {
        uid: '12345',  // String that should be converted to number
        userid: '  john.doe  ',  // Whitespace that should be trimmed
        timestamp: Date.now(),  // Unix timestamp that should be converted to Date
        state: '0',  // String that should be converted to number
        type: '0'    // String that should be converted to number
      };

      const result = validateAttendanceRecord(rawData);

      expect(result.success).toBe(true);
      expect(result.data?.uid).toBe(12345);
      expect(result.data?.userid).toBe('john.doe');
      expect(result.data?.timestamp).toBeInstanceOf(Date);
      expect(result.data?.state).toBe(0);
      expect(result.data?.type).toBe(0);
    });
  });

  describe('validateAttendanceRecordWithEmployee', () => {
    let mockEmployeeService: jest.Mocked<EmployeeValidationService>;

    beforeEach(() => {
      mockEmployeeService = new MockEmployeeValidationService({
        mappingStrategy: 'email_prefix'
      }) as jest.Mocked<EmployeeValidationService>;
    });

    test('should validate attendance with valid employee', async () => {
      const validRecord = {
        uid: 12345,
        userid: 'john.doe',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      mockEmployeeService.validateEmployeeId.mockResolvedValue({
        isValid: true,
        userId: 'user-123',
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@company.com'
      });

      const result = await validateAttendanceRecordWithEmployee(validRecord, mockEmployeeService);

      expect(result.success).toBe(true);
      expect(result.employeeValidation?.isValid).toBe(true);
      expect(mockEmployeeService.validateEmployeeId).toHaveBeenCalledWith('john.doe');
    });

    test('should reject attendance with invalid employee', async () => {
      const validRecord = {
        uid: 12345,
        userid: 'invalid.user',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      mockEmployeeService.validateEmployeeId.mockResolvedValue({
        isValid: false,
        errorMessage: 'Employee not found'
      });

      const result = await validateAttendanceRecordWithEmployee(validRecord, mockEmployeeService);

      expect(result.success).toBe(false);
      expect(result.employeeValidation?.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should handle employee validation service errors', async () => {
      const validRecord = {
        uid: 12345,
        userid: 'john.doe',
        timestamp: new Date(),
        state: AttendanceState.CHECK_IN,
        type: AttendanceType.PUNCH_IN
      };

      mockEmployeeService.validateEmployeeId.mockRejectedValue(new Error('Database connection failed'));

      const result = await validateAttendanceRecordWithEmployee(validRecord, mockEmployeeService);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateAttendanceRecordsBatch', () => {
    test('should validate batch of mixed valid and invalid records', () => {
      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date(),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: -1,  // Invalid UID
          userid: 'jane.smith',
          timestamp: new Date(),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: 12347,
          userid: 'bob.wilson',
          timestamp: new Date(),
          state: AttendanceState.CHECK_OUT,
          type: AttendanceType.PUNCH_OUT
        }
      ];

      const result = validateAttendanceRecordsBatch(records);

      expect(result.totalProcessed).toBe(3);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.validRecords).toHaveLength(2);
      expect(result.invalidRecords).toHaveLength(1);
    });

    test('should handle empty batch', () => {
      const result = validateAttendanceRecordsBatch([]);

      expect(result.totalProcessed).toBe(0);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });
  });

  describe('sanitizeZKTAttendanceData', () => {
    test('should sanitize whitespace in userid', () => {
      const data = {
        userid: '  john.doe  with spaces  '
      };

      const sanitized = sanitizeZKTAttendanceData(data);

      expect((sanitized as any).userid).toBe('john.doe_with_spaces');
    });

    test('should convert string timestamp to Date', () => {
      const data = {
        timestamp: '2024-01-15T10:30:00Z'
      };

      const sanitized = sanitizeZKTAttendanceData(data);

      expect((sanitized as any).timestamp).toBeInstanceOf(Date);
    });

    test('should convert Unix timestamp seconds to Date', () => {
      const unixSeconds = Math.floor(Date.now() / 1000);
      const data = {
        timestamp: unixSeconds
      };

      const sanitized = sanitizeZKTAttendanceData(data);

      expect((sanitized as any).timestamp).toBeInstanceOf(Date);
    });

    test('should convert Unix timestamp milliseconds to Date', () => {
      const unixMs = Date.now();
      const data = {
        timestamp: unixMs
      };

      const sanitized = sanitizeZKTAttendanceData(data);

      expect((sanitized as any).timestamp).toBeInstanceOf(Date);
    });

    test('should convert string numbers to integers', () => {
      const data = {
        uid: '12345',
        state: '0',
        type: '1'
      };

      const sanitized = sanitizeZKTAttendanceData(data);

      expect((sanitized as any).uid).toBe(12345);
      expect((sanitized as any).state).toBe(0);
      expect((sanitized as any).type).toBe(1);
    });

    test('should handle null or undefined data', () => {
      expect(sanitizeZKTAttendanceData(null)).toBe(null);
      expect(sanitizeZKTAttendanceData(undefined)).toBe(undefined);
    });

    test('should handle non-object data', () => {
      expect(sanitizeZKTAttendanceData('string')).toBe('string');
      expect(sanitizeZKTAttendanceData(123)).toBe(123);
    });
  });

  describe('validateAttendanceSequence', () => {
    test('should validate proper check-in/check-out sequence', () => {
      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T17:00:00Z'),
          state: AttendanceState.CHECK_OUT,
          type: AttendanceType.PUNCH_OUT
        }
      ];

      const result = validateAttendanceSequence(records);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect duplicate records within 1 minute', () => {
      const baseTime = new Date('2024-01-15T09:00:00Z');
      const duplicateTime = new Date(baseTime.getTime() + 30000); // 30 seconds later

      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: baseTime,
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: duplicateTime,
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        }
      ];

      const result = validateAttendanceSequence(records);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Duplicate attendance record detected');
    });

    test('should detect consecutive check-out records', () => {
      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          state: AttendanceState.CHECK_OUT,
          type: AttendanceType.PUNCH_OUT
        },
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:30:00Z'),
          state: AttendanceState.CHECK_OUT,
          type: AttendanceType.PUNCH_OUT
        }
      ];

      const result = validateAttendanceSequence(records);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('consecutive check-out records');
    });

    test('should detect consecutive check-in records', () => {
      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:30:00Z'),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        }
      ];

      const result = validateAttendanceSequence(records);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('consecutive check-in records');
    });

    test('should handle multiple employees correctly', () => {
      const records = [
        {
          uid: 12345,
          userid: 'john.doe',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        },
        {
          uid: 12346,
          userid: 'jane.smith',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          state: AttendanceState.CHECK_IN,
          type: AttendanceType.PUNCH_IN
        }
      ];

      const result = validateAttendanceSequence(records);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});