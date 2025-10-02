"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, FilterIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DocumentCategory } from '../../../types/document';

interface DocumentFiltersProps {
  availableCategories: DocumentCategory[];
  selectedCategories: DocumentCategory[];
  dateRange: { from?: Date; to?: Date };
  onCategoryChange: (categories: DocumentCategory[]) => void;
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  onQuickFilter: (filter: 'last7days' | 'last30days' | 'last90days' | 'thisYear') => void;
  onClearFilters: () => void;
}

export default function DocumentFilters({
  availableCategories,
  selectedCategories,
  dateRange,
  onCategoryChange,
  onDateRangeChange,
  onQuickFilter,
  onClearFilters
}: DocumentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryToggle = (category: DocumentCategory) => {
    const newSelection = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    onCategoryChange(newSelection);
  };

  const handleQuickDateFilter = (filter: 'last7days' | 'last30days' | 'last90days' | 'thisYear') => {
    onQuickFilter(filter);
  };

  const hasActiveFilters = selectedCategories.length > 0 || dateRange.from || dateRange.to;

  const formatCategoryName = (category: DocumentCategory) => {
    return category.replace('_', ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="flex items-center gap-3">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="h-8"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {selectedCategories.length + (dateRange.from || dateRange.to ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Categories</h4>
              <div className="grid gap-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {formatCategoryName(category)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium leading-none">Upload Date</h4>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter('last7days')}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter('last30days')}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter('last90days')}
                  >
                    Last 90 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter('thisYear')}
                  >
                    This year
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Custom Range:</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => onDateRangeChange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {formatCategoryName(category)}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleCategoryToggle(category)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {(dateRange.from || dateRange.to) && (
            <Badge variant="secondary" className="gap-1">
              {dateRange.from && dateRange.to ? (
                `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
              ) : dateRange.from ? (
                `From ${format(dateRange.from, "MMM dd")}`
              ) : (
                `Until ${format(dateRange.to!, "MMM dd")}`
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => onDateRangeChange({})}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}