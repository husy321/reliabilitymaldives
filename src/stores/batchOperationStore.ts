import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DateRange } from 'react-day-picker'

interface BatchOperationState {
  // Date Selection State
  selectedDates: Date[]
  selectedRange: DateRange | undefined
  dateMode: 'multiple' | 'range'
  
  // Form Data State
  batchFormData: Record<string, any>
  
  // Selection State for Bulk Actions
  selectedReportIds: string[]
  bulkActionInProgress: boolean
  
  // Actions
  setSelectedDates: (dates: Date[]) => void
  setSelectedRange: (range: DateRange | undefined) => void
  setDateMode: (mode: 'multiple' | 'range') => void
  setBatchFormData: (data: Record<string, any>) => void
  setSelectedReportIds: (ids: string[]) => void
  setBulkActionInProgress: (inProgress: boolean) => void
  clearBatchData: () => void
  
  // Session Persistence Actions
  saveBatchSession: () => void
  loadBatchSession: () => void
}

const BATCH_SESSION_KEY = 'reliability-batch-operation-session'

export const useBatchOperationStore = create<BatchOperationState>()(
  persist(
    (set, get) => ({
      // Initial State
      selectedDates: [],
      selectedRange: undefined,
      dateMode: 'multiple',
      batchFormData: {},
      selectedReportIds: [],
      bulkActionInProgress: false,
      
      // Date Selection Actions
      setSelectedDates: (dates) => set({ selectedDates: dates }),
      setSelectedRange: (range) => set({ selectedRange: range }),
      setDateMode: (mode) => set({ dateMode: mode }),
      
      // Form Data Actions
      setBatchFormData: (data) => set({ batchFormData: data }),
      
      // Bulk Action Selection
      setSelectedReportIds: (ids) => set({ selectedReportIds: ids }),
      setBulkActionInProgress: (inProgress) => set({ bulkActionInProgress: inProgress }),
      
      // Clear all batch data
      clearBatchData: () => set({
        selectedDates: [],
        selectedRange: undefined,
        batchFormData: {},
        selectedReportIds: [],
        bulkActionInProgress: false,
      }),
      
      // Session Persistence
      saveBatchSession: () => {
        const state = get()
        const sessionData = {
          selectedDates: state.selectedDates.map(date => date.toISOString()),
          selectedRange: state.selectedRange ? {
            from: state.selectedRange.from?.toISOString(),
            to: state.selectedRange.to?.toISOString(),
          } : undefined,
          dateMode: state.dateMode,
          batchFormData: state.batchFormData,
          timestamp: new Date().toISOString(),
        }
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(BATCH_SESSION_KEY, JSON.stringify(sessionData))
        }
      },
      
      loadBatchSession: () => {
        if (typeof window !== 'undefined') {
          const sessionData = sessionStorage.getItem(BATCH_SESSION_KEY)
          if (sessionData) {
            try {
              const parsed = JSON.parse(sessionData)
              
              // Check if session is not too old (1 hour)
              const sessionTime = new Date(parsed.timestamp)
              const now = new Date()
              const hourDiff = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60)
              
              if (hourDiff < 1) {
                set({
                  selectedDates: parsed.selectedDates.map((dateStr: string) => new Date(dateStr)),
                  selectedRange: parsed.selectedRange ? {
                    from: parsed.selectedRange.from ? new Date(parsed.selectedRange.from) : undefined,
                    to: parsed.selectedRange.to ? new Date(parsed.selectedRange.to) : undefined,
                  } : undefined,
                  dateMode: parsed.dateMode || 'multiple',
                  batchFormData: parsed.batchFormData || {},
                })
              } else {
                // Clear old session data
                sessionStorage.removeItem(BATCH_SESSION_KEY)
              }
            } catch (error) {
              console.error('Failed to load batch session:', error)
              sessionStorage.removeItem(BATCH_SESSION_KEY)
            }
          }
        }
      },
    }),
    {
      name: 'batch-operation-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential UI state, not temporary session data
        dateMode: state.dateMode,
      }),
    }
  )
)

// Hook for session persistence
export const useBatchSessionPersistence = () => {
  const { saveBatchSession, loadBatchSession } = useBatchOperationStore()
  
  React.useEffect(() => {
    // Load session on mount
    loadBatchSession()
    
    // Auto-save on page unload
    const handleBeforeUnload = () => {
      saveBatchSession()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        saveBatchSession() // Save on cleanup
      }
    }
  }, [saveBatchSession, loadBatchSession])
}

// Import React for useEffect
import React from 'react'