'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  Building2,
  Target,
  AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SalesReportStatus } from '@/types/sales-report';

interface AnalyticsData {
  totalSales: number;
  totalReports: number;
  averageReportValue: number;
  statusBreakdown: {
    [key in SalesReportStatus]: number;
  };
  topOutlets: Array<{
    outletName: string;
    totalSales: number;
    reportCount: number;
  }>;
  trends: {
    salesGrowth: number;
    reportsGrowth: number;
  };
  complianceMetrics: {
    onTimeSubmissions: number;
    lateSubmissions: number;
    pendingReviews: number;
  };
}

interface Props {
  className?: string;
}

const statusColors = {
  DRAFT: 'text-gray-600',
  SUBMITTED: 'text-blue-600',
  APPROVED: 'text-green-600',
  REJECTED: 'text-red-600'
};

const statusIcons = {
  DRAFT: <FileText className="w-4 h-4" />,
  SUBMITTED: <Clock className="w-4 h-4" />,
  APPROVED: <CheckCircle className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />
};

export function SalesAnalyticsSummary({ className }: Props) {
  const { data: session } = useSession();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Calculate date ranges based on selected period
  const getDateRanges = (period: 'week' | 'month' | 'year') => {
    const now = new Date();
    
    switch (period) {
      case 'week':
        return {
          current: { start: startOfWeek(now), end: endOfWeek(now) },
          previous: { start: startOfWeek(subDays(now, 7)), end: endOfWeek(subDays(now, 7)) }
        };
      case 'month':
        return {
          current: { start: startOfMonth(now), end: endOfMonth(now) },
          previous: { start: startOfMonth(subDays(startOfMonth(now), 1)), end: endOfMonth(subDays(startOfMonth(now), 1)) }
        };
      case 'year':
        return {
          current: { start: startOfYear(now), end: endOfYear(now) },
          previous: { start: startOfYear(subDays(startOfYear(now), 1)), end: endOfYear(subDays(startOfYear(now), 1)) }
        };
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { current, previous } = getDateRanges(selectedPeriod);
      
      const [currentResponse, previousResponse] = await Promise.all([
        fetch(`/api/sales-reports?startDate=${current.start.toISOString()}&endDate=${current.end.toISOString()}&limit=1000`),
        fetch(`/api/sales-reports?startDate=${previous.start.toISOString()}&endDate=${previous.end.toISOString()}&limit=1000`)
      ]);

      if (!currentResponse.ok || !previousResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [currentData, previousData] = await Promise.all([
        currentResponse.json(),
        previousResponse.json()
      ]);

      if (!currentData.success || !previousData.success) {
        throw new Error('Failed to fetch analytics data');
      }

      const currentReports = currentData.data.reports;
      const previousReports = previousData.data.reports;

      // Calculate metrics
      const totalSales = currentReports.reduce((sum: number, report: any) => sum + report.totalSales, 0);
      const previousTotalSales = previousReports.reduce((sum: number, report: any) => sum + report.totalSales, 0);
      
      const totalReports = currentReports.length;
      const previousTotalReports = previousReports.length;
      
      const averageReportValue = totalReports > 0 ? totalSales / totalReports : 0;

      // Calculate status breakdown
      const statusBreakdown = currentReports.reduce((acc: any, report: any) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, {
        DRAFT: 0,
        SUBMITTED: 0,
        APPROVED: 0,
        REJECTED: 0
      });

      // Calculate top outlets
      const outletTotals = currentReports.reduce((acc: any, report: any) => {
        const outletName = report.outlet.name;
        if (!acc[outletName]) {
          acc[outletName] = { totalSales: 0, reportCount: 0 };
        }
        acc[outletName].totalSales += report.totalSales;
        acc[outletName].reportCount += 1;
        return acc;
      }, {});

      const topOutlets = Object.entries(outletTotals)
        .map(([outletName, data]: [string, any]) => ({
          outletName,
          totalSales: data.totalSales,
          reportCount: data.reportCount
        }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);

      // Calculate growth trends
      const salesGrowth = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0;
      
      const reportsGrowth = previousTotalReports > 0 
        ? ((totalReports - previousTotalReports) / previousTotalReports) * 100 
        : 0;

      // Calculate compliance metrics
      const onTimeSubmissions = currentReports.filter((report: any) => 
        report.status === 'APPROVED' || report.status === 'SUBMITTED'
      ).length;
      
      const lateSubmissions = currentReports.filter((report: any) => 
        report.status === 'REJECTED'
      ).length;
      
      const pendingReviews = statusBreakdown.SUBMITTED;

      const analyticsData: AnalyticsData = {
        totalSales,
        totalReports,
        averageReportValue,
        statusBreakdown,
        topOutlets,
        trends: {
          salesGrowth,
          reportsGrowth
        },
        complianceMetrics: {
          onTimeSubmissions,
          lateSubmissions,
          pendingReviews
        }
      };

      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [session, selectedPeriod]);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Sales Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Performance overview and insights
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={(value: 'week' | 'month' | 'year') => setSelectedPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MVR {analytics.totalSales.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {analytics.trends.salesGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={cn(
                "font-medium",
                analytics.trends.salesGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(analytics.trends.salesGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last {selectedPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReports}</div>
            <div className="flex items-center text-xs">
              {analytics.trends.reportsGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={cn(
                "font-medium",
                analytics.trends.reportsGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(analytics.trends.reportsGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last {selectedPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Report Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MVR {analytics.averageReportValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per sales report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.complianceMetrics.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Status</CardTitle>
            <CardDescription>Distribution of report statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={statusColors[status as SalesReportStatus]}>
                      {statusIcons[status as SalesReportStatus]}
                    </span>
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({analytics.totalReports > 0 ? ((count / analytics.totalReports) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Outlets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Outlets</CardTitle>
            <CardDescription>Ranked by total sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topOutlets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available</p>
              ) : (
                analytics.topOutlets.map((outlet, index) => (
                  <div key={outlet.outletName} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{outlet.outletName}</p>
                        <p className="text-xs text-muted-foreground">
                          {outlet.reportCount} report{outlet.reportCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        MVR {outlet.totalSales.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.totalSales > 0 ? ((outlet.totalSales / analytics.totalSales) * 100).toFixed(1) : 0}% of total
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Compliance Overview
          </CardTitle>
          <CardDescription>Report submission and approval metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.complianceMetrics.onTimeSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">On-time submissions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.complianceMetrics.pendingReviews}
              </div>
              <p className="text-xs text-muted-foreground">Pending reviews</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {analytics.complianceMetrics.lateSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">Rejected reports</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


