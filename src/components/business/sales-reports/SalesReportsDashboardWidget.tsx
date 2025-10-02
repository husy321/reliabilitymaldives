'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SalesReportStatus } from '@/types/sales-report';

interface SalesReportSummary {
  totalReports: number;
  totalSales: number;
  statusBreakdown: {
    [key in SalesReportStatus]: number;
  };
  recentReports: Array<{
    id: string;
    outletName: string;
    date: string;
    totalSales: number;
    status: SalesReportStatus;
  }>;
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    percentageChange: number;
  };
}

interface Props {
  className?: string;
  compact?: boolean;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const statusIcons = {
  DRAFT: <FileText className="w-3 h-3" />,
  SUBMITTED: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />
};

export function SalesReportsDashboardWidget({ className, compact = false }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [summary, setSummary] = useState<SalesReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sales reports summary
  const fetchSummary = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch current month data
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      const previousMonthStart = startOfMonth(subDays(currentMonthStart, 1));
      const previousMonthEnd = endOfMonth(subDays(currentMonthStart, 1));

      const [currentResponse, previousResponse, recentResponse] = await Promise.all([
        // Current month summary
        fetch(`/api/sales-reports?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}&limit=100`),
        // Previous month for comparison
        fetch(`/api/sales-reports?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}&limit=100`),
        // Recent reports
        fetch(`/api/sales-reports?limit=5&sortBy=createdAt&sortOrder=desc`)
      ]);

      if (!currentResponse.ok || !previousResponse.ok || !recentResponse.ok) {
        console.error('API Response Status:', {
          current: currentResponse.status,
          previous: previousResponse.status,
          recent: recentResponse.status
        });
        
        // If it's a 401 (unauthorized), show a more helpful message
        if (currentResponse.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        throw new Error(`API Error: ${currentResponse.status} ${currentResponse.statusText}`);
      }

      const [currentData, previousData, recentData] = await Promise.all([
        currentResponse.json(),
        previousResponse.json(),
        recentResponse.json()
      ]);

      if (!currentData.success || !previousData.success || !recentData.success) {
        throw new Error('Failed to fetch sales reports data');
      }

      // Process current month data
      const currentReports = currentData.data.reports;
      const previousReports = previousData.data.reports;
      const recentReports = recentData.data.reports;

      // Calculate totals
      const totalSales = currentReports.reduce((sum: number, report: any) => sum + report.totalSales, 0);
      const previousTotalSales = previousReports.reduce((sum: number, report: any) => sum + report.totalSales, 0);

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

      // Calculate percentage change
      const percentageChange = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0;

      const summaryData: SalesReportSummary = {
        totalReports: currentReports.length,
        totalSales,
        statusBreakdown,
        recentReports: recentReports.slice(0, compact ? 3 : 5).map((report: any) => ({
          id: report.id,
          outletName: report.outlet.name,
          date: report.date,
          totalSales: report.totalSales,
          status: report.status
        })),
        monthlyComparison: {
          currentMonth: totalSales,
          previousMonth: previousTotalSales,
          percentageChange
        }
      };

      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [session]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sales reports data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Reports
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/sales-reports')}
            className="gap-1"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <CardDescription>
          {format(new Date(), 'MMMM yyyy')} overview
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              MVR {summary.totalSales.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-xs">
              {summary.monthlyComparison.percentageChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={cn(
                "font-medium",
                summary.monthlyComparison.percentageChange >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(summary.monthlyComparison.percentageChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold">{summary.totalReports}</p>
            <p className="text-xs text-muted-foreground">Reports this month</p>
          </div>
        </div>

        {/* Status Breakdown */}
        {!compact && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Status Breakdown</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {statusIcons[status as SalesReportStatus]}
                      <span className="text-xs">{status}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", statusColors[status as SalesReportStatus])}>
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent Reports */}
        <Separator />
        <div>
          <p className="text-sm font-medium mb-2">Recent Reports</p>
          <div className="space-y-2">
            {summary.recentReports.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent reports</p>
            ) : (
              summary.recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{report.outletName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.date), 'MMM dd')} • MVR {report.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs ml-2", statusColors[report.status])}>
                    {statusIcons[report.status]}
                    <span className="ml-1">{report.status}</span>
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Separator />
        <div className="flex gap-2">
          {session?.user?.role === 'MANAGER' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => router.push('/sales-reports/new')}
            >
              <Plus className="w-3 h-3" />
              New Report
            </Button>
          )}
          
          {(session?.user?.role === 'ACCOUNTS' || session?.user?.role === 'ADMIN') && 
           summary.statusBreakdown.SUBMITTED > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => router.push('/sales-reports?status=SUBMITTED')}
            >
              <Clock className="w-3 h-3" />
              Review ({summary.statusBreakdown.SUBMITTED})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
