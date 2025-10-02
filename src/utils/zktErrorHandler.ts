// ZKT Error Handling Utility
// Following architecture/error-handling-strategy.md patterns

import { ZKTError, ZKTServiceResponse } from '../../types/zkt';

// Error categories for ZKT operations
export enum ZKTErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION', 
  TIMEOUT = 'TIMEOUT',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  DEVICE_UNAVAILABLE = 'DEVICE_UNAVAILABLE',
  SDK_ERROR = 'SDK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ZKTErrorSeverity {
  LOW = 'LOW',        // Non-critical errors, can continue operation
  MEDIUM = 'MEDIUM',  // Moderate errors, may affect some functionality
  HIGH = 'HIGH',      // Serious errors, affects major functionality
  CRITICAL = 'CRITICAL' // Critical errors, requires immediate attention
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ZKTErrorCategory[];
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringWindowMs: number;
}

// Circuit breaker state
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit tripped, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

// Error notification configuration
export interface ErrorNotificationConfig {
  enableNotifications: boolean;
  criticalErrorThreshold: number;
  notificationCooldownMs: number;
  notificationMethods: ('log' | 'email' | 'webhook')[];
}

// Enhanced ZKT error with additional metadata
export interface EnhancedZKTError extends ZKTError {
  category: ZKTErrorCategory;
  severity: ZKTErrorSeverity;
  isRetryable: boolean;
  retryCount?: number;
  deviceId?: string;
  operation?: string;
  context?: Record<string, unknown>;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    ZKTErrorCategory.NETWORK,
    ZKTErrorCategory.TIMEOUT,
    ZKTErrorCategory.DEVICE_UNAVAILABLE
  ]
};

// Default circuit breaker configuration
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  monitoringWindowMs: 60000
};

// Default error notification configuration
export const DEFAULT_NOTIFICATION_CONFIG: ErrorNotificationConfig = {
  enableNotifications: true,
  criticalErrorThreshold: 3,
  notificationCooldownMs: 300000, // 5 minutes
  notificationMethods: ['log']
};

export class ZKTErrorHandler {
  private retryConfig: RetryConfig;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private notificationConfig: ErrorNotificationConfig;
  
  // Circuit breaker state tracking
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastNotificationTime: number = 0;
  
  constructor(
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
    notificationConfig: Partial<ErrorNotificationConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.circuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig };
    this.notificationConfig = { ...DEFAULT_NOTIFICATION_CONFIG, ...notificationConfig };
  }

  /**
   * Categorize error based on message and context
   */
  categorizeError(error: unknown, operation?: string): ZKTErrorCategory {
    if (!error) return ZKTErrorCategory.UNKNOWN;
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const errorCode = (error as { code?: string })?.code?.toLowerCase();
    
    // SDK-specific errors (check first before generic network errors)
    if (errorMessage.includes('zklib') ||
        errorMessage.includes('zkt') ||
        operation?.includes('zkt')) {
      return ZKTErrorCategory.SDK_ERROR;
    }
    
    // Network-related errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('socket') ||
        errorCode?.includes('econnrefused') ||
        errorCode?.includes('enotfound') ||
        errorCode?.includes('enetunreach')) {
      return ZKTErrorCategory.NETWORK;
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('timed out') ||
        errorCode?.includes('etimedout')) {
      return ZKTErrorCategory.TIMEOUT;
    }
    
    // Authentication errors
    if (errorMessage.includes('auth') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('credentials')) {
      return ZKTErrorCategory.AUTHENTICATION;
    }
    
    // Device unavailable
    if (errorMessage.includes('device') ||
        errorMessage.includes('unavailable') ||
        errorMessage.includes('offline') ||
        errorMessage.includes('not found')) {
      return ZKTErrorCategory.DEVICE_UNAVAILABLE;
    }
    
    // Data corruption
    if (errorMessage.includes('corrupt') ||
        errorMessage.includes('invalid data') ||
        errorMessage.includes('malformed') ||
        errorMessage.includes('parse')) {
      return ZKTErrorCategory.DATA_CORRUPTION;
    }
    
    
    return ZKTErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  determineSeverity(category: ZKTErrorCategory, retryCount: number = 0): ZKTErrorSeverity {
    // Critical errors that require immediate attention
    if (category === ZKTErrorCategory.AUTHENTICATION || 
        (category === ZKTErrorCategory.NETWORK && retryCount >= this.retryConfig.maxAttempts)) {
      return ZKTErrorSeverity.CRITICAL;
    }
    
    // High severity for repeated failures
    if (retryCount >= Math.floor(this.retryConfig.maxAttempts / 2)) {
      return ZKTErrorSeverity.HIGH;
    }
    
    // Medium severity for device and data issues
    if (category === ZKTErrorCategory.DEVICE_UNAVAILABLE ||
        category === ZKTErrorCategory.DATA_CORRUPTION) {
      return ZKTErrorSeverity.MEDIUM;
    }
    
    // Low severity for transient issues
    if (category === ZKTErrorCategory.TIMEOUT ||
        category === ZKTErrorCategory.NETWORK) {
      return ZKTErrorSeverity.LOW;
    }
    
    return ZKTErrorSeverity.MEDIUM;
  }

  /**
   * Create enhanced error with categorization and metadata
   */
  createEnhancedError(
    error: unknown,
    operation?: string,
    deviceId?: string,
    retryCount?: number,
    context?: Record<string, unknown>
  ): EnhancedZKTError {
    const category = this.categorizeError(error, operation);
    const severity = this.determineSeverity(category, retryCount);
    const isRetryable = this.retryConfig.retryableErrors.includes(category);
    
    const baseError: ZKTError = error instanceof Error ? {
      code: (error as { code?: string }).code || category,
      message: error.message,
      timestamp: new Date()
    } : {
      code: category,
      message: String(error),
      timestamp: new Date()
    };

    return {
      ...baseError,
      category,
      severity,
      isRetryable,
      retryCount,
      deviceId,
      operation,
      context
    };
  }

  /**
   * Check if circuit breaker allows operation
   */
  isOperationAllowed(): boolean {
    const now = Date.now();
    
    switch (this.circuitBreakerState) {
      case CircuitBreakerState.CLOSED:
        return true;
        
      case CircuitBreakerState.OPEN:
        // Check if recovery timeout has passed
        if (now - this.lastFailureTime >= this.circuitBreakerConfig.recoveryTimeoutMs) {
          this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
          return true;
        }
        return false;
        
      case CircuitBreakerState.HALF_OPEN:
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Record operation success (for circuit breaker)
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
  }

  /**
   * Record operation failure (for circuit breaker)
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelayMs
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<ZKTServiceResponse<T>>,
    operationName: string,
    deviceId?: string,
    context?: Record<string, unknown>
  ): Promise<ZKTServiceResponse<T>> {
    // Check circuit breaker
    if (!this.isOperationAllowed()) {
      const error = this.createEnhancedError(
        new Error('Circuit breaker is open'),
        operationName,
        deviceId,
        0,
        context
      );
      
      return {
        success: false,
        error
      };
    }

    let lastError: EnhancedZKTError | undefined;
    
    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (result.success) {
          this.recordSuccess();
          return result;
        } else if (result.error) {
          const enhancedError = this.createEnhancedError(
            result.error,
            operationName,
            deviceId,
            attempt,
            context
          );
          
          lastError = enhancedError;
          
          // Don't retry if error is not retryable
          if (!enhancedError.isRetryable) {
            this.recordFailure();
            await this.handleErrorNotification(enhancedError);
            break;
          }
          
          // Don't retry on last attempt
          if (attempt === this.retryConfig.maxAttempts - 1) {
            this.recordFailure();
            await this.handleErrorNotification(enhancedError);
            break;
          }
          
          // Wait before retry
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        } else {
          // Handle case where result is not successful but has no error
          const enhancedError = this.createEnhancedError(
            new Error('Unknown operation failure'),
            operationName,
            deviceId,
            attempt,
            context
          );
          
          lastError = enhancedError;
          
          // Don't retry on last attempt
          if (attempt === this.retryConfig.maxAttempts - 1) {
            this.recordFailure();
            await this.handleErrorNotification(enhancedError);
            break;
          }
          
          // Wait before retry
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      } catch (error) {
        const enhancedError = this.createEnhancedError(
          error,
          operationName,
          deviceId,
          attempt,
          context
        );
        
        lastError = enhancedError;
        
        // Don't retry if error is not retryable
        if (!enhancedError.isRetryable) {
          this.recordFailure();
          await this.handleErrorNotification(enhancedError);
          break;
        }
        
        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts - 1) {
          this.recordFailure();
          await this.handleErrorNotification(enhancedError);
          break;
        }
        
        // Wait before retry
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError || this.createEnhancedError(
        new Error('Unknown error occurred'),
        operationName,
        deviceId,
        this.retryConfig.maxAttempts,
        context
      )
    };
  }

  /**
   * Handle error notifications
   */
  private async handleErrorNotification(error: EnhancedZKTError): Promise<void> {
    if (!this.notificationConfig.enableNotifications ||
        error.severity !== ZKTErrorSeverity.CRITICAL) {
      return;
    }

    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastNotificationTime < this.notificationConfig.notificationCooldownMs) {
      return;
    }

    this.lastNotificationTime = now;

    // Send notifications based on configuration
    for (const method of this.notificationConfig.notificationMethods) {
      switch (method) {
        case 'log':
          console.error('ZKT Critical Error:', {
            error: error.message,
            category: error.category,
            deviceId: error.deviceId,
            operation: error.operation,
            timestamp: error.timestamp,
            context: error.context
          });
          break;
          
        case 'email':
          // TODO: Implement email notification
          console.log('Email notification would be sent for critical ZKT error');
          break;
          
        case 'webhook':
          // TODO: Implement webhook notification
          console.log('Webhook notification would be sent for critical ZKT error');
          break;
      }
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime?: Date;
  } {
    return {
      state: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : undefined
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default error handler instance
export const defaultZKTErrorHandler = new ZKTErrorHandler();

// Helper functions for common error handling patterns
export function isRetryableError(error: EnhancedZKTError): boolean {
  return error.isRetryable && (error.retryCount || 0) < DEFAULT_RETRY_CONFIG.maxAttempts;
}

export function isNetworkError(error: EnhancedZKTError): boolean {
  return error.category === ZKTErrorCategory.NETWORK;
}

export function isCriticalError(error: EnhancedZKTError): boolean {
  return error.severity === ZKTErrorSeverity.CRITICAL;
}

export function formatErrorForLogging(error: EnhancedZKTError): string {
  return `[${error.category}] ${error.severity}: ${error.message} (Device: ${error.deviceId || 'unknown'}, Operation: ${error.operation || 'unknown'})`;
}