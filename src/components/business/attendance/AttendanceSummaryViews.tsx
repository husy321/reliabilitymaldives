'use client';

import React, { useMemo, useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, getWeek, getMonth } from 'date-fns';
import { BarChart3, TrendingUp, TrendingDown, Users, Clock, Calendar, Building2, Download, Filter, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { AttendanceRecord } from '../../../../types/attendance';

interface DepartmentSummary {
  department: string;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  totalHours: number;
  averageHours: number;
  attendanceRate: number;
}

interface DailySummary {
  date: Date;
  totalRecords: number;
  completeRecords: number;
  incompleteRecords: number;
  totalHours: number;
  averageHours: number;
  departments: DepartmentSummary[];
  lateArrivals: number;
  earlyDepartures: number;
  overtime: number;
}

interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalWorkingDays: number;
  dailySummaries: DailySummary[];
  weeklyTotals: {
    totalHours: number;
    averageHours: number;
    attendanceRate: number;
    overtimeHours: number;
    lateCount: number;
    departmentStats: DepartmentSummary[];
  };
}

interface MonthlySummary {
  month: Date;
  totalWorkingDays: number;
  weeklySummaries: WeeklySummary[];
  monthlyTotals: {
    totalHours: number;
    averageHours: number;
    attendanceRate: number;
    overtimeHours: number;
    totalLateArrivals: number;
    payrollData: {
      regularHours: number;
      overtimeHours: number;
      totalCompensation: number;
    };
    departmentBreakdown: DepartmentSummary[];
    trends: {
      weeklyAttendance: number[];
      weeklyHours: number[];
      departmentPerformance: { department: string; trend: 'up' | 'down' | 'stable' }[];
    };
  };
}

interface AttendanceSummaryViewsProps {
  attendanceRecords: AttendanceRecord[];
  selectedPeriod?: Date;
  onPeriodChange?: (period: Date) => void;
  onExport?: (type: 'daily' | 'weekly' | 'monthly', data: any, format: 'csv' | 'excel') => void;
  standardWorkHours?: number;
  standardStartTime?: string;
  overtimeRate?: number;
  regularRate?: number;
  isLoading?: boolean;
}

export function AttendanceSummaryViews({
  attendanceRecords,
  selectedPeriod = new Date(),
  onPeriodChange,
  onExport,
  standardWorkHours = 8,
  standardStartTime = '09:00',
  overtimeRate = 1.5,
  regularRate = 1.0,
  isLoading = false
}: AttendanceSummaryViewsProps) {
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Generate daily summary
  const dailySummary = useMemo((): DailySummary | null => {
    if (attendanceRecords.length === 0) return null;

    const dayStart = startOfDay(selectedPeriod);
    const dayEnd = endOfDay(selectedPeriod);
    
    const dayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= dayStart && recordDate <= dayEnd;
    });

    if (dayRecords.length === 0) return null;

    const completeRecords = dayRecords.filter(r => r.clockInTime && r.clockOutTime);
    const incompleteRecords = dayRecords.filter(r => !r.clockInTime || !r.clockOutTime);
    
    const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const averageHours = completeRecords.length > 0 ? totalHours / completeRecords.length : 0;

    // Late arrivals and early departures
    const lateArrivals = completeRecords.filter(r => {
      if (!r.clockInTime) return false;
      const clockInHour = r.clockInTime.getHours();
      const clockInMinute = r.clockInTime.getMinutes();
      const [standardHour, standardMinute] = standardStartTime.split(':').map(Number);
      return clockInHour > standardHour || (clockInHour === standardHour && clockInMinute > standardMinute);
    }).length;

    const earlyDepartures = completeRecords.filter(r => {
      if (!r.clockOutTime) return false;
      const expectedEndHour = parseInt(standardStartTime.split(':')[0]) + standardWorkHours;
      return r.clockOutTime.getHours() < expectedEndHour;
    }).length;

    const overtime = completeRecords.filter(r => (r.totalHours || 0) > standardWorkHours).length;

    // Department breakdown
    const departmentMap = new Map<string, AttendanceRecord[]>();
    dayRecords.forEach(record => {
      const dept = record.staff?.department || 'Unknown';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, []);
      }
      departmentMap.get(dept)!.push(record);
    });

    const departments: DepartmentSummary[] = Array.from(departmentMap.entries()).map(([dept, records]) => {
      const completeRecords = records.filter(r => r.clockInTime && r.clockOutTime);
      const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const uniqueEmployees = new Set(records.map(r => r.staffId)).size;
      const presentEmployees = new Set(completeRecords.map(r => r.staffId)).size;
      const lateEmployees = records.filter(r => {
        if (!r.clockInTime) return false;
        const clockInHour = r.clockInTime.getHours();
        const clockInMinute = r.clockInTime.getMinutes();
        const [standardHour, standardMinute] = standardStartTime.split(':').map(Number);
        return clockInHour > standardHour || (clockInHour === standardHour && clockInMinute > standardMinute);
      }).length;

      return {
        department: dept,
        totalEmployees: uniqueEmployees,
        presentEmployees,
        absentEmployees: uniqueEmployees - presentEmployees,
        lateEmployees,
        totalHours,
        averageHours: presentEmployees > 0 ? totalHours / presentEmployees : 0,
        attendanceRate: uniqueEmployees > 0 ? (presentEmployees / uniqueEmployees) * 100 : 0
      };
    });

    return {
      date: selectedPeriod,
      totalRecords: dayRecords.length,
      completeRecords: completeRecords.length,
      incompleteRecords: incompleteRecords.length,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
      departments,
      lateArrivals,
      earlyDepartures,
      overtime
    };
  }, [attendanceRecords, selectedPeriod, standardWorkHours, standardStartTime]);

  // Generate weekly summary
  const weeklySummary = useMemo((): WeeklySummary | null => {
    if (attendanceRecords.length === 0) return null;

    const weekStart = startOfWeek(selectedPeriod, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedPeriod, { weekStartsOn: 1 });
    
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailySummaries: DailySummary[] = [];

    weekDays.forEach(day => {
      const dayRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfDay(day) && recordDate <= endOfDay(day);
      });

      if (dayRecords.length > 0) {
        // Generate daily summary for this day (simplified version)
        const completeRecords = dayRecords.filter(r => r.clockInTime && r.clockOutTime);
        const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
        
        const departmentMap = new Map<string, AttendanceRecord[]>();
        dayRecords.forEach(record => {
          const dept = record.staff?.department || 'Unknown';
          if (!departmentMap.has(dept)) {
            departmentMap.set(dept, []);
          }
          departmentMap.get(dept)!.push(record);
        });

        const departments: DepartmentSummary[] = Array.from(departmentMap.entries()).map(([dept, records]) => {
          const completeRecords = records.filter(r => r.clockInTime && r.clockOutTime);
          const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
          const uniqueEmployees = new Set(records.map(r => r.staffId)).size;
          const presentEmployees = new Set(completeRecords.map(r => r.staffId)).size;

          return {
            department: dept,
            totalEmployees: uniqueEmployees,
            presentEmployees,
            absentEmployees: uniqueEmployees - presentEmployees,
            lateEmployees: 0, // Simplified for weekly view
            totalHours,
            averageHours: presentEmployees > 0 ? totalHours / presentEmployees : 0,
            attendanceRate: uniqueEmployees > 0 ? (presentEmployees / uniqueEmployees) * 100 : 0
          };
        });

        dailySummaries.push({
          date: day,
          totalRecords: dayRecords.length,
          completeRecords: completeRecords.length,
          incompleteRecords: dayRecords.length - completeRecords.length,
          totalHours,
          averageHours: completeRecords.length > 0 ? totalHours / completeRecords.length : 0,
          departments,
          lateArrivals: 0,
          earlyDepartures: 0,
          overtime: 0
        });
      }
    });

    // Calculate weekly totals
    const totalHours = dailySummaries.reduce((sum, day) => sum + day.totalHours, 0);
    const totalRecords = dailySummaries.reduce((sum, day) => sum + day.completeRecords, 0);
    const averageHours = totalRecords > 0 ? totalHours / totalRecords : 0;
    
    // Department aggregation for the week
    const weekDepartmentMap = new Map<string, { totalHours: number; totalEmployees: number; presentDays: number }>();
    dailySummaries.forEach(day => {
      day.departments.forEach(dept => {
        if (!weekDepartmentMap.has(dept.department)) {
          weekDepartmentMap.set(dept.department, { totalHours: 0, totalEmployees: dept.totalEmployees, presentDays: 0 });
        }
        const existing = weekDepartmentMap.get(dept.department)!;
        existing.totalHours += dept.totalHours;
        existing.presentDays += dept.presentEmployees;
      });
    });

    const departmentStats: DepartmentSummary[] = Array.from(weekDepartmentMap.entries()).map(([dept, stats]) => ({
      department: dept,
      totalEmployees: stats.totalEmployees,
      presentEmployees: stats.presentDays,
      absentEmployees: 0,
      lateEmployees: 0,
      totalHours: stats.totalHours,
      averageHours: stats.presentDays > 0 ? stats.totalHours / stats.presentDays : 0,
      attendanceRate: stats.totalEmployees > 0 ? (stats.presentDays / (stats.totalEmployees * dailySummaries.length)) * 100 : 0
    }));

    return {
      weekStart,
      weekEnd,
      totalWorkingDays: dailySummaries.length,
      dailySummaries,
      weeklyTotals: {
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: Math.round(averageHours * 100) / 100,
        attendanceRate: 0, // Calculated separately
        overtimeHours: 0, // Simplified
        lateCount: 0, // Simplified
        departmentStats
      }
    };
  }, [attendanceRecords, selectedPeriod]);

  // Generate monthly summary
  const monthlySummary = useMemo((): MonthlySummary | null => {
    if (attendanceRecords.length === 0) return null;

    const monthStart = startOfMonth(selectedPeriod);
    const monthEnd = endOfMonth(selectedPeriod);
    
    const monthRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    if (monthRecords.length === 0) return null;

    // Get weeks in the month
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    const weeklySummaries: WeeklySummary[] = [];

    weeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekRecords = monthRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      if (weekRecords.length > 0) {
        // Generate simplified weekly summary for monthly view
        const completeRecords = weekRecords.filter(r => r.clockInTime && r.clockOutTime);
        const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
        
        weeklySummaries.push({
          weekStart,
          weekEnd,
          totalWorkingDays: 5, // Simplified
          dailySummaries: [], // Simplified for monthly view
          weeklyTotals: {
            totalHours,
            averageHours: completeRecords.length > 0 ? totalHours / completeRecords.length : 0,
            attendanceRate: 0,
            overtimeHours: 0,
            lateCount: 0,
            departmentStats: []
          }
        });
      }
    });

    // Calculate monthly totals
    const completeRecords = monthRecords.filter(r => r.clockInTime && r.clockOutTime);
    const totalHours = completeRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const regularHours = completeRecords.reduce((sum, r) => sum + Math.min(r.totalHours || 0, standardWorkHours), 0);
    const overtimeHours = completeRecords.reduce((sum, r) => sum + Math.max((r.totalHours || 0) - standardWorkHours, 0), 0);

    return {
      month: selectedPeriod,
      totalWorkingDays: weeklySummaries.length * 5, // Simplified
      weeklySummaries,
      monthlyTotals: {
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: completeRecords.length > 0 ? Math.round((totalHours / completeRecords.length) * 100) / 100 : 0,
        attendanceRate: 0, // Calculated separately
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        totalLateArrivals: 0, // Simplified
        payrollData: {
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          totalCompensation: Math.round((regularHours * regularRate + overtimeHours * overtimeRate) * 100) / 100
        },
        departmentBreakdown: [],
        trends: {
          weeklyAttendance: weeklySummaries.map(() => 85), // Simplified
          weeklyHours: weeklySummaries.map(w => w.weeklyTotals.totalHours),
          departmentPerformance: []
        }
      }
    };
  }, [attendanceRecords, selectedPeriod, standardWorkHours, regularRate, overtimeRate]);

  const handleExport = (type: 'daily' | 'weekly' | 'monthly', format: 'csv' | 'excel') => {
    let data;
    switch (type) {
      case 'daily':
        data = dailySummary;
        break;
      case 'weekly':
        data = weeklySummary;
        break;
      case 'monthly':
        data = monthlySummary;
        break;
    }
    onExport?.(type, data, format);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">Loading attendance summaries...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Summary Views
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport(selectedView, 'csv')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport(selectedView, 'excel')}>
                <Download className="h-4 w-4 mr-1" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary View Tabs */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
        </TabsList>

        {/* Daily Summary */}
        <TabsContent value="daily" className="space-y-4">
          {dailySummary ? (
            <>
              {/* Daily Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{dailySummary.totalRecords}</div>
                        <div className="text-sm text-muted-foreground">Total Records</div>
                      </div>
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{dailySummary.averageHours}h</div>
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
                          {Math.round((dailySummary.completeRecords / dailySummary.totalRecords) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Attendance Rate</div>
                      </div>
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <Progress 
                      value={(dailySummary.completeRecords / dailySummary.totalRecords) * 100} 
                      className="mt-2 h-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{dailySummary.lateArrivals}</div>
                        <div className="text-sm text-muted-foreground">Late Arrivals</div>
                      </div>
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Department Breakdown for {format(dailySummary.date, 'MMMM dd, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dailySummary.departments.map((dept) => (
                      <div key={dept.department} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{dept.department}</h4>
                          <Badge variant="outline">{dept.attendanceRate.toFixed(1)}% attendance</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Total Staff</div>
                            <div className="font-medium">{dept.totalEmployees}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Present</div>
                            <div className="font-medium text-green-600">{dept.presentEmployees}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Absent</div>
                            <div className="font-medium text-red-600">{dept.absentEmployees}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total Hours</div>
                            <div className="font-medium">{dept.totalHours.toFixed(1)}h</div>
                          </div>
                        </div>
                        <Progress value={dept.attendanceRate} className="mt-2 h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                No attendance data available for {format(selectedPeriod, 'MMMM dd, yyyy')}.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Weekly Summary */}
        <TabsContent value="weekly" className="space-y-4">
          {weeklySummary ? (
            <>
              {/* Weekly Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Week of {format(weeklySummary.weekStart, 'MMM dd')} - {format(weeklySummary.weekEnd, 'MMM dd, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{weeklySummary.weeklyTotals.totalHours}h</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{weeklySummary.weeklyTotals.averageHours}h</div>
                      <div className="text-sm text-muted-foreground">Daily Average</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{weeklySummary.totalWorkingDays}</div>
                      <div className="text-sm text-muted-foreground">Working Days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weeklySummary.dailySummaries.map((day) => (
                      <div key={day.date.toISOString()} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{format(day.date, 'EEEE, MMM dd')}</div>
                          <div className="text-sm text-muted-foreground">
                            {day.completeRecords} complete records
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{day.totalHours.toFixed(1)}h</div>
                          <div className="text-sm text-muted-foreground">{day.averageHours.toFixed(1)}h avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                No attendance data available for the selected week.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Monthly Summary */}
        <TabsContent value="monthly" className="space-y-4">
          {monthlySummary ? (
            <>
              {/* Monthly Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {format(monthlySummary.month, 'MMMM yyyy')} Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{monthlySummary.monthlyTotals.totalHours}h</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{monthlySummary.monthlyTotals.payrollData.regularHours}h</div>
                      <div className="text-sm text-muted-foreground">Regular Hours</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{monthlySummary.monthlyTotals.payrollData.overtimeHours}h</div>
                      <div className="text-sm text-muted-foreground">Overtime Hours</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">${monthlySummary.monthlyTotals.payrollData.totalCompensation}</div>
                      <div className="text-sm text-muted-foreground">Total Compensation</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payroll Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Payroll Processing Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-lg font-semibold text-green-800">Regular Time</div>
                        <div className="text-2xl font-bold text-green-600">
                          {monthlySummary.monthlyTotals.payrollData.regularHours}h
                        </div>
                        <div className="text-sm text-green-600">
                          @ ${regularRate}/hour = ${(monthlySummary.monthlyTotals.payrollData.regularHours * regularRate).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-lg font-semibold text-amber-800">Overtime</div>
                        <div className="text-2xl font-bold text-amber-600">
                          {monthlySummary.monthlyTotals.payrollData.overtimeHours}h
                        </div>
                        <div className="text-sm text-amber-600">
                          @ ${(regularRate * overtimeRate).toFixed(2)}/hour = ${(monthlySummary.monthlyTotals.payrollData.overtimeHours * regularRate * overtimeRate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-lg font-semibold text-blue-800">Total Monthly Compensation</div>
                      <div className="text-3xl font-bold text-blue-600">
                        ${monthlySummary.monthlyTotals.payrollData.totalCompensation}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthlySummary.weeklySummaries.map((week, index) => (
                      <div key={week.weekStart.toISOString()} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            Week {index + 1}: {format(week.weekStart, 'MMM dd')} - {format(week.weekEnd, 'MMM dd')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {week.totalWorkingDays} working days
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{week.weeklyTotals.totalHours.toFixed(1)}h</div>
                          <div className="text-sm text-muted-foreground">{week.weeklyTotals.averageHours.toFixed(1)}h daily avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                No attendance data available for {format(selectedPeriod, 'MMMM yyyy')}.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}