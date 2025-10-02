"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CustomerListTable } from "@/components/business/CustomerListTable";
import { CustomerCreateDialog } from "@/components/business/CustomerCreateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ReceivablesPageLayout } from "@/components/business/receivables/ReceivablesPageLayout";
import { StackLayout } from "@/components/ui/layout";
import { Plus, Users, AlertCircle } from "lucide-react";
// Temporary: Use development version to bypass authentication
import { getCustomersActionDev as getCustomersAction, toggleCustomerActiveActionDev as toggleCustomerActiveAction } from "@/lib/actions/customers-dev";
import { Customer, GetCustomersParams } from "../../../types/customer";
import { useToast } from "@/hooks/useToast";

interface CustomersPageState {
  customers: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<CustomersPageState>({
    customers: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: null,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'name' | 'email' | 'paymentTerms' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Initialize state from URL parameters
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
    const urlSearchTerm = searchParams.get('search') || '';
    const urlSortBy = (searchParams.get('sortBy') || 'name') as typeof sortConfig.sortBy;
    const urlSortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    setState(prev => ({
      ...prev,
      page: urlPage,
      pageSize: urlPageSize,
    }));

    setSearchTerm(urlSearchTerm);
    setSortConfig({
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
    });
  }, [searchParams]);

  // Update URL when state changes
  const updateURL = (updates: Partial<{
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortOrder: string;
  }>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Reset page to 1 when filters change (except when explicitly setting page)
    if (!('page' in updates) && (updates.search !== undefined || updates.sortBy || updates.sortOrder)) {
      params.set('page', '1');
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  // Fetch customers data
  const fetchCustomers = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params: GetCustomersParams = {
        page: state.page,
        pageSize: state.pageSize,
        searchTerm: searchTerm || undefined,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
        userRole: 'ACCOUNTS' // This would come from user session in real implementation
      };

      const result = await getCustomersAction(params);

      if (result.success) {
        setState(prev => ({
          ...prev,
          customers: result.data.customers,
          totalCount: result.data.totalCount,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch customers',
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setState(prev => ({
        ...prev,
        error: 'An unexpected error occurred while loading customers',
        loading: false,
      }));
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchCustomers();
  }, [state.page, state.pageSize, searchTerm, sortConfig.sortBy, sortConfig.sortOrder]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, page }));
    updateURL({ page });
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
    updateURL({ pageSize, page: 1 });
  };

  // Handle search
  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    updateURL({ search: newSearchTerm, page: 1 });
  };

  // Handle sort
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const newSortConfig = {
      sortBy: column as typeof sortConfig.sortBy,
      sortOrder: direction,
    };
    setSortConfig(newSortConfig);
    updateURL({ sortBy: column, sortOrder: direction, page: 1 });
  };

  // Handle customer edit (placeholder - would open edit modal or navigate to edit page)
  const handleEdit = (customerId: string) => {
    console.log('Edit customer:', customerId);
    // In a real implementation, this might open a detailed view or edit modal
  };

  // Handle toggle active status
  const handleToggleActive = async (customerId: string) => {
    try {
      const result = await toggleCustomerActiveAction(customerId);
      
      if (result.success) {
        showSuccess('Customer status updated successfully');
        // Refresh the customer list
        fetchCustomers();
      } else {
        showError(result.error || 'Failed to update customer status');
      }
    } catch (error) {
      console.error('Error toggling customer status:', error);
      showError('An unexpected error occurred');
    }
  };

  // Handle customer creation success
  const handleCustomerCreated = () => {
    // Refresh the customer list after successful creation
    fetchCustomers();
  };

  // Loading moved inline to table for consistency with other tabs

  return (
    <ReceivablesPageLayout
      title="Customers"
      description="View and manage all customer accounts, payment terms, and contact information"
      action={
        <CustomerCreateDialog
          onCustomerCreated={handleCustomerCreated}
          triggerButton={
            <Button className="flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          }
        />
      }
      subnav={{
        items: [
          { label: "Invoice", href: "/receivables" },
          { label: "Customers", href: "/receivables/customers" },
          { label: "Follow-ups", href: "/receivables/followups" },
          { label: "Completed", href: "/receivables/followups/completed" }
        ]
      }}
      currentPath={pathname}
    >
      <div className="p-6">
        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {state.error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCustomers}
                className="ml-2"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <CustomerListTable
          customers={state.customers}
          currentUserRole="ACCOUNTS"
          totalCount={state.totalCount}
          page={state.page}
          pageSize={state.pageSize}
          searchTerm={searchTerm}
          sortBy={sortConfig.sortBy}
          sortOrder={sortConfig.sortOrder}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSort={handleSort}
          onSearch={handleSearch}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          loading={state.loading}
        />
      </div>
    </ReceivablesPageLayout>
  );
}