'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  PopoverTrigger 
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, ChevronDown, Settings } from 'lucide-react';
import { useMultiOutletSelection } from '@/hooks/useMultiOutletSelection';
import { OutletOption } from '../../../types/outlet';

interface OutletContextSwitcherProps {
  showMultiSelect?: boolean;
  onActiveOutletChange?: (outletId: string | null) => void;
  onSelectedOutletsChange?: (outletIds: string[]) => void;
}

export function OutletContextSwitcher({
  showMultiSelect = true,
  onActiveOutletChange,
  onSelectedOutletsChange,
}: OutletContextSwitcherProps) {
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);

  const {
    outlets,
    selectedOutletIds,
    activeOutletId,
    isLoading,
    error,
    setSelectedOutletIds,
    setActiveOutletId,
  } = useMultiOutletSelection();

  const activeOutlet = outlets.find(outlet => outlet.id === activeOutletId);
  const selectedOutlets = outlets.filter(outlet => selectedOutletIds.includes(outlet.id));

  const handleActiveOutletChange = (outletId: string) => {
    setActiveOutletId(outletId);
    onActiveOutletChange?.(outletId);
  };

  const handleOutletSelection = (outletId: string, checked: boolean) => {
    let newSelectedIds: string[];
    
    if (checked) {
      newSelectedIds = [...selectedOutletIds, outletId];
    } else {
      newSelectedIds = selectedOutletIds.filter(id => id !== outletId);
    }
    
    setSelectedOutletIds(newSelectedIds);
    onSelectedOutletsChange?.(newSelectedIds);
    
    // If we unchecked the active outlet, switch to another selected outlet
    if (!checked && outletId === activeOutletId && newSelectedIds.length > 0) {
      setActiveOutletId(newSelectedIds[0]);
      onActiveOutletChange?.(newSelectedIds[0]);
    }
    
    // If no outlets selected, clear active outlet
    if (newSelectedIds.length === 0) {
      setActiveOutletId(null);
      onActiveOutletChange?.(null);
    }
  };

  const handleSelectAll = () => {
    const allActiveOutletIds = outlets
      .filter(outlet => outlet.isActive)
      .map(outlet => outlet.id);
    setSelectedOutletIds(allActiveOutletIds);
    onSelectedOutletsChange?.(allActiveOutletIds);
    
    // Set active outlet if none selected
    if (!activeOutletId && allActiveOutletIds.length > 0) {
      setActiveOutletId(allActiveOutletIds[0]);
      onActiveOutletChange?.(allActiveOutletIds[0]);
    }
  };

  const handleClearAll = () => {
    setSelectedOutletIds([]);
    setActiveOutletId(null);
    onSelectedOutletsChange?.([]);
    onActiveOutletChange?.(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Loading outlets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || outlets.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-red-600">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">
              {error || 'No outlets available'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single outlet mode - just show the active outlet info
  if (outlets.length === 1 || !showMultiSelect) {
    const displayOutlet = activeOutlet || outlets[0];
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {displayOutlet.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {displayOutlet.location}
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Outlet Display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">
                  {activeOutlet ? activeOutlet.name : 'No Active Outlet'}
                </CardTitle>
                {activeOutlet && (
                  <p className="text-sm text-muted-foreground">
                    {activeOutlet.location}
                  </p>
                )}
              </div>
            </div>
            
            {selectedOutlets.length > 1 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedOutlets.length} outlets selected
                </Badge>
                <Popover open={isMultiSelectOpen} onOpenChange={setIsMultiSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Select Outlets</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={selectedOutletIds.length === outlets.length}
                          >
                            All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={selectedOutletIds.length === 0}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {outlets.map((outlet) => (
                          <div key={outlet.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={outlet.id}
                              checked={selectedOutletIds.includes(outlet.id)}
                              onCheckedChange={(checked) => 
                                handleOutletSelection(outlet.id, checked as boolean)
                              }
                              disabled={!outlet.isActive}
                            />
                            <label
                              htmlFor={outlet.id}
                              className={`flex-1 text-sm cursor-pointer ${
                                !outlet.isActive ? 'text-muted-foreground' : ''
                              }`}
                            >
                              <div>
                                <div className="font-medium">{outlet.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {outlet.location}
                                </div>
                              </div>
                            </label>
                            {outlet.id === activeOutletId && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Outlet Context Switcher */}
      {selectedOutlets.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Switch Active Outlet</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={activeOutletId || ''} onValueChange={handleActiveOutletChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select active outlet" />
              </SelectTrigger>
              <SelectContent>
                {selectedOutlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    <div className="flex flex-col">
                      <span>{outlet.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {outlet.location}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
    </div>
  );
}