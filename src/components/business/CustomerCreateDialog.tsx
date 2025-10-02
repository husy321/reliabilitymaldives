'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CustomerForm } from './CustomerForm';
import { CustomerFormData } from '../../../types/customer';
// Temporary: Use development version to bypass authentication
import { createCustomerActionDev as createCustomerAction } from '@/lib/actions/customers-dev';
import { useToast } from '@/hooks/useToast';

interface CustomerCreateDialogProps {
  onCustomerCreated?: () => void;
  triggerButton?: React.ReactNode;
}

export function CustomerCreateDialog({ 
  onCustomerCreated,
  triggerButton 
}: CustomerCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleCreateCustomer = async (customerData: CustomerFormData) => {
    setIsLoading(true);
    
    try {
      const result = await createCustomerAction(customerData);
      
      if (result.success) {
        showSuccess('Customer created successfully');
        setIsOpen(false);
        onCustomerCreated?.();
      } else {
        showError(result.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
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
    <Button className="flex items-center gap-2" size="sm">
      <Plus className="h-4 w-4" />
      Add Customer
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CustomerForm
            mode="create"
            onSubmit={handleCreateCustomer}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}