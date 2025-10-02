'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Clock, DollarSign, FileText, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { PayrollRecord, PayrollCalculationData } from '@/types/payroll';

interface PayrollEmployeeDetailProps {
  payrollRecord: PayrollRecord & {
    employee: {
      id: string;
      employeeId: string;
      name: string;
      department: string;
    };
    payrollPeriod: {
      id: string;
      startDate: Date;
      endDate: Date;
      status: string;
      attendancePeriod?: {
        id: string;
        startDate: Date;
        endDate: Date;
        status: string;
      };
      calculatedByUser?: {
        id: string;
        name: string;
        email: string;
      };
    };
  };
  attendanceRecords?: any[];
  className?: string;
}

export function PayrollEmployeeDetail({
  payrollRecord,
  attendanceRecords = [],
  className
}: PayrollEmployeeDetailProps) {
  const calculationData = payrollRecord.calculationData as PayrollCalculationData;

  const totalHours = payrollRecord.standardHours + payrollRecord.overtimeHours;
  const standardPay = payrollRecord.standardHours * payrollRecord.standardRate;
  const overtimePay = payrollRecord.overtimeHours * payrollRecord.overtimeRate;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Employee Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xl">{payrollRecord.employee.name}</div>
              <div className="text-sm text-muted-foreground font-normal">
                ID: {payrollRecord.employee.employeeId} • Department: {payrollRecord.employee.department}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-sm text-muted-foreground">Period</div>
              <div className="text-sm font-semibold">
                {format(payrollRecord.payrollPeriod.startDate, "MMM dd")} - {format(payrollRecord.payrollPeriod.endDate, "MMM dd")}
              </div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-sm text-muted-foreground">Total Hours</div>
              <div className="text-lg font-bold">{totalHours.toFixed(1)}</div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <div className="text-sm text-muted-foreground">OT Hours</div>
              <div className="text-lg font-bold">{payrollRecord.overtimeHours.toFixed(1)}</div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-sm text-muted-foreground">Gross Pay</div>
              <div className="text-lg font-bold">${payrollRecord.grossPay.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pay Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Pay Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hours & Rates */}
            <div className="space-y-4">
              <h4 className="font-semibold text-muted-foreground">Hours & Rates</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Regular Hours:</span>
                  <span className="font-medium">{payrollRecord.standardHours.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Hours:</span>
                  <span className="font-medium">{payrollRecord.overtimeHours.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Hours:</span>
                  <span className="font-semibold">{totalHours.toFixed(1)} hrs</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span>Regular Rate:</span>
                  <span className="font-medium">${payrollRecord.standardRate.toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Rate:</span>
                  <span className="font-medium">${payrollRecord.overtimeRate.toFixed(2)}/hr</span>
                </div>
              </div>
            </div>

            {/* Pay Calculation */}
            <div className="space-y-4">
              <h4 className="font-semibold text-muted-foreground">Pay Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Regular Pay:</span>
                  <span className="font-medium">
                    ${standardPay.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Pay:</span>
                  <span className="font-medium">
                    ${overtimePay.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Gross Pay:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${payrollRecord.grossPay.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Overtime Rules */}
              {calculationData?.overtimeRules && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>OT Rules:</strong> Daily threshold: {calculationData.overtimeRules.dailyThreshold}hrs,
                    Weekly threshold: {calculationData.overtimeRules.weeklyThreshold}hrs,
                    OT rate: {(calculationData.overtimeRules.overtimeRate * 100).toFixed(0)}% of regular
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Hours Breakdown */}
      {calculationData?.dailyHours && calculationData.dailyHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Hours Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>OT Hours</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationData.dailyHours.map((day, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(parseISO(day.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{day.regularHours.toFixed(1)}</TableCell>
                      <TableCell>
                        {day.overtimeHours > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {day.overtimeHours.toFixed(1)}
                          </span>
                        ) : (
                          '0.0'
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{day.totalHours.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Daily Summary */}
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold">
                    {calculationData.dailyHours.reduce((sum, day) => sum + day.regularHours, 0).toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">Total Regular</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-amber-600">
                    {calculationData.dailyHours.reduce((sum, day) => sum + day.overtimeHours, 0).toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">Total OT</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">
                    {calculationData.dailyHours.reduce((sum, day) => sum + day.totalHours, 0).toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">Grand Total</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records */}
      {attendanceRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Source Attendance Records ({attendanceRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {record.clockInTime
                          ? format(new Date(record.clockInTime), "HH:mm")
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {record.clockOutTime
                          ? format(new Date(record.clockOutTime), "HH:mm")
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {record.totalHours ? record.totalHours.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.isFinalized ? 'default' : 'outline'}>
                          {record.isFinalized ? 'Finalized' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Calculation Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Payroll Period Status:</span>
              <Badge>{payrollRecord.payrollPeriod.status}</Badge>
            </div>
            {payrollRecord.payrollPeriod.calculatedByUser && (
              <div className="flex justify-between">
                <span>Calculated By:</span>
                <span>{payrollRecord.payrollPeriod.calculatedByUser.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Record Created:</span>
              <span>{format(payrollRecord.createdAt, "PPP 'at' p")}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{format(payrollRecord.updatedAt, "PPP 'at' p")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}