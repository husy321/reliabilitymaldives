'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { format, parse, isValid, isBefore, isAfter, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Clock, Save, X, AlertTriangle, Calendar, Lock } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';

import type { AttendanceRecord, AttendanceEditRequest, AttendanceEditResult } from '../../../../types/attendance';

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSave: (editRequest: AttendanceEditRequest) => Promise<AttendanceEditResult>;
  isLoading?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export function AttendanceEditModal({
  isOpen,
  onClose,
  record,
  onSave,
  isLoading = false
}: AttendanceEditModalProps) {
  // Form state
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [reason, setReason] = useState('');

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when record changes
  useEffect(() => {
    if (record && isOpen) {
      setEditDate(record.date);
      setClockInTime(record.clockInTime ? format(record.clockInTime, 'HH:mm') : '');
      setClockOutTime(record.clockOutTime ? format(record.clockOutTime, 'HH:mm') : '');
      setReason('');
      setValidationErrors([]);
      setHasChanges(false);
    }
  }, [record, isOpen]);

  // Track changes
  const checkForChanges = useCallback(() => {
    if (!record) return false;

    const originalDate = format(record.date, 'yyyy-MM-dd');
    const currentDate = editDate ? format(editDate, 'yyyy-MM-dd') : '';

    const originalClockIn = record.clockInTime ? format(record.clockInTime, 'HH:mm') : '';
    const originalClockOut = record.clockOutTime ? format(record.clockOutTime, 'HH:mm') : '';

    return (
      originalDate !== currentDate ||
      originalClockIn !== clockInTime ||
      originalClockOut !== clockOutTime
    );
  }, [record, editDate, clockInTime, clockOutTime]);

  useEffect(() => {
    setHasChanges(checkForChanges());
  }, [checkForChanges]);

  // Time validation
  const validateTimes = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!editDate) {
      errors.push({ field: 'date', message: 'Date is required' });
      return errors;
    }

    // Prevent future dates
    const today = startOfDay(new Date());
    if (isAfter(startOfDay(editDate), today)) {
      errors.push({ field: 'date', message: 'Cannot set attendance for future dates' });
    }

    // Time format validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (clockInTime && !timeRegex.test(clockInTime)) {
      errors.push({ field: 'clockInTime', message: 'Invalid time format. Use HH:MM (24-hour format)' });
    }

    if (clockOutTime && !timeRegex.test(clockOutTime)) {
      errors.push({ field: 'clockOutTime', message: 'Invalid time format. Use HH:MM (24-hour format)' });
    }

    // Both times provided - sequence validation
    if (clockInTime && clockOutTime && timeRegex.test(clockInTime) && timeRegex.test(clockOutTime)) {
      const clockInDateTime = parse(clockInTime, 'HH:mm', editDate);
      const clockOutDateTime = parse(clockOutTime, 'HH:mm', editDate);

      if (isValid(clockInDateTime) && isValid(clockOutDateTime)) {
        if (isAfter(clockInDateTime, clockOutDateTime)) {
          errors.push({
            field: 'clockOutTime',
            message: 'Clock-out time must be after clock-in time'
          });
        }

        // Working hours validation (reasonable limits)
        const hoursDiff = (clockOutDateTime.getTime() - clockInDateTime.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          errors.push({
            field: 'clockOutTime',
            message: 'Work duration cannot exceed 24 hours'
          });
        }
        if (hoursDiff < 0.25) {
          errors.push({
            field: 'clockOutTime',
            message: 'Work duration must be at least 15 minutes'
          });
        }
      }
    }

    // At least one time must be provided
    if (!clockInTime && !clockOutTime) {
      errors.push({
        field: 'general',
        message: 'At least one time (clock-in or clock-out) must be provided'
      });
    }

    // Reason validation for significant changes
    if (hasChanges && !reason.trim()) {
      errors.push({
        field: 'reason',
        message: 'Reason is required for manual edits'
      });
    }

    return errors;
  }, [editDate, clockInTime, clockOutTime, reason, hasChanges]);

  // Real-time validation
  useEffect(() => {
    if (isOpen) {
      setValidationErrors(validateTimes());
    }
  }, [editDate, clockInTime, clockOutTime, reason, isOpen, validateTimes]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!record || !editDate) return;

    const errors = validateTimes();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const clockInDateTime = clockInTime ?
        parse(clockInTime, 'HH:mm', editDate) : null;
      const clockOutDateTime = clockOutTime ?
        parse(clockOutTime, 'HH:mm', editDate) : null;

      const editRequest: AttendanceEditRequest = {
        recordId: record.id,
        date: editDate,
        clockInTime: clockInDateTime,
        clockOutTime: clockOutDateTime,
        reason: reason.trim()
      };

      const result = await onSave(editRequest);

      if (result.success) {
        onClose();
      } else {
        setValidationErrors(
          result.errors?.map(error => ({ field: 'general', message: error })) ||
          [{ field: 'general', message: 'Failed to save attendance record' }]
        );
      }
    } catch (error) {
      setValidationErrors([
        { field: 'general', message: 'An unexpected error occurred while saving' }
      ]);
    }
  }, [record, editDate, clockInTime, clockOutTime, reason, validateTimes, onSave, onClose]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Get validation errors for specific field
  const getFieldErrors = useCallback((field: string) => {
    return validationErrors.filter(error => error.field === field);
  }, [validationErrors]);

  // Check if form is valid
  const isFormValid = validationErrors.length === 0 && hasChanges;

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Attendance Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Information */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{record.staff?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Employee ID: {record.employeeId}
                </p>
              </div>
              <Badge variant="outline">
                {record.staff?.department || 'Unknown Department'}
              </Badge>
            </div>
          </div>

          {/* Finalization Warning */}
          {record.isFinalized && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Record Finalized:</strong> This attendance record is part of a finalized payroll period and cannot be edited.
                Contact an administrator if changes are required.
              </AlertDescription>
            </Alert>
          )}

          {/* General Errors */}
          {getFieldErrors('general').length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {getFieldErrors('general').map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Date Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-date" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Attendance Date
            </Label>
            <DatePicker
              value={editDate}
              onChange={setEditDate}
              disabled={isLoading || record.isFinalized}
              disableFuture={true}
              className="w-full"
            />
            {getFieldErrors('date').map((error, index) => (
              <p key={index} className="text-sm text-red-600">{error.message}</p>
            ))}
          </div>

          <Separator />

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Clock In Time */}
            <div className="space-y-2">
              <Label htmlFor="clock-in-time">Clock In Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clock-in-time"
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  disabled={isLoading || record.isFinalized}
                  className="pl-10"
                  placeholder="HH:MM"
                />
              </div>
              {getFieldErrors('clockInTime').map((error, index) => (
                <p key={index} className="text-sm text-red-600">{error.message}</p>
              ))}
              <p className="text-xs text-muted-foreground">
                Original: {record.clockInTime ? format(record.clockInTime, 'HH:mm') : 'Not recorded'}
              </p>
            </div>

            {/* Clock Out Time */}
            <div className="space-y-2">
              <Label htmlFor="clock-out-time">Clock Out Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clock-out-time"
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  disabled={isLoading || record.isFinalized}
                  className="pl-10"
                  placeholder="HH:MM"
                />
              </div>
              {getFieldErrors('clockOutTime').map((error, index) => (
                <p key={index} className="text-sm text-red-600">{error.message}</p>
              ))}
              <p className="text-xs text-muted-foreground">
                Original: {record.clockOutTime ? format(record.clockOutTime, 'HH:mm') : 'Not recorded'}
              </p>
            </div>
          </div>

          {/* Working Hours Preview */}
          {clockInTime && clockOutTime && editDate && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <strong>Working Hours Preview:</strong>
                {(() => {
                  try {
                    const clockIn = parse(clockInTime, 'HH:mm', editDate);
                    const clockOut = parse(clockOutTime, 'HH:mm', editDate);
                    if (isValid(clockIn) && isValid(clockOut) && isAfter(clockOut, clockIn)) {
                      const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
                      return ` ${hours.toFixed(2)} hours`;
                    }
                    return ' Invalid time range';
                  } catch {
                    return ' Unable to calculate';
                  }
                })()}
              </div>
            </div>
          )}

          <Separator />

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-reason">
              Reason for Manual Edit <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading || record.isFinalized}
              placeholder={record.isFinalized ? "Record is finalized and cannot be edited" : "Provide a reason for this manual attendance edit..."}
              rows={3}
            />
            {getFieldErrors('reason').map((error, index) => (
              <p key={index} className="text-sm text-red-600">{error.message}</p>
            ))}
            <p className="text-xs text-muted-foreground">
              This reason will be logged for audit purposes.
            </p>
          </div>

          {/* Changes Summary */}
          {hasChanges && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Changes Summary:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {editDate && format(editDate, 'yyyy-MM-dd') !== format(record.date, 'yyyy-MM-dd') && (
                  <li>• Date: {format(record.date, 'MMM dd, yyyy')} → {format(editDate, 'MMM dd, yyyy')}</li>
                )}
                {clockInTime !== (record.clockInTime ? format(record.clockInTime, 'HH:mm') : '') && (
                  <li>• Clock In: {record.clockInTime ? format(record.clockInTime, 'HH:mm') : 'None'} → {clockInTime || 'None'}</li>
                )}
                {clockOutTime !== (record.clockOutTime ? format(record.clockOutTime, 'HH:mm') : '') && (
                  <li>• Clock Out: {record.clockOutTime ? format(record.clockOutTime, 'HH:mm') : 'None'} → {clockOutTime || 'None'}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid || isLoading || record.isFinalized}
            className="min-w-[100px]"
          >
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? 'Saving...' : record.isFinalized ? 'Cannot Edit' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}