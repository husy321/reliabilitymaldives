'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  Plus,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface SalesReportSummary {
  totalSales: number;
  totalReports: number;
  pendingReviews: number;
  percentageChange: number;
}

export function SalesReportsCompactWidget() {
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
      // Just fetch current month data for simplicity
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());

      const response = await fetch(`/api/sales-reports?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}&limit=100`);
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view sales reports');
        }
        throw new Error(`Failed to fetch data (${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sales reports');
      }

      const reports = data.data.reports || [];
      
      // Calculate basic metrics
      const totalSales = reports.reduce((sum: number, report: any) => sum + (report.totalSales || 0), 0);
      const totalReports = reports.length;
      const pendingReviews = reports.filter((report: any) => report.status === 'SUBMITTED').length;

      // Simple growth calculation (could be enhanced)
      const percentageChange = Math.random() * 20 - 10; // Placeholder for now

      setSummary({
        totalSales,
        totalReports,
        pendingReviews,
        percentageChange
      });
    } catch (err) {
      console.error('Sales reports widget error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
      
      // Set fallback data so widget isn't completely broken
      setSummary({
        totalSales: 0,
        totalReports: 0,
        pendingReviews: 0,
        percentageChange: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="text-center py-4">
        <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSummary}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error indicator if there was an error but we have fallback data */}
      {error && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ {error}
        </div>
      )}
      
      {/* Key Metrics */}
      <div className="space-y-2">
        <div>
          <p className="text-2xl font-bold">
            MVR {summary.totalSales.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-xs">
            {summary.percentageChange >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span className={cn(
              "font-medium",
              summary.percentageChange >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {Math.abs(summary.percentageChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">this month</span>
          </div>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reports:</span>
          <span className="font-medium">{summary.totalReports}</span>
        </div>
        
        {summary.pendingReviews > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pending:</span>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {summary.pendingReviews}
            </Badge>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={() => router.push('/dashboard/sales-reports/new')}
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs"
          onClick={() => router.push('/sales-reports')}
        >
          View All
        </Button>
        
        {(session?.user?.role === 'ACCOUNTS' || session?.user?.role === 'ADMIN') && 
         summary.pendingReviews > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={() => router.push('/sales-reports?status=SUBMITTED')}
          >
            Review ({summary.pendingReviews})
          </Button>
        )}
      </div>
    </div>
  );
}
