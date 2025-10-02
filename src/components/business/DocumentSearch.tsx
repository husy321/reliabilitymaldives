"use client";

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon, X } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface DocumentSearchProps {
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
}

export default function DocumentSearch({
  onSearch,
  onClear,
  placeholder = "Search by filename...",
  initialValue = "",
  debounceMs = 300
}: DocumentSearchProps) {
  const [searchValue, setSearchValue] = useState(initialValue);

  // Debounce search to prevent excessive API calls
  const debouncedSearchTerm = useDebounce(searchValue, debounceMs);

  // Execute search when debounced value changes
  React.useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleClear = useCallback(() => {
    setSearchValue("");
    onClear();
  }, [onClear]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  return (
    <div className="relative flex-1 max-w-sm">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleInputChange}
        className="pl-9 pr-9"
      />
      {searchValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}