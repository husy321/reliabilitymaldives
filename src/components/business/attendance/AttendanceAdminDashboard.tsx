'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  Clock,
  Lock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Settings,
  Plus
} from 'lucide-react';
import { AttendancePeriodStatus } from './AttendancePeriodStatus';
import { AttendanceFinalizationModal } from './AttendanceFinalizationModal';
import { useAttendanceFinalization } from '@/hooks/useAttendanceFinalization';
import type { AttendancePeriod } from '@/types/attendance';

interface AttendanceStats {
  totalPeriods: number;
  pendingPeriods: number;
  finalizedPeriods: number;
  totalRecordsProcessed: number;
  averageRecordsPerPeriod: number;
  lastFinalizationDate?: Date;
}

interface AttendanceAdminDashboardProps {
  userRole?: string;
}

export function AttendanceAdminDashboard({ userRole = 'ADMIN' }: AttendanceAdminDashboardProps) {
  const [stats, setStats] = useState<AttendanceStats>({
    totalPeriods: 0,
    pendingPeriods: 0,
    finalizedPeriods: 0,
    totalRecordsProcessed: 0,
    averageRecordsPerPeriod: 0
  });

  const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<AttendancePeriod | null>(null);

  const {
    periods,
    isLoading,
    error,
    finalizePeriod,
    unlockPeriod,
    validatePeriod,
    getPeriodSummary,
    loadPeriods,
    createPeriod,
    clearError
  } = useAttendanceFinalization();

  // Load periods on component mount
  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  // Calculate statistics when periods change
  useEffect(() => {
    if (periods.length > 0) {
      const totalRecordsProcessed = periods.reduce(
        (sum, period) => sum + (period.attendanceRecords?.length || 0),
        0
      );

      const finalizedPeriods = periods.filter(p => p.status === 'FINALIZED' || p.status === 'LOCKED');
      const lastFinalized = finalizedPeriods
        .filter(p => p.finalizedAt)
        .sort((a, b) => new Date(b.finalizedAt!).getTime() - new Date(a.finalizedAt!).getTime())[0];

      setStats({
        totalPeriods: periods.length,
        pendingPeriods: periods.filter(p => p.status === 'PENDING').length,
        finalizedPeriods: finalizedPeriods.length,
        totalRecordsProcessed,
        averageRecordsPerPeriod: periods.length > 0 ? Math.round(totalRecordsProcessed / periods.length) : 0,
        lastFinalizationDate: lastFinalized?.finalizedAt
      });
    }
  }, [periods]);

  const handleCreatePeriod = () => {
    // In a real implementation, this would open a period creation modal
    // For now, we'll just open the finalization modal
    setIsFinalizationModalOpen(true);
  };

  const handleFinalizePeriod = (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setSelectedPeriod(period);
      setIsFinalizationModalOpen(true);
    }
  };

  const handleUnlockPeriod = async (periodId: string) => {
    const reason = prompt('Please provide a reason for unlocking this period:');
    if (reason && reason.trim()) {
      try {
        await unlockPeriod({
          periodId,
          reason: reason.trim(),
          confirmUnlock: true
        });
      } catch (error) {
        console.error('Failed to unlock period:', error);
      }
    }
  };

  const handleViewHistory = (periodId: string) => {
    // Navigate to period history view
    console.log('View history for period:', periodId);
  };

  const handleFinalizationComplete = async (request: any) => {
    try {
      await finalizePeriod(request);
      setIsFinalizationModalOpen(false);
      setSelectedPeriod(null);
    } catch (error) {
      console.error('Finalization failed:', error);
      // Error is handled by the hook and displayed in the modal
    }
  };

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Administration</h1>
          <p className="text-muted-foreground">
            Manage attendance periods, finalization, and payroll preparation
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreatePeriod}>
            <Plus className="h-4 w-4 mr-2" />
            Create Period
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="link"
              size="sm"
              onClick={clearError}
              className="ml-2 p-0 h-auto"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalPeriods}</div>
                <div className="text-sm text-muted-foreground">Total Periods</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingPeriods}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Lock className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.finalizedPeriods}</div>
                <div className="text-sm text-muted-foreground">Finalized</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalRecordsProcessed}</div>
                <div className="text-sm text-muted-foreground">Records Processed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.lastFinalizationDate && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">Last Period Finalized</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.lastFinalizationDate.toLocaleDateString()} at{' '}
                      {stats.lastFinalizationDate.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">Completed</Badge>
              </div>
            )}

            {stats.pendingPeriods > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">Periods Awaiting Review</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.pendingPeriods} period{stats.pendingPeriods !== 1 ? 's' : ''} ready for finalization
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Action Required</Badge>
              </div>
            )}

            {stats.averageRecordsPerPeriod > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">Processing Efficiency</div>
                    <div className="text-sm text-muted-foreground">
                      Average {stats.averageRecordsPerPeriod} records per period
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Optimal
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="periods" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="periods">Period Management</TabsTrigger>
          <TabsTrigger value="finalization">Finalization Queue</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="periods">
          <AttendancePeriodStatus
            periods={periods}
            onCreatePeriod={handleCreatePeriod}
            onFinalizePeriod={handleFinalizePeriod}
            onUnlockPeriod={handleUnlockPeriod}
            onViewHistory={handleViewHistory}
            isLoading={isLoading}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="finalization">
          <Card>
            <CardHeader>
              <CardTitle>Finalization Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {periods.filter(p => p.status === 'PENDING').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">
                      No periods are currently waiting for finalization.
                    </p>
                  </div>
                ) : (
                  periods
                    .filter(p => p.status === 'PENDING')
                    .map(period => (
                      <div
                        key={period.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {period.startDate.toLocaleDateString()} - {period.endDate.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {period.attendanceRecords?.length || 0} records ready for review
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pending</Badge>
                          {isAdmin && (
                            <Button
                              size="sm"
                              onClick={() => handleFinalizePeriod(period.id)}
                            >
                              Review & Finalize
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Attendance Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Finalization Settings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure how attendance periods are processed and finalized.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Require approval before finalization</span>
                      <Badge>Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Automatic notifications to Accounts team</span>
                      <Badge>Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Emergency unlock requires reason</span>
                      <Badge>Enabled</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage who receives notifications for different events.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Accounts team finalization alerts</span>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Admin unlock notifications</span>
                      <Badge>Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finalization Modal */}
      <AttendanceFinalizationModal
        isOpen={isFinalizationModalOpen}
        onClose={() => {
          setIsFinalizationModalOpen(false);
          setSelectedPeriod(null);
        }}
        onFinalize={handleFinalizationComplete}
        onValidatePeriod={validatePeriod}
        onGetPeriodSummary={getPeriodSummary}
        isLoading={isLoading}
      />
    </div>
  );
}