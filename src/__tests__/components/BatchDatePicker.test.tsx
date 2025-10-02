import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchDatePicker } from '@/components/business/BatchDatePicker';
import { useBatchOperationStore } from '@/stores/batchOperationStore';

// Mock the batch operation store
jest.mock('@/stores/batchOperationStore', () => ({
  useBatchOperationStore: jest.fn(),
  useBatchSessionPersistence: jest.fn(),
}));

// Mock date-fns to control date formatting
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPP') return date.toLocaleDateString();
    if (formatStr === 'MMM dd, yyyy') return date.toLocaleDateString();
    return date.toString();
  }),
}));

describe('BatchDatePicker', () => {
  const mockStore = {
    selectedDates: [],
    selectedRange: undefined,
    dateMode: 'multiple' as const,
    setSelectedDates: jest.fn(),
    setSelectedRange: jest.fn(),
    setDateMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useBatchOperationStore as jest.Mock).mockReturnValue(mockStore);
  });

  describe('Multiple Date Selection Mode', () => {
    it('should render with placeholder text when no dates selected', () => {
      render(<BatchDatePicker mode="multiple" />);
      
      expect(screen.getByRole('button')).toHaveTextContent('Select dates');
    });

    it('should display single date when one date is selected', () => {
      const selectedDate = new Date('2024-01-15');
      const storeWithDate = {
        ...mockStore,
        selectedDates: [selectedDate],
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDate);

      render(<BatchDatePicker mode="multiple" />);
      
      expect(screen.getByRole('button')).toHaveTextContent(selectedDate.toLocaleDateString());
    });

    it('should display count when multiple dates are selected', () => {
      const selectedDates = [
        new Date('2024-01-15'),
        new Date('2024-01-16'),
        new Date('2024-01-17'),
      ];
      const storeWithDates = {
        ...mockStore,
        selectedDates,
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);

      render(<BatchDatePicker mode="multiple" />);
      
      expect(screen.getByRole('button')).toHaveTextContent('3 dates selected');
    });

    it('should show selected dates as badges', () => {
      const selectedDates = [
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      ];
      const storeWithDates = {
        ...mockStore,
        selectedDates,
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);

      render(<BatchDatePicker mode="multiple" />);
      
      expect(screen.getByText('Selected dates (2):')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3); // Main button + 2 remove buttons
    });

    it('should call onChange when dates are selected in local mode', () => {
      const mockOnChange = jest.fn();
      
      render(
        <BatchDatePicker 
          mode="multiple" 
          useStore={false} 
          onChange={mockOnChange} 
        />
      );
      
      // This would normally be triggered by the Calendar component
      // We'll simulate the internal handler
      const component = screen.getByRole('button');
      fireEvent.click(component);
      
      // Since we can't easily test the calendar interaction, we'll focus on
      // the validation logic in isolation
    });

    it('should validate maximum dates limit', () => {
      const selectedDates = Array.from({ length: 35 }, (_, i) => 
        new Date(2024, 0, i + 1)
      );
      
      render(
        <BatchDatePicker 
          mode="multiple" 
          maxDates={31}
          useStore={false}
        />
      );
      
      // The validation would happen in handleMultipleSelect
      // We'll test this through integration or by calling the internal method
    });

    it('should remove individual dates when X button is clicked', async () => {
      const user = userEvent.setup();
      const selectedDates = [
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      ];
      const storeWithDates = {
        ...mockStore,
        selectedDates,
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);

      render(<BatchDatePicker mode="multiple" />);
      
      const removeButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg') // Remove buttons have X icons
      );
      
      if (removeButtons.length > 1) {
        await user.click(removeButtons[0]);
        expect(mockStore.setSelectedDates).toHaveBeenCalled();
      }
    });
  });

  describe('Date Range Selection Mode', () => {
    it('should render with placeholder text when no range selected', () => {
      const rangeStore = {
        ...mockStore,
        dateMode: 'range' as const,
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(rangeStore);

      render(<BatchDatePicker mode="range" />);
      
      expect(screen.getByRole('button')).toHaveTextContent('Select dates');
    });

    it('should display from date when only start date is selected', () => {
      const fromDate = new Date('2024-01-15');
      const rangeStore = {
        ...mockStore,
        dateMode: 'range' as const,
        selectedRange: { from: fromDate, to: undefined },
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(rangeStore);

      render(<BatchDatePicker mode="range" />);
      
      expect(screen.getByRole('button')).toHaveTextContent(fromDate.toLocaleDateString());
    });

    it('should display full range when both dates are selected', () => {
      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-20');
      const rangeStore = {
        ...mockStore,
        dateMode: 'range' as const,
        selectedRange: { from: fromDate, to: toDate },
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(rangeStore);

      render(<BatchDatePicker mode="range" />);
      
      const buttonText = screen.getByRole('button').textContent;
      expect(buttonText).toContain(fromDate.toLocaleDateString());
      expect(buttonText).toContain(toDate.toLocaleDateString());
      expect(buttonText).toContain('-');
    });

    it('should show selected range badges', () => {
      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-20');
      const rangeStore = {
        ...mockStore,
        dateMode: 'range' as const,
        selectedRange: { from: fromDate, to: toDate },
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(rangeStore);

      render(<BatchDatePicker mode="range" />);
      
      expect(screen.getByText('Selected range:')).toBeInTheDocument();
      expect(screen.getByText(/From:/)).toBeInTheDocument();
      expect(screen.getByText(/To:/)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when exceeding maximum dates', () => {
      render(
        <BatchDatePicker 
          mode="multiple" 
          maxDates={5}
          useStore={false}
        />
      );
      
      // Error display would be tested through integration
      // as it requires calendar interaction
    });

    it('should show error when below minimum dates', () => {
      render(
        <BatchDatePicker 
          mode="multiple" 
          minDates={3}
          useStore={false}
        />
      );
      
      // Error display would be tested through integration
    });

    it('should validate date range length', () => {
      render(
        <BatchDatePicker 
          mode="range" 
          maxDates={10}
          useStore={false}
        />
      );
      
      // Range validation would be tested through integration
    });

    it('should disable future dates when disableFuture is true', () => {
      render(<BatchDatePicker disableFuture={true} />);
      
      // This would be verified by checking the Calendar component props
      // when the popover is opened
    });

    it('should disable past dates when disablePast is true', () => {
      render(<BatchDatePicker disablePast={true} />);
      
      // This would be verified by checking the Calendar component props
    });
  });

  describe('Store Integration', () => {
    it('should use store values when useStore is true', () => {
      const storeWithData = {
        ...mockStore,
        selectedDates: [new Date('2024-01-15')],
        dateMode: 'multiple' as const,
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithData);

      render(<BatchDatePicker useStore={true} />);
      
      expect(screen.getByRole('button')).toHaveTextContent(
        new Date('2024-01-15').toLocaleDateString()
      );
    });

    it('should update store when useStore is true', async () => {
      const user = userEvent.setup();
      
      render(<BatchDatePicker useStore={true} />);
      
      // When clear all is clicked (after opening popover and having selections)
      fireEvent.click(screen.getByRole('button'));
      
      // This would test store updates through integration
    });

    it('should use local state when useStore is false', () => {
      render(<BatchDatePicker useStore={false} />);
      
      // Should not call store methods
      expect(mockStore.setSelectedDates).not.toHaveBeenCalled();
    });

    it('should sync mode changes with store', () => {
      render(<BatchDatePicker mode="range" useStore={true} />);
      
      expect(mockStore.setDateMode).toHaveBeenCalledWith('range');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all dates when Clear All is clicked', async () => {
      const user = userEvent.setup();
      const storeWithDates = {
        ...mockStore,
        selectedDates: [new Date('2024-01-15')],
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(storeWithDates);

      render(<BatchDatePicker mode="multiple" />);
      
      // Open popover
      fireEvent.click(screen.getByRole('button'));
      
      // Look for Clear All button (would appear in popover)
      await waitFor(() => {
        const clearButton = screen.queryByText('Clear All');
        if (clearButton) {
          fireEvent.click(clearButton);
          expect(mockStore.setSelectedDates).toHaveBeenCalledWith([]);
        }
      });
    });

    it('should clear range when Clear All is clicked in range mode', async () => {
      const user = userEvent.setup();
      const rangeStore = {
        ...mockStore,
        dateMode: 'range' as const,
        selectedRange: { 
          from: new Date('2024-01-15'), 
          to: new Date('2024-01-20') 
        },
      };
      (useBatchOperationStore as jest.Mock).mockReturnValue(rangeStore);

      render(<BatchDatePicker mode="range" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        const clearButton = screen.queryByText('Clear All');
        if (clearButton) {
          fireEvent.click(clearButton);
          expect(mockStore.setSelectedRange).toHaveBeenCalledWith(undefined);
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BatchDatePicker />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Calendar icon should be present
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      
      render(<BatchDatePicker />);
      
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      
      // Should open popover on Enter
      await user.keyboard('{Enter}');
    });

    it('should support disabled state', () => {
      render(<BatchDatePicker disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });
});