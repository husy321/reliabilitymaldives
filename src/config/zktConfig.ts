// ZKT Configuration - Environment variable management
// Following architecture/coding-standards.md environment configuration patterns

import { ZKTConnectionConfig } from '../../types/zkt';

/**
 * ZKT Environment Configuration
 * Access only through config objects, never process.env directly
 */
export interface ZKTEnvConfig {
  // Primary ZKT machine configuration
  primaryDevice: ZKTConnectionConfig;
  // Additional machines (for multi-device support)
  secondaryDevices?: ZKTConnectionConfig[];
  // Connection settings
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
  // Monitoring settings
  healthCheckInterval: number;
  connectionPoolSize: number;
}

/**
 * Load and validate ZKT configuration from environment variables
 */
export function getZKTConfig(): ZKTEnvConfig {
  // Primary device configuration (required)
  const primaryIp = process.env.ZKT_PRIMARY_IP;
  const primaryPort = process.env.ZKT_PRIMARY_PORT;
  
  if (!primaryIp) {
    throw new Error(
      'ZKT_PRIMARY_IP environment variable is required for ZKT device connection. ' +
      'Please set the IP address of your primary ZKT attendance machine.'
    );
  }

  // Parse and validate primary device configuration
  const primaryDevice: ZKTConnectionConfig = {
    ip: primaryIp,
    port: primaryPort ? parseInt(primaryPort, 10) : 4370, // Default ZKTeco port
    timeout: process.env.ZKT_TIMEOUT ? parseInt(process.env.ZKT_TIMEOUT, 10) : 5000,
    inport: process.env.ZKT_INPORT ? parseInt(process.env.ZKT_INPORT, 10) : 5000
  };

  // Validate IP address format
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(primaryDevice.ip)) {
    throw new Error(
      `Invalid ZKT_PRIMARY_IP format: ${primaryDevice.ip}. ` +
      'Please provide a valid IPv4 address (e.g., 192.168.1.100).'
    );
  }

  // Validate port range
  if (primaryDevice.port < 1 || primaryDevice.port > 65535) {
    throw new Error(
      `Invalid ZKT_PRIMARY_PORT: ${primaryDevice.port}. ` +
      'Port must be between 1 and 65535.'
    );
  }

  // Parse secondary devices (optional)
  const secondaryDevices: ZKTConnectionConfig[] = [];
  let deviceIndex = 2;
  while (process.env[`ZKT_SECONDARY_${deviceIndex}_IP`]) {
    const ip = process.env[`ZKT_SECONDARY_${deviceIndex}_IP`];
    const port = process.env[`ZKT_SECONDARY_${deviceIndex}_PORT`];
    
    if (ip && ipRegex.test(ip)) {
      secondaryDevices.push({
        ip,
        port: port ? parseInt(port, 10) : 4370,
        timeout: process.env.ZKT_TIMEOUT ? parseInt(process.env.ZKT_TIMEOUT, 10) : 5000,
        inport: process.env.ZKT_INPORT ? parseInt(process.env.ZKT_INPORT, 10) : 5000
      });
    }
    deviceIndex++;
  }

  // Connection and monitoring settings
  const config: ZKTEnvConfig = {
    primaryDevice,
    secondaryDevices: secondaryDevices.length > 0 ? secondaryDevices : undefined,
    defaultTimeout: process.env.ZKT_DEFAULT_TIMEOUT ? parseInt(process.env.ZKT_DEFAULT_TIMEOUT, 10) : 10000,
    maxRetries: process.env.ZKT_MAX_RETRIES ? parseInt(process.env.ZKT_MAX_RETRIES, 10) : 3,
    retryDelay: process.env.ZKT_RETRY_DELAY ? parseInt(process.env.ZKT_RETRY_DELAY, 10) : 2000,
    healthCheckInterval: process.env.ZKT_HEALTH_CHECK_INTERVAL ? parseInt(process.env.ZKT_HEALTH_CHECK_INTERVAL, 10) : 60000,
    connectionPoolSize: process.env.ZKT_POOL_SIZE ? parseInt(process.env.ZKT_POOL_SIZE, 10) : 5
  };

  return config;
}

/**
 * Validate ZKT environment configuration
 * Throws error if required variables are missing or invalid
 */
export function validateZKTConfig(): boolean {
  try {
    const config = getZKTConfig();
    
    // Additional validation
    if (config.defaultTimeout < 1000) {
      console.warn('ZKT default timeout is very low (< 1000ms). Consider increasing for better reliability.');
    }
    
    if (config.maxRetries > 10) {
      console.warn('ZKT max retries is very high (> 10). This may cause long delays on connection failures.');
    }

    console.log(`ZKT Configuration loaded: Primary device ${config.primaryDevice.ip}:${config.primaryDevice.port}`);
    if (config.secondaryDevices && config.secondaryDevices.length > 0) {
      console.log(`ZKT Secondary devices: ${config.secondaryDevices.length} configured`);
    }
    
    return true;
  } catch (error) {
    console.error('ZKT Configuration validation failed:', error);
    throw error;
  }
}

/**
 * Get development/test configuration for ZKT
 */
export function getZKTTestConfig(): ZKTEnvConfig {
  return {
    primaryDevice: {
      ip: '192.168.1.201', // Common test device IP
      port: 4370,
      timeout: 5000,
      inport: 5000
    },
    defaultTimeout: 5000,
    maxRetries: 2,
    retryDelay: 1000,
    healthCheckInterval: 30000,
    connectionPoolSize: 2
  };
}

// Environment variables documentation for .env.local
export const ZKT_ENV_TEMPLATE = `
# ZKT Attendance Machine Configuration
# Primary device (required)
ZKT_PRIMARY_IP=192.168.1.201
ZKT_PRIMARY_PORT=4370

# Optional secondary devices
# ZKT_SECONDARY_2_IP=192.168.1.202
# ZKT_SECONDARY_2_PORT=4370
# ZKT_SECONDARY_3_IP=192.168.1.203

# Connection settings (optional)
ZKT_TIMEOUT=5000
ZKT_INPORT=5000
ZKT_DEFAULT_TIMEOUT=10000
ZKT_MAX_RETRIES=3
ZKT_RETRY_DELAY=2000
ZKT_HEALTH_CHECK_INTERVAL=60000
ZKT_POOL_SIZE=5
`;

// Export singleton configuration instance
export const zktConfig = process.env.NODE_ENV === 'test' ? getZKTTestConfig() : getZKTConfig();