'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomerSearchFilters } from '../../../types/customer';

interface CustomerSearchProps {
  searchTerm: string;
  onSearch: (filters: CustomerSearchFilters) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSearch({
  searchTerm,
  onSearch,
  placeholder = "Search customers...",
  className = ""
}: CustomerSearchProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const handleSearch = () => {
    onSearch({
      searchTerm: localSearchTerm.trim() || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setLocalSearchTerm('');
    onSearch({
      searchTerm: undefined
    });
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={placeholder}
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-4"
        />
      </div>
      <Button onClick={handleSearch} size="sm">
        Search
      </Button>
      {searchTerm && (
        <Button onClick={handleClear} variant="outline" size="sm">
          Clear
        </Button>
      )}
    </div>
  );
}