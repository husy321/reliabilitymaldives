'use server';

// ZKT Server Actions - Connection management and testing
// Following architecture/coding-standards.md server action patterns

import { getSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { ZKTService } from '@/services/zktService';
import { getZKTConfig } from '@/config/zktConfig';
import {
  ZKTConnectionTest,
  ZKTHealthCheck,
  ZKTConnectionStatus,
  ZKTDeviceInfo
} from '../../../types/zkt';

/**
 * Base action result interface
 */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Role-based access control for ZKT management
 * Only ADMIN role can access ZKT functionality
 */
async function checkZKTAccess(): Promise<{ success: false; error: string } | { success: true; userRole: UserRole }> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // ZKT management restricted to ADMIN role only
  if (session.user.role !== UserRole.ADMIN) {
    return {
      success: false,
      error: 'Access denied. ZKT management requires Admin permissions.'
    };
  }

  return {
    success: true,
    userRole: session.user.role
  };
}

/**
 * Create ZKT service instance for primary device
 */
function createZKTService(): ZKTService {
  const config = getZKTConfig();
  return new ZKTService(config.primaryDevice);
}

/**
 * Test ZKT device connection
 */
export async function testZKTConnection(): Promise<ActionResult<ZKTConnectionTest>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    // Create service and test connection
    const zktService = createZKTService();
    const testResult = await zktService.testConnection();

    return {
      success: true,
      data: testResult
    };

  } catch (error) {
    console.error('ZKT connection test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    };
  }
}

/**
 * Get ZKT device information
 */
export async function getZKTDeviceInfo(): Promise<ActionResult<ZKTDeviceInfo>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    // Create service and get device info
    const zktService = createZKTService();
    const connectionResult = await zktService.connect();
    
    if (!connectionResult.success) {
      return {
        success: false,
        error: connectionResult.error?.message || 'Failed to connect to device'
      };
    }

    const deviceInfoResult = await zktService.getDeviceInfo();
    await zktService.disconnect();

    if (!deviceInfoResult.success) {
      return {
        success: false,
        error: deviceInfoResult.error?.message || 'Failed to get device information'
      };
    }

    return {
      success: true,
      data: deviceInfoResult.data
    };

  } catch (error) {
    console.error('ZKT device info error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get device information'
    };
  }
}

/**
 * Perform ZKT device health check
 */
export async function performZKTHealthCheck(): Promise<ActionResult<ZKTHealthCheck>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    // Create service and perform health check
    const zktService = createZKTService();
    const healthResult = await zktService.healthCheck();

    return {
      success: true,
      data: healthResult
    };

  } catch (error) {
    console.error('ZKT health check error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    };
  }
}

/**
 * Get current ZKT connection status
 */
export async function getZKTConnectionStatus(): Promise<ActionResult<ZKTConnectionStatus>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    // Create service and get status
    const zktService = createZKTService();
    const status = zktService.getConnectionStatus();

    return {
      success: true,
      data: status
    };

  } catch (error) {
    console.error('ZKT status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get connection status'
    };
  }
}

/**
 * Test multiple ZKT devices (if configured)
 */
export async function testAllZKTDevices(): Promise<ActionResult<ZKTConnectionTest[]>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    const config = getZKTConfig();
    const testResults: ZKTConnectionTest[] = [];

    // Test primary device
    const primaryService = new ZKTService(config.primaryDevice);
    const primaryTest = await primaryService.testConnection();
    testResults.push(primaryTest);

    // Test secondary devices if configured
    if (config.secondaryDevices && config.secondaryDevices.length > 0) {
      for (const deviceConfig of config.secondaryDevices) {
        const secondaryService = new ZKTService(deviceConfig);
        const secondaryTest = await secondaryService.testConnection();
        testResults.push(secondaryTest);
      }
    }

    return {
      success: true,
      data: testResults
    };

  } catch (error) {
    console.error('ZKT devices test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test devices'
    };
  }
}

/**
 * Get ZKT configuration info (safe, no sensitive data)
 */
export async function getZKTConfigInfo(): Promise<ActionResult<{ 
  primaryDevice: string; 
  secondaryDevicesCount: number; 
  healthCheckInterval: number;
}>> {
  try {
    // Check access permissions
    const accessCheck = await checkZKTAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        error: accessCheck.error
      };
    }

    const config = getZKTConfig();
    
    return {
      success: true,
      data: {
        primaryDevice: `${config.primaryDevice.ip}:${config.primaryDevice.port}`,
        secondaryDevicesCount: config.secondaryDevices?.length || 0,
        healthCheckInterval: config.healthCheckInterval
      }
    };

  } catch (error) {
    console.error('ZKT config info error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration info'
    };
  }
}