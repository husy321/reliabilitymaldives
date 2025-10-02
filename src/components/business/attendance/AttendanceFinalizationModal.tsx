'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangle, Users, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type {
  AttendancePeriod,
  PeriodStatusSummary,
  PeriodValidationResult,
  FinalizationRequest
} from '@/types/attendance';

interface AttendanceFinalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalize: (request: FinalizationRequest) => Promise<void>;
  onValidatePeriod: (startDate: Date, endDate: Date) => Promise<PeriodValidationResult>;
  onGetPeriodSummary: (startDate: Date, endDate: Date) => Promise<PeriodStatusSummary>;
  isLoading?: boolean;
}

export function AttendanceFinalizationModal({
  isOpen,
  onClose,
  onFinalize,
  onValidatePeriod,
  onGetPeriodSummary,
  isLoading = false,
}: AttendanceFinalizationModalProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [periodSummary, setPeriodSummary] = useState<PeriodStatusSummary | null>(null);
  const [validationResult, setValidationResult] = useState<PeriodValidationResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStartDate(undefined);
      setEndDate(undefined);
      setPeriodSummary(null);
      setValidationResult(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  // Validate period when both dates are selected
  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      validatePeriod();
    } else {
      setPeriodSummary(null);
      setValidationResult(null);
      setShowConfirmation(false);
    }
  }, [startDate, endDate]);

  const validatePeriod = async () => {
    if (!startDate || !endDate) return;

    setIsValidating(true);
    setIsLoadingSummary(true);

    try {
      const [validation, summary] = await Promise.all([
        onValidatePeriod(startDate, endDate),
        onGetPeriodSummary(startDate, endDate)
      ]);

      setValidationResult(validation);
      setPeriodSummary(summary);
    } catch (error) {
      console.error('Period validation failed:', error);
    } finally {
      setIsValidating(false);
      setIsLoadingSummary(false);
    }
  };

  const handleProceedToConfirmation = () => {
    if (validationResult?.canFinalize) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmFinalization = async () => {
    if (!periodSummary?.period) return;

    try {
      await onFinalize({
        periodId: periodSummary.period.id,
        confirmFinalization: true,
      });
      onClose();
    } catch (error) {
      console.error('Finalization failed:', error);
    }
  };

  const canProceed = startDate && endDate && startDate <= endDate && !isValidating && !isLoadingSummary;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Confirm Period Finalization' : 'Finalize Attendance Period'}
          </DialogTitle>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            {/* Period Selection */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Select Period to Finalize</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal w-full",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal w-full",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => startDate ? date < startDate : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {startDate && endDate && startDate > endDate && (
                  <Alert className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      End date must be after start date.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Period Summary */}
              {periodSummary && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Period Summary</h3>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-primary">{periodSummary.totalRecords}</div>
                      <div className="text-xs text-muted-foreground">Total Records</div>
                    </div>

                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                      <div className="text-2xl font-bold">{periodSummary.employeeCount}</div>
                      <div className="text-xs text-muted-foreground">Employees</div>
                    </div>

                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                      <div className="text-2xl font-bold">{periodSummary.pendingApprovals}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>

                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-500" />
                      <div className="text-2xl font-bold">{periodSummary.conflicts}</div>
                      <div className="text-xs text-muted-foreground">Conflicts</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Period Status:</span>
                    <Badge variant={periodSummary.period.status === 'FINALIZED' ? 'default' : 'outline'}>
                      {periodSummary.period.status}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Validation Results */}
              {validationResult && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Validation Status</h3>

                  {validationResult.canFinalize ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Period is ready for finalization. All attendance records have been approved and conflicts resolved.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Period cannot be finalized. Please resolve the following issues:
                        </AlertDescription>
                      </Alert>

                      {validationResult.issues.map((issue, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertDescription>
                            <strong>{issue.type.replace('_', ' ')}:</strong> {issue.message} ({issue.count} items)
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Finalizing this period will lock all attendance records
                and prevent further edits. This action cannot be undone without administrator approval.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Finalization Summary</h3>

              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-medium">
                    {startDate && endDate &&
                      `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`
                    }
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="font-medium">{periodSummary?.totalRecords}</span>
                </div>

                <div className="flex justify-between">
                  <span>Affected Employees:</span>
                  <span className="font-medium">{periodSummary?.employeeCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showConfirmation ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToConfirmation}
                disabled={!canProceed || !validationResult?.canFinalize}
              >
                {isValidating || isLoadingSummary ? 'Validating...' : 'Proceed to Finalize'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Back
              </Button>
              <Button
                onClick={handleConfirmFinalization}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Finalizing...' : 'Confirm Finalization'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}