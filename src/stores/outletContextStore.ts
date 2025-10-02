'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OutletContextState {
  selectedOutletIds: string[];
  activeOutletId: string | null;
  setSelectedOutletIds: (outletIds: string[]) => void;
  setActiveOutletId: (outletId: string | null) => void;
  addOutletId: (outletId: string) => void;
  removeOutletId: (outletId: string) => void;
  clearSelection: () => void;
}

export const useOutletContextStore = create<OutletContextState>()(
  persist(
    (set, get) => ({
      selectedOutletIds: [],
      activeOutletId: null,
      
      setSelectedOutletIds: (outletIds) => {
        set({ selectedOutletIds: outletIds });
        
        // If active outlet is not in the new selection, clear it
        const { activeOutletId } = get();
        if (activeOutletId && !outletIds.includes(activeOutletId)) {
          set({ activeOutletId: null });
        }
        
        // If only one outlet selected, make it active
        if (outletIds.length === 1) {
          set({ activeOutletId: outletIds[0] });
        }
      },
      
      setActiveOutletId: (outletId) => {
        const { selectedOutletIds } = get();
        
        // Ensure the active outlet is in the selected outlets
        if (outletId && !selectedOutletIds.includes(outletId)) {
          set({ 
            selectedOutletIds: [...selectedOutletIds, outletId],
            activeOutletId: outletId 
          });
        } else {
          set({ activeOutletId: outletId });
        }
      },
      
      addOutletId: (outletId) => {
        const { selectedOutletIds } = get();
        if (!selectedOutletIds.includes(outletId)) {
          const newSelection = [...selectedOutletIds, outletId];
          set({ selectedOutletIds: newSelection });
          
          // If this is the first outlet, make it active
          if (newSelection.length === 1) {
            set({ activeOutletId: outletId });
          }
        }
      },
      
      removeOutletId: (outletId) => {
        const { selectedOutletIds, activeOutletId } = get();
        const newSelection = selectedOutletIds.filter(id => id !== outletId);
        set({ selectedOutletIds: newSelection });
        
        // If removed outlet was active, set new active outlet
        if (activeOutletId === outletId) {
          set({ activeOutletId: newSelection.length > 0 ? newSelection[0] : null });
        }
      },
      
      clearSelection: () => {
        set({ selectedOutletIds: [], activeOutletId: null });
      },
    }),
    {
      name: 'outlet-context-storage',
      partialize: (state) => ({
        selectedOutletIds: state.selectedOutletIds,
        activeOutletId: state.activeOutletId,
      }),
    }
  )
);