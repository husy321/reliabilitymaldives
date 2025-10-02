'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Calendar, Building, CheckCircle, XCircle, Edit, Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { AttendanceRecord } from '../../../../types/attendance';
import { useAttendanceEditStore, useAttendanceRecordsWithUpdates } from '../../../stores/attendanceEditStore';

interface AttendanceResultsProps {
  records: AttendanceRecord[];
  title?: string;
  showStats?: boolean;
}

export function AttendanceResults({
  records,
  title = "Attendance Records",
  showStats = true
}: AttendanceResultsProps) {
  const { data: session } = useSession();
  const openEditModal = useAttendanceEditStore((state) => state.openEditModal);

  // Apply optimistic updates to records
  const recordsWithUpdates = useAttendanceRecordsWithUpdates(records);

  // Check if user has admin permissions for editing
  const canEdit = session?.user?.role === 'ADMIN';
  // Calculate statistics using updated records
  const stats = React.useMemo(() => {
    const totalRecords = recordsWithUpdates.length;
    const recordsWithBothTimes = recordsWithUpdates.filter(r => r.clockInTime && r.clockOutTime).length;
    const recordsWithOnlyClockIn = recordsWithUpdates.filter(r => r.clockInTime && !r.clockOutTime).length;
    const recordsWithOnlyClockOut = recordsWithUpdates.filter(r => !r.clockInTime && r.clockOutTime).length;
    const totalHours = recordsWithUpdates.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = totalRecords > 0 ? totalHours / totalRecords : 0;

    // Group by department using updated records
    const byDepartment = recordsWithUpdates.reduce((acc, record) => {
      const dept = record.staff?.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRecords,
      recordsWithBothTimes,
      recordsWithOnlyClockIn,
      recordsWithOnlyClockOut,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHours: Math.round(avgHours * 100) / 100,
      byDepartment
    };
  }, [recordsWithUpdates]);

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No attendance records found for the selected criteria.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.recordsWithBothTimes}</div>
                  <div className="text-sm text-muted-foreground">Complete Records</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.avgHours}h</div>
                  <div className="text-sm text-muted-foreground">Avg Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{Object.keys(stats.byDepartment).length}</div>
                  <div className="text-sm text-muted-foreground">Departments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title} ({records.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Finalization</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsWithUpdates.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{record.staff?.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ID: {record.employeeId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.staff?.department || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(record.date, 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.clockInTime ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <Clock className="h-3 w-3" />
                          {format(record.clockInTime, 'HH:mm:ss')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.clockOutTime ? (
                        <div className="flex items-center gap-1 text-red-700">
                          <Clock className="h-3 w-3" />
                          {format(record.clockOutTime, 'HH:mm:ss')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.totalHours !== null ? (
                        <Badge variant="secondary">
                          {record.totalHours.toFixed(2)}h
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge record={record} />
                    </TableCell>
                    <TableCell>
                      <FinalizationStatusBadge record={record} />
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(record)}
                          className="h-8 w-8 p-0"
                          title={record.isFinalized ? "Record is finalized and cannot be edited" : "Edit attendance record"}
                          disabled={record.isFinalized}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Department Summary */}
      {showStats && Object.keys(stats.byDepartment).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Department Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byDepartment)
                .sort(([, a], [, b]) => b - a)
                .map(([department, count]) => (
                  <div key={department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{department}</span>
                    <Badge>{count} records</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Insights */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-green-600">{stats.recordsWithBothTimes}</div>
                <div className="text-sm text-muted-foreground">Complete Records</div>
                <div className="text-xs text-muted-foreground">
                  ({Math.round((stats.recordsWithBothTimes / stats.totalRecords) * 100)}%)
                </div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-amber-600">{stats.recordsWithOnlyClockIn}</div>
                <div className="text-sm text-muted-foreground">Only Clock In</div>
                <div className="text-xs text-muted-foreground">
                  ({Math.round((stats.recordsWithOnlyClockIn / stats.totalRecords) * 100)}%)
                </div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-blue-600">{stats.recordsWithOnlyClockOut}</div>
                <div className="text-sm text-muted-foreground">Only Clock Out</div>
                <div className="text-xs text-muted-foreground">
                  ({Math.round((stats.recordsWithOnlyClockOut / stats.totalRecords) * 100)}%)
                </div>
              </div>
            </div>

            {(stats.recordsWithOnlyClockIn > 0 || stats.recordsWithOnlyClockOut > 0) && (
              <Alert>
                <AlertDescription>
                  {stats.recordsWithOnlyClockIn > 0 && (
                    <div>• {stats.recordsWithOnlyClockIn} records have only clock-in times (missing clock-out)</div>
                  )}
                  {stats.recordsWithOnlyClockOut > 0 && (
                    <div>• {stats.recordsWithOnlyClockOut} records have only clock-out times (missing clock-in)</div>
                  )}
                  <div className="mt-2 text-sm">
                    Consider reviewing these records for data completeness.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for attendance status
function AttendanceStatusBadge({ record }: { record: AttendanceRecord }) {
  if (record.clockInTime && record.clockOutTime) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    );
  }
  
  if (record.clockInTime && !record.clockOutTime) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    );
  }
  
  if (!record.clockInTime && record.clockOutTime) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <XCircle className="h-3 w-3 mr-1" />
        Out Only
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline">
      <XCircle className="h-3 w-3 mr-1" />
      Incomplete
    </Badge>
  );
}

// Helper component for finalization status
function FinalizationStatusBadge({ record }: { record: AttendanceRecord }) {
  if (record.isFinalized) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <Lock className="h-3 w-3 mr-1" />
        Finalized
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <Calendar className="h-3 w-3 mr-1" />
      Editable
    </Badge>
  );
}