import { UserRole } from "@prisma/client";

export type Role = UserRole;

/**
 * Check if a user has a specific role
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(userRole: string): boolean {
  return userRole === "ADMIN";
}

/**
 * Check if a user has manager or admin privileges
 */
export function isManagerOrAdmin(userRole: string): boolean {
  return ["ADMIN", "MANAGER"].includes(userRole);
}

/**
 * Check if a user has accounting privileges
 */
export function hasAccountingAccess(userRole: string): boolean {
  return ["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT"].includes(userRole);
}

/**
 * Check if a user has sales privileges
 */
export function hasSalesAccess(userRole: string): boolean {
  return ["ADMIN", "SALES", "MANAGER"].includes(userRole);
}

/**
 * Check if a user has HR access
 */
export function hasHRAccess(userRole: string): boolean {
  return ["ADMIN", "MANAGER"].includes(userRole);
}

/**
 * Type guard for role validation
 */
export function isValidRole(role: string): role is Role {
  return ["ADMIN", "SALES", "ACCOUNTS", "MANAGER", "ACCOUNTANT"].includes(role);
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(userRole: string) {
  return {
    canViewDashboard: hasRole(userRole, ["ADMIN", "SALES", "ACCOUNTS", "MANAGER", "ACCOUNTANT"]),
    canViewReceivables: hasAccountingAccess(userRole),
    canViewSalesReports: hasSalesAccess(userRole),
    canViewHR: hasHRAccess(userRole),
    canManageUsers: isAdmin(userRole),
    canViewInvoices: hasAccountingAccess(userRole),
    canCreateSalesReports: hasRole(userRole, ["ADMIN", "SALES"]),
    canApproveSalesReports: isManagerOrAdmin(userRole),
  };
}