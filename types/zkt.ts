// ZKTeco device connection and management types
// Following architecture/coding-standards.md type sharing patterns

// Basic SDK connection configuration
export interface ZKTConnectionConfig {
  ip: string
  port: number
  timeout?: number
  inport?: number
}

// Device connection status
export interface ZKTConnectionStatus {
  isConnected: boolean
  deviceInfo?: ZKTDeviceInfo
  lastConnected?: Date
  error?: string
}

// Device information from ZKT machine
export interface ZKTDeviceInfo {
  name?: string
  serialNumber?: string
  deviceId?: string
  firmwareVersion?: string
  platform?: string
  fingerCount?: number
  recordCount?: number
  userCount?: number
  adminCount?: number
  passwordCount?: number
  oplogCount?: number
  capacity?: number
}

// User data from ZKT device
export interface ZKTUser {
  uid: number
  userid: string
  name: string
  password?: string
  role?: number
  cardno?: number
}

// Attendance log data
export interface ZKTAttendanceLog {
  uid: number
  userid: string
  timestamp: Date
  state: number // 0=Check-In, 1=Check-Out, etc.
  type: number // Verification type
}

// Connection test result
export interface ZKTConnectionTest {
  success: boolean
  message: string
  responseTime?: number
  deviceInfo?: ZKTDeviceInfo
  error?: ZKTError
}

// ZKT specific error interface
export interface ZKTError {
  code: string
  message: string
  details?: string
  timestamp: Date
}

// Service response wrapper
export interface ZKTServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ZKTError
}

// Health check result
export interface ZKTHealthCheck {
  deviceId: string
  status: 'connected' | 'disconnected' | 'error'
  lastCheck: Date
  responseTime?: number
  error?: string
}

// Enhanced types for error handling and validation
export interface ZKTOperationConfig {
  enableRetry?: boolean
  enableCircuitBreaker?: boolean
  enableValidation?: boolean
  timeout?: number
}

// ZKT Service metrics for monitoring
export interface ZKTServiceMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageResponseTime: number
  circuitBreakerTrips: number
  lastOperationTime?: Date
}