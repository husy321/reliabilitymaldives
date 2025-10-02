"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  CreditCard,
  BarChart3,
  UserCog,
  Receipt,
} from "lucide-react";
import type { MenuItem } from "./navigation-items";

// Icon mapping
const iconMap = {
  Home,
  Users,
  CreditCard,
  BarChart3,
  UserCog,
  Receipt,
};

interface NavigationContentProps {
  items: MenuItem[];
  currentPath: string;
  onMobileMenuToggle?: () => void;
}

export function NavigationContent({
  items,
  currentPath,
  onMobileMenuToggle
}: NavigationContentProps) {
  return (
    <nav className="flex flex-col space-y-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap];
        const isActive = currentPath === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onMobileMenuToggle}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
