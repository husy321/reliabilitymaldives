import { UserRole } from "@prisma/client";

export type { UserRole };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SessionUser extends AuthUser {
  isActive: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type RolePermissions = {
  [K in UserRole]: {
    canViewDashboard: boolean;
    canViewReceivables: boolean;
    canViewSalesReports: boolean;
    canViewHR: boolean;
    canManageUsers: boolean;
    canViewInvoices: boolean;
    canCreateSalesReports: boolean;
    canApproveSalesReports: boolean;
  };
};

export const rolePermissions: RolePermissions = {
  ADMIN: {
    canViewDashboard: true,
    canViewReceivables: true,
    canViewSalesReports: true,
    canViewHR: true,
    canManageUsers: true,
    canViewInvoices: true,
    canCreateSalesReports: true,
    canApproveSalesReports: true,
  },
  MANAGER: {
    canViewDashboard: true,
    canViewReceivables: true,
    canViewSalesReports: true,
    canViewHR: true,
    canManageUsers: false,
    canViewInvoices: true,
    canCreateSalesReports: true,
    canApproveSalesReports: true,
  },
  ACCOUNTS: {
    canViewDashboard: true,
    canViewReceivables: true,
    canViewSalesReports: false,
    canViewHR: false,
    canManageUsers: false,
    canViewInvoices: true,
    canCreateSalesReports: false,
    canApproveSalesReports: false,
  },
  ACCOUNTANT: {
    canViewDashboard: true,
    canViewReceivables: true,
    canViewSalesReports: false,
    canViewHR: false,
    canManageUsers: false,
    canViewInvoices: true,
    canCreateSalesReports: false,
    canApproveSalesReports: false,
  },
  SALES: {
    canViewDashboard: true,
    canViewReceivables: false,
    canViewSalesReports: true,
    canViewHR: false,
    canManageUsers: false,
    canViewInvoices: false,
    canCreateSalesReports: true,
    canApproveSalesReports: false,
  },
};