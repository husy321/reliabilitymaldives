import { renderHook, act } from '@testing-library/react';
import { useAttendanceEditStore, useAttendanceRecordsWithUpdates } from '../../stores/attendanceEditStore';
import type { AttendanceRecord, AttendanceEditRequest } from '../../../types/attendance';

// Mock fetch globally
global.fetch = jest.fn();

describe('useAttendanceEditStore', () => {
  const mockRecord: AttendanceRecord = {
    id: 'record-123',
    staffId: 'staff-456',
    employeeId: 'EMP001',
    date: new Date('2024-01-15'),
    clockInTime: new Date('2024-01-15T09:00:00Z'),
    clockOutTime: new Date('2024-01-15T17:00:00Z'),
    totalHours: 8,
    zkTransactionId: 'zkt-123',
    fetchedAt: new Date('2024-01-15T18:00:00Z'),
    fetchedById: 'fetcher-123',
    createdAt: new Date('2024-01-15T18:00:00Z'),
    updatedAt: new Date('2024-01-15T18:00:00Z'),
    staff: {
      id: 'staff-456',
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'Engineering'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useAttendanceEditStore.getState().closeEditModal();
    useAttendanceEditStore.getState().clearOptimisticUpdates();
  });

  afterEach(() => {
    // Clean up after each test
    if (fetch) {
      (fetch as jest.Mock).mockClear();
    }
  });

  describe('modal state management', () => {
    it('should initialize with closed modal state', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.selectedRecord).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it('should open modal with selected record', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      act(() => {
        result.current.openEditModal(mockRecord);
      });

      expect(result.current.isEditModalOpen).toBe(true);
      expect(result.current.selectedRecord).toEqual(mockRecord);
    });

    it('should close modal and clear selected record', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      // First open modal
      act(() => {
        result.current.openEditModal(mockRecord);
      });

      // Then close it
      act(() => {
        result.current.closeEditModal();
      });

      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.selectedRecord).toBe(null);
    });

    it('should manage loading state', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('optimistic updates', () => {
    it('should add optimistic update', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      const updatedRecord = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z'),
        totalHours: 8.5
      };

      act(() => {
        result.current.addOptimisticUpdate('record-123', updatedRecord);
      });

      expect(result.current.optimisticUpdates['record-123']).toEqual(updatedRecord);
    });

    it('should remove optimistic update', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      const updatedRecord = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z')
      };

      // Add optimistic update
      act(() => {
        result.current.addOptimisticUpdate('record-123', updatedRecord);
      });

      expect(result.current.optimisticUpdates['record-123']).toBeDefined();

      // Remove optimistic update
      act(() => {
        result.current.removeOptimisticUpdate('record-123');
      });

      expect(result.current.optimisticUpdates['record-123']).toBeUndefined();
    });

    it('should clear all optimistic updates', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      // Add multiple optimistic updates
      act(() => {
        result.current.addOptimisticUpdate('record-1', { ...mockRecord, id: 'record-1' });
        result.current.addOptimisticUpdate('record-2', { ...mockRecord, id: 'record-2' });
      });

      expect(Object.keys(result.current.optimisticUpdates)).toHaveLength(2);

      // Clear all updates
      act(() => {
        result.current.clearOptimisticUpdates();
      });

      expect(Object.keys(result.current.optimisticUpdates)).toHaveLength(0);
    });

    it('should update existing optimistic update', () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      const firstUpdate = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z')
      };

      const secondUpdate = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:00:00Z'),
        clockOutTime: new Date('2024-01-15T18:00:00Z')
      };

      // Add first update
      act(() => {
        result.current.addOptimisticUpdate('record-123', firstUpdate);
      });

      expect(result.current.optimisticUpdates['record-123'].clockInTime).toEqual(firstUpdate.clockInTime);

      // Update with second update
      act(() => {
        result.current.addOptimisticUpdate('record-123', secondUpdate);
      });

      expect(result.current.optimisticUpdates['record-123'].clockInTime).toEqual(secondUpdate.clockInTime);
      expect(result.current.optimisticUpdates['record-123'].clockOutTime).toEqual(secondUpdate.clockOutTime);
    });
  });

  describe('editAttendanceRecord', () => {
    const editRequest: AttendanceEditRequest = {
      recordId: 'record-123',
      date: new Date('2024-01-15'),
      clockInTime: new Date('2024-01-15T08:30:00Z'),
      clockOutTime: new Date('2024-01-15T17:30:00Z'),
      reason: 'Corrected arrival time'
    };

    beforeEach(() => {
      // Set up store with selected record
      useAttendanceEditStore.getState().openEditModal(mockRecord);
    });

    it('should handle successful edit request', async () => {
      const mockSuccessResponse = {
        success: true,
        updatedRecord: {
          ...mockRecord,
          clockInTime: editRequest.clockInTime,
          clockOutTime: editRequest.clockOutTime,
          totalHours: 9,
          conflictResolved: true,
          conflictResolvedBy: 'user-123'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockSuccessResponse)
      });

      const { result } = renderHook(() => useAttendanceEditStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editAttendanceRecord(editRequest);
      });

      // Check API call
      expect(fetch).toHaveBeenCalledWith('/api/attendance/record-123/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editRequest),
      });

      // Check result
      expect(editResult).toEqual(mockSuccessResponse);

      // Check state updates
      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.selectedRecord).toBe(null);
      expect(result.current.optimisticUpdates['record-123']).toEqual(mockSuccessResponse.updatedRecord);
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        success: false,
        errors: ['Validation failed: Invalid time sequence']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockErrorResponse)
      });

      const { result } = renderHook(() => useAttendanceEditStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editAttendanceRecord(editRequest);
      });

      // Check result
      expect(editResult).toEqual(mockErrorResponse);

      // Modal should remain open on error
      expect(result.current.isEditModalOpen).toBe(true);
      expect(result.current.selectedRecord).toEqual(mockRecord);

      // Optimistic update should be removed on error
      expect(result.current.optimisticUpdates['record-123']).toBeUndefined();
    });

    it('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAttendanceEditStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editAttendanceRecord(editRequest);
      });

      // Check error result
      expect(editResult).toEqual({
        success: false,
        errors: ['Failed to save attendance record. Please try again.']
      });

      // Modal should remain open on error
      expect(result.current.isEditModalOpen).toBe(true);

      // Optimistic update should be removed on error
      expect(result.current.optimisticUpdates['record-123']).toBeUndefined();
    });

    it('should return error when no record is selected', async () => {
      const { result } = renderHook(() => useAttendanceEditStore());

      // Close modal to clear selected record
      act(() => {
        result.current.closeEditModal();
      });

      let editResult;
      await act(async () => {
        editResult = await result.current.editAttendanceRecord(editRequest);
      });

      expect(editResult).toEqual({
        success: false,
        errors: ['No record selected for editing']
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should manage loading state during request', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockReturnValueOnce({
        json: jest.fn().mockReturnValueOnce(mockPromise)
      });

      const { result } = renderHook(() => useAttendanceEditStore());

      // Start edit request (don't await)
      const editPromise = act(async () => {
        return result.current.editAttendanceRecord(editRequest);
      });

      // Check loading state is true
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ success: true, updatedRecord: mockRecord });
        await editPromise;
      });

      // Check loading state is false
      expect(result.current.isLoading).toBe(false);
    });

    it('should apply optimistic update immediately', async () => {
      // Mock a delayed response
      const mockResponse = { success: true, updatedRecord: mockRecord };
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockReturnValueOnce({
        json: jest.fn().mockReturnValueOnce(mockPromise)
      });

      const { result } = renderHook(() => useAttendanceEditStore());

      // Start edit request
      const editPromise = act(async () => {
        return result.current.editAttendanceRecord(editRequest);
      });

      // Check optimistic update is applied immediately
      const optimisticUpdate = result.current.optimisticUpdates['record-123'];
      expect(optimisticUpdate).toBeDefined();
      expect(optimisticUpdate.clockInTime).toEqual(editRequest.clockInTime);
      expect(optimisticUpdate.clockOutTime).toEqual(editRequest.clockOutTime);
      expect(optimisticUpdate.conflictResolved).toBe(true);

      // Resolve the API call
      await act(async () => {
        resolvePromise!(mockResponse);
        await editPromise;
      });
    });
  });

  describe('useAttendanceRecordsWithUpdates', () => {
    const originalRecords = [
      mockRecord,
      { ...mockRecord, id: 'record-456', employeeId: 'EMP002' }
    ];

    it('should return original records when no optimistic updates', () => {
      const { result } = renderHook(() => useAttendanceRecordsWithUpdates(originalRecords));

      expect(result.current).toEqual(originalRecords);
    });

    it('should apply optimistic updates to matching records', () => {
      const { result: storeResult } = renderHook(() => useAttendanceEditStore());

      const updatedRecord = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z'),
        totalHours: 8.5
      };

      // Add optimistic update
      act(() => {
        storeResult.current.addOptimisticUpdate('record-123', updatedRecord);
      });

      const { result } = renderHook(() => useAttendanceRecordsWithUpdates(originalRecords));

      expect(result.current[0]).toEqual(updatedRecord);
      expect(result.current[1]).toEqual(originalRecords[1]); // Unchanged
    });

    it('should handle multiple optimistic updates', () => {
      const { result: storeResult } = renderHook(() => useAttendanceEditStore());

      const updatedRecord1 = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z')
      };

      const updatedRecord2 = {
        ...originalRecords[1],
        clockOutTime: new Date('2024-01-15T18:30:00Z')
      };

      // Add multiple optimistic updates
      act(() => {
        storeResult.current.addOptimisticUpdate('record-123', updatedRecord1);
        storeResult.current.addOptimisticUpdate('record-456', updatedRecord2);
      });

      const { result } = renderHook(() => useAttendanceRecordsWithUpdates(originalRecords));

      expect(result.current[0]).toEqual(updatedRecord1);
      expect(result.current[1]).toEqual(updatedRecord2);
    });

    it('should return original record when optimistic update is cleared', () => {
      const { result: storeResult } = renderHook(() => useAttendanceEditStore());

      const updatedRecord = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z')
      };

      // Add optimistic update
      act(() => {
        storeResult.current.addOptimisticUpdate('record-123', updatedRecord);
      });

      const { result, rerender } = renderHook(() => useAttendanceRecordsWithUpdates(originalRecords));

      expect(result.current[0]).toEqual(updatedRecord);

      // Remove optimistic update
      act(() => {
        storeResult.current.removeOptimisticUpdate('record-123');
      });

      rerender();

      expect(result.current[0]).toEqual(mockRecord);
    });

    it('should handle empty records array', () => {
      const { result } = renderHook(() => useAttendanceRecordsWithUpdates([]));

      expect(result.current).toEqual([]);
    });

    it('should preserve record order', () => {
      const { result: storeResult } = renderHook(() => useAttendanceEditStore());

      const reversedRecords = [...originalRecords].reverse();

      const updatedRecord = {
        ...mockRecord,
        clockInTime: new Date('2024-01-15T08:30:00Z')
      };

      // Add optimistic update
      act(() => {
        storeResult.current.addOptimisticUpdate('record-123', updatedRecord);
      });

      const { result } = renderHook(() => useAttendanceRecordsWithUpdates(reversedRecords));

      expect(result.current[0]).toEqual(reversedRecords[0]); // record-456
      expect(result.current[1]).toEqual(updatedRecord); // record-123 with update
    });
  });
});