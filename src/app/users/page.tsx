"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { UserListTable } from "@/components/business/UserListTable";
import { UserCreateDialog } from "@/components/business/UserCreateDialog";
import { UserEditDialog } from "@/components/business/UserEditDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Users } from "lucide-react";
import { getUsersAction, toggleUserActiveAction, deleteUserAction } from "@/lib/actions/users";
import { UserRole } from "@prisma/client";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UsersPageState {
  users: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

export default function UsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { showSuccess, showError } = useToast();

  const [state, setState] = useState<UsersPageState>({
    users: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [sortConfig, setSortConfig] = useState<{
    sortBy: 'name' | 'email' | 'role' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Initialize state from URL parameters
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
    const urlSearchTerm = searchParams.get('search') || '';
    const urlRole = searchParams.get('role') as UserRole | undefined;

    setState(prev => ({
      ...prev,
      page: urlPage,
      pageSize: urlPageSize,
    }));

    setSearchTerm(urlSearchTerm);
    setRoleFilter(urlRole);
  }, [searchParams]);

  // Update URL when state changes
  const updateURL = useCallback((updates: Partial<{
    page: number;
    pageSize: number;
    search: string;
    role: string;
  }>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Reset page to 1 when filters change (except when explicitly setting page)
    if (!('page' in updates) && (updates.search !== undefined || updates.role !== undefined)) {
      params.set('page', '1');
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getUsersAction({
        page: state.page,
        pageSize: state.pageSize,
        searchTerm: searchTerm || undefined,
        roleFilter: roleFilter,
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          users: result.data.users,
          totalCount: result.data.totalCount,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch users',
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setState(prev => ({
        ...prev,
        error: 'An unexpected error occurred while loading users',
        loading: false,
      }));
    }
  }, [state.page, state.pageSize, searchTerm, roleFilter]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  // Handle role filter
  const handleRoleFilter = (role: UserRole | undefined) => {
    setRoleFilter(role);
    updateURL({ role: role || '', page: 1 });
  };

  // Handle sort
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const newSortConfig = {
      sortBy: column as typeof sortConfig.sortBy,
      sortOrder: direction,
    };
    setSortConfig(newSortConfig);
  };

  // Handle edit
  const handleEdit = (userId: string) => {
    setSelectedUserId(userId);
    setEditDialogOpen(true);
  };

  // Handle toggle active
  const handleToggleActive = async (userId: string) => {
    try {
      const result = await toggleUserActiveAction(userId);

      if (result.success) {
        showSuccess('User status updated successfully');
        fetchUsers();
      } else {
        showError(result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      showError('An unexpected error occurred');
    }
  };

  // Handle delete
  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const result = await deleteUserAction(userToDelete);

      if (result.success) {
        showSuccess('User deleted successfully');
        fetchUsers();
      } else {
        showError(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('An unexpected error occurred');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle user created
  const handleUserCreated = () => {
    fetchUsers();
  };

  // Handle user updated
  const handleUserUpdated = () => {
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-2">Manage user accounts and permissions</p>
          </div>
          <UserCreateDialog
            onUserCreated={handleUserCreated}
            triggerButton={
              <Button className="flex items-center gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            }
          />
        </div>

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {state.error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="ml-2"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage all user accounts in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserListTable
              users={state.users}
              totalCount={state.totalCount}
              page={state.page}
              pageSize={state.pageSize}
              searchTerm={searchTerm}
              roleFilter={roleFilter}
              sortBy={sortConfig.sortBy}
              sortOrder={sortConfig.sortOrder}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSort={handleSort}
              onSearch={handleSearch}
              onRoleFilter={handleRoleFilter}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              loading={state.loading}
              currentUserEmail={session?.user?.email || ''}
            />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {selectedUserId && (
          <UserEditDialog
            userId={selectedUserId}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUserUpdated={handleUserUpdated}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the user account. The user will no longer be able to log in.
                This action can be reversed by activating the user again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
