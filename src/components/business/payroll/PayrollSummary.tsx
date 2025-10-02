'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Clock, DollarSign, TrendingUp, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';
import type { PayrollPeriod, PayrollSummary as PayrollSummaryType, PayrollRecord } from '@/types/payroll';

interface PayrollSummaryProps {
  payrollPeriod: PayrollPeriod;
  summary: PayrollSummaryType;
  className?: string;
}

export function PayrollSummary({ payrollPeriod, summary, className }: PayrollSummaryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'CALCULATING': return 'bg-blue-100 text-blue-800';
      case 'CALCULATED': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Payroll Period Summary
            </CardTitle>
            <Badge className={getStatusColor(payrollPeriod.status)}>
              {payrollPeriod.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Period</div>
              <div className="text-sm font-semibold">
                {format(payrollPeriod.startDate, "MMM dd")} - {format(payrollPeriod.endDate, "MMM dd, yyyy")}
              </div>
            </div>

            <div className="text-center p-4 bg-secondary rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Employees</div>
              <div className="text-2xl font-bold">{summary.totalEmployees}</div>
            </div>

            <div className="text-center p-4 bg-secondary rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Total Hours</div>
              <div className="text-xl font-bold">
                {(summary.totalStandardHours + summary.totalOvertimeHours).toFixed(1)}
              </div>
            </div>

            <div className="text-center p-4 bg-secondary rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium text-muted-foreground mb-1">Total Pay</div>
              <div className="text-2xl font-bold">${summary.totalGrossPay.toFixed(2)}</div>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Hours Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Regular Hours:</span>
                  <span className="font-medium">{summary.totalStandardHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Overtime Hours:</span>
                  <span className="font-medium">{summary.totalOvertimeHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Total Hours:</span>
                  <span className="font-semibold">
                    {(summary.totalStandardHours + summary.totalOvertimeHours).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Averages</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Avg Hours/Employee:</span>
                  <span className="font-medium">{summary.averageHoursPerEmployee.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Pay/Employee:</span>
                  <span className="font-medium">
                    ${summary.totalEmployees > 0 ? (summary.totalGrossPay / summary.totalEmployees).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Overtime %:</span>
                  <span className="font-semibold flex items-center gap-1">
                    {summary.overtimePercentage.toFixed(1)}%
                    <TrendingUp className="h-3 w-3 text-amber-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Details */}
          {payrollPeriod.calculatedAt && payrollPeriod.calculatedByUser && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Calculated by {payrollPeriod.calculatedByUser.name} on {format(payrollPeriod.calculatedAt, "PPP 'at' p")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Employee Records Table */}
      {payrollPeriod.payrollRecords && payrollPeriod.payrollRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>OT Hours</TableHead>
                    <TableHead>Standard Rate</TableHead>
                    <TableHead>OT Rate</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPeriod.payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.employee?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{record.employee?.department || 'N/A'}</TableCell>
                      <TableCell>{record.standardHours.toFixed(1)}</TableCell>
                      <TableCell>{record.overtimeHours.toFixed(1)}</TableCell>
                      <TableCell>${record.standardRate.toFixed(2)}</TableCell>
                      <TableCell>${record.overtimeRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${record.grossPay.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary Row */}
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <div className="flex justify-between items-center font-semibold">
                <span>Total for {summary.totalEmployees} employees:</span>
                <span className="text-lg">${summary.totalGrossPay.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}