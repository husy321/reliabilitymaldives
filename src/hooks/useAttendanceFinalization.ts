import { useState, useCallback } from 'react';
import type {
  AttendancePeriod,
  FinalizationRequest,
  FinalizationResult,
  UnlockRequest,
  PeriodValidationResult,
  PeriodStatusSummary
} from '@/types/attendance';

interface UseAttendanceFinalizationReturn {
  periods: AttendancePeriod[];
  isLoading: boolean;
  error: string | null;
  finalizePeriod: (request: FinalizationRequest) => Promise<void>;
  unlockPeriod: (request: UnlockRequest) => Promise<void>;
  validatePeriod: (startDate: Date, endDate: Date) => Promise<PeriodValidationResult>;
  getPeriodSummary: (startDate: Date, endDate: Date) => Promise<PeriodStatusSummary>;
  loadPeriods: () => Promise<void>;
  createPeriod: (startDate: Date, endDate: Date) => Promise<void>;
  clearError: () => void;
}

export function useAttendanceFinalization(): UseAttendanceFinalizationReturn {
  const [periods, setPeriods] = useState<AttendancePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);

    if (error?.message) {
      setError(error.message);
    } else if (error?.error) {
      setError(error.error);
    } else {
      setError(defaultMessage);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/periods');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load periods');
      }

      const periodsData = await response.json();
      setPeriods(periodsData);
    } catch (err) {
      handleApiError(err, 'Failed to load attendance periods');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const finalizePeriod = useCallback(async (request: FinalizationRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/finalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize period');
      }

      const result: FinalizationResult = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Finalization failed');
      }

      // Update the period in the local state
      if (result.period) {
        setPeriods(prevPeriods =>
          prevPeriods.map(period =>
            period.id === result.period!.id ? result.period! : period
          )
        );
      }

      // Show success notification
      // toast.success(`Period finalized successfully. ${result.affectedRecordCount} records locked.`);
    } catch (err) {
      handleApiError(err, 'Failed to finalize attendance period');
      throw err; // Re-throw to allow component to handle
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const unlockPeriod = useCallback(async (request: UnlockRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/finalization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unlock period');
      }

      const result: FinalizationResult = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Unlock failed');
      }

      // Update the period in the local state
      if (result.period) {
        setPeriods(prevPeriods =>
          prevPeriods.map(period =>
            period.id === result.period!.id ? result.period! : period
          )
        );
      }

      // Show success notification
      // toast.success(`Period unlocked successfully. ${result.affectedRecordCount} records are now editable.`);
    } catch (err) {
      handleApiError(err, 'Failed to unlock attendance period');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const validatePeriod = useCallback(async (startDate: Date, endDate: Date): Promise<PeriodValidationResult> => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        action: 'validate'
      });

      const response = await fetch(`/api/attendance/periods?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate period');
      }

      return await response.json();
    } catch (err) {
      console.error('Period validation error:', err);
      return {
        canFinalize: false,
        issues: [{
          type: 'MISSING_DATA',
          message: 'Failed to validate period',
          count: 0
        }]
      };
    }
  }, []);

  const getPeriodSummary = useCallback(async (startDate: Date, endDate: Date): Promise<PeriodStatusSummary> => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        action: 'summary'
      });

      const response = await fetch(`/api/attendance/periods?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get period summary');
      }

      return await response.json();
    } catch (err) {
      console.error('Period summary error:', err);
      throw new Error('Failed to get period summary');
    }
  }, []);

  const createPeriod = useCallback(async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create period');
      }

      const newPeriod = await response.json();

      // Add to local state
      setPeriods(prevPeriods => [newPeriod, ...prevPeriods]);

      // Show success notification
      // toast.success(`Period created successfully. ${newPeriod.recordCount || 0} records associated.`);
    } catch (err) {
      handleApiError(err, 'Failed to create attendance period');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  return {
    periods,
    isLoading,
    error,
    finalizePeriod,
    unlockPeriod,
    validatePeriod,
    getPeriodSummary,
    loadPeriods,
    createPeriod,
    clearError,
  };
}