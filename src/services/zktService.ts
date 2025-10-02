// ZKT Service - SDK wrapper following service architecture patterns
// Following architecture/coding-standards.md service patterns

import ZKLib from 'node-zklib';
import { 
  ZKTConnectionConfig, 
  ZKTConnectionStatus, 
  ZKTDeviceInfo, 
  ZKTUser, 
  ZKTAttendanceLog,
  ZKTConnectionTest,
  ZKTError,
  ZKTServiceResponse,
  ZKTHealthCheck,
  ZKTOperationConfig,
  ZKTServiceMetrics
} from '../../types/zkt';
import { 
  ZKTErrorHandler, 
  defaultZKTErrorHandler,
  EnhancedZKTError,
  formatErrorForLogging
} from '../utils/zktErrorHandler';
import { 
  validateAttendanceRecordsBatch
} from '../validators/attendanceValidator';
import { EmployeeValidationService } from './employeeValidationService';

/**
 * ZKTService - Enhanced service layer abstraction for ZKTeco device communication
 * Provides connection management, health checks, data retrieval with robust error handling
 */
export class ZKTService {
  private zkInstance: unknown;
  private config: ZKTConnectionConfig;
  private isConnected: boolean = false;
  private lastError: EnhancedZKTError | null = null;
  private errorHandler: ZKTErrorHandler;
  private employeeValidationService?: EmployeeValidationService;
  private operationConfig: ZKTOperationConfig;
  private metrics: ZKTServiceMetrics;

  constructor(
    config: ZKTConnectionConfig,
    operationConfig: ZKTOperationConfig = {},
    errorHandler: ZKTErrorHandler = defaultZKTErrorHandler,
    employeeValidationService?: EmployeeValidationService
  ) {
    this.config = config;
    this.operationConfig = {
      enableRetry: true,
      enableCircuitBreaker: true,
      enableValidation: true,
      timeout: 5000,
      ...operationConfig
    };
    this.errorHandler = errorHandler;
    this.employeeValidationService = employeeValidationService;
    
    // Initialize metrics
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      circuitBreakerTrips: 0
    };
    
    this.zkInstance = new ZKLib(
      config.ip, 
      config.port, 
      this.operationConfig.timeout || 5000, 
      config.inport || 5000
    );
  }

  /**
   * Establish connection to ZKT device with enhanced error handling
   */
  async connect(): Promise<ZKTServiceResponse<ZKTConnectionStatus>> {
    const deviceId = `${this.config.ip}:${this.config.port}`;
    const startTime = Date.now();
    
    const operation = async (): Promise<ZKTServiceResponse<ZKTConnectionStatus>> => {
      try {
        await this.zkInstance.createSocket();
        this.isConnected = true;
        this.lastError = null;

        const deviceInfo = await this.getDeviceInfo();
        
        return {
          success: true,
          data: {
            isConnected: true,
            deviceInfo: deviceInfo.data,
            lastConnected: new Date()
          }
        };
      } catch (error) {
        this.isConnected = false;
        const enhancedError = this.errorHandler.createEnhancedError(
          error,
          'connect',
          deviceId,
          0,
          { ip: this.config.ip, port: this.config.port }
        );
        this.lastError = enhancedError;

        return {
          success: false,
          error: enhancedError
        };
      }
    };

    // Execute with retry logic if enabled
    let result: ZKTServiceResponse<ZKTConnectionStatus>;
    
    if (this.operationConfig.enableRetry && this.operationConfig.enableCircuitBreaker) {
      result = await this.errorHandler.executeWithRetry(
        operation,
        'connect',
        deviceId,
        { ip: this.config.ip, port: this.config.port }
      );
    } else {
      result = await operation();
    }

    // Update metrics
    this.updateMetrics(startTime, result.success);
    
    if (!result.success && result.error) {
      console.error(`ZKT Connection Failed: ${formatErrorForLogging(result.error as EnhancedZKTError)}`);
    }

    return result;
  }

  /**
   * Disconnect from ZKT device
   */
  async disconnect(): Promise<ZKTServiceResponse<boolean>> {
    try {
      if (this.zkInstance && this.isConnected) {
        await this.zkInstance.disconnect();
      }
      this.isConnected = false;
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const zktError: ZKTError = {
        code: 'DISCONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown disconnection error',
        timestamp: new Date()
      };

      return {
        success: false,
        error: zktError
      };
    }
  }

  /**
   * Test connection to ZKT device with timeout handling
   */
  async testConnection(): Promise<ZKTConnectionTest> {
    const startTime = Date.now();
    
    try {
      const connectionResult = await this.connect();
      const responseTime = Date.now() - startTime;
      
      if (connectionResult.success && connectionResult.data) {
        await this.disconnect();
        return {
          success: true,
          message: 'Connection successful',
          responseTime,
          deviceInfo: connectionResult.data.deviceInfo
        };
      } else {
        return {
          success: false,
          message: connectionResult.error?.message || 'Connection failed',
          responseTime,
          error: connectionResult.error
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const zktError: ZKTError = {
        code: 'TEST_CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date()
      };

      return {
        success: false,
        message: zktError.message,
        responseTime,
        error: zktError
      };
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<ZKTServiceResponse<ZKTDeviceInfo>> {
    if (!this.isConnected) {
      return {
        success: false,
        error: {
          code: 'NOT_CONNECTED',
          message: 'Device not connected',
          timestamp: new Date()
        }
      };
    }

    try {
      const info = await this.zkInstance.getInfo();
      
      const deviceInfo: ZKTDeviceInfo = {
        name: info.name,
        serialNumber: info.serialNumber,
        deviceId: info.deviceId,
        firmwareVersion: info.firmwareVersion,
        platform: info.platform,
        fingerCount: info.fingerCount,
        recordCount: info.recordCount,
        userCount: info.userCount,
        adminCount: info.adminCount,
        passwordCount: info.passwordCount,
        oplogCount: info.oplogCount,
        capacity: info.capacity
      };

      return {
        success: true,
        data: deviceInfo
      };
    } catch (error) {
      const zktError: ZKTError = {
        code: 'GET_INFO_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get device info',
        timestamp: new Date()
      };

      return {
        success: false,
        error: zktError
      };
    }
  }

  /**
   * Get users from device
   */
  async getUsers(): Promise<ZKTServiceResponse<ZKTUser[]>> {
    if (!this.isConnected) {
      return {
        success: false,
        error: {
          code: 'NOT_CONNECTED',
          message: 'Device not connected',
          timestamp: new Date()
        }
      };
    }

    try {
      const users = await this.zkInstance.getUsers();
      
      const zktUsers: ZKTUser[] = users.data.map((user: { uid: number; userid: string; name: string; password?: string; role?: number; cardno?: number }) => ({
        uid: user.uid,
        userid: user.userid,
        name: user.name,
        password: user.password,
        role: user.role,
        cardno: user.cardno
      }));

      return {
        success: true,
        data: zktUsers
      };
    } catch (error) {
      const zktError: ZKTError = {
        code: 'GET_USERS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get users',
        timestamp: new Date()
      };

      return {
        success: false,
        error: zktError
      };
    }
  }

  /**
   * Get attendance logs from device
   */
  async getAttendanceLogs(): Promise<ZKTServiceResponse<ZKTAttendanceLog[]>> {
    if (!this.isConnected) {
      return {
        success: false,
        error: {
          code: 'NOT_CONNECTED',
          message: 'Device not connected',
          timestamp: new Date()
        }
      };
    }

    try {
      const logs = await this.zkInstance.getAttendances();
      
      const attendanceLogs: ZKTAttendanceLog[] = logs.data.map((log: { uid: number; userid: string; timestamp: number; state: number; type: number }) => ({
        uid: log.uid,
        userid: log.userid,
        timestamp: new Date(log.timestamp),
        state: log.state,
        type: log.type
      }));

      return {
        success: true,
        data: attendanceLogs
      };
    } catch (error) {
      const zktError: ZKTError = {
        code: 'GET_ATTENDANCE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get attendance logs',
        timestamp: new Date()
      };

      return {
        success: false,
        error: zktError
      };
    }
  }

  /**
   * Health check with status monitoring
   */
  async healthCheck(): Promise<ZKTHealthCheck> {
    const startTime = Date.now();
    const deviceId = `${this.config.ip}:${this.config.port}`;

    try {
      const testResult = await this.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        deviceId,
        status: testResult.success ? 'connected' : 'error',
        lastCheck: new Date(),
        responseTime,
        error: testResult.error?.message
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        deviceId,
        status: 'error',
        lastCheck: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ZKTConnectionStatus {
    return {
      isConnected: this.isConnected,
      lastConnected: this.isConnected ? new Date() : undefined,
      error: this.lastError?.message
    };
  }

  /**
   * Get device configuration
   */
  getConfig(): ZKTConnectionConfig {
    return { ...this.config };
  }

  /**
   * Get validated attendance logs with employee validation
   */
  async getValidatedAttendanceLogs(): Promise<ZKTServiceResponse<{
    validRecords: unknown[];
    invalidRecords: unknown[];
    validationSummary: {
      totalProcessed: number;
      validCount: number;
      invalidCount: number;
    };
  }>> {
    const deviceId = `${this.config.ip}:${this.config.port}`;
    const startTime = Date.now();

    try {
      // First get the raw attendance logs
      const logsResult = await this.getAttendanceLogs();
      
      if (!logsResult.success || !logsResult.data) {
        this.updateMetrics(startTime, false);
        return {
          success: false,
          error: logsResult.error || this.errorHandler.createEnhancedError(
            new Error('Failed to retrieve attendance logs'),
            'getValidatedAttendanceLogs',
            deviceId
          )
        };
      }

      // Validate attendance records if validation is enabled
      if (this.operationConfig.enableValidation) {
        const validationResult = validateAttendanceRecordsBatch(logsResult.data);
        
        this.updateMetrics(startTime, true);
        
        return {
          success: true,
          data: {
            validRecords: validationResult.validRecords,
            invalidRecords: validationResult.invalidRecords,
            validationSummary: {
              totalProcessed: validationResult.totalProcessed,
              validCount: validationResult.validCount,
              invalidCount: validationResult.invalidCount
            }
          }
        };
      } else {
        // Return all records as valid if validation is disabled
        this.updateMetrics(startTime, true);
        
        return {
          success: true,
          data: {
            validRecords: logsResult.data,
            invalidRecords: [],
            validationSummary: {
              totalProcessed: logsResult.data.length,
              validCount: logsResult.data.length,
              invalidCount: 0
            }
          }
        };
      }
    } catch (error) {
      this.updateMetrics(startTime, false);
      
      const enhancedError = this.errorHandler.createEnhancedError(
        error,
        'getValidatedAttendanceLogs',
        deviceId
      );
      
      console.error(`ZKT Validation Failed: ${formatErrorForLogging(enhancedError)}`);
      
      return {
        success: false,
        error: enhancedError
      };
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): ZKTServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get error handler status
   */
  getErrorHandlerStatus(): {
    circuitBreaker: ReturnType<ZKTErrorHandler['getCircuitBreakerStatus']>;
    lastError?: EnhancedZKTError;
  } {
    return {
      circuitBreaker: this.errorHandler.getCircuitBreakerStatus(),
      lastError: this.lastError || undefined
    };
  }

  /**
   * Reset error handler and metrics
   */
  resetErrorHandler(): void {
    this.errorHandler.resetCircuitBreaker();
    this.lastError = null;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      circuitBreakerTrips: 0
    };
  }

  /**
   * Update service metrics
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    this.metrics.totalOperations++;
    this.metrics.lastOperationTime = new Date();
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
      
      // Check if it's a circuit breaker trip
      const status = this.errorHandler.getCircuitBreakerStatus();
      if (status.state === 'OPEN') {
        this.metrics.circuitBreakerTrips++;
      }
    }
    
    // Update average response time using exponential moving average
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * 0.7) + (responseTime * 0.3);
    }
  }

  /**
   * Set employee validation service
   */
  setEmployeeValidationService(service: EmployeeValidationService): void {
    this.employeeValidationService = service;
  }

  /**
   * Update operation configuration
   */
  updateOperationConfig(config: Partial<ZKTOperationConfig>): void {
    this.operationConfig = { ...this.operationConfig, ...config };
  }
}