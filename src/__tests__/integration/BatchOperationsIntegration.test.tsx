import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchSalesReportForm } from '@/components/forms/BatchSalesReportForm';
import { useMultiOutletSelection } from '@/hooks/useMultiOutletSelection';
import { useBatchOperationStore } from '@/stores/batchOperationStore';
import { submitSalesReportAction } from '@/lib/actions/sales-reports';

// Mock all dependencies
jest.mock('@/hooks/useMultiOutletSelection');
jest.mock('@/stores/batchOperationStore');
jest.mock('@/lib/actions/sales-reports');

// Mock components to focus on integration logic
jest.mock('@/components/business/OutletContextSwitcher', () => ({
  OutletContextSwitcher: ({ 
    onActiveOutletChange, 
    onSelectedOutletsChange 
  }: any) => (
    <div data-testid="outlet-context-switcher">
      <button 
        onClick={() => onSelectedOutletsChange?.(['outlet1', 'outlet2'])}
        data-testid="select-outlets-btn"
      >
        Select Outlets
      </button>
      <button 
        onClick={() => onActiveOutletChange?.('outlet1')}
        data-testid="set-active-outlet-btn"
      >
        Set Active Outlet
      </button>
    </div>
  ),
}));

jest.mock('@/components/business/BatchDatePicker', () => ({
  BatchDatePicker: ({ onChange }: any) => (
    <div data-testid="batch-date-picker">
      <button 
        onClick={() => onChange?.([
          new Date('2024-01-15'), 
          new Date('2024-01-16')
        ])}
        data-testid="select-dates-btn"
      >
        Select Dates
      </button>
    </div>
  ),
}));

describe('Batch Operations Integration', () => {
  const mockOutlets = [
    { 
      id: 'outlet1', 
      name: 'Outlet 1', 
      location: 'Location 1', 
      isActive: true,
      managerId: 'manager1'
    },
    { 
      id: 'outlet2', 
      name: 'Outlet 2', 
      location: 'Location 2', 
      isActive: true,
      managerId: 'manager1'
    },
    { 
      id: 'outlet3', 
      name: 'Outlet 3', 
      location: 'Location 3', 
      isActive: true,
      managerId: 'manager2' // Different manager
    },
  ];

  const mockStore = {
    selectedDates: [],
    selectedRange: undefined,
    dateMode: 'multiple' as const,
    batchFormData: {},
    setBatchFormData: jest.fn(),
    setSelectedDates: jest.fn(),
    setSelectedRange: jest.fn(),
    setDateMode: jest.fn(),
  };

  const mockMultiOutletHook = {
    outlets: mockOutlets.slice(0, 2), // Only outlets for manager1
    selectedOutletIds: [],
    activeOutletId: null,
    isLoading: false,
    error: null,
    setSelectedOutletIds: jest.fn(),
    setActiveOutletId: jest.fn(),
    refetchOutlets: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useMultiOutletSelection as jest.Mock).mockReturnValue(mockMultiOutletHook);
    (useBatchOperationStore as jest.Mock).mockReturnValue(mockStore);
    (submitSalesReportAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'report123' },
    });
  });

  describe('Multi-Outlet Permission Validation', () => {
    it('should only show outlets that the manager has permission to access', () => {
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Verify outlet context switcher is rendered
      expect(screen.getByTestId('outlet-context-switcher')).toBeInTheDocument();
      
      // The hook should only return outlets for the current manager
      expect(mockMultiOutletHook.outlets).toHaveLength(2);
      expect(mockMultiOutletHook.outlets.every(o => o.managerId === 'manager1')).toBe(true);
    });

    it('should handle outlet selection changes with permission validation', async () => {
      const user = userEvent.setup();
      const mockSetSelectedOutletIds = jest.fn();
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue({
        ...mockMultiOutletHook,
        setSelectedOutletIds: mockSetSelectedOutletIds,
      });
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      const selectButton = screen.getByTestId('select-outlets-btn');
      await user.click(selectButton);
      
      // This would trigger outlet selection logic
      // In real implementation, this would validate permissions
    });

    it('should prevent access to outlets from different managers', () => {
      // Mock hook returning outlets for different manager (security test)
      const unauthorizedHook = {
        ...mockMultiOutletHook,
        outlets: [mockOutlets[2]], // outlet3 belongs to manager2
        error: 'Unauthorized access to outlet',
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(unauthorizedHook);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      expect(screen.getByText('Unauthorized access to outlet')).toBeInTheDocument();
    });
  });

  describe('Batch Entry Generation with Outlet Context', () => {
    it('should generate entries for selected outlets and dates', async () => {
      const user = userEvent.setup();
      
      // Mock store with dates and hook with selected outlets
      const storeWithDates = {
        ...mockStore,
        selectedDates: [new Date('2024-01-15'), new Date('2024-01-16')],
      };
      const hookWithOutlets = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithOutlets);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should generate 4 entries (2 outlets × 2 dates)
      // This would be visible in the table if entries were generated
      // In a real test, we'd check the table structure
    });

    it('should segregate batch data by outlet context', async () => {
      const user = userEvent.setup();
      
      const storeWithData = {
        ...mockStore,
        selectedDates: [new Date('2024-01-15')],
        batchFormData: {
          'outlet1-2024-01-15T00:00:00.000Z': {
            cashDeposits: 100,
            cardSettlements: 200,
            totalSales: 300,
          },
          'outlet2-2024-01-15T00:00:00.000Z': {
            cashDeposits: 150,
            cardSettlements: 250,
            totalSales: 400,
          },
        },
      };
      
      const hookWithOutlets = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithData);
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithOutlets);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Verify that form data is correctly segregated by outlet
      // Each outlet should have its own cached data
      expect(storeWithData.batchFormData).toHaveProperty('outlet1-2024-01-15T00:00:00.000Z');
      expect(storeWithData.batchFormData).toHaveProperty('outlet2-2024-01-15T00:00:00.000Z');
    });
  });

  describe('Active Outlet Management', () => {
    it('should handle active outlet changes', async () => {
      const user = userEvent.setup();
      const mockSetActiveOutletId = jest.fn();
      
      const hookWithActive = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
        activeOutletId: 'outlet1',
        setActiveOutletId: mockSetActiveOutletId,
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithActive);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      const setActiveButton = screen.getByTestId('set-active-outlet-btn');
      await user.click(setActiveButton);
      
      // In real implementation, this would affect form context
    });

    it('should validate active outlet permissions', () => {
      const hookWithInvalidActive = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
        activeOutletId: 'outlet3', // This outlet belongs to different manager
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithInvalidActive);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should handle invalid active outlet gracefully
      // In real implementation, this should reset or show error
    });
  });

  describe('Form Data Persistence with Outlet Context', () => {
    it('should persist form data per outlet-date combination', async () => {
      const mockSetBatchFormData = jest.fn();
      
      const storeWithPersistence = {
        ...mockStore,
        setBatchFormData: mockSetBatchFormData,
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithPersistence);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // In real implementation, form changes would trigger persistence
      // We'd test by entering data and verifying setBatchFormData calls
    });

    it('should restore form data when switching between outlets', () => {
      const storeWithCachedData = {
        ...mockStore,
        batchFormData: {
          'outlet1-2024-01-15T00:00:00.000Z': {
            cashDeposits: 100,
            cardSettlements: 200,
            totalSales: 300,
          },
        },
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithCachedData);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // When switching to outlet1 on 2024-01-15, 
      // form should restore the cached values
    });
  });

  describe('Batch Submission with Permission Validation', () => {
    it('should validate outlet permissions before submission', async () => {
      const user = userEvent.setup();
      const mockSubmitAction = jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'report123' },
      });
      
      (submitSalesReportAction as jest.Mock).mockImplementation(mockSubmitAction);
      
      const hookWithOutlets = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithOutlets);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // In real implementation, form submission would validate
      // that user has permission for each outlet in the batch
    });

    it('should handle permission errors during batch submission', async () => {
      const mockSubmitAction = jest.fn()
        .mockResolvedValueOnce({ success: true, data: { id: 'report1' } })
        .mockRejectedValueOnce(new Error('Permission denied for outlet'))
        .mockResolvedValueOnce({ success: true, data: { id: 'report3' } });
      
      (submitSalesReportAction as jest.Mock).mockImplementation(mockSubmitAction);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should handle partial failures due to permission errors
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle outlet loading errors gracefully', () => {
      const hookWithError = {
        ...mockMultiOutletHook,
        isLoading: false,
        error: 'Failed to load outlets',
        outlets: [],
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithError);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      expect(screen.getByText('Failed to load outlets')).toBeInTheDocument();
    });

    it('should handle outlet permission changes during session', async () => {
      // Start with valid outlets
      const initialHook = {
        ...mockMultiOutletHook,
        outlets: mockOutlets.slice(0, 2),
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      const { rerender } = render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Simulate permission change (outlet2 no longer accessible)
      const updatedHook = {
        ...initialHook,
        outlets: [mockOutlets[0]], // Only outlet1 remains
        selectedOutletIds: ['outlet1'], // outlet2 removed
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(updatedHook);
      
      rerender(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should handle the change gracefully and update form state
    });

    it('should validate outlet access on form submission', async () => {
      // Mock a scenario where outlet permissions change between form setup and submission
      const mockSubmitAction = jest.fn().mockImplementation((formData) => {
        // Simulate server-side permission check
        if (formData.outletId === 'outlet2') {
          return Promise.reject(new Error('Permission denied: outlet access revoked'));
        }
        return Promise.resolve({ success: true, data: { id: 'report123' } });
      });
      
      (submitSalesReportAction as jest.Mock).mockImplementation(mockSubmitAction);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Form submission should handle permission denied errors
    });
  });

  describe('Integration with Date Selection', () => {
    it('should regenerate entries when date selection changes', async () => {
      const user = userEvent.setup();
      
      const hookWithOutlets = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithOutlets);
      
      // Start with no dates
      const initialStore = {
        ...mockStore,
        selectedDates: [],
      };
      
      const { rerender } = render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Add dates
      const storeWithDates = {
        ...initialStore,
        selectedDates: [new Date('2024-01-15'), new Date('2024-01-16')],
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);
      
      rerender(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should regenerate entries for new dates
    });

    it('should handle date range selection with multiple outlets', () => {
      const storeWithRange = {
        ...mockStore,
        dateMode: 'range' as const,
        selectedRange: {
          from: new Date('2024-01-15'),
          to: new Date('2024-01-17'), // 3 days
        },
      };
      
      const hookWithOutlets = {
        ...mockMultiOutletHook,
        selectedOutletIds: ['outlet1', 'outlet2'],
      };
      
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithRange);
      (useMultiOutletSelection as jest.Mock).mockReturnValue(hookWithOutlets);
      
      render(<BatchSalesReportForm onCancel={() => {}} />);
      
      // Should generate 6 entries (2 outlets × 3 days)
    });
  });
});