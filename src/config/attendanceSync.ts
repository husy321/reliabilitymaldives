// Attendance Sync Configuration - Environment-based config following architecture patterns
// Following architecture/coding-standards.md environment variable patterns

import { 
  JobScheduleConfig, 
  ZKTMachineConfig, 
  AttendanceSyncSystemConfig 
} from '../../types/attendanceJobs';

/**
 * Default ZKT machine configurations
 * These should be overridden by environment variables in production
 */
const defaultZKTMachines: ZKTMachineConfig[] = [
  {
    id: 'zkt_main_01',
    name: 'Main Office - Entry',
    ip: process.env.ZKT_MAIN_IP || '192.168.1.100',
    port: parseInt(process.env.ZKT_MAIN_PORT || '4370'),
    enabled: process.env.ZKT_MAIN_ENABLED !== 'false',
    priority: 1
  },
  {
    id: 'zkt_warehouse_01',
    name: 'Warehouse - Entry',
    ip: process.env.ZKT_WAREHOUSE_IP || '192.168.1.101',
    port: parseInt(process.env.ZKT_WAREHOUSE_PORT || '4370'),
    enabled: process.env.ZKT_WAREHOUSE_ENABLED !== 'false',
    priority: 2
  }
];

/**
 * Default job scheduling configuration
 */
const defaultScheduleConfig: JobScheduleConfig = {
  enabled: process.env.ATTENDANCE_SYNC_ENABLED !== 'false',
  cronExpression: process.env.ATTENDANCE_SYNC_CRON || '0 6 * * *', // 6 AM daily
  timezone: process.env.ATTENDANCE_SYNC_TIMEZONE || 'Asia/Maldives',
  autoRetry: process.env.ATTENDANCE_SYNC_AUTO_RETRY !== 'false',
  maxRetries: parseInt(process.env.ATTENDANCE_SYNC_MAX_RETRIES || '3'),
  retryDelayMinutes: parseInt(process.env.ATTENDANCE_SYNC_RETRY_DELAY || '15'),
  alertOnFailure: process.env.ATTENDANCE_SYNC_ALERT_ON_FAILURE !== 'false',
  alertRecipients: (process.env.ATTENDANCE_SYNC_ALERT_RECIPIENTS || '')
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0)
};

/**
 * Complete attendance sync system configuration
 */
export const attendanceSyncConfig: AttendanceSyncSystemConfig = {
  scheduling: defaultScheduleConfig,
  machines: defaultZKTMachines,
  defaults: {
    batchSize: parseInt(process.env.ATTENDANCE_SYNC_BATCH_SIZE || '100'),
    timeoutMs: parseInt(process.env.ATTENDANCE_SYNC_TIMEOUT_MS || '30000'),
    enableValidation: process.env.ATTENDANCE_SYNC_VALIDATION !== 'false',
    enableDeduplication: process.env.ATTENDANCE_SYNC_DEDUPLICATION !== 'false',
    maxRetries: parseInt(process.env.ATTENDANCE_SYNC_MAX_RETRIES || '3'),
    retryDelayMinutes: parseInt(process.env.ATTENDANCE_SYNC_RETRY_DELAY || '15')
  },
  notifications: {
    enabled: process.env.ATTENDANCE_NOTIFICATIONS_ENABLED !== 'false',
    channels: (process.env.ATTENDANCE_NOTIFICATION_CHANNELS || 'EMAIL')
      .split(',')
      .map(channel => channel.trim().toUpperCase())
      .filter(channel => ['EMAIL', 'SLACK', 'WEBHOOK'].includes(channel)) as ('EMAIL' | 'SLACK' | 'WEBHOOK')[],
    recipients: (process.env.ATTENDANCE_NOTIFICATION_RECIPIENTS || '')
      .split(',')
      .map(recipient => recipient.trim())
      .filter(recipient => recipient.length > 0),
    webhookUrl: process.env.ATTENDANCE_NOTIFICATION_WEBHOOK_URL
  }
};

/**
 * Validation helper to ensure configuration is valid
 */
export function validateAttendanceSyncConfig(config: AttendanceSyncSystemConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate scheduling
  if (!config.scheduling.cronExpression) {
    errors.push('Cron expression is required for scheduling');
  }

  if (config.scheduling.maxRetries < 0 || config.scheduling.maxRetries > 10) {
    errors.push('Max retries must be between 0 and 10');
  }

  if (config.scheduling.retryDelayMinutes < 1 || config.scheduling.retryDelayMinutes > 60) {
    errors.push('Retry delay must be between 1 and 60 minutes');
  }

  // Validate machines
  if (config.machines.length === 0) {
    errors.push('At least one ZKT machine must be configured');
  }

  const enabledMachines = config.machines.filter(m => m.enabled);
  if (enabledMachines.length === 0) {
    errors.push('At least one ZKT machine must be enabled');
  }

  for (const machine of config.machines) {
    if (!machine.id || !machine.name || !machine.ip) {
      errors.push(`Machine ${machine.id || 'unknown'} missing required fields`);
    }

    if (machine.port < 1 || machine.port > 65535) {
      errors.push(`Machine ${machine.id} has invalid port number`);
    }

    // Basic IP validation
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(machine.ip)) {
      errors.push(`Machine ${machine.id} has invalid IP address format`);
    }
  }

  // Validate defaults
  if (config.defaults.batchSize < 1 || config.defaults.batchSize > 1000) {
    errors.push('Batch size must be between 1 and 1000');
  }

  if (config.defaults.timeoutMs < 1000 || config.defaults.timeoutMs > 300000) {
    errors.push('Timeout must be between 1000ms and 300000ms (5 minutes)');
  }

  // Validate notifications
  if (config.notifications.enabled) {
    if (config.notifications.channels.length === 0) {
      errors.push('At least one notification channel must be specified when notifications are enabled');
    }

    if (config.notifications.channels.includes('WEBHOOK') && !config.notifications.webhookUrl) {
      errors.push('Webhook URL is required when webhook notifications are enabled');
    }

    if (config.notifications.channels.includes('EMAIL') && config.notifications.recipients.length === 0) {
      errors.push('Email recipients are required when email notifications are enabled');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get ZKT machine configuration by ID
 */
export function getZKTMachineConfig(machineId: string): ZKTMachineConfig | undefined {
  return attendanceSyncConfig.machines.find(m => m.id === machineId);
}

/**
 * Get enabled ZKT machines sorted by priority
 */
export function getEnabledZKTMachines(): ZKTMachineConfig[] {
  return attendanceSyncConfig.machines
    .filter(m => m.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Check if scheduling is enabled and valid
 */
export function isSchedulingEnabled(): boolean {
  const validation = validateAttendanceSyncConfig(attendanceSyncConfig);
  return attendanceSyncConfig.scheduling.enabled && validation.isValid;
}

/**
 * Get next scheduled run time based on cron expression
 */
export function getNextScheduledRun(cronExpression?: string): Date {
  // This would use a cron library like 'node-cron' or 'cron-parser'
  // For now, return next day at 6 AM as placeholder
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  return tomorrow;
}

/**
 * Environment variable documentation
 * This helps with deployment and configuration management
 */
export const environmentVariables = {
  // ZKT Machine Configuration
  ZKT_MAIN_IP: 'IP address for main ZKT device (default: 192.168.1.100)',
  ZKT_MAIN_PORT: 'Port for main ZKT device (default: 4370)',
  ZKT_MAIN_ENABLED: 'Enable main ZKT device (default: true)',
  ZKT_WAREHOUSE_IP: 'IP address for warehouse ZKT device (default: 192.168.1.101)',
  ZKT_WAREHOUSE_PORT: 'Port for warehouse ZKT device (default: 4370)',
  ZKT_WAREHOUSE_ENABLED: 'Enable warehouse ZKT device (default: true)',

  // Scheduling Configuration
  ATTENDANCE_SYNC_ENABLED: 'Enable automatic attendance sync (default: true)',
  ATTENDANCE_SYNC_CRON: 'Cron expression for sync schedule (default: "0 6 * * *")',
  ATTENDANCE_SYNC_TIMEZONE: 'Timezone for scheduling (default: Asia/Maldives)',
  ATTENDANCE_SYNC_AUTO_RETRY: 'Enable automatic retry on failure (default: true)',
  ATTENDANCE_SYNC_MAX_RETRIES: 'Maximum retry attempts (default: 3)',
  ATTENDANCE_SYNC_RETRY_DELAY: 'Delay between retries in minutes (default: 15)',

  // Processing Configuration
  ATTENDANCE_SYNC_BATCH_SIZE: 'Records to process per batch (default: 100)',
  ATTENDANCE_SYNC_TIMEOUT_MS: 'Operation timeout in milliseconds (default: 30000)',
  ATTENDANCE_SYNC_VALIDATION: 'Enable data validation (default: true)',
  ATTENDANCE_SYNC_DEDUPLICATION: 'Enable duplicate prevention (default: true)',

  // Notification Configuration
  ATTENDANCE_SYNC_ALERT_ON_FAILURE: 'Send alerts on sync failure (default: true)',
  ATTENDANCE_SYNC_ALERT_RECIPIENTS: 'Comma-separated email addresses for alerts',
  ATTENDANCE_NOTIFICATIONS_ENABLED: 'Enable all notifications (default: true)',
  ATTENDANCE_NOTIFICATION_CHANNELS: 'Comma-separated notification channels (EMAIL,SLACK,WEBHOOK)',
  ATTENDANCE_NOTIFICATION_RECIPIENTS: 'Comma-separated notification recipients',
  ATTENDANCE_NOTIFICATION_WEBHOOK_URL: 'Webhook URL for notifications'
};

// Export for use in other parts of the application
export { 
  defaultZKTMachines, 
  defaultScheduleConfig 
};