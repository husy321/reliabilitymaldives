'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReceivableForm } from './ReceivableForm';
import { Receivable, ReceivableFormData, UserRole } from '../../../types/receivable';
import { Customer } from '../../../types/customer';

interface ReceivableEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable | null;
  customers: Customer[];
  onSubmit: (receivableId: string, data: ReceivableFormData) => Promise<void>;
  isLoading?: boolean;
  currentUserRole: UserRole;
}

export function ReceivableEditDialog({
  open,
  onOpenChange,
  receivable,
  customers,
  onSubmit,
  isLoading = false,
  currentUserRole
}: ReceivableEditDialogProps) {
  const handleSubmit = async (data: ReceivableFormData) => {
    if (!receivable) return;
    
    try {
      await onSubmit(receivable.id, data);
      onOpenChange(false);
    } catch (error) {
      console.error('Edit receivable error:', error);
      // Error handling is done by the form component
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!receivable) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[min(95vw,1400px)] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Edit Receivable</DialogTitle>
          <DialogDescription>
            Update receivable information for invoice {receivable.invoiceNumber}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <ReceivableForm
            receivable={receivable}
            customers={customers}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            mode="edit"
            currentUserRole={currentUserRole}
            fullWidth
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}