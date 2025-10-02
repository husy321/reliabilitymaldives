'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
// Fetch via API to avoid server-action import loops in client components
import { useToast } from '@/hooks/useToast';

interface OutletOption {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

interface UseOutletSelectionReturn {
  outlets: OutletOption[];
  selectedOutletId: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedOutletId: (outletId: string | null) => void;
  refetchOutlets: () => Promise<void>;
}

export function useOutletSelection(
  defaultOutletId?: string
): UseOutletSelectionReturn {
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(
    defaultOutletId || null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useToast();

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
        
        // Auto-select outlet if only one available
        if (result.data.length === 1 && !selectedOutletId) {
          setSelectedOutletId(result.data[0].id);
        }
        
        // Validate selected outlet still exists and is active
        if (selectedOutletId) {
          const selectedOutlet = result.data.find(
            outlet => outlet.id === selectedOutletId
          );
          if (!selectedOutlet || !selectedOutlet.isActive) {
            setSelectedOutletId(null);
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
  }, [selectedOutletId, showError]);

  // Initial fetch
  useEffect(() => {
    fetchOutlets();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected outlet when default changes
  useEffect(() => {
    if (defaultOutletId && defaultOutletId !== selectedOutletId) {
      setSelectedOutletId(defaultOutletId);
    }
  }, [defaultOutletId, selectedOutletId]);

  const refetchOutlets = useCallback(async () => {
    await fetchOutlets();
  }, [fetchOutlets]);

  return {
    outlets,
    selectedOutletId,
    isLoading,
    error,
    setSelectedOutletId,
    refetchOutlets,
  };
}