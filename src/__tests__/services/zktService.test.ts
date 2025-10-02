import { ZKTService } from '@/services/zktService';
import { ZKTConnectionConfig } from '../../../types/zkt';

// Mock the node-zklib module
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

describe('ZKTService', () => {
  const mockConfig: ZKTConnectionConfig = {
    ip: '192.168.1.201',
    port: 4370,
    timeout: 5000,
    inport: 5000
  };

  let zktService: ZKTService;

  beforeEach(() => {
    jest.clearAllMocks();
    zktService = new ZKTService(mockConfig);
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      // Mock successful connection
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device',
        serialNumber: '12345',
        userCount: 10,
        recordCount: 100
      });

      const result = await zktService.connect();

      expect(result.success).toBe(true);
      expect(result.data?.isConnected).toBe(true);
      expect(result.data?.deviceInfo).toBeDefined();
      expect(mockZKLib.createSocket).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failure', async () => {
      // Mock connection failure
      mockZKLib.createSocket.mockRejectedValue(new Error('Connection failed'));

      const result = await zktService.connect();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONNECTION_FAILED');
      expect(result.error?.message).toBe('Connection failed');
    });

    it('should disconnect successfully', async () => {
      // Mock successful disconnection
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await zktService.disconnect();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle disconnection failure', async () => {
      // First connect, then mock disconnection failure
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({ name: 'Test Device' });
      await zktService.connect();
      
      // Mock disconnection failure
      mockZKLib.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      const result = await zktService.disconnect();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISCONNECTION_FAILED');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      // Mock successful connection test with delay
      mockZKLib.createSocket.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10))
      );
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device',
        serialNumber: '12345'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await zktService.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.deviceInfo).toBeDefined();
    });

    it('should handle connection test timeout', async () => {
      // Mock connection timeout
      mockZKLib.createSocket.mockRejectedValue(new Error('Connection timeout'));

      const result = await zktService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection timeout');
      expect(result.error?.code).toBe('CONNECTION_FAILED');
    });

    it('should measure response time correctly', async () => {
      // Mock delayed connection
      mockZKLib.createSocket.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await zktService.testConnection();

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Device Information', () => {
    it('should get device info when connected', async () => {
      // Setup connected state
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device',
        serialNumber: '12345',
        deviceId: 'DEV001',
        firmwareVersion: '1.2.3',
        userCount: 50,
        recordCount: 1000,
        capacity: 10000
      });

      // Connect first
      await zktService.connect();

      const result = await zktService.getDeviceInfo();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Device');
      expect(result.data?.serialNumber).toBe('12345');
      expect(result.data?.userCount).toBe(50);
    });

    it('should fail to get device info when not connected', async () => {
      const result = await zktService.getDeviceInfo();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_CONNECTED');
      expect(result.error?.message).toBe('Device not connected');
    });

    it('should handle device info retrieval error', async () => {
      // Setup connected state
      mockZKLib.createSocket.mockResolvedValue(true);
      await zktService.connect();

      // Mock info retrieval error
      mockZKLib.getInfo.mockRejectedValue(new Error('Info retrieval failed'));

      const result = await zktService.getDeviceInfo();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_INFO_FAILED');
    });
  });

  describe('User Management', () => {
    it('should get users when connected', async () => {
      // Setup connected state
      mockZKLib.createSocket.mockResolvedValue(true);
      await zktService.connect();

      // Mock users data
      mockZKLib.getUsers.mockResolvedValue({
        data: [
          {
            uid: 1,
            userid: 'USER001',
            name: 'John Doe',
            role: 0,
            cardno: 123
          },
          {
            uid: 2,
            userid: 'USER002',
            name: 'Jane Smith',
            role: 1,
            cardno: 124
          }
        ]
      });

      const result = await zktService.getUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].userid).toBe('USER001');
      expect(result.data?.[1].name).toBe('Jane Smith');
    });

    it('should fail to get users when not connected', async () => {
      const result = await zktService.getUsers();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_CONNECTED');
    });
  });

  describe('Attendance Logs', () => {
    it('should get attendance logs when connected', async () => {
      // Setup connected state
      mockZKLib.createSocket.mockResolvedValue(true);
      await zktService.connect();

      // Mock attendance data
      const mockTimestamp = new Date('2025-09-11T08:00:00Z');
      mockZKLib.getAttendances.mockResolvedValue({
        data: [
          {
            uid: 1,
            userid: 'USER001',
            timestamp: mockTimestamp.getTime(),
            state: 0,
            type: 1
          }
        ]
      });

      const result = await zktService.getAttendanceLogs();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].userid).toBe('USER001');
      expect(result.data?.[0].timestamp).toEqual(mockTimestamp);
    });

    it('should fail to get attendance logs when not connected', async () => {
      const result = await zktService.getAttendanceLogs();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_CONNECTED');
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      // Mock successful health check with delay
      mockZKLib.createSocket.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10))
      );
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device'
      });
      mockZKLib.disconnect.mockResolvedValue(true);

      const result = await zktService.healthCheck();

      expect(result.status).toBe('connected');
      expect(result.deviceId).toBe('192.168.1.201:4370');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.lastCheck).toBeDefined();
    });

    it('should handle health check failure', async () => {
      // Mock health check failure
      mockZKLib.createSocket.mockRejectedValue(new Error('Health check failed'));

      const result = await zktService.healthCheck();

      expect(result.status).toBe('error');
      expect(result.error).toBe('Health check failed');
    });
  });

  describe('Connection Status', () => {
    it('should return disconnected status initially', () => {
      const status = zktService.getConnectionStatus();

      expect(status.isConnected).toBe(false);
      expect(status.lastConnected).toBeUndefined();
    });

    it('should return connected status after successful connection', async () => {
      // Mock successful connection
      mockZKLib.createSocket.mockResolvedValue(true);
      mockZKLib.getInfo.mockResolvedValue({
        name: 'Test Device'
      });

      await zktService.connect();
      const status = zktService.getConnectionStatus();

      expect(status.isConnected).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return device configuration', () => {
      const config = zktService.getConfig();

      expect(config.ip).toBe('192.168.1.201');
      expect(config.port).toBe(4370);
      expect(config.timeout).toBe(5000);
    });

    it('should not modify original configuration', () => {
      const config = zktService.getConfig();
      config.ip = 'modified';

      const originalConfig = zktService.getConfig();
      expect(originalConfig.ip).toBe('192.168.1.201');
    });
  });
});