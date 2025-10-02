"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronUpIcon, ChevronDownIcon, Edit, MoreHorizontal, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Customer, CustomerListTableProps, CustomerSearchFilters } from "../../../types/customer";
import { CustomerEditDialog } from './CustomerEditDialog';
import { CustomerDetailsDialog } from './CustomerDetailsDialog';
import { CustomerSearch } from './CustomerSearch';
import { CustomerFilters } from './CustomerFilters';

const StatusBadgeVariants = {
  active: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

import { formatCurrencyMvr } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return formatCurrencyMvr(amount);
}

function formatPaymentTerms(days: number): string {
  if (days === 0) return 'Cash';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function CustomerListTable({
  customers,
  currentUserRole,
  totalCount,
  page,
  pageSize,
  searchTerm,
  sortBy = 'name',
  sortOrder = 'asc',
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onEdit,
  onToggleActive,
  loading = false,
}: CustomerListTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === 'desc' }
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [searchFilters, setSearchFilters] = React.useState<CustomerSearchFilters>({
    searchTerm: searchTerm || '',
    activeOnly: true
  });

  // Handle customer toggle active status
  const handleToggleActive = async (customerId: string) => {
    try {
      await onToggleActive(customerId);
    } catch (error) {
      console.error('Failed to toggle customer status:', error);
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("name", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Customer Name
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{customer.name}</span>
            {customer.email && (
              <span className="text-xs text-muted-foreground">
                {customer.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex flex-col">
            {customer.phone && (
              <span className="text-sm">{customer.phone}</span>
            )}
            {customer.address && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {customer.address}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "paymentTerms",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("paymentTerms", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Payment Terms
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const paymentTerms = row.getValue("paymentTerms") as number;
        return (
          <Badge variant="outline">
            {formatPaymentTerms(paymentTerms)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "totalInvoiceAmount",
      header: "Total Invoices",
      cell: ({ row }) => {
        const customer = row.original;
        const total = customer.totalInvoiceAmount || 0;
        return (
          <span className="font-mono text-sm font-medium">
            {formatCurrency(total)}
          </span>
        );
      },
    },
    {
      accessorKey: "totalOutstanding",
      header: "Outstanding",
      cell: ({ row }) => {
        const customer = row.original;
        const outstanding = customer.totalOutstanding || 0;
        return (
          <span className={`font-mono text-sm font-medium ${
            outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {formatCurrency(outstanding)}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge
            variant="secondary" 
            className={StatusBadgeVariants[isActive ? 'active' : 'inactive']}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        const isActive = row.getValue(id) as boolean;
        return value === 'active' ? isActive : !isActive;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const customer = row.original;
        
        return (
          <div className="flex items-center gap-2">
            <CustomerEditDialog
              customer={customer}
              onCustomerUpdated={() => window.location.reload()}
              triggerButton={
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            
            <CustomerDetailsDialog
              customer={customer}
              triggerButton={
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              }
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleToggleActive(customer.id)}
                  className={customer.isActive ? 'text-warning' : 'text-success'}
                >
                  {customer.isActive ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  // Handle search
  const handleSearch = (filters: CustomerSearchFilters) => {
    setSearchFilters(filters);
    onSearch(filters.searchTerm || '');
  };

  // Handle filter changes
  const handleFilterChange = (filters: CustomerSearchFilters) => {
    setSearchFilters(filters);
    // In a real implementation, this would trigger server-side filtering
    console.log('Filter change:', filters);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <CustomerSearch
            searchTerm={searchFilters.searchTerm || ''}
            onSearch={handleSearch}
            placeholder="Search customers"
          />
          <CustomerFilters
            filters={searchFilters}
            onFiltersChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-lg font-medium text-muted-foreground">No customers found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchFilters.searchTerm 
                        ? "Try adjusting your search terms or filters"
                        : "Get started by adding your first customer"
                      }
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <StandardPagination
        pagination={{
          pageIndex: page - 1,
          pageSize: pageSize,
          pageCount: Math.ceil(totalCount / pageSize),
          total: totalCount,
        }}
        onPageChange={(pageIndex) => onPageChange(pageIndex + 1)}
        loading={loading}
        showPageSizeSelector={true}
        onPageSizeChange={onPageSizeChange}
        variant="simple"
      />
    </div>
  );
}