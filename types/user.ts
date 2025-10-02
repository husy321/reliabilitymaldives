import { User, UserRole } from "@prisma/client";

export type { User, UserRole };

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserWithRole extends User {
  role: UserRole;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface UserFormData {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export const USER_ROLES: Record<UserRole, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  ACCOUNTS: "Accounts",
  ACCOUNTANT: "Accountant",
  SALES: "Sales",
} as const;