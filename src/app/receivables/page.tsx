"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ReceivableListTable } from "@/components/business/ReceivableListTable";
import dynamic from "next/dynamic";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Plus,
  AlertCircle,
  Upload
} from "lucide-react";
import { 
  getReceivablesAction,
  createReceivableAction,
  updateReceivableAction,
  recordPaymentAction,
  getReceivableByIdAction,
  updateReceivableStatusAction
} from "@/lib/actions/receivables";
import { getCustomersAction } from "@/lib/actions/customers";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { 
  Receivable, 
  ReceivableFormData,
  GetReceivablesParams,
  ReceivableStatus,
  UserRole,
  PaymentData,
  ReceivableFilters,
  ReceivableWithDocumentCount
} from "../../../types/receivable";
import { Customer } from "../../../types/customer";
import { useToast } from "@/hooks/useToast";
import { ReceivablesPageLayout } from "@/components/business/receivables/ReceivablesPageLayout";
import { StackLayout } from "@/components/ui/layout";
type CreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSubmit: (data: ReceivableFormData) => Promise<void>;
  isLoading?: boolean;
  currentUserRole: UserRole;
};
type EditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable | null;
  customers: Customer[];
  onSubmit: (receivableId: string, data: ReceivableFormData) => Promise<void>;
  isLoading?: boolean;
  currentUserRole: UserRole;
};
type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable | null;
  onSubmit: (paymentData: PaymentData) => Promise<void>;
  isLoading?: boolean;
};
type BulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
};

const ReceivableCreateDialog = dynamic<CreateDialogProps>(
  () => import("@/components/business/ReceivableCreateDialog").then(m => ({ default: m.ReceivableCreateDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    ),
  }
);
const ReceivableEditDialog = dynamic<EditDialogProps>(
  () => import("@/components/business/ReceivableEditDialog").then(m => ({ default: m.ReceivableEditDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    ),
  }
);
const PaymentRecordDialog = dynamic<PaymentDialogProps>(
  () => import("@/components/business/PaymentRecordDialog").then(m => ({ default: m.PaymentRecordDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    ),
  }
);
const BulkImportDialog = dynamic<BulkImportDialogProps>(
  () => import("@/components/business/BulkImportDialog").then(m => ({ default: m.BulkImportDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    ),
  }
);

interface ReceivablesPageState {
  receivables: ReceivableWithDocumentCount[];
  customers: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

// Removed per design: KPI/status cards shown only on dashboard

export default function ReceivablesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<ReceivablesPageState>({
    receivables: [],
    customers: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceivableStatus[]>([]);

  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'invoiceNumber' | 'customer' | 'amount' | 'invoiceDate' | 'dueDate' | 'status' | 'assignedTo';
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Memoize static header props to avoid re-renders of header on pagination
  const headerAction = useMemo(() => (
    <div className="flex gap-2">
      <Button
        onClick={() => setShowBulkImportDialog(true)}
        variant="outline"
        className="flex items-center gap-2"
        size="sm"
      >
        <Upload className="h-4 w-4" />
        Bulk Import
      </Button>
      <Button
        onClick={() => setShowCreateDialog(true)}
        className="flex items-center gap-2"
        size="sm"
      >
        <Plus className="h-4 w-4" />
        New Receivable
      </Button>
    </div>
  ), []);

  const subnavConfig = useMemo(() => ({
    items: [
      { label: "Invoice", href: "/receivables" },
      { label: "Customers", href: "/receivables/customers" },
      { label: "Follow-ups", href: "/receivables/followups" },
      { label: "Completed", href: "/receivables/followups/completed" }
    ]
  }), []);

  // Removed per design: KPI/status cards state

  // Current user role (derived from session if available)
  // Fallback to SALES only if session is unavailable on client
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.SALES);
  const { data: session } = useSession();
  useEffect(() => {
    const role = session?.user?.role as UserRole | undefined;
    if (role && Object.values(UserRole).includes(role)) {
      setCurrentUserRole(role);
    }
  }, [session]);

  // Initialize state from URL parameters (guard against unnecessary updates)
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
    const urlSearchTerm = searchParams.get('search') || '';
    const urlSortBy = (searchParams.get('sortBy') || 'dueDate') as typeof sortConfig.sortBy;
    const urlSortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const urlStatus = searchParams.get('status');

    // Update page and pageSize only if they changed
    setState(prev => {
      if (prev.page === urlPage && prev.pageSize === urlPageSize) return prev;
      return {
        ...prev,
        page: urlPage,
        pageSize: urlPageSize,
      };
    });

    // Update search term
    setSearchTerm(urlSearchTerm);

    // Update sort config
    setSortConfig({
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
    });

    // Update status filter from URL
    if (urlStatus) {
      setStatusFilter([urlStatus as ReceivableStatus]);
    } else {
      setStatusFilter([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when state changes
  const updateURL = useCallback((updates: Partial<{
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortOrder: string;
  }>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Reset page to 1 only when filter values actually change (and page not explicitly set)
    if (!('page' in updates)) {
      const prevSearch = searchParams.get('search') ?? '';
      const prevSortBy = searchParams.get('sortBy') ?? '';
      const prevSortOrder = searchParams.get('sortOrder') ?? '';

      const nextSearch = params.get('search') ?? '';
      const nextSortBy = params.get('sortBy') ?? '';
      const nextSortOrder = params.get('sortOrder') ?? '';

      const searchChanged = nextSearch !== prevSearch;
      const sortByChanged = nextSortBy !== prevSortBy;
      const sortOrderChanged = nextSortOrder !== prevSortOrder;

      if (searchChanged || sortByChanged || sortOrderChanged) {
        params.set('page', '1');
      }
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) {
      return; // avoid unnecessary replace that can cause loops
    }

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [searchParams, pathname, router]);

  // Removed per design: KPI/status cards calculation

  // Fetch receivables data - read directly from searchParams for accuracy
  const fetchReceivables = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Read directly from URL to avoid stale closure issues
      const urlPage = parseInt(searchParams.get('page') || '1');
      const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
      const urlSearchTerm = searchParams.get('search') || '';
      const urlSortBy = (searchParams.get('sortBy') || 'dueDate') as 'invoiceNumber' | 'customer' | 'amount' | 'invoiceDate' | 'dueDate' | 'status' | 'assignedTo';
      const urlSortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
      const urlStatus = searchParams.get('status');

      const params: GetReceivablesParams = {
        page: urlPage,
        pageSize: urlPageSize,
        searchTerm: urlSearchTerm || undefined,
        statusFilter: urlStatus ? [urlStatus as ReceivableStatus] : undefined,
        sortBy: urlSortBy,
        sortOrder: urlSortOrder,
        userRole: currentUserRole
      };

      const result = await getReceivablesAction(params);

      if (result.success) {
        setState(prev => ({
          ...prev,
          receivables: result.data.receivables,
          totalCount: result.data.totalCount,
          loading: false,
        }));
        // KPI/status cards removed
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch receivables',
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching receivables:', error);
      setState(prev => ({
        ...prev,
        error: 'An unexpected error occurred while loading receivables',
        loading: false,
      }));
    }
  }, [searchParams, currentUserRole]);

  // Fetch customers data
  const fetchCustomers = useCallback(async () => {
    try {
      const result = await getCustomersAction({
        page: 1,
        pageSize: 1000, // Get all customers for the dropdown
        activeOnly: true,
        userRole: currentUserRole as PrismaUserRole
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          customers: result.data.customers,
        }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, [currentUserRole]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Event handlers
  const handlePageChange = useCallback((page: number) => {
    // Don't update state - let URL be the source of truth
    updateURL({ page });
  }, [updateURL]);

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortConfig({
      sortBy: column as typeof sortConfig.sortBy,
      sortOrder: direction,
    });
    updateURL({ sortBy: column, sortOrder: direction });
  }, [updateURL]);

  const handleSearch = useCallback((searchTerm: string) => {
    setSearchTerm(searchTerm);
    updateURL({ search: searchTerm });
  }, [updateURL]);

  const handleFilter = useCallback((filters: ReceivableFilters) => {
    if (filters.statusFilter) {
      setStatusFilter(filters.statusFilter);
      const statusParam = filters.statusFilter.length ? filters.statusFilter[0] : '';
      const params = new URLSearchParams(searchParams.toString());
      if (statusParam) params.set('status', statusParam); else params.delete('status');
      params.set('page', '1');
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    }
  }, [searchParams, router, pathname]);

  const handleCreateReceivable = async (data: ReceivableFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createReceivableAction(data);
      
      if (result.success) {
        showSuccess('Receivable created successfully');
        fetchReceivables(); // Refresh the list
      } else {
        showError(result.error || 'Failed to create receivable');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Create receivable error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReceivable = async (receivableId: string, data: ReceivableFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateReceivableAction(receivableId, data);
      
      if (result.success) {
        showSuccess('Receivable updated successfully');
        fetchReceivables(); // Refresh the list
      } else {
        showError(result.error || 'Failed to update receivable');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Update receivable error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (paymentData: PaymentData) => {
    if (!selectedReceivable) return;
    
    setIsSubmitting(true);
    try {
      const result = await recordPaymentAction(selectedReceivable.id, paymentData);
      
      if (result.success) {
        showSuccess('Payment recorded successfully');
        fetchReceivables(); // Refresh the list
      } else {
        showError(result.error || 'Failed to record payment');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Record payment error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (receivableId: string) => {
    try {
      const result = await getReceivableByIdAction(receivableId);
      if (result.success) {
        setSelectedReceivable(result.data);
        setShowEditDialog(true);
      } else {
        showError(result.error || 'Failed to load receivable details');
      }
    } catch (error) {
      console.error('Error loading receivable:', error);
      showError('Failed to load receivable details');
    }
  };

  const handleRecordPaymentClick = async (receivableId: string) => {
    try {
      const result = await getReceivableByIdAction(receivableId);
      if (result.success) {
        setSelectedReceivable(result.data);
        setShowPaymentDialog(true);
      } else {
        showError(result.error || 'Failed to load receivable details');
      }
    } catch (error) {
      console.error('Error loading receivable:', error);
      showError('Failed to load receivable details');
    }
  };

  const handleStatusUpdate = async (receivableId: string, status: ReceivableStatus) => {
    try {
      const result = await updateReceivableStatusAction(receivableId, status);
      if (result.success) {
        showSuccess('Receivable status updated successfully');
        fetchReceivables(); // Refresh the list
      } else {
        showError(result.error || 'Failed to update receivable status');
      }
    } catch (error) {
      console.error('Error updating receivable status:', error);
      showError('Failed to update receivable status');
    }
  };

  const handleBulkImportComplete = () => {
    // Refresh the data after bulk import
    fetchReceivables();
    fetchCustomers();
    setShowBulkImportDialog(false);
  };


  return (
    <ReceivablesPageLayout
      title="Receivables List"
      description="Manage and track all customer receivables and payment status"
      action={headerAction}
      subnav={subnavConfig}
      currentPath={pathname}
    >
      <StackLayout spacing="md">
        {/* Error Alert */}
        {state.error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <div className="p-6">
          <ReceivableListTable
            receivables={state.receivables}
            currentUserRole={currentUserRole}
            totalCount={state.totalCount}
            page={parseInt(searchParams.get('page') || '1')}
            pageSize={parseInt(searchParams.get('pageSize') || '10')}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            sortBy={sortConfig.sortBy}
            sortOrder={sortConfig.sortOrder}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onEdit={handleEditClick}
            onStatusUpdate={handleStatusUpdate}
            onRecordPayment={handleRecordPaymentClick}
            loading={state.loading}
            actionButton={null}
          />
        </div>
      </StackLayout>

      {/* Dialogs */}
      {showCreateDialog && (
        <ReceivableCreateDialog
          open
          onOpenChange={setShowCreateDialog}
          customers={state.customers}
          onSubmit={handleCreateReceivable}
          isLoading={isSubmitting}
          currentUserRole={currentUserRole}
        />
      )}

      {showEditDialog && (
        <ReceivableEditDialog
          open
          onOpenChange={setShowEditDialog}
          receivable={selectedReceivable}
          customers={state.customers}
          onSubmit={handleEditReceivable}
          isLoading={isSubmitting}
          currentUserRole={currentUserRole}
        />
      )}

      {showPaymentDialog && (
        <PaymentRecordDialog
          open
          onOpenChange={setShowPaymentDialog}
          receivable={selectedReceivable}
          onSubmit={handleRecordPayment}
          isLoading={isSubmitting}
        />
      )}

      {showBulkImportDialog && (
        <BulkImportDialog
          open
          onOpenChange={setShowBulkImportDialog}
          onImportComplete={handleBulkImportComplete}
        />
      )}
    </ReceivablesPageLayout>
  );
}