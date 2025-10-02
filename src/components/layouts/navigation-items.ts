/**
 * Navigation menu items configuration
 * Server-safe - no hooks or browser APIs
 */

export interface MenuItem {
  name: string;
  href: string;
  icon: string; // Icon name as string
  roles: string[];
}

export const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "Home",
    roles: ["ADMIN", "SALES", "ACCOUNTS", "MANAGER", "ACCOUNTANT"],
  },
  {
    name: "Receivables",
    href: "/receivables",
    icon: "CreditCard",
    roles: ["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT", "SALES"],
  },
  {
    name: "Sales Reports",
    href: "/sales-reports",
    icon: "BarChart3",
    roles: ["ADMIN", "SALES", "MANAGER"],
  },
  {
    name: "HR",
    href: "/hr",
    icon: "Users",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    name: "User Management",
    href: "/users",
    icon: "UserCog",
    roles: ["ADMIN"],
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: "Receipt",
    roles: ["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT"],
  },
];

/**
 * Filter menu items based on user role
 * Can be used on server or client
 */
export function getFilteredMenuItems(userRole: string): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(userRole));
}
