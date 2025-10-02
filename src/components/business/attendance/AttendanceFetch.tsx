'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, Download, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { fetchZKTAttendanceAction, testZKTConnectionAction } from '@/actions/attendanceActions';
import type { AttendanceFetchResult } from '../../../../types/attendance';

// Form validation schema
const AttendanceFetchSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  zktIp: z.string().ip('Valid IP address is required').optional().or(z.literal('')),
  zktPort: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535').optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
});

type AttendanceFetchData = z.infer<typeof AttendanceFetchSchema>;

interface AttendanceFetchProps {
  onFetchComplete?: (result: AttendanceFetchResult) => void;
}

export function AttendanceFetch({ onFetchComplete }: AttendanceFetchProps) {
  const [isPending, startTransition] = useTransition();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [fetchResult, setFetchResult] = useState<AttendanceFetchResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    responseTime?: number;
  }>({ status: 'idle' });

  const form = useForm<AttendanceFetchData>({
    resolver: zodResolver(AttendanceFetchSchema),
    defaultValues: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(),
      zktIp: '',
      zktPort: 4370
    }
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    
    if (!values.zktIp) {
      setConnectionStatus({
        status: 'error',
        message: 'IP address is required for connection test'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus({ status: 'idle' });

    try {
      const result = await testZKTConnectionAction({
        ip: values.zktIp,
        port: values.zktPort || 4370
      });

      if (result.success && result.data) {
        setConnectionStatus({
          status: 'success',
          message: `Connected successfully (${result.data.responseTime}ms)`,
          responseTime: result.data.responseTime
        });
      } else {
        setConnectionStatus({
          status: 'error',
          message: result.error || 'Connection failed'
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (data: AttendanceFetchData) => {
    startTransition(async () => {
      setFetchResult(null);
      
      try {
        const fetchRequest = {
          startDate: data.startDate,
          endDate: data.endDate,
          zktConfig: data.zktIp ? {
            ip: data.zktIp,
            port: data.zktPort || 4370
          } : undefined
        };

        const result = await fetchZKTAttendanceAction(fetchRequest);
        
        if (result.success && result.data) {
          setFetchResult(result.data);
          onFetchComplete?.(result.data);
        } else {
          setFetchResult({
            success: false,
            totalRecordsProcessed: 0,
            recordsCreated: 0,
            recordsSkipped: 0,
            recordsWithErrors: 0,
            employeeMappingErrors: 0,
            validationErrors: 0,
            records: [],
            errors: [{
              type: 'ZKT_COMMUNICATION',
              message: result.error || 'Failed to fetch attendance data'
            }],
            summary: {
              startDate: data.startDate,
              endDate: data.endDate,
              fetchedAt: new Date(),
              fetchedById: ''
            }
          });
        }
      } catch (error) {
        console.error('Fetch attendance error:', error);
        setFetchResult({
          success: false,
          totalRecordsProcessed: 0,
          recordsCreated: 0,
          recordsSkipped: 0,
          recordsWithErrors: 0,
          employeeMappingErrors: 0,
          validationErrors: 0,
          records: [],
          errors: [{
            type: 'ZKT_COMMUNICATION',
            message: error instanceof Error ? error.message : 'Unknown error'
          }],
          summary: {
            startDate: data.startDate,
            endDate: data.endDate,
            fetchedAt: new Date(),
            fetchedById: ''
          }
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Manual Attendance Data Fetch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Date Range Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              disabled={isPending}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('2020-01-01')
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              disabled={isPending}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('2020-01-01')
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ZKT Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <h4 className="text-sm font-medium">ZKT Device Configuration</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="zktIp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device IP Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="192.168.1.100"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zktPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="4370"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isPending || isTestingConnection || !form.watch('zktIp')}
                      className="w-full"
                    >
                      {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Test Connection
                    </Button>
                  </div>
                </div>

                {/* Connection Status */}
                {connectionStatus.status !== 'idle' && (
                  <Alert className={
                    connectionStatus.status === 'success' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }>
                    {connectionStatus.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={
                      connectionStatus.status === 'success' 
                        ? 'text-green-800' 
                        : 'text-red-800'
                    }>
                      {connectionStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Submit Button */}
              <Separator />
              <Button
                type="submit"
                disabled={isPending}
                className="w-full"
                size="lg"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Fetching Attendance Data...' : 'Fetch Attendance Data'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Fetch Results */}
      {fetchResult && (
        <AttendanceFetchResults result={fetchResult} />
      )}
    </div>
  );
}

// Results Display Component
function AttendanceFetchResults({ result }: { result: AttendanceFetchResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fetch Results</span>
          <Badge variant={result.success ? 'default' : 'destructive'}>
            {result.success ? 'Success' : 'Failed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{result.totalRecordsProcessed}</div>
            <div className="text-sm text-blue-600">Total Processed</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{result.recordsCreated}</div>
            <div className="text-sm text-green-600">Records Created</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{result.recordsSkipped}</div>
            <div className="text-sm text-yellow-600">Records Skipped</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{result.recordsWithErrors}</div>
            <div className="text-sm text-red-600">Errors</div>
          </div>
        </div>

        {/* Progress Bar */}
        {result.totalRecordsProcessed > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>
                {Math.round((result.recordsCreated / result.totalRecordsProcessed) * 100)}%
              </span>
            </div>
            <Progress 
              value={(result.recordsCreated / result.totalRecordsProcessed) * 100} 
              className="w-full"
            />
          </div>
        )}

        {/* Error Details */}
        {result.errors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Issues ({result.errors.length})
            </h4>
            <ScrollArea className="h-32 border rounded p-3">
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <Alert key={index} className="py-2">
                    <AlertDescription className="text-sm">
                      <span className="font-medium">{error.type}:</span> {error.message}
                      {error.employeeId && (
                        <span className="text-muted-foreground"> (Employee: {error.employeeId})</span>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Fetch Summary */}
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Date Range: {format(result.summary.startDate, 'PPP')} - {format(result.summary.endDate, 'PPP')}</div>
          <div>Fetched At: {format(result.summary.fetchedAt, 'PPpp')}</div>
        </div>
      </CardContent>
    </Card>
  );
}