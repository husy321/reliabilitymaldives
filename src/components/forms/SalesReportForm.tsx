"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DocumentUploader } from "@/components/business/DocumentUploader";
import { Separator } from "@/components/ui/separator";
import { Calculator, Upload, Building2 } from "lucide-react";
import { SalesReportFormData, SalesReportStatus } from "../../../types/sales-report";
import { DocumentCategory, Document } from "../../../types/document";
import { UploadOptions } from "../../../types/upload";
import { useOutletSelection } from "@/hooks/useOutletSelection";
import { useMultiOutletSelection } from "@/hooks/useMultiOutletSelection";
import { OutletContextSwitcher } from "@/components/business/OutletContextSwitcher";
import { submitSalesReportAction } from "@/lib/actions/sales-reports";

const salesReportSchema = z.object({
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
});

type SalesReportFormType = z.infer<typeof salesReportSchema>;

interface SalesReportFormProps {
  defaultOutletId?: string;
  defaultOutletIds?: string[];
  enableMultiOutlet?: boolean;
  initialData?: SalesReportFormData;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
  submitButtonText?: string;
  onSuccess?: (reportId?: string, formData?: SalesReportFormData) => void;
  onCancel: () => void;
}

export function SalesReportForm({
  defaultOutletId,
  defaultOutletIds,
  enableMultiOutlet = false,
  initialData,
  mode = 'create',
  isSubmitting: externalSubmitting = false,
  submitButtonText,
  onSuccess,
  onCancel,
}: SalesReportFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [formDataCache, setFormDataCache] = useState<Record<string, Partial<SalesReportFormType>>>({});
  
  // Use appropriate outlet selection hook based on multi-outlet mode
  const singleOutletSelection = useOutletSelection(defaultOutletId);
  const multiOutletSelection = useMultiOutletSelection(defaultOutletIds);
  
  // Choose which selection to use based on enableMultiOutlet flag
  const outletSelection = enableMultiOutlet ? multiOutletSelection : singleOutletSelection;
  
  const {
    outlets,
    isLoading: outletsLoading,
    error: outletsError,
  } = outletSelection;
  
  // Get selected outlet ID - for multi-outlet use activeOutletId, for single use selectedOutletId
  const selectedOutletId = enableMultiOutlet 
    ? (outletSelection as { activeOutletId: string | null }).activeOutletId 
    : (outletSelection as { selectedOutletId: string | null }).selectedOutletId;
    
  const setSelectedOutletId = enableMultiOutlet 
    ? (outletSelection as { setActiveOutletId: (id: string | null) => void }).setActiveOutletId
    : (outletSelection as { setSelectedOutletId: (id: string | null) => void }).setSelectedOutletId;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SalesReportFormType>({
    resolver: zodResolver(salesReportSchema),
    defaultValues: initialData ? {
      outletId: initialData.outletId,
      date: initialData.date,
      cashDeposits: initialData.cashDeposits,
      cardSettlements: initialData.cardSettlements,
      totalSales: initialData.totalSales,
    } : {
      outletId: selectedOutletId || "",
      date: new Date(),
      cashDeposits: 0,
      cardSettlements: 0,
      totalSales: 0,
    },
  });

  const cashDeposits = watch("cashDeposits");
  const cardSettlements = watch("cardSettlements");

  // Auto-calculate total sales when cash or card amounts change
  useEffect(() => {
    const total = (cashDeposits || 0) + (cardSettlements || 0);
    setValue("totalSales", total);
  }, [cashDeposits, cardSettlements, setValue]);

  // Update form when selectedOutletId changes
  useEffect(() => {
    if (selectedOutletId) {
      setValue("outletId", selectedOutletId);
    }
  }, [selectedOutletId, setValue]);

  // Form data persistence for outlet switching (multi-outlet mode only)
  useEffect(() => {
    if (enableMultiOutlet && selectedOutletId) {
      // Save current form data before switching
      const currentData = watch();
      if (currentData.outletId && currentData.outletId !== selectedOutletId) {
        setFormDataCache(prev => ({
          ...prev,
          [currentData.outletId]: {
            date: currentData.date,
            cashDeposits: currentData.cashDeposits,
            cardSettlements: currentData.cardSettlements,
            totalSales: currentData.totalSales,
          }
        }));
      }
      
      // Load cached data for new outlet or reset to defaults
      const cachedData = formDataCache[selectedOutletId];
      if (cachedData) {
        setValue("date", cachedData.date || new Date());
        setValue("cashDeposits", cachedData.cashDeposits || 0);
        setValue("cardSettlements", cachedData.cardSettlements || 0);
        setValue("totalSales", cachedData.totalSales || 0);
      } else {
        // Reset to defaults for new outlet
        setValue("date", new Date());
        setValue("cashDeposits", 0);
        setValue("cardSettlements", 0);
        setValue("totalSales", 0);
      }
    }
  }, [selectedOutletId, enableMultiOutlet, setValue, watch, formDataCache]);

  const selectedOutlet = outlets.find(outlet => outlet.id === selectedOutletId);

  // Handle outlet context changes in multi-outlet mode
  const handleActiveOutletChange = useCallback((outletId: string | null) => {
    if (outletId && enableMultiOutlet) {
      setSelectedOutletId(outletId);
    }
  }, [enableMultiOutlet, setSelectedOutletId]);

  const handleFormSubmit = async (data: SalesReportFormType) => {
    setError(null);
    
    try {
      const formData: SalesReportFormData = {
        ...data,
        status: mode === 'edit' ? (initialData?.status || SalesReportStatus.DRAFT) : SalesReportStatus.DRAFT,
      };
      
      if (mode === 'edit') {
        // In edit mode, return the form data to the parent handler
        onSuccess?.(formData as any);
      } else {
        // In create mode, use the original server action
        const result = await submitSalesReportAction(formData);
        
      if (result.success) {
        // Inform uploader to finalize any deferred uploads now that we have an ID
        // We pass through onSuccess; NewSalesReportClient handles redirect
        onSuccess?.(result.data.id);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit sales report");
    }
  };

  const handleDocumentUpload = useCallback((documents: Document[]) => {
    setUploadedDocuments(prev => [...prev, ...documents]);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setError(`Document upload failed: ${error}`);
  }, []);

  // Upload options for document uploader
  const uploadOptions: UploadOptions = {
    salesReportId: undefined, // will be injected after report create
    category: DocumentCategory.OTHER,
    maxFiles: 10,
  };

  // Show loading state while outlets are being fetched
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

  return (
    <div className="space-y-6">
      {/* Outlet Information Header - Use OutletContextSwitcher for multi-outlet mode */}
      {enableMultiOutlet ? (
        <OutletContextSwitcher
          showMultiSelect={true}
          onActiveOutletChange={handleActiveOutletChange}
        />
      ) : (
        selectedOutlet && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedOutlet.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedOutlet.location}
              </p>
            </CardHeader>
          </Card>
        )
      )}

      {/* Sales Report Form */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Outlet Selection - Only show in single-outlet mode */}
            {!enableMultiOutlet && (
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Controller
                  name="outletId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedOutletId(value);
                      }}
                      disabled={outletsLoading || isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            <div className="flex flex-col">
                              <span>{outlet.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {outlet.location}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.outletId && (
                  <p className="text-sm text-red-500">{errors.outletId.message}</p>
                )}
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select report date"
                    disabled={outletsLoading || isSubmitting}
                    disableFuture={true}
                  />
                )}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            <Separator />

            {/* Sales Data */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                <h3 className="font-medium">Sales Data</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cash Deposits */}
                <div className="space-y-2">
                  <Label htmlFor="cashDeposits">Cash Deposits</Label>
                  <Input
                    id="cashDeposits"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={outletsLoading || isSubmitting}
                    {...register("cashDeposits", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.cashDeposits && (
                    <p className="text-sm text-red-500">
                      {errors.cashDeposits.message}
                    </p>
                  )}
                </div>

                {/* Card Settlements */}
                <div className="space-y-2">
                  <Label htmlFor="cardSettlements">Card Settlements</Label>
                  <Input
                    id="cardSettlements"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={outletsLoading || isSubmitting}
                    {...register("cardSettlements", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.cardSettlements && (
                    <p className="text-sm text-red-500">
                      {errors.cardSettlements.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Sales (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="totalSales">Total Sales (Auto-calculated)</Label>
                <Input
                  id="totalSales"
                  type="number"
                  step="0.01"
                  readOnly
                  disabled
                  className="bg-muted"
                  {...register("totalSales", {
                    valueAsNumber: true,
                  })}
                />
                {errors.totalSales && (
                  <p className="text-sm text-red-500">
                    {errors.totalSales.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Document Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <h3 className="font-medium">Supporting Documents</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload sales receipts, cash deposit slips, and other supporting documents.
              </p>

              <DocumentUploader
                options={uploadOptions}
                linkSalesReportId={undefined}
                onUploadComplete={handleDocumentUpload}
                onError={handleUploadError}
              />

              {uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Uploaded Documents ({uploadedDocuments.length})
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {uploadedDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <span>•</span>
                        <span>{doc.originalName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || externalSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={outletsLoading || isSubmitting || externalSubmitting}
              >
                {(isSubmitting || externalSubmitting) 
                  ? (mode === 'edit' ? "Updating..." : "Creating Report...") 
                  : (submitButtonText || (mode === 'edit' ? "Update Report" : "Create Sales Report"))
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}