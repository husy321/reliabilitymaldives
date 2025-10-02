'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CustomerSearchFilters, PAYMENT_TERMS_OPTIONS } from '../../../types/customer';

interface CustomerFiltersProps {
  filters: CustomerSearchFilters;
  onFiltersChange: (filters: CustomerSearchFilters) => void;
  className?: string;
}

export function CustomerFilters({
  filters,
  onFiltersChange,
  className = ""
}: CustomerFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleActiveStatusChange = (activeOnly: boolean) => {
    onFiltersChange({
      ...filters,
      activeOnly
    });
  };

  const handlePaymentTermsChange = (paymentTerms: number[]) => {
    onFiltersChange({
      ...filters,
      paymentTermsFilter: paymentTerms.length > 0 ? paymentTerms : undefined
    });
  };

  const handleDateRangeChange = (dateRange: { from: Date; to: Date } | undefined) => {
    onFiltersChange({
      ...filters,
      createdDateRange: dateRange
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: filters.searchTerm
    });
    setIsOpen(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.activeOnly !== undefined && filters.activeOnly !== true) count++;
    if (filters.paymentTermsFilter && filters.paymentTermsFilter.length > 0) count++;
    if (filters.createdDateRange) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 px-1 py-0 text-xs bg-primary text-primary-foreground"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter Customers</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-6"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Active Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={filters.activeOnly === undefined ? "all" : filters.activeOnly ? "active" : "inactive"}
                onValueChange={(value) => {
                  if (value === "all") {
                    handleActiveStatusChange(undefined as any);
                  } else {
                    handleActiveStatusChange(value === "active");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Terms Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Terms</Label>
              <div className="space-y-2">
                {PAYMENT_TERMS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payment-${option.value}`}
                      checked={filters.paymentTermsFilter?.includes(option.value) || false}
                      onCheckedChange={(checked) => {
                        const currentTerms = filters.paymentTermsFilter || [];
                        if (checked) {
                          handlePaymentTermsChange([...currentTerms, option.value]);
                        } else {
                          handlePaymentTermsChange(currentTerms.filter(term => term !== option.value));
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`payment-${option.value}`}
                      className="text-sm font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Created Date</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    handleDateRangeChange({ from: weekAgo, to: today });
                  }}
                  className="text-xs"
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    handleDateRangeChange({ from: monthAgo, to: today });
                  }}
                  className="text-xs"
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const yearStart = new Date(today.getFullYear(), 0, 1);
                    handleDateRangeChange({ from: yearStart, to: today });
                  }}
                  className="text-xs"
                >
                  This year
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange(undefined)}
                  className="text-xs"
                >
                  All time
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center space-x-1 flex-wrap">
          {filters.activeOnly === false && (
            <Badge variant="secondary" className="text-xs">
              Inactive Only
            </Badge>
          )}
          {filters.paymentTermsFilter && filters.paymentTermsFilter.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filters.paymentTermsFilter.length} Payment Terms
            </Badge>
          )}
          {filters.createdDateRange && (
            <Badge variant="secondary" className="text-xs">
              Date Range
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}