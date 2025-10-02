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
import { ReceivableFormData, UserRole } from '../../../types/receivable';
import { Customer } from '../../../types/customer';

interface ReceivableCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSubmit: (data: ReceivableFormData) => Promise<void>;
  isLoading?: boolean;
  currentUserRole: UserRole;
}

export function ReceivableCreateDialog({
  open,
  onOpenChange,
  customers,
  onSubmit,
  isLoading = false,
  currentUserRole
}: ReceivableCreateDialogProps) {
  const handleSubmit = async (data: ReceivableFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Create receivable error:', error);
      // Error handling is done by the form component
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Receivable</DialogTitle>
          <DialogDescription>
            Add a new receivable to track customer invoices and payments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <ReceivableForm
            customers={customers}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            mode="create"
            currentUserRole={currentUserRole}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}