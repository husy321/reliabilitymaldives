'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StaffList } from '@/components/business/staff/StaffList';
import { StaffForm } from '@/components/business/staff/StaffForm';
import { StaffSearchFilter } from '@/components/business/staff/StaffSearchFilter';

import { 
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
  searchStaffAction,
  getDepartmentsAction
} from '@/actions/staffActions';

import type { Staff, CreateStaffRequest, UpdateStaffRequest, StaffSearchParams, StaffSearchResult } from '../../../types/staff';

export default function StaffPage() {
  // State management
  const [staffResult, setStaffResult] = useState<StaffSearchResult>({
    staff: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [searchParams, setSearchParams] = useState<StaffSearchParams>({
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Search staff when params change
  useEffect(() => {
    searchStaff();
  }, [searchParams]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments
      const deptResult = await getDepartmentsAction();
      if (deptResult.success) {
        setDepartments(deptResult.data);
      }
      
      // TODO: Load available users for staff creation
      // For now, using empty array - this would be fetched from user management
      setUsers([]);
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  };

  const searchStaff = async () => {
    try {
      setIsSearching(true);
      const result = await searchStaffAction(searchParams);
      
      if (result.success) {
        setStaffResult(result.data);
      } else {
        toast.error(result.error || 'Failed to search staff');
      }
    } catch (error) {
      console.error('Search staff error:', error);
      toast.error('Failed to search staff');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateStaff = async (data: CreateStaffRequest) => {
    try {
      setIsSubmitting(true);
      const result = await createStaffAction(data);
      
      if (result.success) {
        toast.success('Staff member created successfully');
        setIsCreateDialogOpen(false);
        searchStaff(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to create staff member');
      }
    } catch (error) {
      console.error('Create staff error:', error);
      toast.error('Failed to create staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (data: UpdateStaffRequest) => {
    try {
      setIsSubmitting(true);
      const result = await updateStaffAction(data);
      
      if (result.success) {
        toast.success('Staff member updated successfully');
        setIsEditDialogOpen(false);
        setSelectedStaff(null);
        searchStaff(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Update staff error:', error);
      toast.error('Failed to update staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    
    try {
      setIsSubmitting(true);
      const result = await deleteStaffAction(selectedStaff.id);
      
      if (result.success) {
        toast.success('Staff member deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedStaff(null);
        searchStaff(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Delete staff error:', error);
      toast.error('Failed to delete staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchParamsChange = (newParams: StaffSearchParams) => {
    setSearchParams(newParams);
  };

  const resetSearch = () => {
    setSearchParams({
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage your organization's staff members and their information.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={users.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {users.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                No User Accounts Available
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                To create staff members, you need user accounts first. Please create user accounts in the User Management section.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <StaffSearchFilter
            searchParams={searchParams}
            departments={departments}
            onSearchParamsChange={handleSearchParamsChange}
            onSearch={searchStaff}
            onReset={resetSearch}
            isLoading={isSearching}
          />
        </div>
        
        <div className="lg:col-span-2">
          <StaffList
            searchResult={staffResult}
            onStaffEdit={(staff) => {
              setSelectedStaff(staff);
              setIsEditDialogOpen(true);
            }}
            onStaffDelete={(staff) => {
              setSelectedStaff(staff);
              setIsDeleteDialogOpen(true);
            }}
            onCreateNew={() => setIsCreateDialogOpen(true)}
            onPageChange={handlePageChange}
            isLoading={isSearching || isLoading}
          />
        </div>
      </div>

      {/* Create Staff Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Staff Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to your organization.
            </DialogDescription>
          </DialogHeader>
          <StaffForm
            users={users}
            departments={departments}
            onSubmit={handleCreateStaff}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={isSubmitting}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member information.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <StaffForm
              staff={selectedStaff}
              users={users}
              departments={departments}
              onSubmit={handleUpdateStaff}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedStaff(null);
              }}
              isLoading={isSubmitting}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Staff Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedStaff?.name}</strong>? 
              This action cannot be undone and will remove all staff information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedStaff(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Staff Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}