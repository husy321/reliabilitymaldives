'use client';

import React, { useState, useMemo } from 'react';
import { format, formatDuration, differenceInHours, differenceInMinutes, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Building2,
  Badge as BadgeIcon,
  Timer,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

import type { AttendanceRecord } from '../../../../types/attendance';
import { useAttendanceEditStore, useAttendanceRecordsWithUpdates } from '../../../stores/attendanceEditStore';

interface StaffProfile {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position?: string;
  joinedDate?: Date;
  email?: string;
  phone?: string;
}

interface AttendancePattern {
  averageClockIn: string;
  averageClockOut: string;
  averageHours: number;
  totalDays: number;
  completeDays: number;
  incompleteDays: number;
  lateArrivals: number;
  earlyDepartures: number;
  overtime: number;
}

interface EmployeeAttendanceHistoryProps {
  staffProfile: StaffProfile;
  attendanceRecords: AttendanceRecord[];
  onEditRecord?: (recordId: string) => void;
  isLoading?: boolean;
  showEditButton?: boolean;
  standardWorkHours?: number;
  standardStartTime?: string;
  standardEndTime?: string;
}

export function EmployeeAttendanceHistory({
  staffProfile,
  attendanceRecords,
  onEditRecord,
  isLoading = false,
  showEditButton = true,
  standardWorkHours = 8,
  standardStartTime = '09:00',
  standardEndTime = '17:00'
}: EmployeeAttendanceHistoryProps) {
  const { data: session } = useSession();
  const openEditModal = useAttendanceEditStore((state) => state.openEditModal);
  const [selectedView, setSelectedView] = useState<'timeline' | 'summary' | 'patterns'>('timeline');

  // Apply optimistic updates to records
  const recordsWithUpdates = useAttendanceRecordsWithUpdates(attendanceRecords);

  // Check if user has admin permissions for editing
  const canEdit = session?.user?.role === 'ADMIN' && showEditButton;

  // Calculate attendance patterns and statistics
  const attendanceStats = useMemo(() => {
    if (recordsWithUpdates.length === 0) return null;

    const completeRecords = recordsWithUpdates.filter(r => r.clockInTime && r.clockOutTime);
    const incompleteRecords = recordsWithUpdates.filter(r => !r.clockInTime || !r.clockOutTime);
    
    // Calculate averages
    const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = completeRecords.length > 0 ? totalHours / completeRecords.length : 0;

    // Calculate clock-in patterns
    const clockInTimes = completeRecords
      .map(r => r.clockInTime)
      .filter(Boolean)
      .map(time => format(time!, 'HH:mm'));
    
    const clockOutTimes = completeRecords
      .map(r => r.clockOutTime)
      .filter(Boolean)
      .map(time => format(time!, 'HH:mm'));

    // Late arrivals (after standard start time)
    const standardStart = parseISO(`2000-01-01T${standardStartTime}:00`);
    const lateArrivals = completeRecords.filter(r => {
      if (!r.clockInTime) return false;
      const clockInHour = r.clockInTime.getHours();
      const clockInMinute = r.clockInTime.getMinutes();
      const standardHour = standardStart.getHours();
      const standardMinute = standardStart.getMinutes();
      return clockInHour > standardHour || (clockInHour === standardHour && clockInMinute > standardMinute);
    }).length;

    // Early departures (before standard end time)
    const standardEnd = parseISO(`2000-01-01T${standardEndTime}:00`);
    const earlyDepartures = completeRecords.filter(r => {
      if (!r.clockOutTime) return false;
      const clockOutHour = r.clockOutTime.getHours();
      const clockOutMinute = r.clockOutTime.getMinutes();
      const standardHour = standardEnd.getHours();
      const standardMinute = standardEnd.getMinutes();
      return clockOutHour < standardHour || (clockOutHour === standardHour && clockOutMinute < standardMinute);
    }).length;

    // Overtime records
    const overtimeRecords = completeRecords.filter(r => (r.totalHours || 0) > standardWorkHours).length;

    const pattern: AttendancePattern = {
      averageClockIn: clockInTimes.length > 0 ? 
        format(new Date(`2000-01-01T${clockInTimes.reduce((avg, time) => {
          const [h, m] = time.split(':').map(Number);
          return avg + (h * 60 + m);
        }, 0) / clockInTimes.length / 60}:${(clockInTimes.reduce((avg, time) => {
          const [h, m] = time.split(':').map(Number);
          return avg + (h * 60 + m);
        }, 0) / clockInTimes.length) % 60}:00`), 'HH:mm') : 
        '--:--',
      averageClockOut: clockOutTimes.length > 0 ? 
        format(new Date(`2000-01-01T${clockOutTimes.reduce((avg, time) => {
          const [h, m] = time.split(':').map(Number);
          return avg + (h * 60 + m);
        }, 0) / clockOutTimes.length / 60}:${(clockOutTimes.reduce((avg, time) => {
          const [h, m] = time.split(':').map(Number);
          return avg + (h * 60 + m);
        }, 0) / clockOutTimes.length) % 60}:00`), 'HH:mm') : 
        '--:--',
      averageHours: Math.round(avgHours * 100) / 100,
      totalDays: attendanceRecords.length,
      completeDays: completeRecords.length,
      incompleteDays: incompleteRecords.length,
      lateArrivals,
      earlyDepartures,
      overtime: overtimeRecords
    };

    return {
      totalRecords: recordsWithUpdates.length,
      completeRecords: completeRecords.length,
      incompleteRecords: incompleteRecords.length,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(avgHours * 100) / 100,
      pattern,
      latestRecord: recordsWithUpdates[0],
      oldestRecord: recordsWithUpdates[recordsWithUpdates.length - 1]
    };
  }, [recordsWithUpdates, standardWorkHours, standardStartTime, standardEndTime]);

  // Group records by week for timeline view
  const weeklyGroupedRecords = useMemo(() => {
    const groups: Record<string, AttendanceRecord[]> = {};

    recordsWithUpdates.forEach(record => {
      const weekStart = startOfWeek(record.date, { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(record);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([weekStart, records]) => ({
        weekStart: new Date(weekStart),
        weekEnd: endOfWeek(new Date(weekStart), { weekStartsOn: 1 }),
        records: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
  }, [recordsWithUpdates]);

  const getAttendanceStatusInfo = (record: AttendanceRecord) => {
    if (record.clockInTime && record.clockOutTime) {
      return {
        status: 'complete',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Complete'
      };
    } else if (record.clockInTime && !record.clockOutTime) {
      return {
        status: 'in-progress',
        icon: Timer,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: 'In Progress'
      };
    } else if (!record.clockInTime && record.clockOutTime) {
      return {
        status: 'out-only',
        icon: AlertTriangle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Clock Out Only'
      };
    } else {
      return {
        status: 'incomplete',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'No Records'
      };
    }
  };

  const getSyncStatusInfo = (record: AttendanceRecord) => {
    if (!record.lastSyncStatus) {
      return {
        status: 'unknown',
        icon: AlertTriangle,
        color: 'text-gray-500',
        label: 'Unknown'
      };
    }

    switch (record.lastSyncStatus) {
      case 'SUCCESS':
        return {
          status: 'success',
          icon: CheckCircle,
          color: 'text-green-600',
          label: 'Synced'
        };
      case 'FAILED':
        return {
          status: 'failed',
          icon: XCircle,
          color: 'text-red-600',
          label: 'Sync Failed'
        };
      case 'PARTIAL':
        return {
          status: 'partial',
          icon: AlertTriangle,
          color: 'text-amber-600',
          label: 'Partial Sync'
        };
      case 'PENDING':
        return {
          status: 'pending',
          icon: Timer,
          color: 'text-blue-600',
          label: 'Sync Pending'
        };
      default:
        return {
          status: 'unknown',
          icon: AlertTriangle,
          color: 'text-gray-500',
          label: 'Unknown'
        };
    }
  };

  const getValidationStatusInfo = (record: AttendanceRecord) => {
    if (!record.validationStatus) {
      return {
        status: 'unknown',
        icon: AlertTriangle,
        color: 'text-gray-500',
        label: 'Not Validated'
      };
    }

    switch (record.validationStatus) {
      case 'VALIDATED':
        return {
          status: 'validated',
          icon: CheckCircle,
          color: 'text-green-600',
          label: 'Validated'
        };
      case 'FAILED':
        return {
          status: 'failed',
          icon: XCircle,
          color: 'text-red-600',
          label: 'Validation Failed'
        };
      case 'PENDING':
        return {
          status: 'pending',
          icon: Timer,
          color: 'text-amber-600',
          label: 'Validation Pending'
        };
      case 'SKIPPED':
        return {
          status: 'skipped',
          icon: AlertTriangle,
          color: 'text-blue-600',
          label: 'Validation Skipped'
        };
      default:
        return {
          status: 'unknown',
          icon: AlertTriangle,
          color: 'text-gray-500',
          label: 'Unknown'
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-6 w-6 animate-pulse mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">Loading attendance history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Employee Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{staffProfile.name}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <BadgeIcon className="h-3 w-3" />
                    ID: {staffProfile.employeeId}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {staffProfile.department}
                  </div>
                  {staffProfile.position && (
                    <div>{staffProfile.position}</div>
                  )}
                </div>
              </div>
            </div>
            {showEditButton && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      {attendanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Days</div>
                </div>
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.averageHours}h</div>
                  <div className="text-sm text-muted-foreground">Avg Hours</div>
                </div>
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round((attendanceStats.completeRecords / attendanceStats.totalRecords) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Complete Records</div>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <Progress 
                value={(attendanceStats.completeRecords / attendanceStats.totalRecords) * 100} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.pattern.overtime}</div>
                  <div className="text-sm text-muted-foreground">Overtime Days</div>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          {weeklyGroupedRecords.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {weeklyGroupedRecords.map(({ weekStart, weekEnd, records }) => (
                  <Card key={format(weekStart, 'yyyy-MM-dd')}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                        <Badge variant="outline">{records.length} days</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {records.map((record) => {
                          const statusInfo = getAttendanceStatusInfo(record);
                          const syncInfo = getSyncStatusInfo(record);
                          const validationInfo = getValidationStatusInfo(record);
                          const StatusIcon = statusInfo.icon;
                          const SyncIcon = syncInfo.icon;
                          const ValidationIcon = validationInfo.icon;
                          
                          return (
                            <div
                              key={record.id}
                              className={`p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                            >
                              <div className="space-y-3">
                                {/* Main attendance info */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                                    <div>
                                      <div className="font-medium">
                                        {format(record.date, 'EEEE, MMM dd')}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {record.clockInTime && (
                                          <span>In: {format(record.clockInTime, 'HH:mm:ss')}</span>
                                        )}
                                        {record.clockInTime && record.clockOutTime && ' • '}
                                        {record.clockOutTime && (
                                          <span>Out: {format(record.clockOutTime, 'HH:mm:ss')}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {record.totalHours !== null ? (
                                      <Badge variant="secondary">
                                        {record.totalHours.toFixed(2)}h
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Incomplete</Badge>
                                    )}
                                    {canEdit && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(record)}
                                        title="Edit attendance record"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* ZKT and Validation Status */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                  <div className="flex items-center space-x-4 text-xs">
                                    {/* ZKT Transaction */}
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        ZKT: {record.zkTransactionId}
                                      </Badge>
                                    </div>
                                    
                                    {/* Sync Status */}
                                    <div className="flex items-center gap-1">
                                      <SyncIcon className={`h-3 w-3 ${syncInfo.color}`} />
                                      <span className={syncInfo.color}>{syncInfo.label}</span>
                                    </div>
                                    
                                    {/* Validation Status */}
                                    <div className="flex items-center gap-1">
                                      <ValidationIcon className={`h-3 w-3 ${validationInfo.color}`} />
                                      <span className={validationInfo.color}>{validationInfo.label}</span>
                                    </div>
                                  </div>

                                  {/* Sync Details */}
                                  <div className="text-xs text-muted-foreground">
                                    {record.syncedAt && (
                                      <span>Synced: {format(record.syncedAt, 'HH:mm:ss')}</span>
                                    )}
                                    {record.syncSource && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {record.syncSource}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Conflict Indicator */}
                                {record.hasConflict && (
                                  <div className="pt-2 border-t border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span className="text-xs font-medium">
                                        {record.conflictResolved ? 'Conflict Resolved' : 'Conflict Detected'}
                                      </span>
                                      {record.conflictDetails && (
                                        <Badge variant="outline" className="text-xs">
                                          {record.conflictDetails}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Validation Errors */}
                                {record.validationErrors && record.validationErrors.length > 0 && (
                                  <div className="pt-2 border-t border-red-200">
                                    <div className="text-xs text-red-600">
                                      <div className="font-medium mb-1">Validation Issues:</div>
                                      <ul className="list-disc list-inside space-y-1">
                                        {record.validationErrors.map((error, index) => (
                                          <li key={index}>{error}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Alert>
              <AlertDescription>
                No attendance records found for this employee.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Summary View */}
        <TabsContent value="summary" className="space-y-4">
          {attendanceStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Record Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Records:</span>
                    <Badge>{attendanceStats.totalRecords}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Complete Records:</span>
                    <Badge variant="secondary">{attendanceStats.completeRecords}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Incomplete Records:</span>
                    <Badge variant="destructive">{attendanceStats.incompleteRecords}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Total Hours:</span>
                    <Badge variant="outline">{attendanceStats.totalHours}h</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Hours/Day:</span>
                    <Badge variant="outline">{attendanceStats.averageHours}h</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Late Arrivals:</span>
                    <Badge variant={attendanceStats.pattern.lateArrivals > 0 ? "destructive" : "secondary"}>
                      {attendanceStats.pattern.lateArrivals}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Early Departures:</span>
                    <Badge variant={attendanceStats.pattern.earlyDepartures > 0 ? "destructive" : "secondary"}>
                      {attendanceStats.pattern.earlyDepartures}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Overtime Days:</span>
                    <Badge variant="secondary">{attendanceStats.pattern.overtime}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Attendance Rate:</span>
                    <Badge variant="outline">
                      {Math.round((attendanceStats.completeRecords / attendanceStats.totalRecords) * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No data available to generate summary.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Patterns View */}
        <TabsContent value="patterns" className="space-y-4">
          {attendanceStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Time Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Average Clock-in Time</div>
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceStats.pattern.averageClockIn}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Average Clock-out Time</div>
                    <div className="text-2xl font-bold text-red-600">
                      {attendanceStats.pattern.averageClockOut}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Average Daily Hours</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {attendanceStats.pattern.averageHours}h
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>On-time Arrivals</span>
                      <span>{attendanceStats.pattern.totalDays - attendanceStats.pattern.lateArrivals}/{attendanceStats.pattern.totalDays}</span>
                    </div>
                    <Progress 
                      value={((attendanceStats.pattern.totalDays - attendanceStats.pattern.lateArrivals) / attendanceStats.pattern.totalDays) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Full Day Attendance</span>
                      <span>{attendanceStats.pattern.completeDays}/{attendanceStats.pattern.totalDays}</span>
                    </div>
                    <Progress 
                      value={(attendanceStats.pattern.completeDays / attendanceStats.pattern.totalDays) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Standard Hours Compliance</span>
                      <span>{attendanceStats.pattern.totalDays - attendanceStats.pattern.overtime}/{attendanceStats.pattern.totalDays}</span>
                    </div>
                    <Progress 
                      value={((attendanceStats.pattern.totalDays - attendanceStats.pattern.overtime) / attendanceStats.pattern.totalDays) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No data available to analyze patterns.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}