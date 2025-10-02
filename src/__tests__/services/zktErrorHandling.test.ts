// Tests for ZKT SDK error handling and recovery scenarios
// Following architecture/testing-strategy.md backend testing patterns

import {
  ZKTErrorHandler,
  ZKTErrorCategory,
  ZKTErrorSeverity,
  CircuitBreakerState,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG
} from '../../utils/zktErrorHandler';
import { ZKTServiceResponse } from '../../../types/zkt';

describe('ZKTErrorHandler', () => {
  let errorHandler: ZKTErrorHandler;

  beforeEach(() => {
    errorHandler = new ZKTErrorHandler();
  });

  describe('categorizeError', () => {
    test('should categorize network errors correctly', () => {
      const networkErrors = [
        new Error('Connection refused'),
        new Error('Network timeout'),
        { code: 'ECONNREFUSED', message: 'Connection error' },
        { code: 'ENOTFOUND', message: 'Host not found' },
        { code: 'ENETUNREACH', message: 'Network unreachable' }
      ];

      for (const error of networkErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.NETWORK);
      }
    });

    test('should categorize timeout errors correctly', () => {
      const timeoutErrors = [
        new Error('Operation timed out'),
        new Error('Request timeout'),
        { code: 'ETIMEDOUT', message: 'Timeout error' }
      ];

      for (const error of timeoutErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.TIMEOUT);
      }
    });

    test('should categorize authentication errors correctly', () => {
      const authErrors = [
        new Error('Authentication failed'),
        new Error('Unauthorized access'),
        new Error('Invalid credentials'),
        new Error('Forbidden request')
      ];

      for (const error of authErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.AUTHENTICATION);
      }
    });

    test('should categorize device unavailable errors correctly', () => {
      const deviceErrors = [
        new Error('Device not found'),
        new Error('Device unavailable'),
        new Error('Device offline')
      ];

      for (const error of deviceErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.DEVICE_UNAVAILABLE);
      }
    });

    test('should categorize data corruption errors correctly', () => {
      const dataErrors = [
        new Error('Corrupt data received'),
        new Error('Invalid data format'),
        new Error('Malformed response'),
        new Error('Parse error')
      ];

      for (const error of dataErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.DATA_CORRUPTION);
      }
    });

    test('should categorize SDK errors correctly', () => {
      const sdkErrors = [
        new Error('zklib connection failed'),
        new Error('ZKT device error')
      ];

      for (const error of sdkErrors) {
        const category = errorHandler.categorizeError(error, 'zktOperation');
        expect(category).toBe(ZKTErrorCategory.SDK_ERROR);
      }
    });

    test('should categorize unknown errors as UNKNOWN', () => {
      const unknownErrors = [
        new Error('Some random error'),
        'String error',
        null,
        undefined
      ];

      for (const error of unknownErrors) {
        const category = errorHandler.categorizeError(error);
        expect(category).toBe(ZKTErrorCategory.UNKNOWN);
      }
    });
  });

  describe('determineSeverity', () => {
    test('should assign CRITICAL severity to authentication errors', () => {
      const severity = errorHandler.determineSeverity(ZKTErrorCategory.AUTHENTICATION);
      expect(severity).toBe(ZKTErrorSeverity.CRITICAL);
    });

    test('should assign CRITICAL severity to network errors after max retries', () => {
      const severity = errorHandler.determineSeverity(
        ZKTErrorCategory.NETWORK, 
        DEFAULT_RETRY_CONFIG.maxAttempts
      );
      expect(severity).toBe(ZKTErrorSeverity.CRITICAL);
    });

    test('should assign HIGH severity after half max retries', () => {
      const severity = errorHandler.determineSeverity(
        ZKTErrorCategory.TIMEOUT,
        Math.floor(DEFAULT_RETRY_CONFIG.maxAttempts / 2)
      );
      expect(severity).toBe(ZKTErrorSeverity.HIGH);
    });

    test('should assign MEDIUM severity to device unavailable errors', () => {
      const severity = errorHandler.determineSeverity(ZKTErrorCategory.DEVICE_UNAVAILABLE);
      expect(severity).toBe(ZKTErrorSeverity.MEDIUM);
    });

    test('should assign LOW severity to timeout errors', () => {
      const severity = errorHandler.determineSeverity(ZKTErrorCategory.TIMEOUT);
      expect(severity).toBe(ZKTErrorSeverity.LOW);
    });
  });

  describe('createEnhancedError', () => {
    test('should create enhanced error with correct properties', () => {
      const error = new Error('Test error');
      const enhancedError = errorHandler.createEnhancedError(
        error,
        'testOperation',
        'device-123',
        2,
        { key: 'value' }
      );

      expect(enhancedError.message).toBe('Test error');
      expect(enhancedError.operation).toBe('testOperation');
      expect(enhancedError.deviceId).toBe('device-123');
      expect(enhancedError.retryCount).toBe(2);
      expect(enhancedError.context).toEqual({ key: 'value' });
      expect(enhancedError.category).toBeDefined();
      expect(enhancedError.severity).toBeDefined();
      expect(typeof enhancedError.isRetryable).toBe('boolean');
    });

    test('should handle non-Error objects', () => {
      const enhancedError = errorHandler.createEnhancedError('String error');
      
      expect(enhancedError.message).toBe('String error');
      expect(enhancedError.category).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    test('should start in CLOSED state', () => {
      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
    });

    test('should allow operations in CLOSED state', () => {
      expect(errorHandler.isOperationAllowed()).toBe(true);
    });

    test('should open circuit after failure threshold', () => {
      // Record failures up to threshold
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        errorHandler.recordFailure();
      }

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitBreakerState.OPEN);
      expect(errorHandler.isOperationAllowed()).toBe(false);
    });

    test('should transition to HALF_OPEN after recovery timeout', async () => {
      // Configure with short recovery timeout for testing
      const testErrorHandler = new ZKTErrorHandler(
        {},
        { failureThreshold: 1, recoveryTimeoutMs: 100 }
      );

      // Trip the circuit
      testErrorHandler.recordFailure();
      expect(testErrorHandler.isOperationAllowed()).toBe(false);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should now allow operation (HALF_OPEN)
      expect(testErrorHandler.isOperationAllowed()).toBe(true);
    });

    test('should reset to CLOSED state on successful operation', () => {
      // Trip the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        errorHandler.recordFailure();
      }

      expect(errorHandler.getCircuitBreakerStatus().state).toBe(CircuitBreakerState.OPEN);

      // Record success
      errorHandler.recordSuccess();

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
    });

    test('should reset circuit breaker manually', () => {
      // Trip the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        errorHandler.recordFailure();
      }

      expect(errorHandler.getCircuitBreakerStatus().state).toBe(CircuitBreakerState.OPEN);

      // Manual reset
      errorHandler.resetCircuitBreaker();

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    test('should calculate exponential backoff delay', () => {
      const delay1 = errorHandler.calculateRetryDelay(0);
      const delay2 = errorHandler.calculateRetryDelay(1);
      const delay3 = errorHandler.calculateRetryDelay(2);

      // Should increase exponentially (with some jitter)
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    test('should cap delay at maximum', () => {
      const testErrorHandler = new ZKTErrorHandler({ maxDelayMs: 1000 });
      const delay = testErrorHandler.calculateRetryDelay(10);

      expect(delay).toBeLessThanOrEqual(1100); // Allow for jitter
    });
  });

  describe('executeWithRetry', () => {
    test('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ success: true, data: 'test' });

      const result = await errorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        'device-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({ success: true, data: 'test' });

      const result = await errorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        'device-123'
      );

      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    test('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Authentication failed'));

      const result = await errorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        'device-123'
      );

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const result = await errorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        'device-123'
      );

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
    });

    test('should respect circuit breaker', async () => {
      // Configure with low failure threshold
      const testErrorHandler = new ZKTErrorHandler({}, { failureThreshold: 1 });
      const mockOperation = jest.fn().mockRejectedValue(new Error('Connection failed'));

      // First call should fail and trip circuit
      await testErrorHandler.executeWithRetry(mockOperation, 'testOperation', 'device-123');

      // Second call should fail fast due to circuit breaker
      const result = await testErrorHandler.executeWithRetry(
        mockOperation, 
        'testOperation', 
        'device-123'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is open');
    });

    test('should handle service response errors', async () => {
      const mockOperation = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          timestamp: new Date()
        }
      });

      const result = await errorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        'device-123'
      );

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
    });
  });

  describe('Error Notifications', () => {
    test('should log critical errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const testErrorHandler = new ZKTErrorHandler(
        {},
        {},
        { enableNotifications: true, notificationMethods: ['log'] }
      );

      const mockOperation = jest.fn().mockRejectedValue(new Error('Authentication failed'));

      await testErrorHandler.executeWithRetry(mockOperation, 'testOperation', 'device-123');

      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});