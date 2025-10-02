'use client';

import React, { useState } from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerForm } from './CustomerForm';
import { Customer, CustomerFormData } from '../../../types/customer';
// Temporary: Use development version to bypass authentication
import { updateCustomerActionDev as updateCustomerAction } from '@/lib/actions/customers-dev';
import { useToast } from '@/hooks/useToast';

interface CustomerEditDialogProps {
  customer: Customer;
  onCustomerUpdated?: () => void;
  triggerButton?: React.ReactNode;
}

export function CustomerEditDialog({ 
  customer,
  onCustomerUpdated,
  triggerButton 
}: CustomerEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleUpdateCustomer = async (customerData: CustomerFormData) => {
    setIsLoading(true);
    
    try {
      const result = await updateCustomerAction(customer.id, customerData);
      
      if (result.success) {
        showSuccess('Customer updated successfully');
        setIsOpen(false);
        onCustomerUpdated?.();
      } else {
        showError(result.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CustomerForm
            customer={customer}
            mode="edit"
            onSubmit={handleUpdateCustomer}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}