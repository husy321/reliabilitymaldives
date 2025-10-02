"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
  Users,
  Receipt,
  UserPlus,
  X
} from 'lucide-react';
import { ImportOptions, ImportPreview, BulkImportResult } from '../../../types/bulk-import';
import { useToast } from '@/hooks/useToast';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: BulkImportResult) => void;
}

type ImportStep = 'upload' | 'configure' | 'preview' | 'importing' | 'complete';

export function BulkImportDialog({ open, onOpenChange, onImportComplete }: BulkImportDialogProps) {
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState<ImportStep>('upload');
  const [csvText, setCsvText] = useState('');
  const [importData, setImportData] = useState<any[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    importType: 'combined',
    updateExisting: false,
    skipDuplicates: true,
    validateOnly: false
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset dialog state only when opening (but preserve success state)
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    console.log('Dialog useEffect triggered - open:', open, 'hasOpened:', hasOpened, 'current step:', step);
    if (open && !hasOpened) {
      console.log('Dialog opened for first time this session - resetting state');
      if (step !== 'complete' && step !== 'importing') {
        resetDialog();
      }
      setHasOpened(true);
    } else if (!open && hasOpened) {
      // Reset the hasOpened flag when dialog closes
      setHasOpened(false);
    }
  }, [open, hasOpened, step]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered', event);
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      console.log('File content loaded, length:', text?.length);
      setCsvText(text);
      setStep('configure');
      setError(null);
    };
    reader.onerror = () => {
      console.error('FileReader error');
      setError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  }, []);

  const handleCsvPaste = useCallback((text: string) => {
    setCsvText(text);
    setStep('configure');
    setError(null);
  }, []);

  const generatePreview = async () => {
    if (!csvText.trim()) {
      setError('Please provide CSV data');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvText,
          options: { ...options, validateOnly: true }
        })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to generate preview');
        return;
      }

      setPreview(data.data);
      setStep('preview');
    } catch (error) {
      console.error('Preview error:', error);
      setError('Failed to generate preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeImport = async () => {
    if (!csvText.trim()) {
      setError('No data to import');
      return;
    }

    console.log('=== FRONTEND: Starting import execution ===');
    console.log('Options being sent:', { ...options, validateOnly: false });

    setIsProcessing(true);
    setError(null);
    setStep('importing');

    try {
      const response = await fetch('/api/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvText,
          options: { ...options, validateOnly: false }
        })
      });

      console.log('Import response status:', response.status);
      const data = await response.json();
      console.log('Import response data:', data);
      console.log('About to set result and step to complete');

      if (!data.success) {
        console.log('Import failed:', data.error);
        setError(data.error || 'Import failed');
        setStep('preview');
        return;
      }

      console.log('Setting result data:', data.data);
      setResult(data.data);
      console.log('Setting step to complete');
      setStep('complete');
      console.log('Step set to complete, result set. Dialog should now show success.');

      if (onImportComplete) {
        onImportComplete(data.data);
      }

      showSuccess(`Import completed successfully! ${data.data.successCount} records processed.`);
    } catch (error) {
      console.error('Import error:', error);
      setError('Import failed');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    console.log('resetDialog called - current step was:', step);
    setStep('upload');
    setCsvText('');
    setImportData([]);
    setPreview(null);
    setResult(null);
    setError(null);
    setIsProcessing(false);
    console.log('resetDialog completed - step set to upload');
  };

  const downloadTemplate = (type: 'customers' | 'receivables' | 'combined') => {
    const templates = {
      customers: 'name,email,phone,address,paymentTerms,isActive\nExample Customer Ltd,contact@example.com,+960 123-4567,"Male, Maldives",30,true',
      receivables: 'invoiceNumber,customerName,customerEmail,amount,invoiceDate,paidAmount,assignedTo\nINV-2024-001,Example Customer Ltd,contact@example.com,1500.00,2024-01-15,0,SALES',
      combined: 'customerName,customerEmail,customerPhone,customerAddress,customerPaymentTerms,invoiceNumber,amount,invoiceDate,paidAmount,assignedTo\nExample Customer Ltd,contact@example.com,+960 123-4567,"Male, Maldives",30,INV-2024-001,1500.00,2024-01-15,0,SALES'
    };

    const blob = new Blob([templates[type]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import - {step === 'upload' ? 'Upload Data' :
                          step === 'configure' ? 'Configure Import' :
                          step === 'preview' ? 'Preview & Validate' :
                          step === 'importing' ? 'Importing...' : 'Complete'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Import customers and invoices in bulk using CSV format
              </p>
            </div>

            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="paste">Paste Data</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload or drag and drop your CSV file
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => {
                      console.log('Choose File button clicked');
                      const input = document.getElementById('csv-upload') as HTMLInputElement;
                      console.log('Input element found:', !!input);
                      if (input) {
                        input.click();
                      }
                    }}
                    type="button"
                  >
                    Choose File
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  placeholder="Paste your CSV data here..."
                  rows={10}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => handleCsvPaste(csvText)}
                  disabled={!csvText.trim()}
                  className="w-full"
                >
                  Continue with Pasted Data
                </Button>
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Download Templates</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate('customers')}
                    className="flex items-center gap-1"
                  >
                    <Users className="h-3 w-3" />
                    Customers
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate('receivables')}
                    className="flex items-center gap-1"
                  >
                    <Receipt className="h-3 w-3" />
                    Invoices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate('combined')}
                    className="flex items-center gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    Combined
                  </Button>
                </div>
              </div>

              <div className="text-xs space-y-2">
                <h4 className="font-medium">Field Format Requirements:</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-medium text-blue-600">Dates:</div>
                    <div>YYYY-MM-DD (e.g., 2024-01-15)</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Amounts:</div>
                    <div>Numbers only (e.g., 1500.00)</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Emails:</div>
                    <div>Valid format (user@domain.com)</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Roles:</div>
                    <div>ADMIN, SALES, ACCOUNTS, MANAGER, ACCOUNTANT</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Boolean:</div>
                    <div>true/false, yes/no, 1/0</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">Required:</div>
                    <div>All * marked fields must have values</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Import Type</label>
                <Select value={options.importType} onValueChange={(value: any) => setOptions({...options, importType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customers">Customers Only</SelectItem>
                    <SelectItem value="receivables">Invoices Only</SelectItem>
                    <SelectItem value="combined">Customers + Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={options.updateExisting}
                  onCheckedChange={(checked) => setOptions({...options, updateExisting: !!checked})}
                />
                <label htmlFor="updateExisting" className="text-sm">
                  Update existing records with new data
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={options.skipDuplicates}
                  onCheckedChange={(checked) => setOptions({...options, skipDuplicates: !!checked})}
                />
                <label htmlFor="skipDuplicates" className="text-sm">
                  Skip duplicate records (recommended)
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Preview Data</h4>
              <div className="bg-muted/50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {csvText.split('\n').slice(0, 5).map((line, i) => (
                  <div key={i} className={i === 0 ? 'font-bold' : ''}>
                    {line}
                  </div>
                ))}
                {csvText.split('\n').length > 5 && (
                  <div className="text-muted-foreground">
                    ... and {csvText.split('\n').length - 5} more rows
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep('upload')} variant="outline">
                Back
              </Button>
              <Button onClick={generatePreview} disabled={isProcessing}>
                {isProcessing ? 'Validating...' : 'Preview & Validate'}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Rows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{preview.totalRows}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Valid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{preview.validRows}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{preview.invalidRows}</div>
                </CardContent>
              </Card>
            </div>

            {preview.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600">Validation Errors ({preview.errors.length} total)</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {preview.errors.slice(0, 15).map((error, i) => (
                    <div key={i} className="text-xs p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-red-700">Row {error.row}</strong>
                        {error.field && (
                          <span className="text-red-600 bg-red-100 px-1 py-0.5 rounded text-xs">
                            {error.field}
                          </span>
                        )}
                      </div>
                      <div className="text-red-600 mb-1">{error.message}</div>
                      {error.value !== undefined && error.value !== null && error.value !== '' && (
                        <div className="text-gray-600">
                          <span className="font-medium">Current value:</span> "{String(error.value)}"
                        </div>
                      )}
                      {error.field === 'invoiceDate' && (
                        <div className="text-blue-600 mt-1">
                          <span className="font-medium">Fix:</span> Use YYYY-MM-DD format (e.g., 2024-01-15)
                        </div>
                      )}
                      {error.field === 'amount' && (
                        <div className="text-blue-600 mt-1">
                          <span className="font-medium">Fix:</span> Enter a positive number (e.g., 1500.00)
                        </div>
                      )}
                      {error.field === 'email' && (
                        <div className="text-blue-600 mt-1">
                          <span className="font-medium">Fix:</span> Use valid email format (e.g., user@example.com)
                        </div>
                      )}
                      {error.field === 'assignedTo' && (
                        <div className="text-blue-600 mt-1">
                          <span className="font-medium">Fix:</span> Use: ADMIN, SALES, ACCOUNTS, MANAGER, or ACCOUNTANT
                        </div>
                      )}
                    </div>
                  ))}
                  {preview.errors.length > 15 && (
                    <div className="text-xs text-muted-foreground p-2 text-center bg-gray-50 rounded">
                      ... and {preview.errors.length - 15} more errors. Fix the above errors and try again to see remaining issues.
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  <strong>💡 Tips:</strong> Download a template to see the correct format, or check the documentation section below.
                </div>
              </div>
            )}

            {(preview.duplicateInvoices.length > 0 || preview.duplicateCustomers.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-orange-600">Duplicates Found</h4>
                {preview.duplicateInvoices.length > 0 && (
                  <div className="text-xs">
                    <strong>Invoice Numbers:</strong> {preview.duplicateInvoices.slice(0, 5).join(', ')}
                    {preview.duplicateInvoices.length > 5 && ` ... and ${preview.duplicateInvoices.length - 5} more`}
                  </div>
                )}
                {preview.duplicateCustomers.length > 0 && (
                  <div className="text-xs">
                    <strong>Customer Names:</strong> {preview.duplicateCustomers.slice(0, 5).join(', ')}
                    {preview.duplicateCustomers.length > 5 && ` ... and ${preview.duplicateCustomers.length - 5} more`}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setStep('configure')} variant="outline">
                Back
              </Button>
              <Button
                onClick={executeImport}
                disabled={preview.validRows === 0 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Importing...' : `Import ${preview.validRows} Records`}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <div>
              <h3 className="text-lg font-medium">Processing Import...</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your data
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && result && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-medium">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Records Processed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {result.successCount} / {result.totalRows}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {result.errorCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">{result.customersCreated}</div>
                <div className="text-xs text-muted-foreground">Customers Created</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{result.customersUpdated}</div>
                <div className="text-xs text-muted-foreground">Customers Updated</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">{result.receivablesCreated}</div>
                <div className="text-xs text-muted-foreground">Invoices Created</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600">Import Errors ({result.errors.length} total)</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.errors.slice(0, 10).map((error, i) => (
                    <div key={i} className="text-xs p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-red-700">Row {error.row}</strong>
                        {error.field && (
                          <span className="text-red-600 bg-red-100 px-1 py-0.5 rounded text-xs">
                            {error.field}
                          </span>
                        )}
                      </div>
                      <div className="text-red-600 mb-1">{error.message}</div>
                      {error.value !== undefined && error.value !== null && error.value !== '' && (
                        <div className="text-gray-600">
                          <span className="font-medium">Value:</span> "{String(error.value)}"
                        </div>
                      )}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="text-xs text-muted-foreground p-2 text-center bg-gray-50 rounded">
                      ... and {result.errors.length - 10} more errors occurred during import
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={resetDialog} variant="outline" className="flex-1">
                Import More Data
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}