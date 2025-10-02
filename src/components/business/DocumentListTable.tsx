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
import { ChevronUpIcon, ChevronDownIcon, Eye, Download } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentWithUser, DocumentCategory, DocumentFilters, DocumentDownloadProgress } from "../../../types/document";
import DocumentSearch from './DocumentSearch';
import DocumentFiltersComponent from './DocumentFilters';

interface DocumentListTableProps {
  documents: DocumentWithUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchFilters: DocumentFilters;
  loading?: boolean;
  currentUserRole: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (filters: DocumentFilters) => void;
  onFilterChange: (filters: DocumentFilters) => void;
  onPreview: (documentId: string) => void;
  onDownload: (documentId: string) => Promise<void>;
  downloadProgress?: Record<string, DocumentDownloadProgress>;
}

const CategoryBadgeVariants: Record<DocumentCategory, string> = {
  [DocumentCategory.INVOICE]: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  [DocumentCategory.PURCHASE_ORDER]: "bg-green-100 text-green-800 hover:bg-green-200",  
  [DocumentCategory.DELIVERY_ORDER]: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  [DocumentCategory.SALES_RECEIPT]: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  [DocumentCategory.OTHER]: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DocumentListTable({
  documents,
  totalCount,
  page,
  pageSize,
  searchFilters,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onFilterChange,
  onPreview,
  onDownload,
  downloadProgress = {},
}: DocumentListTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const columns: ColumnDef<DocumentWithUser>[] = [
    {
      accessorKey: "originalName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("originalName", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Filename
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const fileName = row.getValue("originalName") as string;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(row.original.fileSize)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("category", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Category
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const category = row.getValue("category") as DocumentCategory;
        return (
          <Badge
            variant="secondary" 
            className={CategoryBadgeVariants[category]}
          >
            {category.replace('_', ' ')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "uploadedBy",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("uploadedBy", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Uploaded By
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const user = row.original.uploadedBy;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        return rowA.original.uploadedBy.name.localeCompare(rowB.original.uploadedBy.name);
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";  
              column.toggleSorting(isDesc);
              onSort("createdAt", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Upload Date
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        return formatDate(row.getValue("createdAt") as Date);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const document = row.original;
        const documentProgress = downloadProgress[document.id];
        
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(document.id)}
              className="h-8 w-8 p-0"
              title="Preview document"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(document.id)}
              disabled={documentProgress?.status === 'downloading'}
              className="h-8 w-8 p-0"
              title="Download document"
            >
              {documentProgress?.status === 'downloading' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  // Handle search functionality
  const handleSearch = React.useCallback((searchTerm: string) => {
    const newFilters = { ...searchFilters, filenameSearch: searchTerm || undefined };
    onSearch(newFilters);
  }, [searchFilters, onSearch]);

  const handleClearSearch = React.useCallback(() => {
    const newFilters = { ...searchFilters, filenameSearch: undefined };
    onSearch(newFilters);
  }, [searchFilters, onSearch]);

  // Handle filter changes
  const handleCategoryChange = React.useCallback((categories: DocumentCategory[]) => {
    const newFilters = { ...searchFilters, categoryFilter: categories.length > 0 ? categories : undefined };
    onFilterChange(newFilters);
  }, [searchFilters, onFilterChange]);

  const handleDateRangeChange = React.useCallback((range: { from?: Date; to?: Date }) => {
    const newFilters = { ...searchFilters, uploadDateRange: range.from || range.to ? range : undefined };
    onFilterChange(newFilters);
  }, [searchFilters, onFilterChange]);

  const handleQuickFilter = React.useCallback((filter: 'last7days' | 'last30days' | 'last90days' | 'thisYear') => {
    const now = new Date();
    let from: Date;
    const to = now;

    switch (filter) {
      case 'last7days':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const newFilters = { ...searchFilters, uploadDateRange: { from, to } };
    onFilterChange(newFilters);
  }, [searchFilters, onFilterChange]);

  const handleClearFilters = React.useCallback(() => {
    const newFilters = { 
      ...searchFilters, 
      categoryFilter: undefined, 
      uploadDateRange: undefined 
    };
    onFilterChange(newFilters);
  }, [searchFilters, onFilterChange]);

  return (
    <div className="space-y-4">
      {/* Enhanced Search and Filter Bar */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4 flex-1">
          <DocumentSearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            initialValue={searchFilters.filenameSearch || ""}
            placeholder="Search documents by filename..."
          />
          <DocumentFiltersComponent
            availableCategories={Object.values(DocumentCategory)}
            selectedCategories={searchFilters.categoryFilter || []}
            dateRange={searchFilters.uploadDateRange || {}}
            onCategoryChange={handleCategoryChange}
            onDateRangeChange={handleDateRangeChange}
            onQuickFilter={handleQuickFilter}
            onClearFilters={handleClearFilters}
          />
        </div>
        {loading && (
          <div className="text-sm text-muted-foreground">
            Searching...
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="px-4">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30, 40, 50].map((pageSizeOption) => (
                  <SelectItem key={pageSizeOption} value={`${pageSizeOption}`}>
                    {pageSizeOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {startRecord} to {endRecord} of {totalCount} documents
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}