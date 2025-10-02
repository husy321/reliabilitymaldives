import { ZKTService } from '@/services/zktService';
import { getZKTConfig } from '@/config/zktConfig';
import { 
  testZKTConnection, 
  getZKTDeviceInfo, 
  performZKTHealthCheck,
  testAllZKTDevices
} from '@/lib/actions/zktActions';

// Mock authentication for testing
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      role: 'ADMIN' // Admin role required for ZKT access
    }
  }))
}));

// Mock the ZKT configuration to use test config
jest.mock('@/config/zktConfig', () => ({
  getZKTConfig: jest.fn(() => ({
    primaryDevice: {
      ip: '192.168.1.201',
      port: 4370,
      timeout: 5000,
      inport: 5000
    },
    secondaryDevices: [
      {
        ip: '192.168.1.202',
        port: 4370,
        timeout: 5000,
        inport: 5000
      }
    ],
    defaultTimeout: 5000,
    maxRetries: 2,
    retryDelay: 1000,
    healthCheckInterval: 30000,
    connectionPoolSize: 2
  })),
  validateZKTConfig: jest.fn(() => true)
}));

// Mock node-zklib
const mockZKLib = {
  createSocket: jest.fn(),
  disconnect: jest.fn(),
  getInfo: jest.fn(),
  getUsers: jest.fn(),
  getAttendances: jest.fn(),
};

jest.mock('node-zklib', () => {
  return jest.fn().mockImplementation(() => mockZKLib);
});

describe('ZKT Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ZKT Service Integration', () => {
    it('should perform full connection lifecycle', async () => {
      // Mock successful operations
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Integration Test Device',
        serialNumber: 'INT12345',
        userCount: 25,
        recordCount: 500
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const config = getZKTConfig();
      const zktService = new ZKTService(config.primaryDevice);

      // Test connection
      const connectResult = await zktService.connect();
      expect(connectResult.success).toBe(true);

      // Test device info retrieval
      const infoResult = await zktService.getDeviceInfo();
      expect(infoResult.success).toBe(true);
      expect(infoResult.data?.name).toBe('Integration Test Device');

      // Test disconnection
      const disconnectResult = await zktService.disconnect();
      expect(disconnectResult.success).toBe(true);
    });

    it('should handle connection retry logic', async () => {
      const config = getZKTConfig();
      
      // Test individual retry attempts
      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        // Mock failure for each attempt except the last
        if (attempt < config.maxRetries - 1) {
          mockZKLib.createSocket.mockRejectedValueOnce(new Error('Connection failed'));
        } else {
          // Success on final attempt
          mockZKLib.createSocket.mockResolvedValue(true);
          mockZKLib.getInfo.mockResolvedValue({
            name: 'Retry Test Device'
          });
        }
      }

      const zktService = new ZKTService(config.primaryDevice);
      
      // Test connection attempts
      let lastResult;
      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        lastResult = await zktService.connect();
        if (lastResult.success) break;
      }

      // Should succeed on final attempt
      expect(lastResult?.success).toBe(true);
    });

    it('should handle multiple device management', async () => {
      // Mock successful connections for multiple devices
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Multi Device Test'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const config = getZKTConfig();
      const services: ZKTService[] = [];

      // Create services for all configured devices
      services.push(new ZKTService(config.primaryDevice));
      if (config.secondaryDevices) {
        config.secondaryDevices.forEach(deviceConfig => {
          services.push(new ZKTService(deviceConfig));
        });
      }

      // Test all devices
      const testResults = await Promise.all(
        services.map(service => service.testConnection())
      );

      expect(testResults).toHaveLength(2); // Primary + 1 secondary
      testResults.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ZKT Server Actions Integration', () => {
    it('should test ZKT connection via server action', async () => {
      // Mock successful connection
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Server Action Test'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await testZKTConnection();

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.message).toBe('Connection successful');
    });

    it('should get device info via server action', async () => {
      // Mock successful operations
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Device Info Test',
        serialNumber: 'DIT12345',
        firmwareVersion: '2.1.0',
        userCount: 100,
        recordCount: 2000
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await getZKTDeviceInfo();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Device Info Test');
      expect(result.data?.serialNumber).toBe('DIT12345');
      expect(result.data?.userCount).toBe(100);
    });

    it('should perform health check via server action', async () => {
      // Mock health check operations with delay
      mockZKLib.createSocket.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10))
      );
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Health Check Test'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await performZKTHealthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('connected');
      expect(result.data?.deviceId).toBe('192.168.1.201:4370');
      expect(result.data?.responseTime).toBeGreaterThan(0);
    });

    it('should test all devices via server action', async () => {
      // Mock successful connections for all devices
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'All Devices Test'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await testAllZKTDevices();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Primary + 1 secondary
      result.data?.forEach(test => {
        expect(test.success).toBe(true);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network timeout gracefully', async () => {
      // Mock network timeout
      mockZKLib.createSocket.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await testZKTConnection();

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.error?.code).toBe('CONNECTION_FAILED');
    });

    it('should handle device communication errors', async () => {
      // Mock connection success but info retrieval failure
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockRejectedValue(new Error('Device not responding'));

      const result = await getZKTDeviceInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not responding');
    });

    it('should handle authentication errors', async () => {
      // Mock non-admin user
      const { getSession } = require('@/lib/auth');
      getSession.mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          role: 'USER' // Non-admin role
        }
      });

      const result = await testZKTConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied. ZKT management requires Admin permissions.');
    });
  });

  describe('Configuration Integration', () => {
    it('should load configuration correctly', () => {
      const config = getZKTConfig();

      expect(config.primaryDevice.ip).toBe('192.168.1.201');
      expect(config.primaryDevice.port).toBe(4370);
      expect(config.secondaryDevices).toHaveLength(1);
      expect(config.maxRetries).toBe(2);
    });

    it('should validate connection parameters', async () => {
      const config = getZKTConfig();
      const zktService = new ZKTService(config.primaryDevice);

      const deviceConfig = zktService.getConfig();

      expect(deviceConfig.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      expect(deviceConfig.port).toBeGreaterThan(0);
      expect(deviceConfig.port).toBeLessThan(65536);
    });
  });
});