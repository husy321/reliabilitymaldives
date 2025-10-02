'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calculator, Users, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type {
  AttendancePeriod,
  PayrollPreviewData,
  PayrollCalculationRequest,
  PayrollApprovalRequest
} from '@/types/payroll';

interface PayrollCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendancePeriods: AttendancePeriod[];
  onValidateEligibility: (periodId: string) => Promise<{
    eligible: boolean;
    reason?: string;
    attendancePeriod: any;
    existingPayroll: any;
  }>;
  onGetPreview: (periodId: string, employeeIds?: string[]) => Promise<PayrollPreviewData[]>;
  onCalculatePayroll: (request: PayrollCalculationRequest) => Promise<void>;
  onApprovePayroll: (request: PayrollApprovalRequest) => Promise<void>;
  isLoading?: boolean;
}

type ModalStep = 'select' | 'preview' | 'confirm' | 'approve';

export function PayrollCalculationModal({
  isOpen,
  onClose,
  attendancePeriods,
  onValidateEligibility,
  onGetPreview,
  onCalculatePayroll,
  onApprovePayroll,
  isLoading = false,
}: PayrollCalculationModalProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>('select');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<PayrollPreviewData[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('select');
      setSelectedPeriodId('');
      setEligibilityResult(null);
      setPreviewData([]);
    }
  }, [isOpen]);

  // Validate eligibility when period is selected
  useEffect(() => {
    if (selectedPeriodId) {
      validateEligibility();
    } else {
      setEligibilityResult(null);
    }
  }, [selectedPeriodId]);

  const validateEligibility = async () => {
    if (!selectedPeriodId) return;

    setIsValidating(true);
    try {
      const result = await onValidateEligibility(selectedPeriodId);
      setEligibilityResult(result);
    } catch (error) {
      console.error('Eligibility validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceedToPreview = async () => {
    if (!selectedPeriodId || !eligibilityResult?.eligible) return;

    setIsLoadingPreview(true);
    try {
      const preview = await onGetPreview(selectedPeriodId);
      setPreviewData(preview);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Preview loading failed:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleProceedToConfirm = () => {
    setCurrentStep('confirm');
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriodId) return;

    try {
      await onCalculatePayroll({
        periodId: selectedPeriodId,
        confirmCalculation: true
      });
      setCurrentStep('approve');
    } catch (error) {
      console.error('Payroll calculation failed:', error);
    }
  };

  const handleApprovePayroll = async () => {
    if (!eligibilityResult?.existingPayroll?.id) return;

    try {
      await onApprovePayroll({
        periodId: eligibilityResult.existingPayroll.id,
        confirmApproval: true
      });
      onClose();
    } catch (error) {
      console.error('Payroll approval failed:', error);
    }
  };

  const canProceed = selectedPeriodId && !isValidating && eligibilityResult?.eligible;
  const totalGrossPay = previewData.reduce((sum, record) => sum + record.grossPay, 0);
  const totalEmployees = previewData.length;
  const totalStandardHours = previewData.reduce((sum, record) => sum + record.standardHours, 0);
  const totalOvertimeHours = previewData.reduce((sum, record) => sum + record.overtimeHours, 0);

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select': return 'Select Period for Payroll Calculation';
      case 'preview': return 'Payroll Calculation Preview';
      case 'confirm': return 'Confirm Payroll Calculation';
      case 'approve': return 'Approve Payroll';
      default: return 'Payroll Calculation';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {currentStep === 'select' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Finalized Attendance Period</label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an attendance period..." />
                </SelectTrigger>
                <SelectContent>
                  {attendancePeriods
                    .filter(period => period.status === 'FINALIZED')
                    .map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {format(period.startDate, "MMM dd, yyyy")} - {format(period.endDate, "MMM dd, yyyy")}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {eligibilityResult && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Period Information</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{eligibilityResult.attendancePeriod.employeeCount}</div>
                    <div className="text-xs text-muted-foreground">Employees</div>
                  </div>

                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{eligibilityResult.attendancePeriod.totalRecords}</div>
                    <div className="text-xs text-muted-foreground">Records</div>
                  </div>

                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <div className="text-2xl font-bold text-primary">{eligibilityResult.attendancePeriod.status}</div>
                    <div className="text-xs text-muted-foreground">Status</div>
                  </div>
                </div>

                {eligibilityResult.eligible ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Period is eligible for payroll calculation.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {eligibilityResult.reason}
                    </AlertDescription>
                  </Alert>
                )}

                {eligibilityResult.existingPayroll && (
                  <Alert>
                    <AlertDescription>
                      <strong>Existing Payroll Found:</strong> Status: {eligibilityResult.existingPayroll.status}
                      {eligibilityResult.existingPayroll.calculatedBy &&
                        ` | Calculated by: ${eligibilityResult.existingPayroll.calculatedBy}`
                      }
                      {eligibilityResult.existingPayroll.totalAmount &&
                        ` | Total: $${eligibilityResult.existingPayroll.totalAmount.toFixed(2)}`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <div className="text-xs text-muted-foreground">Employees</div>
              </div>

              <div className="text-center p-3 bg-secondary rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold">{totalStandardHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Regular Hours</div>
              </div>

              <div className="text-center p-3 bg-secondary rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold">{totalOvertimeHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">OT Hours</div>
              </div>

              <div className="text-center p-3 bg-secondary rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <div className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Total Gross Pay</div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>OT Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Gross Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.standardHours.toFixed(1)}</TableCell>
                      <TableCell>{record.overtimeHours.toFixed(1)}</TableCell>
                      <TableCell>${record.standardRate.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${record.grossPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {currentStep === 'confirm' && (
          <div className="space-y-6">
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready to Calculate:</strong> This will process payroll for {totalEmployees} employees
                with a total gross pay of ${totalGrossPay.toFixed(2)}.
              </AlertDescription>
            </Alert>

            <div className="bg-secondary p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Period:</span>
                <span className="font-medium">
                  {eligibilityResult?.attendancePeriod &&
                    `${format(new Date(eligibilityResult.attendancePeriod.startDate), "MMM dd, yyyy")} - ${format(new Date(eligibilityResult.attendancePeriod.endDate), "MMM dd, yyyy")}`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Employees:</span>
                <span className="font-medium">{totalEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span>Regular Hours:</span>
                <span className="font-medium">{totalStandardHours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Overtime Hours:</span>
                <span className="font-medium">{totalOvertimeHours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Total Gross Pay:</span>
                <span className="font-semibold">${totalGrossPay.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'approve' && (
          <div className="space-y-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Payroll has been calculated successfully and is ready for approval.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="text-green-800 font-semibold mb-2">Calculation Complete</div>
              <div className="text-sm text-green-700">
                Payroll for {totalEmployees} employees has been calculated.
                Please review and approve to finalize the payroll.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'select' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleProceedToPreview}
                disabled={!canProceed || isLoadingPreview}
              >
                {isValidating ? 'Validating...' : isLoadingPreview ? 'Loading Preview...' : 'Preview Calculation'}
              </Button>
            </>
          )}

          {currentStep === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('select')}>Back</Button>
              <Button onClick={handleProceedToConfirm}>Proceed to Calculate</Button>
            </>
          )}

          {currentStep === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('preview')}>Back</Button>
              <Button
                onClick={handleCalculatePayroll}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Calculating...' : 'Calculate Payroll'}
              </Button>
            </>
          )}

          {currentStep === 'approve' && (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button
                onClick={handleApprovePayroll}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Approving...' : 'Approve Payroll'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}