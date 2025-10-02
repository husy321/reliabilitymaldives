"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CustomerListTable } from "@/components/business/CustomerListTable";
import { CustomerCreateDialog } from "@/components/business/CustomerCreateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Users, AlertCircle, Info } from "lucide-react";
import { getCustomersActionDev, toggleCustomerActiveActionDev } from "@/lib/actions/customers-dev";
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

export default function CustomersDevPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccess, showError, showInfo } = useToast();

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
    sortBy: 'name' | 'email' | 'paymentTerms' | 'currentBalance' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Show development notice
  useEffect(() => {
    showInfo('Development Mode: Authentication bypassed for testing');
  }, []);

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

  // Fetch customers data using development actions
  const fetchCustomers = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params: GetCustomersParams = {
        page: state.page,
        pageSize: state.pageSize,
        searchTerm: searchTerm || undefined,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
        userRole: 'ACCOUNTS' // Development default
      };

      const result = await getCustomersActionDev(params);

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

  // Handle customer edit (placeholder)
  const handleEdit = (customerId: string) => {
    console.log('Edit customer:', customerId);
    showInfo('Edit functionality would open customer details or edit modal');
  };

  // Handle toggle active status using development action
  const handleToggleActive = async (customerId: string) => {
    try {
      const result = await toggleCustomerActiveActionDev(customerId);
      
      if (result.success) {
        showSuccess('Customer status updated successfully');
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
    fetchCustomers();
  };

  // Create some sample data if empty
  const createSampleData = async () => {
    try {
      const sampleCustomers = [
        {
          name: 'Maldivian Heritage',
          email: 'info@maldivianheritage.com',
          phone: '+960-330-5678',
          address: 'Male, Republic of Maldives',
          paymentTerms: 30,
          isActive: true
        },
        {
          name: 'Island Resort Group',
          email: 'admin@islandresorts.mv',
          phone: '+960-664-2345',
          address: 'Kaafu Atoll, Maldives',
          paymentTerms: 15,
          isActive: true
        },
        {
          name: 'Oceanic Trading Co',
          email: 'trade@oceanic.com.mv',
          phone: '+960-775-9876',
          address: 'Hulhumale, Maldives',
          paymentTerms: 45,
          isActive: false
        }
      ];

      for (const customerData of sampleCustomers) {
        await fetch('/api/customers-dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
      }

      fetchCustomers();
      showSuccess('Sample data created successfully');
    } catch (error) {
      console.error('Error creating sample data:', error);
      showError('Failed to create sample data');
    }
  };

  // Loading skeleton
  if (state.loading && state.customers.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
          
          <div className="border rounded-lg">
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Development Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Development Mode:</strong> This page uses simplified authentication for testing customer functionality.
        </AlertDescription>
      </Alert>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Customer Management (Dev)
          </h1>
          <p className="text-muted-foreground">
            Manage your customer database and track payment information
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {state.totalCount === 0 && (
            <Button variant="outline" onClick={createSampleData}>
              Create Sample Data
            </Button>
          )}
          <CustomerCreateDialog onCustomerCreated={handleCustomerCreated} />
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <Alert variant="destructive">
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
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Customers
            {!state.loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({state.totalCount} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            View and manage all customer accounts, payment terms, and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            onSort={handleSort}
            onSearch={handleSearch}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            loading={state.loading}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {!state.loading && state.customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.totalCount}</div>
              <p className="text-xs text-muted-foreground">
                All registered customers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.customers.filter(c => c.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active accounts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <Users className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${state.customers
                  .filter(c => c.currentBalance > 0)
                  .reduce((sum, c) => sum + c.currentBalance, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total receivables
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}