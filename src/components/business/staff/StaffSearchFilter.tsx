'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StaffSearchParams } from '../../../../types/staff';

interface StaffSearchFilterProps {
  searchParams: StaffSearchParams;
  departments: string[];
  onSearchParamsChange: (params: StaffSearchParams) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function StaffSearchFilter({
  searchParams,
  departments,
  onSearchParamsChange,
  onSearch,
  onReset,
  isLoading = false
}: StaffSearchFilterProps) {
  const updateSearchParam = (key: keyof StaffSearchParams, value: any) => {
    const newParams = { ...searchParams, [key]: value };
    
    // Reset page to 1 when filters change
    if (key !== 'page') {
      newParams.page = 1;
    }
    
    onSearchParamsChange(newParams);
  };

  const removeFilter = (key: keyof StaffSearchParams) => {
    const newParams = { ...searchParams };
    delete newParams[key];
    newParams.page = 1;
    onSearchParamsChange(newParams);
  };

  const hasActiveFilters = Boolean(
    searchParams.query || 
    searchParams.department || 
    typeof searchParams.isActive === 'boolean'
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchParams.query) count++;
    if (searchParams.department) count++;
    if (typeof searchParams.isActive === 'boolean') count++;
    return count;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Filter Staff
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Query */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or employee ID..."
              value={searchParams.query || ''}
              onChange={(e) => updateSearchParam('query', e.target.value)}
              className="pl-8"
              disabled={isLoading}
            />
            {searchParams.query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => removeFilter('query')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select 
              value={searchParams.department || ''} 
              onValueChange={(value) => updateSearchParam('department', value || undefined)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={
                typeof searchParams.isActive === 'boolean' 
                  ? searchParams.isActive.toString() 
                  : ''
              } 
              onValueChange={(value) => 
                updateSearchParam(
                  'isActive', 
                  value === '' ? undefined : value === 'true'
                )
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="true">Active only</SelectItem>
                <SelectItem value="false">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort by</label>
            <Select 
              value={searchParams.sortBy || 'name'} 
              onValueChange={(value) => updateSearchParam('sortBy', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="employeeId">Employee ID</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Order</label>
            <Select 
              value={searchParams.sortOrder || 'asc'} 
              onValueChange={(value) => updateSearchParam('sortOrder', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={onSearch} 
            disabled={isLoading}
            className="flex-1"
          >
            <Search className="mr-2 h-4 w-4" />
            Search Staff
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={onReset}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {searchParams.query && (
                <Badge variant="outline" className="gap-1">
                  Search: {searchParams.query}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter('query')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {searchParams.department && (
                <Badge variant="outline" className="gap-1">
                  Dept: {searchParams.department}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter('department')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {typeof searchParams.isActive === 'boolean' && (
                <Badge variant="outline" className="gap-1">
                  Status: {searchParams.isActive ? 'Active' : 'Inactive'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter('isActive')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}