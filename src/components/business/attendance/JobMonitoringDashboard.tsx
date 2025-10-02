// Job Monitoring Dashboard - Real-time sync job monitoring interface
// Following shadcn/ui component patterns and architecture/coding-standards.md

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  PlayCircle, 
  PauseCircle, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Activity,
  Settings
} from 'lucide-react';
import { 
  AttendanceSyncJob, 
  AttendanceJobStatus, 
  JobExecutionMetrics,
  JobHealthStatus 
} from '../../../../types/attendanceJobs';

interface JobMonitoringDashboardProps {
  onTriggerManualSync?: () => void;
  onConfigureScheduling?: () => void;
  refreshInterval?: number; // in seconds
}

interface JobProgressInfo {
  jobId: string;
  completedMachines: number;
  totalMachines: number;
  currentMachine?: string;
  estimatedTimeRemaining?: number;
}

export function JobMonitoringDashboard({ 
  onTriggerManualSync, 
  onConfigureScheduling,
  refreshInterval = 30 
}: JobMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<JobExecutionMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<JobHealthStatus | null>(null);
  const [recentJobs, setRecentJobs] = useState<AttendanceSyncJob[]>([]);
  const [runningJobs, setRunningJobs] = useState<JobProgressInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsResponse, jobsResponse] = await Promise.all([
        fetch('/api/attendance/sync', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/attendance/sync/jobs?limit=10', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!metricsResponse.ok) {
        throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
      }

      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.metrics);
      setHealthStatus(metricsData.healthStatus);

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setRecentJobs(jobsData.jobs || []);
        
        // Filter running jobs for progress tracking
        const running = jobsData.jobs
          ?.filter((job: AttendanceSyncJob) => job.status === AttendanceJobStatus.RUNNING)
          .map((job: AttendanceSyncJob) => ({
            jobId: job.id,
            completedMachines: 0, // Would be fetched from job progress API
            totalMachines: job.config.zktMachines.length,
            currentMachine: job.config.zktMachines[0]?.name
          })) || [];
        
        setRunningJobs(running);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMonitoringData();
    
    const interval = setInterval(fetchMonitoringData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchMonitoringData();
  };

  // Get status color and icon
  const getStatusDisplay = (status: AttendanceJobStatus) => {
    switch (status) {
      case AttendanceJobStatus.COMPLETED:
        return { color: 'bg-green-500', icon: CheckCircle, text: 'Completed' };
      case AttendanceJobStatus.RUNNING:
        return { color: 'bg-blue-500', icon: Activity, text: 'Running' };
      case AttendanceJobStatus.FAILED:
        return { color: 'bg-red-500', icon: XCircle, text: 'Failed' };
      case AttendanceJobStatus.PENDING:
        return { color: 'bg-yellow-500', icon: Clock, text: 'Pending' };
      case AttendanceJobStatus.CANCELLED:
        return { color: 'bg-gray-500', icon: PauseCircle, text: 'Cancelled' };
      default:
        return { color: 'bg-gray-500', icon: Clock, text: 'Unknown' };
    }
  };

  // Format time duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Monitoring Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 ml-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Sync Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of automated attendance synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onTriggerManualSync && (
            <Button size="sm" onClick={onTriggerManualSync}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Manual Sync
            </Button>
          )}
          {onConfigureScheduling && (
            <Button variant="outline" size="sm" onClick={onConfigureScheduling}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          )}
        </div>
      </div>

      {/* System Health Status */}
      {healthStatus && (
        <Alert variant={healthStatus.isHealthy ? "default" : "destructive"}>
          {healthStatus.isHealthy ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            System Status: {healthStatus.currentStatus}
          </AlertTitle>
          <AlertDescription>
            {healthStatus.isHealthy ? (
              `System is operating normally. Last successful run: ${
                healthStatus.lastSuccessfulRun 
                  ? new Date(healthStatus.lastSuccessfulRun).toLocaleString()
                  : 'Never'
              }`
            ) : (
              <>
                System issues detected. {healthStatus.consecutiveFailures} consecutive failures.
                {healthStatus.issues.length > 0 && (
                  <ul className="mt-2 list-disc list-inside">
                    {healthStatus.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics.successRate * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.successRate * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg. Execution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(metrics.averageExecutionTime)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Job Run</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {metrics.lastJobRun 
                  ? new Date(metrics.lastJobRun).toLocaleString()
                  : 'Never'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Running Jobs Progress */}
      {runningJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Running Jobs</CardTitle>
            <CardDescription>
              Active sync operations with real-time progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {runningJobs.map((job) => (
              <div key={job.jobId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Job {job.jobId}</span>
                    {job.currentMachine && (
                      <span className="text-sm text-muted-foreground ml-2">
                        Processing: {job.currentMachine}
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {job.completedMachines} / {job.totalMachines} machines
                  </Badge>
                </div>
                <Progress 
                  value={(job.completedMachines / job.totalMachines) * 100} 
                  className="h-2"
                />
                {job.estimatedTimeRemaining && (
                  <div className="text-xs text-muted-foreground">
                    Estimated time remaining: {formatDuration(job.estimatedTimeRemaining)}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Latest sync job execution history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent jobs found
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => {
                const statusInfo = getStatusDisplay(job.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                      <div>
                        <div className="font-medium">
                          {job.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(job.scheduledAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.text}
                      </Badge>
                      {job.duration && (
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(job.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Refresh Info */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastRefresh.toLocaleTimeString()}
        {refreshInterval > 0 && ` • Auto-refresh every ${refreshInterval}s`}
      </div>
    </div>
  );
}