import { create } from 'zustand';
import type { AttendanceRecord, AttendanceEditRequest, AttendanceEditResult } from '../../types/attendance';

interface AttendanceEditState {
  // Modal state
  isEditModalOpen: boolean;
  selectedRecord: AttendanceRecord | null;

  // Loading states
  isLoading: boolean;

  // Optimistic updates
  optimisticUpdates: Record<string, AttendanceRecord>;

  // Actions
  openEditModal: (record: AttendanceRecord) => void;
  closeEditModal: () => void;
  setLoading: (loading: boolean) => void;

  // Optimistic update actions
  addOptimisticUpdate: (recordId: string, updatedRecord: AttendanceRecord) => void;
  removeOptimisticUpdate: (recordId: string) => void;
  clearOptimisticUpdates: () => void;

  // Edit actions
  editAttendanceRecord: (editRequest: AttendanceEditRequest) => Promise<AttendanceEditResult>;
}

export const useAttendanceEditStore = create<AttendanceEditState>((set, get) => ({
  // Initial state
  isEditModalOpen: false,
  selectedRecord: null,
  isLoading: false,
  optimisticUpdates: {},

  // Modal actions
  openEditModal: (record) => set({
    isEditModalOpen: true,
    selectedRecord: record
  }),

  closeEditModal: () => set({
    isEditModalOpen: false,
    selectedRecord: null
  }),

  setLoading: (loading) => set({ isLoading: loading }),

  // Optimistic update actions
  addOptimisticUpdate: (recordId, updatedRecord) => set((state) => ({
    optimisticUpdates: {
      ...state.optimisticUpdates,
      [recordId]: updatedRecord
    }
  })),

  removeOptimisticUpdate: (recordId) => set((state) => {
    const { [recordId]: removed, ...rest } = state.optimisticUpdates;
    return { optimisticUpdates: rest };
  }),

  clearOptimisticUpdates: () => set({ optimisticUpdates: {} }),

  // Edit action with optimistic updates
  editAttendanceRecord: async (editRequest) => {
    const { setLoading, addOptimisticUpdate, removeOptimisticUpdate, selectedRecord } = get();

    if (!selectedRecord) {
      return { success: false, errors: ['No record selected for editing'] };
    }

    setLoading(true);

    // Create optimistic update
    const optimisticRecord: AttendanceRecord = {
      ...selectedRecord,
      date: editRequest.date,
      clockInTime: editRequest.clockInTime,
      clockOutTime: editRequest.clockOutTime,
      totalHours: editRequest.clockInTime && editRequest.clockOutTime
        ? (editRequest.clockOutTime.getTime() - editRequest.clockInTime.getTime()) / (1000 * 60 * 60)
        : null,
      updatedAt: new Date(),
      conflictResolvedBy: 'current-user', // This will be set by the API
      conflictResolved: true,
      conflictNotes: `Manual edit: ${editRequest.reason}`
    };

    // Apply optimistic update
    addOptimisticUpdate(editRequest.recordId, optimisticRecord);

    try {
      // Make API call
      const response = await fetch(`/api/attendance/${editRequest.recordId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editRequest),
      });

      const result: AttendanceEditResult = await response.json();

      if (result.success) {
        // Update optimistic update with real data
        if (result.updatedRecord) {
          addOptimisticUpdate(editRequest.recordId, result.updatedRecord);
        }

        // Close modal
        set({ isEditModalOpen: false, selectedRecord: null });

        return result;
      } else {
        // Remove optimistic update on failure
        removeOptimisticUpdate(editRequest.recordId);
        return result;
      }
    } catch (error) {
      // Remove optimistic update on error
      removeOptimisticUpdate(editRequest.recordId);

      console.error('Failed to edit attendance record:', error);
      return {
        success: false,
        errors: ['Failed to save attendance record. Please try again.']
      };
    } finally {
      setLoading(false);
    }
  }
}));

// Helper hook to get records with optimistic updates applied
export const useAttendanceRecordsWithUpdates = (records: AttendanceRecord[]) => {
  const optimisticUpdates = useAttendanceEditStore((state) => state.optimisticUpdates);

  return records.map(record => {
    const optimisticUpdate = optimisticUpdates[record.id];
    return optimisticUpdate || record;
  });
};