'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Download,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import type { PayrollExport } from '@/types/payroll';

interface PayrollExportHistoryProps {
  payrollPeriodId: string;
  onDownload: (exportId: string) => void;
  onDelete: (exportId: string) => void;
  className?: string;
}

export function PayrollExportHistory({
  payrollPeriodId,
  onDownload,
  onDelete,
  className
}: PayrollExportHistoryProps) {
  const [exports, setExports] = useState<PayrollExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExportHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/payroll/export/history?payrollPeriodId=${payrollPeriodId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch export history');
      }

      const data = await response.json();
      setExports(data.exports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export history');
      setExports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (payrollPeriodId) {
      fetchExportHistory();
    }
  }, [payrollPeriodId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'GENERATING':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
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

  const handleDownload = (exportId: string) => {
    onDownload(exportId);
  };

  const handleDelete = (exportId: string) => {
    if (window.confirm('Are you sure you want to delete this export?')) {
      onDelete(exportId);
      // Refresh the list after deletion
      setTimeout(() => {
        fetchExportHistory();
      }, 1000);
    }
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
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Export History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : exports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No exports found for this payroll period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{exports.length}</div>
                <div className="text-sm text-muted-foreground">Total Exports</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {exports.filter(e => e.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {exports.filter(e => e.status === 'GENERATING').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {exports.filter(e => e.status === 'FAILED').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Export List */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Exported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exportItem) => (
                    <TableRow key={exportItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exportItem.status)}
                          <Badge className={getStatusColor(exportItem.status)}>
                            {exportItem.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{exportItem.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatFileSize(exportItem.fileSize)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{exportItem.exportedByUser?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(exportItem.exportedAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {exportItem.status === 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(exportItem.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(exportItem.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}