'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Calendar, Users, BarChart3, Settings, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import { AttendanceFetch } from './AttendanceFetch';
import { AttendanceResults } from './AttendanceResults';
import { getAttendanceStatsAction, searchAttendanceRecordsAction } from '@/actions/attendanceActions';
import type { AttendanceStats, AttendanceRecord, AttendanceFetchResult } from '../../../../types/attendance';

export function AttendanceDashboard() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsResult, recordsResult] = await Promise.all([
        getAttendanceStatsAction(),
        searchAttendanceRecordsAction({
          page: 1,
          limit: 10,
          sortBy: 'date',
          sortOrder: 'desc'
        })
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        console.error('Failed to load stats:', statsResult.error);
      }

      if (recordsResult.success) {
        setRecentRecords(recordsResult.data.records);
      } else {
        console.error('Failed to load recent records:', recordsResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchComplete = (result: AttendanceFetchResult) => {
    // Refresh dashboard data after successful fetch
    if (result.success && result.recordsCreated > 0) {
      loadDashboardData();
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quick Actions</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/attendance/fetch">
              <Button className="w-full h-20 flex flex-col gap-2">
                <Download className="h-6 w-6" />
                Manual Fetch
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full h-20 flex flex-col gap-2"
              disabled
            >
              <Calendar className="h-6 w-6" />
              Schedule Sync
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-20 flex flex-col gap-2"
              disabled
            >
              <Settings className="h-6 w-6" />
              ZKT Settings
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-700">{stats.totalRecords}</div>
                <div className="text-sm text-blue-600">Total Records</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-700">
                  {stats.recordsByDepartment.length}
                </div>
                <div className="text-sm text-green-600">Departments</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-700">
                  {stats.recordsByMonth.length}
                </div>
                <div className="text-sm text-purple-600">Active Months</div>
              </div>
              
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-3xl font-bold text-amber-700">
                  {stats.recentFetches.length}
                </div>
                <div className="text-sm text-amber-600">Recent Fetches</div>
              </div>
            </div>

            {/* Department Breakdown */}
            {stats.recordsByDepartment.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Records by Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {stats.recordsByDepartment.slice(0, 6).map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{dept.department}</span>
                      <Badge variant="outline">{dept.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="fetch" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fetch" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Manual Fetch
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fetch">
          <AttendanceFetch onFetchComplete={handleFetchComplete} />
        </TabsContent>

        <TabsContent value="recent">
          <AttendanceResults 
            records={recentRecords}
            title="Recent Attendance Records"
            showStats={false}
          />
          
          {recentRecords.length > 0 && (
            <div className="flex justify-center mt-4">
              <Link href="/attendance/records">
                <Button variant="outline">
                  View All Records
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Fetch Activity */}
      {stats?.recentFetches && stats.recentFetches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recent Fetch Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentFetches.map((fetch, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{fetch.fetchedBy}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(fetch.fetchedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge>{fetch.recordCount} records</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-96 w-full" />
    </div>
  );
}