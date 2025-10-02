export enum AuditEventType {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    // In production, this would write to a database table
    // For now, we'll use console logging with structured data
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    
    // Log to console in structured format
    console.log(JSON.stringify({
      level: entry.success ? "info" : "warn",
      type: "AUDIT",
      ...logEntry,
    }));
    
    // In a real implementation, save to database:
    // await prisma.auditLog.create({
    //   data: {
    //     eventType: entry.eventType,
    //     userId: entry.userId,
    //     email: entry.email,
    //     ipAddress: entry.ipAddress,
    //     userAgent: entry.userAgent,
    //     metadata: entry.metadata,
    //     success: entry.success,
    //     createdAt: new Date(),
    //   },
    // });
    
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error("Failed to write audit log:", error);
  }
}

// Helper function to log failed login attempts
export async function logFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
) {
  await logAuditEvent({
    eventType: AuditEventType.LOGIN_FAILED,
    email,
    ipAddress,
    userAgent,
    metadata: { reason },
    success: false,
  });
}

// Helper function to log successful login
export async function logSuccessfulLogin(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logAuditEvent({
    eventType: AuditEventType.LOGIN_SUCCESS,
    userId,
    email,
    ipAddress,
    userAgent,
    success: true,
  });
}

// Helper function to log rate limit exceeded
export async function logRateLimitExceeded(
  identifier: string,
  ipAddress?: string,
  endpoint?: string
) {
  await logAuditEvent({
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
    ipAddress,
    metadata: { identifier, endpoint },
    success: false,
  });
}