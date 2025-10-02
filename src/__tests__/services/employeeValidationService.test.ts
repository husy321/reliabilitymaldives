// Tests for employee validation service
// Following architecture/testing-strategy.md backend testing patterns

import { EmployeeValidationService } from '../../services/employeeValidationService';
import { prisma } from '../../lib/prisma';

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('EmployeeValidationService', () => {
  let service: EmployeeValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Prefix Strategy', () => {
    beforeEach(() => {
      service = new EmployeeValidationService({
        mappingStrategy: 'email_prefix',
        emailDomain: '@testcompany.com',
        cacheResults: false // Disable caching for cleaner tests
      });
    });

    test('should validate existing employee by email prefix', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateEmployeeId('john.doe');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.employeeName).toBe('John Doe');
      expect(result.employeeEmail).toBe('john.doe@testcompany.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'john.doe@testcompany.com',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });
    });

    test('should reject non-existent employee', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateEmployeeId('nonexistent.user');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No active employee found');
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.validateEmployeeId('john.doe');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Database query failed');
    });

    test('should require email domain for email prefix strategy', async () => {
      const serviceWithoutDomain = new EmployeeValidationService({
        mappingStrategy: 'email_prefix'
        // No emailDomain provided
      });

      const result = await serviceWithoutDomain.validateEmployeeId('john.doe');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Email domain not configured');
    });
  });

  describe('Direct ID Strategy', () => {
    beforeEach(() => {
      service = new EmployeeValidationService({
        mappingStrategy: 'direct_id',
        cacheResults: false
      });
    });

    test('should validate existing employee by direct ID', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateEmployeeId('user-123');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-123',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });
    });

    test('should reject non-existent user ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateEmployeeId('invalid-id');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No active employee found with ID');
    });
  });

  describe('Batch Validation', () => {
    beforeEach(() => {
      service = new EmployeeValidationService({
        mappingStrategy: 'email_prefix',
        emailDomain: '@testcompany.com',
        cacheResults: false
      });
    });

    test('should validate batch of mixed valid and invalid employee IDs', async () => {
      const validUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(validUser)  // john.doe - valid
        .mockResolvedValueOnce(null)       // invalid.user - invalid
        .mockResolvedValueOnce(validUser); // another.user - valid

      const userids = ['john.doe', 'invalid.user', 'another.user'];
      const result = await service.validateEmployeeIdsBatch(userids);

      expect(result.totalProcessed).toBe(3);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.validEmployees).toHaveLength(2);
      expect(result.invalidEmployees).toHaveLength(1);
      expect(result.invalidEmployees[0].userid).toBe('invalid.user');
    });

    test('should handle empty batch', async () => {
      const result = await service.validateEmployeeIdsBatch([]);

      expect(result.totalProcessed).toBe(0);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });

    test('should process large batches in chunks', async () => {
      // Create array of 150 userids (3 batches of 50)
      const userids = Array.from({ length: 150 }, (_, i) => `user${i}`);
      
      mockPrisma.user.findUnique.mockResolvedValue(null); // All invalid for simplicity

      const result = await service.validateEmployeeIdsBatch(userids);

      expect(result.totalProcessed).toBe(150);
      expect(result.invalidCount).toBe(150);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(150);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      service = new EmployeeValidationService({
        mappingStrategy: 'email_prefix',
        emailDomain: '@testcompany.com',
        cacheResults: true,
        cacheTtlMinutes: 5
      });
    });

    test('should cache validation results', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // First call should hit database
      const result1 = await service.validateEmployeeId('john.doe');
      expect(result1.isValid).toBe(true);

      // Second call should use cache
      const result2 = await service.validateEmployeeId('john.doe');
      expect(result2.isValid).toBe(true);

      // Database should only be called once
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    test('should provide cache statistics', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Cache should be empty initially
      let stats = service.getCacheStats();
      expect(stats.entryCount).toBe(0);

      // Add entry to cache
      await service.validateEmployeeId('john.doe');

      // Cache should have one entry
      stats = service.getCacheStats();
      expect(stats.entryCount).toBe(1);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
    });

    test('should clear cache manually', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Add entry to cache
      await service.validateEmployeeId('john.doe');
      expect(service.getCacheStats().entryCount).toBe(1);

      // Clear cache
      service.clearCache();
      expect(service.getCacheStats().entryCount).toBe(0);
    });

    test('should expire cache entries after TTL', async () => {
      // Create service with very short TTL
      const shortTtlService = new EmployeeValidationService({
        mappingStrategy: 'email_prefix',
        emailDomain: '@testcompany.com',
        cacheResults: true,
        cacheTtlMinutes: 0.001 // Very short TTL for testing
      });

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // First call
      await shortTtlService.validateEmployeeId('john.doe');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);

      // Wait for cache expiry
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second call should hit database again
      await shortTtlService.validateEmployeeId('john.doe');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration Validation', () => {
    test('should handle invalid mapping strategy', async () => {
      service = new EmployeeValidationService({
        mappingStrategy: 'custom_field' as any
      });

      const result = await service.validateEmployeeId('test.user');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Custom field mapping not yet implemented');
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(() => {
      service = new EmployeeValidationService({
        mappingStrategy: 'email_prefix',
        emailDomain: '@testcompany.com',
        cacheResults: false
      });
    });

    test('should handle database connection failures', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.validateEmployeeId('john.doe');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Database query failed: Connection timeout');
    });

    test('should handle database query errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Syntax error'));

      const result = await service.validateEmployeeId('john.doe');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Database query failed: Syntax error');
    });

    test('should handle batch validation with some database errors', async () => {
      mockPrisma.user.findUnique
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);

      const result = await service.validateEmployeeIdsBatch(['error.user', 'invalid.user']);

      expect(result.totalProcessed).toBe(2);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(2);
    });
  });
});