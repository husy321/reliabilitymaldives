'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Search, Filter, Download, Calendar, RefreshCw, Users, Building2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { AttendanceResultsWithEdit } from './AttendanceResultsWithEdit';
import type { 
  AttendanceRecord, 
  AttendanceSearchParams, 
  AttendanceSearchResult 
} from '../../../../types/attendance';

interface AttendanceListViewProps {
  onFilterChange?: (filters: AttendanceSearchParams) => void;
  onExport?: (filters: AttendanceSearchParams, format: 'csv' | 'excel') => void;
  isLoading?: boolean;
  data?: AttendanceSearchResult;
  departments?: string[];
  employees?: Array<{ id: string; employeeId: string; name: string; department: string }>;
}

export function AttendanceListView({
  onFilterChange,
  onExport,
  isLoading = false,
  data,
  departments = [],
  employees = []
}: AttendanceListViewProps) {
  // Filter state
  const [filters, setFilters] = useState<AttendanceSearchParams>({
    page: 1,
    limit: 25,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Update filters when form changes
  const updateFilters = useCallback((newFilters: Partial<AttendanceSearchParams>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    updateFilters({
      employeeId: value.trim() || undefined
    });
  }, [updateFilters]);

  // Handle department filter
  const handleDepartmentChange = useCallback((department: string) => {
    setSelectedDepartment(department);
    updateFilters({
      department: department === 'all' ? undefined : department
    });
  }, [updateFilters]);

  // Handle employee filter
  const handleEmployeeChange = useCallback((employeeId: string) => {
    setSelectedEmployee(employeeId);
    updateFilters({
      staffId: employeeId === 'all' ? undefined : employeeId
    });
  }, [updateFilters]);

  // Handle date range filter
  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    updateFilters({
      startDate: range.from ? startOfDay(range.from) : undefined,
      endDate: range.to ? endOfDay(range.to) : undefined
    });
  }, [updateFilters]);

  // Handle sorting
  const handleSortChange = useCallback((sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    updateFilters({
      sortBy: sortBy as AttendanceSearchParams['sortBy'],
      sortOrder: newSortOrder
    });
  }, [filters.sortBy, filters.sortOrder, updateFilters]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  // Handle page size change
  const handlePageSizeChange = useCallback((limit: string) => {
    updateFilters({
      limit: parseInt(limit, 10)
    });
  }, [updateFilters]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedEmployee('all');
    setDateRange({ from: undefined, to: undefined });
    const clearedFilters: AttendanceSearchParams = {
      page: 1,
      limit: 25,
      sortBy: 'date',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
  }, [onFilterChange]);

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    onExport?.(filters, format);
  }, [filters, onExport]);

  // Filter employees by department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === 'all') return employees;
    return employees.filter(emp => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.employeeId) count++;
    if (filters.department) count++;
    if (filters.staffId) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Attendance Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Date Range Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter employee ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
                placeholder="Select date range..."
                className="w-full"
              />
            </div>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Records per Page</label>
              <Select value={filters.limit?.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 records</SelectItem>
                  <SelectItem value="25">25 records</SelectItem>
                  <SelectItem value="50">50 records</SelectItem>
                  <SelectItem value="100">100 records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department and Employee Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Department
              </label>
              <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Users className="h-4 w-4" />
                Specific Employee
              </label>
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              disabled={activeFiltersCount === 0}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isLoading || !data?.records.length}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={isLoading || !data?.records.length}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Excel
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium">Active Filters:</div>
              <div className="flex flex-wrap gap-2">
                {filters.employeeId && (
                  <Badge variant="secondary">
                    Employee ID: {filters.employeeId}
                  </Badge>
                )}
                {filters.department && (
                  <Badge variant="secondary">
                    Department: {filters.department}
                  </Badge>
                )}
                {filters.staffId && (
                  <Badge variant="secondary">
                    Staff: {employees.find(e => e.id === filters.staffId)?.name || filters.staffId}
                  </Badge>
                )}
                {(filters.startDate || filters.endDate) && (
                  <Badge variant="secondary">
                    Date: {filters.startDate ? format(filters.startDate, 'MMM dd, yyyy') : 'Start'} - {filters.endDate ? format(filters.endDate, 'MMM dd, yyyy') : 'End'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Loading attendance records...</div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && data && (
        <>
          {/* Pagination Summary */}
          {data.records.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                >
                  Previous
                </Button>
                <span className="px-2">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Results Display */}
          <AttendanceResultsWithEdit
            records={data.records}
            title={`Attendance Records (${data.total} total)`}
            showStats={true}
          />

          {/* Bottom Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={data.page <= 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, data.page - 2) + i;
                  if (pageNum > data.totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === data.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.totalPages)}
                  disabled={data.page >= data.totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {!isLoading && data && data.records.length === 0 && (
        <Alert>
          <AlertDescription>
            No attendance records found matching the current filters. Try adjusting your search criteria.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}