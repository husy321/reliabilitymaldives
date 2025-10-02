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
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  Edit, 
  MoreHorizontal, 
  DollarSign,
  Calendar,
  User,
  FileText,
  Paperclip
} from "lucide-react";
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
import { formatCurrencyMvr } from "@/lib/utils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { 
  ReceivableWithDocumentCount,
  ReceivableListTableProps, 
  ReceivableStatus,
  RECEIVABLE_STATUS_LABELS,
  RECEIVABLE_STATUS_COLORS,
  USER_ROLE_LABELS
} from "../../../types/receivable";
import { cn } from "@/lib/utils";

// Helper functions
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
}

function formatCurrency(amount: number): string {
  return formatCurrencyMvr(amount);
}

function isOverdue(dueDate: Date, status: ReceivableStatus): boolean {
  const now = new Date();
  return status !== ReceivableStatus.PAID && dueDate < now;
}

export function ReceivableListTable({
  receivables,
  totalCount,
  page,
  pageSize,
  searchTerm = '',
  statusFilter = [],
  sortBy = 'dueDate',
  sortOrder = 'asc',
  onPageChange,
  onSort,
  onSearch,
  onFilter,
  onEdit,
  onStatusUpdate,
  onRecordPayment,
  loading = false,
  actionButton,
}: ReceivableListTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === 'desc' }
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [localSearchTerm, setLocalSearchTerm] = React.useState(searchTerm);
  const [localStatusFilter, setLocalStatusFilter] = React.useState<ReceivableStatus[]>(statusFilter);

  // Track if this is the first render to avoid triggering search on mount
  const isFirstRender = React.useRef(true);

  // Handle search with debounce
  React.useEffect(() => {
    // Skip search on initial mount/remount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      onSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearchTerm]);

  // Handle status filter changes
  const handleStatusFilterChange = (status: string) => {
    let newFilter: ReceivableStatus[];
    if (status === 'all') {
      newFilter = [];
    } else {
      newFilter = [status as ReceivableStatus];
    }
    setLocalStatusFilter(newFilter);
    onFilter({ statusFilter: newFilter });
  };

  const columns: ColumnDef<ReceivableWithDocumentCount>[] = [
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("invoiceNumber", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Invoice #
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        const overdueStatus = isOverdue(receivable.dueDate, receivable.status);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-medium">
              {receivable.invoiceNumber}
            </span>
            {overdueStatus && (
              <Badge variant="destructive" className="text-xs w-fit mt-1">
                Overdue
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("customer", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Customer
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{receivable.customer.name}</span>
            {receivable.customer.email && (
              <span className="text-xs text-muted-foreground">
                {receivable.customer.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("amount", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Amount
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        const remainingBalance = receivable.amount - receivable.paidAmount;
        return (
          <div className="flex flex-col text-right">
            <span className="font-mono font-medium">
              {formatCurrency(receivable.amount)}
            </span>
            {receivable.paidAmount > 0 && (
              <div className="text-xs text-muted-foreground">
                <div>Paid: {formatCurrency(receivable.paidAmount)}</div>
                <div>Balance: {formatCurrency(remainingBalance)}</div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "invoiceDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("invoiceDate", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            <Calendar className="mr-1 h-4 w-4" />
            Invoice Date
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        return (
          <div className="text-sm">
            {formatDate(receivable.invoiceDate)}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("dueDate", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Due Date
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        const overdueStatus = isOverdue(receivable.dueDate, receivable.status);
        return (
          <div className={`text-sm ${overdueStatus ? 'text-destructive font-medium' : ''}`}>
            {formatDate(receivable.dueDate)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const receivable = row.original;
        return (
          <Badge 
            className={RECEIVABLE_STATUS_COLORS[receivable.status]}
            variant="secondary"
          >
            {RECEIVABLE_STATUS_LABELS[receivable.status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned",
      cell: ({ row }) => {
        const receivable = row.original;
        return (
          <div className="flex items-center gap-1 text-sm">
            <User className="h-3 w-3" />
            {USER_ROLE_LABELS[receivable.assignedTo]}
          </div>
        );
      },
    },
    {
      accessorKey: "documentCount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("documentCount", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            <FileText className="mr-1 h-4 w-4" />
            Documents
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const receivable = row.original;
        const docCount = receivable.documentCount || 0;
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {docCount > 0 ? (
                <Paperclip className="h-4 w-4 text-info" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn(
                "text-sm font-medium",
                docCount > 0 ? "text-info" : "text-muted-foreground"
              )}>
                {docCount}
              </span>
            </div>
            {docCount > 0 && (
              <Badge variant="outline" className="text-xs px-1">
                {docCount === 1 ? 'doc' : 'docs'}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const receivable = row.original;
        const canRecordPayment = receivable.status !== ReceivableStatus.PAID;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(receivable.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {canRecordPayment && (
                <DropdownMenuItem onClick={() => onRecordPayment(receivable.id)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusUpdate(receivable.id, ReceivableStatus.DISPUTED)}>
                Mark as Disputed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: receivables,
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
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            placeholder="Search invoices or customers..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <Select
            value={localStatusFilter.length === 0 ? 'all' : localStatusFilter[0]}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(RECEIVABLE_STATUS_LABELS).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {actionButton}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
                  <TableRow key={`loading-row-${i}`}>
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
                  No receivables found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}