// Employee validation service for ZKT attendance data
// Following architecture/coding-standards.md service patterns

import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Employee validation configuration
export interface EmployeeValidationConfig {
  // Strategy for mapping ZKT userid to database records
  mappingStrategy: 'email_prefix' | 'direct_id' | 'custom_field';
  // For email_prefix strategy: userid becomes email prefix (e.g., 'john.doe' -> 'john.doe@company.com')
  emailDomain?: string;
  // Cache validation results for performance
  cacheResults?: boolean;
  cacheTtlMinutes?: number;
}

// Validation result for employee lookup
export interface EmployeeValidationResult {
  isValid: boolean;
  userId?: string;
  employeeName?: string;
  employeeEmail?: string;
  errorMessage?: string;
}

// Batch validation result
export interface BatchEmployeeValidationResult {
  validEmployees: Array<{
    userid: string;
    userId: string;
    name: string;
    email: string;
  }>;
  invalidEmployees: Array<{
    userid: string;
    errorMessage: string;
  }>;
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
}

// Cache for employee validation results
interface ValidationCache {
  [userid: string]: {
    result: EmployeeValidationResult;
    timestamp: number;
  };
}

export class EmployeeValidationService {
  private config: EmployeeValidationConfig;
  private cache: ValidationCache = {};
  
  constructor(config: EmployeeValidationConfig = { mappingStrategy: 'email_prefix' }) {
    this.config = {
      emailDomain: '@company.com',
      cacheResults: true,
      cacheTtlMinutes: 30,
      ...config
    };
  }

  /**
   * Validate a single employee ID against the database
   */
  async validateEmployeeId(userid: string): Promise<EmployeeValidationResult> {
    // Check cache first
    if (this.config.cacheResults && this.isCacheValid(userid)) {
      return this.cache[userid].result;
    }

    try {
      const result = await this.performDatabaseLookup(userid);
      
      // Cache the result
      if (this.config.cacheResults) {
        this.cacheResult(userid, result);
      }
      
      return result;
    } catch (error) {
      const errorResult: EmployeeValidationResult = {
        isValid: false,
        errorMessage: `Database lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      return errorResult;
    }
  }

  /**
   * Validate multiple employee IDs in batch
   */
  async validateEmployeeIdsBatch(userids: string[]): Promise<BatchEmployeeValidationResult> {
    const validEmployees: Array<{
      userid: string;
      userId: string;
      name: string;
      email: string;
    }> = [];
    
    const invalidEmployees: Array<{
      userid: string;
      errorMessage: string;
    }> = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < userids.length; i += batchSize) {
      const batch = userids.slice(i, i + batchSize);
      const batchPromises = batch.map(userid => this.validateEmployeeId(userid));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((result, index) => {
        const userid = batch[index];
        if (result.isValid && result.userId && result.employeeName && result.employeeEmail) {
          validEmployees.push({
            userid,
            userId: result.userId,
            name: result.employeeName,
            email: result.employeeEmail
          });
        } else {
          invalidEmployees.push({
            userid,
            errorMessage: result.errorMessage || 'Unknown validation error'
          });
        }
      });
    }

    return {
      validEmployees,
      invalidEmployees,
      totalProcessed: userids.length,
      validCount: validEmployees.length,
      invalidCount: invalidEmployees.length
    };
  }

  /**
   * Perform actual database lookup based on mapping strategy
   */
  private async performDatabaseLookup(userid: string): Promise<EmployeeValidationResult> {
    switch (this.config.mappingStrategy) {
      case 'email_prefix':
        return await this.validateByEmailPrefix(userid);
      
      case 'direct_id':
        return await this.validateByDirectId(userid);
      
      case 'custom_field':
        // For future extensibility - would require schema changes
        return {
          isValid: false,
          errorMessage: 'Custom field mapping not yet implemented'
        };
      
      default:
        return {
          isValid: false,
          errorMessage: 'Invalid mapping strategy configured'
        };
    }
  }

  /**
   * Validate by email prefix strategy (userid becomes email prefix)
   */
  private async validateByEmailPrefix(userid: string): Promise<EmployeeValidationResult> {
    if (!this.config.emailDomain) {
      return {
        isValid: false,
        errorMessage: 'Email domain not configured for email_prefix strategy'
      };
    }

    // Construct email from userid
    const email = `${userid}${this.config.emailDomain}`;
    
    try {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });

      if (user) {
        return {
          isValid: true,
          userId: user.id,
          employeeName: user.name,
          employeeEmail: user.email
        };
      } else {
        return {
          isValid: false,
          errorMessage: `No active employee found with email: ${email}`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate by direct ID strategy (userid matches user.id directly)
   */
  private async validateByDirectId(userid: string): Promise<EmployeeValidationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: userid,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });

      if (user) {
        return {
          isValid: true,
          userId: user.id,
          employeeName: user.name,
          employeeEmail: user.email
        };
      } else {
        return {
          isValid: false,
          errorMessage: `No active employee found with ID: ${userid}`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(userid: string): boolean {
    if (!this.cache[userid]) {
      return false;
    }

    const cached = this.cache[userid];
    const ttlMs = (this.config.cacheTtlMinutes || 30) * 60 * 1000;
    const isExpired = Date.now() - cached.timestamp > ttlMs;
    
    if (isExpired) {
      delete this.cache[userid];
      return false;
    }
    
    return true;
  }

  /**
   * Cache validation result
   */
  private cacheResult(userid: string, result: EmployeeValidationResult): void {
    this.cache[userid] = {
      result,
      timestamp: Date.now()
    };
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { 
    entryCount: number; 
    hitRate?: number; 
    oldestEntry?: Date;
  } {
    const entryCount = Object.keys(this.cache).length;
    
    if (entryCount === 0) {
      return { entryCount: 0 };
    }

    const timestamps = Object.values(this.cache).map(entry => entry.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    
    return {
      entryCount,
      oldestEntry: new Date(oldestTimestamp)
    };
  }
}

// Default instance with email prefix strategy
export const defaultEmployeeValidationService = new EmployeeValidationService({
  mappingStrategy: 'email_prefix',
  emailDomain: '@reliabilitymaldives.com',
  cacheResults: true,
  cacheTtlMinutes: 30
});

// Validation schema for employee validation configuration
export const employeeValidationConfigSchema = z.object({
  mappingStrategy: z.enum(['email_prefix', 'direct_id', 'custom_field']),
  emailDomain: z.string().optional(),
  cacheResults: z.boolean().optional(),
  cacheTtlMinutes: z.number().min(1).max(1440).optional()
});

// Type guard for employee validation config
export function isValidEmployeeValidationConfig(
  config: unknown
): config is EmployeeValidationConfig {
  try {
    employeeValidationConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}