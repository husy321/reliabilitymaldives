'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  Settings,
  Building,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import type { PayrollPeriod, PayrollExportRequest } from '@/types/payroll';

interface PayrollExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollPeriod: PayrollPeriod | null;
  onExport: (request: PayrollExportRequest) => Promise<void>;
  isLoading?: boolean;
  exportProgress?: number;
  className?: string;
}

export function PayrollExportModal({
  isOpen,
  onClose,
  payrollPeriod,
  onExport,
  isLoading = false,
  exportProgress = 0,
  className
}: PayrollExportModalProps) {
  const [exportOptions, setExportOptions] = useState({
    includeCompanyBranding: true,
    includeDetailedBreakdown: true,
    includeAttendanceRecords: false
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!payrollPeriod) return null;

  const handleExportOptionsChange = (option: keyof typeof exportOptions, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: checked
    }));
  };

  const handlePreview = async () => {
    setIsPreviewMode(true);
    setExportError(null);
    // In a real implementation, this would generate a preview
    setTimeout(() => {
      setIsPreviewMode(false);
    }, 1500);
  };

  const handleExport = async () => {
    if (!payrollPeriod) return;

    setExportError(null);

    try {
      await onExport({
        payrollPeriodId: payrollPeriod.id,
        exportFormat: 'PDF',
        options: exportOptions
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const canExport = payrollPeriod.status === 'APPROVED' && !isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Payroll
          </DialogTitle>
          <DialogDescription>
            Generate and download payroll export for external processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payroll Period Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Payroll Period Details
                <Badge className={
                  payrollPeriod.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  payrollPeriod.status === 'CALCULATED' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {payrollPeriod.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Period</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payrollPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(payrollPeriod.endDate), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Employees</div>
                    <div className="text-sm text-muted-foreground">
                      {payrollPeriod.payrollRecords?.length || 0} records
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Total Amount:</div>
                <div className="text-lg font-bold text-primary">
                  MVR {payrollPeriod.totalAmount?.toFixed(2) || '0.00'}
                </div>
              </div>

              {payrollPeriod.status !== 'APPROVED' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Only approved payroll periods can be exported for external processing.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="company-branding"
                    checked={exportOptions.includeCompanyBranding}
                    onCheckedChange={(checked) => handleExportOptionsChange('includeCompanyBranding', checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="company-branding"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Building className="h-4 w-4" />
                      Include Company Branding
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add company letterhead and professional formatting
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="detailed-breakdown"
                    checked={exportOptions.includeDetailedBreakdown}
                    onCheckedChange={(checked) => handleExportOptionsChange('includeDetailedBreakdown', checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="detailed-breakdown"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Include Detailed Employee Breakdown
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Individual employee records with pay calculations
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="attendance-records"
                    checked={exportOptions.includeAttendanceRecords}
                    onCheckedChange={(checked) => handleExportOptionsChange('includeAttendanceRecords', checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="attendance-records"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Include Attendance Records
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Daily attendance data and time calculations
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating Export...</span>
                    <span className="text-sm text-muted-foreground">{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    Please wait while we generate your payroll export document.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {exportError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!canExport || isPreviewMode}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Generating Preview...' : 'Preview'}
            </Button>

            <Button
              onClick={handleExport}
              disabled={!canExport}
            >
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}