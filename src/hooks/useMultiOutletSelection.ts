'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
// Fetch via API to avoid server-action import loops in client components
import { useToast } from '@/hooks/useToast';
import { useOutletContextStore } from '@/stores/outletContextStore';
import { UseMultiOutletSelectionReturn, OutletOption } from '../../types/outlet';

export function useMultiOutletSelection(
  defaultOutletIds?: string[]
): UseMultiOutletSelectionReturn {
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useToast();

  const {
    selectedOutletIds,
    activeOutletId,
    setSelectedOutletIds,
    setActiveOutletId,
  } = useOutletContextStore();

  const fetchingRef = useRef(false);

  const fetchOutlets = useCallback(async () => {
    if (fetchingRef.current) return;
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/outlets/user', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      let result: any;
      try {
        result = await res.json();
      } catch (e) {
        const text = await res.text();
        throw new Error(`Outlets API ${res.status}: ${text.slice(0,200)}`);
      }
      if (!res.ok) {
        throw new Error(result?.error || `Outlets API ${res.status}`);
      }
      
      if (result.success) {
        setOutlets(result.data);
        
        // Auto-select outlets if defaults provided and no current selection
        if (defaultOutletIds && defaultOutletIds.length > 0 && selectedOutletIds.length === 0) {
          const validDefaults = defaultOutletIds.filter(id => 
            result.data.some(outlet => outlet.id === id && outlet.isActive)
          );
          if (validDefaults.length > 0) {
            setSelectedOutletIds(validDefaults);
          }
        }
        
        // Auto-select if only one outlet available and no current selection
        if (result.data.length === 1 && selectedOutletIds.length === 0) {
          setSelectedOutletIds([result.data[0].id]);
        }
        
        // Validate selected outlets still exist and are active
        if (selectedOutletIds.length > 0) {
          const validOutletIds = selectedOutletIds.filter(outletId => {
            const outlet = result.data.find(o => o.id === outletId);
            return outlet && outlet.isActive;
          });
          
          if (validOutletIds.length !== selectedOutletIds.length) {
            setSelectedOutletIds(validOutletIds);
          }
        }
        
        // Validate active outlet
        if (activeOutletId) {
          const activeOutlet = result.data.find(outlet => outlet.id === activeOutletId);
          if (!activeOutlet || !activeOutlet.isActive || !selectedOutletIds.includes(activeOutletId)) {
            setActiveOutletId(selectedOutletIds.length > 0 ? selectedOutletIds[0] : null);
          }
        }
      } else {
        setError(result.error);
        showError(result.error, { title: 'Failed to load outlets' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch outlets';
      setError(errorMessage);
      showError(errorMessage, { title: 'Error loading outlets' });
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [selectedOutletIds, activeOutletId, setSelectedOutletIds, setActiveOutletId, showError, defaultOutletIds]);

  // Initial fetch
  useEffect(() => {
    fetchOutlets();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected outlets when defaults change
  useEffect(() => {
    if (defaultOutletIds && defaultOutletIds.length > 0 && selectedOutletIds.length === 0) {
      const validDefaults = defaultOutletIds.filter(id => 
        outlets.some(outlet => outlet.id === id && outlet.isActive)
      );
      if (validDefaults.length > 0) {
        setSelectedOutletIds(validDefaults);
      }
    }
  }, [defaultOutletIds, selectedOutletIds, outlets, setSelectedOutletIds]);

  const refetchOutlets = useCallback(async () => {
    await fetchOutlets();
  }, [fetchOutlets]);

  return {
    outlets,
    selectedOutletIds,
    activeOutletId,
    isLoading,
    error,
    setSelectedOutletIds,
    setActiveOutletId,
    refetchOutlets,
  };
}