// Sync Configuration - Job scheduling and machine configuration management
// Following shadcn/ui form patterns and architecture/coding-standards.md

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Trash2,
  TestTube,
  Save
} from 'lucide-react';
import { 
  JobScheduleConfig, 
  ZKTMachineConfig, 
  AttendanceSyncSystemConfig 
} from '../../../../types/attendanceJobs';

// Form validation schemas
const scheduleConfigSchema = z.object({
  enabled: z.boolean(),
  cronExpression: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  autoRetry: z.boolean(),
  maxRetries: z.number().min(0).max(10),
  retryDelayMinutes: z.number().min(1).max(60),
  alertOnFailure: z.boolean(),
  alertRecipients: z.string()
});

const machineConfigSchema = z.object({
  id: z.string().min(1, 'Machine ID is required'),
  name: z.string().min(1, 'Machine name is required'),
  ip: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address'),
  port: z.number().min(1).max(65535),
  enabled: z.boolean(),
  priority: z.number().min(1).max(100)
});

type ScheduleFormData = z.infer<typeof scheduleConfigSchema>;
type MachineFormData = z.infer<typeof machineConfigSchema>;

interface SyncConfigurationProps {
  onConfigurationSave?: (config: AttendanceSyncSystemConfig) => Promise<void>;
  onTestMachine?: (machineConfig: ZKTMachineConfig) => Promise<boolean>;
}

export function SyncConfiguration({ 
  onConfigurationSave, 
  onTestMachine 
}: SyncConfigurationProps) {
  const [currentConfig, setCurrentConfig] = useState<AttendanceSyncSystemConfig | null>(null);
  const [machines, setMachines] = useState<ZKTMachineConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingMachine, setTestingMachine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Schedule form
  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleConfigSchema),
    defaultValues: {
      enabled: true,
      cronExpression: '0 6 * * *',
      timezone: 'Asia/Maldives',
      autoRetry: true,
      maxRetries: 3,
      retryDelayMinutes: 15,
      alertOnFailure: true,
      alertRecipients: ''
    }
  });

  // Machine form
  const machineForm = useForm<MachineFormData>({
    resolver: zodResolver(machineConfigSchema),
    defaultValues: {
      id: '',
      name: '',
      ip: '',
      port: 4370,
      enabled: true,
      priority: 1
    }
  });

  // Load current configuration
  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/attendance/sync/configuration', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }

      const config = await response.json();
      setCurrentConfig(config);
      setMachines(config.machines || []);

      // Update form with loaded data
      if (config.scheduling) {
        scheduleForm.reset({
          enabled: config.scheduling.enabled,
          cronExpression: config.scheduling.cronExpression,
          timezone: config.scheduling.timezone,
          autoRetry: config.scheduling.autoRetry,
          maxRetries: config.scheduling.maxRetries,
          retryDelayMinutes: config.scheduling.retryDelayMinutes,
          alertOnFailure: config.scheduling.alertOnFailure,
          alertRecipients: config.scheduling.alertRecipients.join(', ')
        });
      }

    } catch (error) {
      console.error('Error loading configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  // Save schedule configuration
  const handleSaveSchedule = async (data: ScheduleFormData) => {
    if (!currentConfig) return;

    const updatedConfig: AttendanceSyncSystemConfig = {
      ...currentConfig,
      scheduling: {
        enabled: data.enabled,
        cronExpression: data.cronExpression,
        timezone: data.timezone,
        autoRetry: data.autoRetry,
        maxRetries: data.maxRetries,
        retryDelayMinutes: data.retryDelayMinutes,
        alertOnFailure: data.alertOnFailure,
        alertRecipients: data.alertRecipients.split(',').map(email => email.trim()).filter(email => email.length > 0)
      }
    };

    await saveConfiguration(updatedConfig);
  };

  // Add new machine
  const handleAddMachine = (data: MachineFormData) => {
    const newMachine: ZKTMachineConfig = {
      id: data.id,
      name: data.name,
      ip: data.ip,
      port: data.port,
      enabled: data.enabled,
      priority: data.priority
    };

    setMachines([...machines, newMachine]);
    machineForm.reset();
  };

  // Remove machine
  const handleRemoveMachine = (machineId: string) => {
    setMachines(machines.filter(m => m.id !== machineId));
  };

  // Test machine connection
  const handleTestMachine = async (machine: ZKTMachineConfig) => {
    if (!onTestMachine) return;

    try {
      setTestingMachine(machine.id);
      const isConnected = await onTestMachine(machine);
      
      if (isConnected) {
        alert(`Successfully connected to ${machine.name}`);
      } else {
        alert(`Failed to connect to ${machine.name}`);
      }
    } catch (error) {
      alert(`Error testing ${machine.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingMachine(null);
    }
  };

  // Save complete configuration
  const saveConfiguration = async (config: AttendanceSyncSystemConfig) => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');

      const configWithMachines = {
        ...config,
        machines
      };

      if (onConfigurationSave) {
        await onConfigurationSave(configWithMachines);
      } else {
        // Default API call
        const response = await fetch('/api/attendance/sync/configuration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configWithMachines)
        });

        if (!response.ok) {
          throw new Error(`Failed to save configuration: ${response.statusText}`);
        }
      }

      setCurrentConfig(configWithMachines);
      setSaveStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);

    } catch (error) {
      console.error('Error saving configuration:', error);
      setSaveStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Configuration</h2>
          <p className="text-muted-foreground">
            Configure automated attendance synchronization settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
          {saveStatus === 'error' && (
            <Badge variant="outline" className="text-red-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Schedule Configuration
          </CardTitle>
          <CardDescription>
            Configure when and how often attendance sync runs automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...scheduleForm}>
            <form onSubmit={scheduleForm.handleSubmit(handleSaveSchedule)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={scheduleForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Scheduling</FormLabel>
                        <FormDescription>
                          Enable automatic sync scheduling
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={scheduleForm.control}
                  name="cronExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0 6 * * *" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        When to run (e.g., "0 6 * * *" for 6 AM daily)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={scheduleForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Asia/Maldives">Asia/Maldives</SelectItem>
                          <SelectItem value="Asia/Colombo">Asia/Colombo</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={scheduleForm.control}
                  name="maxRetries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Retries</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="10"
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum retry attempts on failure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={scheduleForm.control}
                name="alertRecipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Recipients</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="admin@company.com, hr@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated email addresses for failure alerts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ZKT Machines Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>ZKT Machines</CardTitle>
          <CardDescription>
            Configure ZKT attendance machines for sync operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing machines */}
          <div className="space-y-3">
            {machines.map((machine) => (
              <div key={machine.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${machine.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-medium">{machine.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {machine.ip}:{machine.port} • Priority: {machine.priority}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestMachine(machine)}
                    disabled={testingMachine === machine.id}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    {testingMachine === machine.id ? 'Testing...' : 'Test'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMachine(machine.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Add new machine form */}
          <Form {...machineForm}>
            <form onSubmit={machineForm.handleSubmit(handleAddMachine)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={machineForm.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine ID</FormLabel>
                      <FormControl>
                        <Input placeholder="zkt_main_01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={machineForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Office Entry" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={machineForm.control}
                  name="ip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={machineForm.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="4370"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={machineForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="100"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={machineForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enabled</FormLabel>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}