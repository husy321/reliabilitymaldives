'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, DollarSign } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Receivable, PaymentData } from '../../../types/receivable';
import { formatCurrencyMvr } from '@/lib/utils';

// Payment form validation schema
const PaymentFormSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  date: z.date({
    required_error: 'Payment date is required',
  }),
  notes: z.string().optional()
}).refine((data) => {
  // Payment date should not be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  if (data.date > today) {
    return false;
  }
  return true;
}, {
  message: 'Payment date cannot be in the future',
  path: ['date']
});

interface PaymentRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable | null;
  onSubmit: (paymentData: PaymentData) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentRecordDialog({
  open,
  onOpenChange,
  receivable,
  onSubmit,
  isLoading = false
}: PaymentRecordDialogProps) {
  const form = useForm<PaymentData>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      notes: ''
    }
  });

  // Reset form when dialog opens/closes or receivable changes
  React.useEffect(() => {
    if (open && receivable) {
      const remainingBalance = receivable.amount - receivable.paidAmount;
      form.reset({
        amount: remainingBalance,
        date: new Date(),
        notes: ''
      });
    }
  }, [open, receivable, form]);

  const handleSubmit = async (data: PaymentData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Payment submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!receivable) {
    return null;
  }

  const remainingBalance = receivable.amount - receivable.paidAmount;
  const watchedAmount = form.watch('amount') || 0;
  const maxPaymentAmount = remainingBalance;

  // Format currency helper
  const formatCurrency = (amount: number) => formatCurrencyMvr(amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for invoice {receivable.invoiceNumber} from {receivable.customer.name}
          </DialogDescription>
        </DialogHeader>

        {/* Receivable Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Invoice Total:</span>
            <span className="tabular-nums">{formatCurrency(receivable.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Amount Paid:</span>
            <span className="tabular-nums">{formatCurrency(receivable.paidAmount)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium">Remaining Balance:</span>
            <span className="tabular-nums font-medium text-lg">
              {formatCurrency(remainingBalance)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Payment Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxPaymentAmount}
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
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Maximum: {formatCurrency(maxPaymentAmount)}</span>
                    {watchedAmount > 0 && (
                      <span>
                        New Balance: {formatCurrency(remainingBalance - watchedAmount)}
                      </span>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select payment date"
                      disabled={isLoading}
                      disableFuture={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Payment method, reference, etc."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Impact Preview */}
            {watchedAmount > 0 && (
              <div className="rounded-lg border bg-primary/10 p-3">
                <div className="text-sm font-medium text-primary mb-2">
                  Payment Impact:
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="tabular-nums">{formatCurrency(remainingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Payment Amount:</span>
                    <span className="tabular-nums">-{formatCurrency(watchedAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>New Balance:</span>
                    <span className="tabular-nums">
                      {formatCurrency(remainingBalance - watchedAmount)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge variant={remainingBalance - watchedAmount <= 0 ? "default" : "secondary"}>
                      {remainingBalance - watchedAmount <= 0 ? "Fully Paid" : "Partially Paid"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || watchedAmount <= 0}
                className="flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}