'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Staff, CreateStaffRequest, UpdateStaffRequest } from '../../../../types/staff';

// Form validation schema
const StaffFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50, 'Employee ID must be less than 50 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  department: z.string().min(1, 'Department is required').max(100, 'Department must be less than 100 characters'),
  shiftSchedule: z.string().min(1, 'Shift schedule is required').max(100, 'Shift schedule must be less than 100 characters'),
  userId: z.string().uuid('Valid user ID is required'),
  isActive: z.boolean()
});

type StaffFormData = z.infer<typeof StaffFormSchema>;

interface StaffFormProps {
  staff?: Staff;
  users: Array<{ id: string; email: string; name: string }>;
  departments: string[];
  onSubmit: (data: CreateStaffRequest | UpdateStaffRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const COMMON_SHIFTS = [
  'Day Shift (9:00 AM - 5:00 PM)',
  'Night Shift (5:00 PM - 1:00 AM)',
  'Early Shift (6:00 AM - 2:00 PM)',
  'Late Shift (2:00 PM - 10:00 PM)',
  'Flexible Hours',
  'Part-time Morning',
  'Part-time Evening'
];

export function StaffForm({
  staff,
  users,
  departments,
  onSubmit,
  onCancel,
  isLoading = false,
  mode
}: StaffFormProps) {
  const form = useForm<StaffFormData>({
    resolver: zodResolver(StaffFormSchema),
    defaultValues: {
      employeeId: staff?.employeeId || '',
      name: staff?.name || '',
      department: staff?.department || '',
      shiftSchedule: staff?.shiftSchedule || '',
      userId: staff?.userId || '',
      isActive: staff?.isActive ?? true
    }
  });

  const handleSubmit = (data: StaffFormData) => {
    if (mode === 'create') {
      onSubmit(data as CreateStaffRequest);
    } else {
      onSubmit({ 
        id: staff!.id,
        ...data 
      } as UpdateStaffRequest);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create Staff Member' : 'Edit Staff Member'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter employee ID" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter full name" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shiftSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Schedule</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift schedule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_SHIFTS.map((shift) => (
                          <SelectItem key={shift} value={shift}>
                            {shift}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Account</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoading || mode === 'edit'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {mode === 'edit' && (
                      <p className="text-sm text-muted-foreground">
                        User account cannot be changed after creation
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active Status
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this staff member
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create Staff Member' : 'Update Staff Member'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}