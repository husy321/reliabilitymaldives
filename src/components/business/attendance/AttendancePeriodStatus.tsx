'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Lock,
  Unlock,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  History,
  Calculator,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import type { AttendancePeriod, AttendancePeriodStatus } from '@/types/attendance';
import type { PayrollPeriod } from '@/types/payroll';

interface AttendancePeriodStatusProps {
  periods: AttendancePeriod[];
  payrollPeriods?: PayrollPeriod[];
  onCreatePeriod: () => void;
  onFinalizePeriod: (periodId: string) => void;
  onUnlockPeriod: (periodId: string) => void;
  onViewHistory: (periodId: string) => void;
  onCalculatePayroll?: (attendancePeriodId: string) => void;
  onViewPayroll?: (payrollPeriodId: string) => void;
  isLoading?: boolean;
  userRole?: string;
}

interface PeriodStats {
  total: number;
  pending: number;
  finalized: number;
  locked: number;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  FINALIZED: 'bg-blue-100 text-blue-800 border-blue-300',
  LOCKED: 'bg-green-100 text-green-800 border-green-300',
} as const;

const statusIcons = {
  PENDING: Clock,
  FINALIZED: CheckCircle2,
  LOCKED: Lock,
} as const;

export function AttendancePeriodStatus({
  periods,
  payrollPeriods = [],
  onCreatePeriod,
  onFinalizePeriod,
  onUnlockPeriod,
  onViewHistory,
  onCalculatePayroll,
  onViewPayroll,
  isLoading = false,
  userRole
}: AttendancePeriodStatusProps) {
  const [activeTab, setActiveTab] = useState<AttendancePeriodStatus | 'all'>('all');

  // Calculate statistics
  const stats: PeriodStats = periods.reduce(
    (acc, period) => {
      acc.total++;
      switch (period.status) {
        case 'PENDING':
          acc.pending++;
          break;
        case 'FINALIZED':
          acc.finalized++;
          break;
        case 'LOCKED':
          acc.locked++;
          break;
      }
      return acc;
    },
    { total: 0, pending: 0, finalized: 0, locked: 0 }
  );

  // Filter periods based on active tab
  const filteredPeriods = activeTab === 'all'
    ? periods
    : periods.filter(period => period.status === activeTab);

  // Sort periods by start date (most recent first)
  const sortedPeriods = [...filteredPeriods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Helper to get payroll status for attendance period
  const getPayrollStatus = (attendancePeriodId: string) => {
    return payrollPeriods.find(p => p.attendancePeriodId === attendancePeriodId);
  };

  const getPayrollStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'CALCULATING': return 'bg-blue-100 text-blue-800';
      case 'CALCULATED': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const StatusBadge = ({ status }: { status: AttendancePeriodStatus }) => {
    const Icon = statusIcons[status];
    return (
      <Badge className={`${statusColors[status]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const PeriodRow = ({ period }: { period: AttendancePeriod }) => {
    const payrollStatus = getPayrollStatus(period.id);

    return (
      <TableRow key={period.id}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {format(new Date(period.startDate), 'MMM dd, yyyy')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <div className="space-y-1">
            <StatusBadge status={period.status} />
            {payrollStatus && (
              <Badge className={`text-xs ${getPayrollStatusColor(payrollStatus.status)}`}>
                <DollarSign className="h-3 w-3 mr-1" />
                Payroll: {payrollStatus.status}
              </Badge>
            )}
          </div>
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{period.attendanceRecords?.length || 0} records</span>
          </div>
        </TableCell>

        <TableCell>
          {period.finalizedAt && period.finalizedByUser ? (
            <div>
              <div className="text-sm font-medium">{period.finalizedByUser.name}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(period.finalizedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            {period.status === 'PENDING' && userRole === 'ADMIN' && (
              <Button
                size="sm"
                onClick={() => onFinalizePeriod(period.id)}
                disabled={isLoading}
              >
                Finalize
              </Button>
            )}

            {period.status === 'FINALIZED' && userRole === 'ADMIN' && period.unlockReason && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnlockPeriod(period.id)}
                disabled={isLoading}
              >
                <Unlock className="h-4 w-4 mr-1" />
                Unlock
              </Button>
            )}

            {/* Payroll Actions */}
            {period.status === 'FINALIZED' && !payrollStatus && onCalculatePayroll &&
             (userRole === 'ACCOUNTS' || userRole === 'ADMIN') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCalculatePayroll(period.id)}
                disabled={isLoading}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Calculate Payroll
              </Button>
            )}

            {payrollStatus && onViewPayroll && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewPayroll(payrollStatus.id)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                View Payroll
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewHistory(period.id)}
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Periods</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.finalized}</div>
            <div className="text-sm text-muted-foreground">Finalized</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.locked}</div>
            <div className="text-sm text-muted-foreground">Locked</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Periods</CardTitle>
          {userRole === 'ADMIN' && (
            <Button onClick={onCreatePeriod} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Create Period
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AttendancePeriodStatus | 'all')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="PENDING">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="FINALIZED">Finalized ({stats.finalized})</TabsTrigger>
              <TabsTrigger value="LOCKED">Locked ({stats.locked})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {sortedPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No periods found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'all'
                      ? 'No attendance periods have been created yet.'
                      : `No periods with status "${activeTab}" found.`
                    }
                  </p>
                  {userRole === 'ADMIN' && activeTab === 'all' && (
                    <Button onClick={onCreatePeriod}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Period
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Finalized By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPeriods.map((period) => (
                      <PeriodRow key={period.id} period={period} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Important Notes */}
      {userRole === 'ADMIN' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Notice:</strong> Finalizing a period locks all attendance records and prevents further edits.
            Only finalized periods can be processed for payroll. Use emergency unlock only when absolutely necessary.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}