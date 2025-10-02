'use client';

import React from 'react';
import { StaffCard } from './StaffCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserPlus,
  Loader2 
} from 'lucide-react';
import type { Staff, StaffSearchResult } from '../../../../types/staff';

interface StaffListProps {
  searchResult: StaffSearchResult;
  onStaffEdit?: (staff: Staff) => void;
  onStaffDelete?: (staff: Staff) => void;
  onStaffView?: (staff: Staff) => void;
  onCreateNew?: () => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function StaffList({
  searchResult,
  onStaffEdit,
  onStaffDelete,
  onStaffView,
  onCreateNew,
  onPageChange,
  isLoading = false
}: StaffListProps) {
  const { staff, total, page, limit, totalPages } = searchResult;

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, page - Math.floor(maxVisible / 2));
      let end = start + maxVisible - 1;
      
      if (end > totalPages) {
        end = totalPages;
        start = end - maxVisible + 1;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading staff members...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Staff Members</CardTitle>
              <Badge variant="outline">
                {total} total
              </Badge>
            </div>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            )}
          </div>
          
          {total > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} staff members
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Staff Grid */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-6">
              {total === 0 
                ? "No staff members have been created yet." 
                : "No staff members match your current search criteria."
              }
            </p>
            {onCreateNew && total === 0 && (
              <Button onClick={onCreateNew}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create First Staff Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((staffMember) => (
            <StaffCard
              key={staffMember.id}
              staff={staffMember}
              onEdit={onStaffEdit}
              onDelete={onStaffDelete}
              onView={onStaffView}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex space-x-1">
                  {generatePageNumbers().map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      disabled={isLoading}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}