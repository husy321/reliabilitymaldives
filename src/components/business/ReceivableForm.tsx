'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calculator } from 'lucide-react';

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
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { 
  ReceivableFormData, 
  ReceivableFormProps, 
  UserRole,
  USER_ROLE_LABELS 
} from '../../../types/receivable';
import { Customer } from '../../../types/customer';
import { DocumentList } from './DocumentList';
import { SimpleDocumentUploadQueue } from './SimpleDocumentUploadQueue';
import { DocumentWithUser } from '../../../types/document';
import { getReceivableDocumentsAction, unlinkDocumentFromReceivableAction } from '@/lib/actions/documents';
import { previewDocumentAction, downloadDocumentAction } from '@/lib/actions/documents';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';

// Form validation schema
const ReceivableFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100, 'Invoice number must be less than 100 characters'),
  customerId: z.string().min(1, 'Customer selection is required'),
  amount: z.number().positive('Amount must be positive').max(99999999.99, 'Amount too large'),
  invoiceDate: z.date({
    required_error: 'Invoice date is required',
  }),
  assignedTo: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Please select a team member' })
  })
}).refine((data) => {
  // Invoice date should not be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  if (data.invoiceDate > today) {
    return false;
  }
  return true;
}, {
  message: 'Invoice date cannot be in the future',
  path: ['invoiceDate']
});

export function ReceivableForm({
  receivable,
  customers,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  currentUserRole,
  fullWidth = false
}: ReceivableFormProps) {
  const { showSuccess, showError } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [calculatedDueDate, setCalculatedDueDate] = useState<Date | null>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentWithUser[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentSection, setShowDocumentSection] = useState(false);

  const form = useForm<ReceivableFormData>({
    resolver: zodResolver(ReceivableFormSchema),
    defaultValues: {
      invoiceNumber: receivable?.invoiceNumber || '',
      customerId: receivable?.customerId || '',
      amount: receivable?.amount || 0,
      invoiceDate: receivable?.invoiceDate || new Date(),
      assignedTo: receivable?.assignedTo || currentUserRole
    }
  });

  // Update selected customer when customer changes
  const watchCustomerId = form.watch('customerId');
  const watchInvoiceDate = form.watch('invoiceDate');

  useEffect(() => {
    if (watchCustomerId) {
      const customer = customers.find(c => c.id === watchCustomerId);
      setSelectedCustomer(customer || null);
      
      // Calculate due date based on customer payment terms and invoice date
      if (customer && watchInvoiceDate) {
        const dueDate = new Date(watchInvoiceDate);
        dueDate.setDate(dueDate.getDate() + customer.paymentTerms);
        setCalculatedDueDate(dueDate);
      }
    } else {
      setSelectedCustomer(null);
      setCalculatedDueDate(null);
    }
  }, [watchCustomerId, watchInvoiceDate, customers]);

  // Load linked documents for existing receivables
  const loadLinkedDocuments = useCallback(async () => {
    if (!receivable?.id) return;
    setLoadingDocuments(true);
    try {
      const result = await getReceivableDocumentsAction(receivable.id);
      if (result.success) {
        setLinkedDocuments(result.data);
        setShowDocumentSection(result.data.length > 0);
      } else {
        showError('Failed to load linked documents', { title: 'Document Error' });
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      showError('Error loading documents', { title: 'Document Error' });
    } finally {
      setLoadingDocuments(false);
    }
  }, [receivable?.id]);

  // Load documents when editing an existing receivable
  useEffect(() => {
    if (mode === 'edit' && receivable?.id) {
      loadLinkedDocuments();
    }
    // Intentionally omit loadLinkedDocuments from deps to avoid re-fetch loops due to unstable hook fns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, receivable?.id]);

  // Document handling functions
  const handleDocumentUpload = useCallback(async (uploadedCount: number) => {
    // Simple callback that just receives the count of uploaded files
    showSuccess(`${uploadedCount} document(s) uploaded successfully`, { title: 'Upload Complete' });

    // Reload documents to show newly uploaded ones
    if (receivable?.id) {
      await loadLinkedDocuments();
    }
  }, [receivable?.id, loadLinkedDocuments, showSuccess]);

  const handleDocumentRemove = useCallback(async (documentId: string) => {
    if (!receivable?.id) return;
    
    try {
      const result = await unlinkDocumentFromReceivableAction(documentId, receivable.id);
      if (result.success) {
        setLinkedDocuments(prev => prev.filter(doc => doc.id !== documentId));
        showSuccess('Document removed from receivable', { title: 'Document Removed' });
      } else {
        showError(result.error, { title: 'Remove Error' });
      }
    } catch (error) {
      console.error('Error removing document:', error);
      showError('Failed to remove document', { title: 'Remove Error' });
    }
  }, [receivable?.id, showSuccess, showError]);

  const handleDocumentPreview = useCallback(async (documentId: string) => {
    try {
      const result = await previewDocumentAction(documentId);
      if (result.success) {
        // Open document in new window/tab
        window.open(result.data.previewUrl, '_blank');
      } else {
        showError(result.error, { title: 'Preview Error' });
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      showError('Failed to preview document', { title: 'Preview Error' });
    }
  }, [showError]);

  const handleBulkDownload = useCallback(async (documentIds: string[]) => {
    try {
      // Download each document individually (simplified approach)
      for (const documentId of documentIds) {
        const result = await downloadDocumentAction(documentId);
        if (result.success) {
          // Trigger download by creating temporary link
          const link = document.createElement('a');
          link.href = result.data.downloadUrl;
          link.download = result.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      showSuccess(`Downloaded ${documentIds.length} documents`, { title: 'Download Complete' });
    } catch (error) {
      console.error('Error downloading documents:', error);
      showError('Failed to download documents', { title: 'Download Error' });
    }
  }, [showSuccess, showError]);

  const handleSubmit = async (data: ReceivableFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isEditMode = mode === 'edit';
  const formTitle = isEditMode ? 'Edit Receivable' : 'Create New Receivable';
  
  // Get total amount for summary
  const totalAmount = form.watch('amount') || 0;

  return (
    <Card className={`w-full ${fullWidth ? '' : 'max-w-4xl'} mx-auto`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {formTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Number - Required Field */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter invoice number"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Selection - Required Field */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers
                          .filter(customer => customer.isActive)
                          .map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex items-center gap-2">
                              <span>{customer.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {customer.paymentTerms}d terms
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedCustomer && (
                      <div className="text-sm text-muted-foreground">
                        Payment Terms: {selectedCustomer.paymentTerms} days
                        {calculatedDueDate && (
                          <span className="ml-2">
                            • Due: {formatDate(calculatedDueDate)}
                          </span>
                        )}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Invoice Amount - Required Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="99999999.99"
                        placeholder="0.00"
                        disabled={isLoading}
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invoice Date - Required Field */}
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select invoice date"
                        disabled={isLoading}
                        disableFuture={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assigned To - Required Field */}
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Only show roles that can handle receivables */}
                        {[UserRole.SALES, UserRole.ACCOUNTS, UserRole.MANAGER, UserRole.ACCOUNTANT].map(role => (
                          <SelectItem key={role} value={role}>
                            {USER_ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary Card - spans across both columns */}
              {totalAmount > 0 && (
                <div className="md:col-span-2">
                  <div className="rounded-lg border bg-muted/50 p-4 max-w-md">
                    <h4 className="text-sm font-medium mb-2">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="tabular-nums">{totalAmount.toFixed(2)}</span>
                      </div>
                      {calculatedDueDate && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Due Date:</span>
                          <span>{formatDate(calculatedDueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Management Section - Only for existing receivables or when explicitly shown */}
            {(mode === 'edit' && receivable?.id) || showDocumentSection ? (
              <div className="col-span-full">
                <Separator className="my-6" />
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Supporting Documents</h3>
                    {mode === 'create' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDocumentSection(false)}
                      >
                        Hide Document Section
                      </Button>
                    )}
                  </div>
                  
                  {/* Document Upload for New Receivables */}
                  {mode === 'create' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Note: Documents can only be uploaded after creating the receivable. Save this receivable first, then edit it to upload documents.
                      </p>
                    </div>
                  )}
                  
                  {/* Document List for Existing Receivables */}
                  {mode === 'edit' && receivable?.id && (
                    <div className="space-y-4">
                      {/* Simple Document Upload Queue */}
                      <SimpleDocumentUploadQueue
                        receivableId={receivable.id}
                        onUploadComplete={handleDocumentUpload}
                      />

                      {/* Document List */}
                      <DocumentList
                        documents={linkedDocuments}
                        receivableId={receivable.id}
                        currentUserRole={currentUserRole}
                        showUploadZone={false}
                        allowRemoval={true}
                        allowDownload={true}
                        groupByCategory={false}
                        sortBy="date"
                        sortOrder="desc"
                        onDocumentRemove={handleDocumentRemove}
                        onDocumentPreview={handleDocumentPreview}
                        onBulkDownload={handleBulkDownload}
                        loading={loadingDocuments}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : mode === 'create' && (
              <div className="col-span-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDocumentSection(true)}
                  className="w-full"
                >
                  Add Supporting Documents
                </Button>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Receivable' : 'Create Receivable'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
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