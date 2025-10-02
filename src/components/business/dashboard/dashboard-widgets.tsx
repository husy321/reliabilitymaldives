"use client";

import { Suspense } from "react";
import DashboardWidget from "./dashboard-widget";
import { SalesReportsCompactWidget } from "../sales-reports/SalesReportsCompactWidget";
import { ApiTestWidget } from "../sales-reports/ApiTestWidget";
import {
  CreditCard,
  BarChart3,
  Users,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
} from "lucide-react";

interface DashboardWidgetsProps {
  userRole: string;
}

interface Widget {
  id: string;
  title: string;
  content: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  priority: number;
}

export default function DashboardWidgets({ userRole }: DashboardWidgetsProps) {
  const widgets: Widget[] = [
    {
      id: "overview",
      title: "System Overview",
      content: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">All systems operational</p>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-xs">Last updated: Just now</span>
          </div>
        </div>
      ),
      icon: BarChart3,
      roles: ["ADMIN", "MANAGER"],
      priority: 1,
    },
    {
      id: "receivables-summary",
      title: "Receivables Summary",
      content: (
        <div className="space-y-2">
          <p className="text-2xl font-bold">$25,430</p>
          <p className="text-sm text-muted-foreground">Outstanding receivables</p>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-xs text-primary">+12% from last month</span>
          </div>
        </div>
      ),
      icon: CreditCard,
      roles: ["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT"],
      priority: 2,
    },
    {
      id: "sales-metrics",
      title: "Sales Performance",
      content: (
        <div className="space-y-2">
          <p className="text-2xl font-bold">$42,850</p>
          <p className="text-sm text-muted-foreground">This month's sales</p>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary">+8% from target</span>
          </div>
        </div>
      ),
      icon: DollarSign,
      roles: ["ADMIN", "SALES", "MANAGER"],
      priority: 3,
    },
    {
      id: "api-test",
      title: "API Test",
      content: (
        <ApiTestWidget />
      ),
      icon: Receipt,
      roles: ["ADMIN", "ACCOUNTS", "MANAGER"],
      priority: 3.4,
    },
    {
      id: "sales-reports",
      title: "Sales Reports",
      content: (
        <Suspense fallback={<div className="animate-pulse h-16 bg-muted rounded-lg"></div>}>
          <SalesReportsCompactWidget />
        </Suspense>
      ),
      icon: Receipt,
      roles: ["ADMIN", "ACCOUNTS", "MANAGER"],
      priority: 3.5,
    },
    {
      id: "hr-summary",
      title: "HR Overview",
      content: (
        <div className="space-y-2">
          <p className="text-2xl font-bold">24</p>
          <p className="text-sm text-muted-foreground">Active employees</p>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-xs">3 new hires this month</span>
          </div>
        </div>
      ),
      icon: Users,
      roles: ["ADMIN", "MANAGER"],
      priority: 4,
    },
    {
      id: "pending-invoices",
      title: "Pending Invoices",
      content: (
        <div className="space-y-2">
          <p className="text-2xl font-bold">7</p>
          <p className="text-sm text-muted-foreground">Awaiting approval</p>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <span className="text-xs text-accent">2 overdue</span>
          </div>
        </div>
      ),
      icon: Receipt,
      roles: ["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT"],
      priority: 5,
    },
    {
      id: "user-activity",
      title: "User Activity",
      content: (
        <div className="space-y-2">
          <p className="text-2xl font-bold">156</p>
          <p className="text-sm text-muted-foreground">Active sessions today</p>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-xs">Peak: 2:30 PM</span>
          </div>
        </div>
      ),
      icon: Users,
      roles: ["ADMIN"],
      priority: 6,
    },
  ];

  const filteredWidgets = widgets
    .filter((widget) => widget.roles.includes(userRole))
    .sort((a, b) => a.priority - b.priority);

  const WidgetSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-32 bg-muted rounded-lg"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredWidgets.map((widget) => (
        <Suspense key={widget.id} fallback={<WidgetSkeleton />}>
          <DashboardWidget
            title={widget.title}
            icon={widget.icon}
            loading={false}
            error={null}
          >
            {widget.content}
          </DashboardWidget>
        </Suspense>
      ))}
    </div>
  );
}