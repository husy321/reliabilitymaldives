'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import type { PayrollExport } from '@/types/payroll';

interface PayrollExportStatusProps {
  payrollPeriodId: string;
  onExportClick: () => void;
  onDownload: (exportId: string) => void;
  onViewHistory: () => void;
  className?: string;
}

export function PayrollExportStatus({
  payrollPeriodId,
  onExportClick,
  onDownload,
  onViewHistory,
  className
}: PayrollExportStatusProps) {
  const [latestExport, setLatestExport] = useState<PayrollExport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestExport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/payroll/export/history?payrollPeriodId=${payrollPeriodId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch export status');
      }

      const data = await response.json();
      const exports = data.exports || [];

      // Get the most recent export
      if (exports.length > 0) {
        const sorted = exports.sort((a: PayrollExport, b: PayrollExport) =>
          new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
        );
        setLatestExport(sorted[0]);
      } else {
        setLatestExport(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export status');
      setLatestExport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (payrollPeriodId) {
      fetchLatestExport();
    }
  }, [payrollPeriodId]);

  // Poll for export status if one is in progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (latestExport?.status === 'GENERATING') {
      interval = setInterval(() => {
        fetchLatestExport();
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [latestExport?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'GENERATING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'GENERATING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getEstimatedProgress = () => {
    if (!latestExport || latestExport.status !== 'GENERATING') return 0;

    // Simulate progress based on time elapsed since export started
    const elapsed = Date.now() - new Date(latestExport.exportedAt).getTime();
    const estimatedTotal = 30000; // 30 seconds estimated
    const progress = Math.min(95, (elapsed / estimatedTotal) * 100);

    return Math.round(progress);
  };

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Status
          </div>
          <Button variant="outline" size="sm" onClick={onViewHistory}>
            <Eye className="h-4 w-4 mr-1" />
            View History
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading export status...</span>
          </div>
        ) : !latestExport ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No exports found for this payroll period.</p>
            <Button onClick={onExportClick}>
              <FileText className="h-4 w-4 mr-2" />
              Create Export
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest Export Status */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {getStatusIcon(latestExport.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">{latestExport.fileName}</h4>
                  <Badge className={getStatusColor(latestExport.status)}>
                    {latestExport.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    Size: {formatFileSize(latestExport.fileSize)} •
                    Created: {format(new Date(latestExport.exportedAt), 'MMM dd, yyyy HH:mm')}
                  </div>

                  {latestExport.exportedByUser && (
                    <div>
                      By: {latestExport.exportedByUser.name}
                    </div>
                  )}
                </div>

                {/* Progress bar for generating exports */}
                {latestExport.status === 'GENERATING' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Generating export...</span>
                      <span className="text-sm text-muted-foreground">{getEstimatedProgress()}%</span>
                    </div>
                    <Progress value={getEstimatedProgress()} className="w-full" />
                  </div>
                )}

                {/* Export metadata */}
                {latestExport.metadata && (
                  <div className="mt-3 p-3 bg-secondary rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Employees: {latestExport.metadata.totalEmployees}</div>
                      <div>Amount: MVR {latestExport.metadata.totalAmount.toFixed(2)}</div>
                      {latestExport.metadata.generationTime && (
                        <div>Generation Time: {(latestExport.metadata.generationTime / 1000).toFixed(1)}s</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {latestExport.status === 'COMPLETED' && (
                <Button onClick={() => onDownload(latestExport.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}

              {latestExport.status === 'FAILED' && (
                <Button onClick={onExportClick}>
                  <FileText className="h-4 w-4 mr-2" />
                  Retry Export
                </Button>
              )}

              {latestExport.status === 'COMPLETED' && (
                <Button variant="outline" onClick={onExportClick}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Export
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}