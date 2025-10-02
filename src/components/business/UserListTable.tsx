"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { ChevronUpIcon, ChevronDownIcon, Edit, MoreHorizontal, Eye, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
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
import { StandardPagination } from "@/components/ui/standard-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@prisma/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserListTableProps {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchTerm: string;
  roleFilter?: UserRole;
  sortBy: 'name' | 'email' | 'role' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (searchTerm: string) => void;
  onRoleFilter: (role: UserRole | undefined) => void;
  onEdit: (userId: string) => void;
  onToggleActive: (userId: string) => void;
  onDelete: (userId: string) => void;
  loading?: boolean;
  currentUserEmail: string;
}

const StatusBadgeVariants = {
  active: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
};

const RoleBadgeVariants: Record<UserRole, string> = {
  ADMIN: "bg-destructive/10 text-destructive border-destructive/20",
  MANAGER: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ACCOUNTS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ACCOUNTANT: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  SALES: "bg-green-500/10 text-green-600 border-green-500/20",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function UserListTable({
  users,
  totalCount,
  page,
  pageSize,
  searchTerm,
  roleFilter,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onRoleFilter,
  onEdit,
  onToggleActive,
  onDelete,
  loading = false,
  currentUserEmail,
}: UserListTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === 'desc' }
  ]);
  const [localSearchTerm, setLocalSearchTerm] = React.useState(searchTerm);
  const [localRoleFilter, setLocalRoleFilter] = React.useState<string>(roleFilter || 'all');

  const columns: ColumnDef<User>[] = [
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
            User
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              const newDirection = isDesc ? "asc" : "desc";
              column.toggleSorting(isDesc);
              onSort("role", newDirection);
            }}
            className="h-8 px-2 font-medium"
          >
            Role
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole;
        return (
          <Badge variant="secondary" className={RoleBadgeVariants[role]}>
            {role}
          </Badge>
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
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.email === currentUserEmail;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onToggleActive(user.id)}
                  disabled={isSelf}
                  className={user.isActive ? 'text-warning' : 'text-success'}
                >
                  {user.isActive ? (
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(user.id)}
                  disabled={isSelf}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(localSearchTerm);
    }
  };

  const handleRoleFilterChange = (value: string) => {
    setLocalRoleFilter(value);
    onRoleFilter(value === 'all' ? undefined : value as UserRole);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Input
            placeholder="Search users by name or email..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleSearchKeyPress}
            className="max-w-sm"
          />
          <Select value={localRoleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
              <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
              <SelectItem value={UserRole.ACCOUNTS}>Accounts</SelectItem>
              <SelectItem value={UserRole.ACCOUNTANT}>Accountant</SelectItem>
              <SelectItem value={UserRole.SALES}>Sales</SelectItem>
            </SelectContent>
          </Select>
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
                    <p className="text-lg font-medium text-muted-foreground">No users found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm
                        ? "Try adjusting your search terms or filters"
                        : "Get started by adding your first user"
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
