"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { 
  Calculator, 
  Upload, 
  Building2, 
  Plus, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";
import { SalesReportFormData, SalesReportStatus } from "../../../types/sales-report";
import { DocumentCategory, Document } from "../../../types/document";
import { UploadOptions } from "../../../types/upload";
import { useMultiOutletSelection } from "@/hooks/useMultiOutletSelection";
import { OutletContextSwitcher } from "@/components/business/OutletContextSwitcher";
import { BatchDatePicker } from "@/components/business/BatchDatePicker";
import { DocumentUploader } from "@/components/business/DocumentUploader";
import { submitSalesReportAction } from "@/lib/actions/sales-reports";
import { useBatchOperationStore } from "@/stores/batchOperationStore";
import { DateRange } from "react-day-picker";

// Individual batch report entry schema
const batchReportEntrySchema = z.object({
  id: z.string().optional(), // For tracking rows
  outletId: z.string().min(1, "Please select an outlet"),
  date: z.date({
    required_error: "Please select a date",
  }).refine(
    (date) => date <= new Date(),
    "Cannot create reports for future dates"
  ),
  cashDeposits: z
    .number({
      required_error: "Cash deposits amount is required",
    })
    .min(0, "Cash deposits cannot be negative"),
  cardSettlements: z
    .number({
      required_error: "Card settlements amount is required", 
    })
    .min(0, "Card settlements cannot be negative"),
  totalSales: z.number().min(0, "Total sales cannot be negative"),
  hasErrors: z.boolean().default(false),
});

// Batch form schema
const batchSalesReportSchema = z.object({
  reports: z
    .array(batchReportEntrySchema)
    .min(1, "At least one report is required")
    .refine(
      (reports) => {
        // Check for duplicate outlet-date combinations
        const combinations = reports.map(r => `${r.outletId}-${r.date.toDateString()}`);
        const uniqueCombinations = new Set(combinations);
        return combinations.length === uniqueCombinations.size;
      },
      "Duplicate reports found for the same outlet and date"
    ),
});

type BatchSalesReportFormType = z.infer<typeof batchSalesReportSchema>;
type BatchReportEntryType = z.infer<typeof batchReportEntrySchema>;

interface BatchSalesReportFormProps {
  onSuccess?: (reportIds: string[]) => void;
  onCancel: () => void;
}

export function BatchSalesReportForm({
  onSuccess,
  onCancel,
}: BatchSalesReportFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, Document[]>>({});
  
  // Multi-outlet selection
  const {
    outlets,
    selectedOutletIds,
    isLoading: outletsLoading,
    error: outletsError,
  } = useMultiOutletSelection();
  
  // Batch operation store
  const {
    selectedDates,
    selectedRange,
    dateMode,
    batchFormData,
    setBatchFormData,
  } = useBatchOperationStore();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<BatchSalesReportFormType>({
    resolver: zodResolver(batchSalesReportSchema),
    defaultValues: {
      reports: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "reports",
  });

  const watchedReports = watch("reports");

  // Generate batch entries based on selected dates and outlets
  const generateBatchEntries = useCallback(() => {
    if (selectedOutletIds.length === 0) return;
    
    let dates: Date[] = [];
    
    // Get dates based on mode
    if (dateMode === 'multiple') {
      dates = selectedDates;
    } else if (dateMode === 'range' && selectedRange?.from && selectedRange?.to) {
      // Generate dates from range
      const start = selectedRange.from;
      const end = selectedRange.to;
      dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }
    
    if (dates.length === 0) return;
    
    // Generate entries for each outlet-date combination
    const newReports: BatchReportEntryType[] = [];
    
    selectedOutletIds.forEach((outletId) => {
      dates.forEach((date) => {
        const entryId = `${outletId}-${date.toISOString()}`;
        
        // Check if entry already exists
        const existingEntry = fields.find(
          field => field.outletId === outletId && 
          field.date.toDateString() === date.toDateString()
        );
        
        if (!existingEntry) {
          // Check for cached data from store
          const cachedEntry = batchFormData[entryId];
          
          newReports.push({
            id: entryId,
            outletId,
            date,
            cashDeposits: cachedEntry?.cashDeposits || 0,
            cardSettlements: cachedEntry?.cardSettlements || 0,
            totalSales: cachedEntry?.totalSales || 0,
            hasErrors: false,
          });
        }
      });
    });
    
    // Add new reports
    newReports.forEach(report => append(report));
  }, [selectedOutletIds, selectedDates, selectedRange, dateMode, fields, append, batchFormData]);

  // Auto-generate entries when dates or outlets change
  useEffect(() => {
    generateBatchEntries();
  }, [generateBatchEntries]);

  // Auto-calculate totals and persist data
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && name.startsWith('reports.') && (name.includes('cashDeposits') || name.includes('cardSettlements'))) {
        const reportIndex = parseInt(name.split('.')[1]);
        const report = value.reports?.[reportIndex];
        
        if (report) {
          const total = (report.cashDeposits || 0) + (report.cardSettlements || 0);
          setValue(`reports.${reportIndex}.totalSales`, total);
          
          // Save to store for persistence
          const entryId = report.id || `${report.outletId}-${report.date?.toISOString()}`;
          setBatchFormData({
            ...batchFormData,
            [entryId]: {
              cashDeposits: report.cashDeposits,
              cardSettlements: report.cardSettlements,
              totalSales: total,
            }
          });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, setValue, batchFormData, setBatchFormData]);

  const handleFormSubmit = async (data: BatchSalesReportFormType) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const submissionPromises = data.reports.map(async (report) => {
        const formData: SalesReportFormData = {
          outletId: report.outletId,
          date: report.date,
          cashDeposits: report.cashDeposits,
          cardSettlements: report.cardSettlements,
          totalSales: report.totalSales,
          status: SalesReportStatus.DRAFT,
        };
        
        const result = await submitSalesReportAction(formData);
        return result;
      });
      
      const results = await Promise.all(submissionPromises);
      
      // Check for failures
      const failures = results.filter(result => !result.success);
      if (failures.length > 0) {
        setError(`${failures.length} reports failed to submit. Please review and try again.`);
        return;
      }
      
      // All successful
      const reportIds = results.map(result => result.data.id);
      onSuccess?.(reportIds);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit batch reports");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentUpload = useCallback((reportId: string, documents: Document[]) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [reportId]: [...(prev[reportId] || []), ...documents]
    }));
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setError(`Document upload failed: ${error}`);
  }, []);

  const addNewRow = () => {
    const newEntry: BatchReportEntryType = {
      id: `manual-${Date.now()}`,
      outletId: selectedOutletIds[0] || "",
      date: new Date(),
      cashDeposits: 0,
      cardSettlements: 0,
      totalSales: 0,
      hasErrors: false,
    };
    append(newEntry);
  };

  const removeRow = (index: number) => {
    remove(index);
  };

  // Show loading state
  if (outletsLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading outlets...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if outlets failed to load
  if (outletsError || outlets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {outletsError || "No outlets available. Please ensure you have manager permissions for at least one active outlet."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getTotalSummary = () => {
    return watchedReports.reduce(
      (acc, report) => ({
        cashDeposits: acc.cashDeposits + (report.cashDeposits || 0),
        cardSettlements: acc.cardSettlements + (report.cardSettlements || 0),
        totalSales: acc.totalSales + (report.totalSales || 0),
      }),
      { cashDeposits: 0, cardSettlements: 0, totalSales: 0 }
    );
  };

  const totals = getTotalSummary();

  return (
    <div className="space-y-6">
      {/* Outlet Selection */}
      <OutletContextSwitcher
        showMultiSelect={true}
        onSelectedOutletsChange={(outletIds) => {
          // The hook handles this internally
        }}
      />

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Batch Date Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BatchDatePicker
            placeholder="Select dates for batch reports"
            maxDates={31}
            minDates={1}
          />
        </CardContent>
      </Card>

      {/* Batch Report Form */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Sales Reports</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create multiple sales reports efficiently with bulk data entry.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {fields.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Select outlets and dates above to generate batch report entries.
                </p>
              </div>
            ) : (
              <>
                {/* Batch Entry Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Cash Deposits</TableHead>
                        <TableHead>Card Settlements</TableHead>
                        <TableHead>Total Sales</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const outlet = outlets.find(o => o.id === field.outletId);
                        const fieldErrors = errors.reports?.[index];
                        
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Controller
                                name={`reports.${index}.outletId`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <div className="min-w-[150px]">
                                    <select
                                      {...controllerField}
                                      className="w-full p-1 border rounded text-sm"
                                      disabled={isSubmitting}
                                    >
                                      <option value="">Select outlet</option>
                                      {outlets.map((outlet) => (
                                        <option key={outlet.id} value={outlet.id}>
                                          {outlet.name}
                                        </option>
                                      ))}
                                    </select>
                                    {fieldErrors?.outletId && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldErrors.outletId.message}
                                      </p>
                                    )}
                                  </div>
                                )}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Controller
                                name={`reports.${index}.date`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <div className="min-w-[120px]">
                                    <Input
                                      type="date"
                                      value={controllerField.value ? format(controllerField.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          controllerField.onChange(new Date(e.target.value));
                                        }
                                      }}
                                      disabled={isSubmitting}
                                      className="text-sm"
                                    />
                                    {fieldErrors?.date && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldErrors.date.message}
                                      </p>
                                    )}
                                  </div>
                                )}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Controller
                                name={`reports.${index}.cashDeposits`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <div className="min-w-[100px]">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      {...controllerField}
                                      onChange={(e) => controllerField.onChange(parseFloat(e.target.value) || 0)}
                                      disabled={isSubmitting}
                                      className="text-sm"
                                    />
                                    {fieldErrors?.cashDeposits && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldErrors.cashDeposits.message}
                                      </p>
                                    )}
                                  </div>
                                )}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Controller
                                name={`reports.${index}.cardSettlements`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <div className="min-w-[100px]">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      {...controllerField}
                                      onChange={(e) => controllerField.onChange(parseFloat(e.target.value) || 0)}
                                      disabled={isSubmitting}
                                      className="text-sm"
                                    />
                                    {fieldErrors?.cardSettlements && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldErrors.cardSettlements.message}
                                      </p>
                                    )}
                                  </div>
                                )}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Controller
                                name={`reports.${index}.totalSales`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <div className="min-w-[100px]">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      readOnly
                                      disabled
                                      className="bg-muted text-sm"
                                      {...controllerField}
                                    />
                                  </div>
                                )}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeRow(index)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary Row */}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      Summary ({fields.length} reports)
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Cash: ${totals.cashDeposits.toFixed(2)}</span>
                      <span>Card: ${totals.cardSettlements.toFixed(2)}</span>
                      <span className="font-medium">Total: ${totals.totalSales.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Add Row Button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNewRow}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || fields.length === 0}
              >
                {isSubmitting ? "Creating Reports..." : `Create ${fields.length} Sales Report${fields.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}