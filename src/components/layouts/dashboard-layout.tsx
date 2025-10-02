"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/layouts/navigation";
import UserProfile from "@/components/layouts/user-profile";
import NotificationArea from "@/components/business/notifications/notification-area";
import DashboardWidgets from "@/components/business/dashboard/dashboard-widgets";

interface DashboardLayoutProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Navigation Sidebar */}
        <Navigation userRole={user.role} />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            {/* Dashboard Header */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <NotificationArea />
                  <UserProfile user={user} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Welcome Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Welcome back, {user.name}!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Here's your dashboard overview. Access your modules through the navigation sidebar.
                </p>
              </CardContent>
            </Card>
            
            {/* Dashboard Widgets */}
            <DashboardWidgets userRole={user.role} />
          </div>
        </div>
      </div>
    </div>
  );
}