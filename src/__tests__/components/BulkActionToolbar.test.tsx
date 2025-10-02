import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionToolbar, commonBulkActions } from '@/components/ui/BulkActionToolbar';
import { Send, Check, Trash2 } from 'lucide-react';

describe('BulkActionToolbar', () => {
  const mockActions = [
    {
      id: 'submit',
      label: 'Submit',
      icon: Send,
      requiresConfirmation: true,
      confirmationTitle: 'Submit Reports',
      confirmationDescription: 'Are you sure you want to submit these reports?',
    },
    {
      id: 'approve',
      label: 'Approve',
      icon: Check,
      variant: 'default' as const,
      requiresConfirmation: true,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      requiresConfirmation: true,
    },
  ];

  const defaultProps = {
    selectedItems: ['item1', 'item2'],
    totalItems: 10,
    actions: mockActions,
    isProcessing: false,
    onAction: jest.fn(),
    onSelectAll: jest.fn(),
    onClearSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should render when items are selected', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByText('of 10')).toBeInTheDocument();
    });

    it('should not render when no items selected and not processing', () => {
      const { container } = render(
        <BulkActionToolbar 
          {...defaultProps} 
          selectedItems={[]} 
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when processing even with no selection', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          selectedItems={[]} 
          isProcessing={true}
          processingStatus="Processing reports..."
        />
      );
      
      expect(screen.getByText('Processing reports...')).toBeInTheDocument();
    });
  });

  describe('Selection Display', () => {
    it('should display correct selection count', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByText('of 10')).toBeInTheDocument();
    });

    it('should show Select All button when not all items selected', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    });

    it('should not show Select All button when all items selected', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          selectedItems={Array.from({ length: 10 }, (_, i) => `item${i + 1}`)}
        />
      );
      
      expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument();
    });

    it('should show Clear button', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render primary actions as buttons', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });

    it('should render secondary actions in dropdown', () => {
      render(<BulkActionToolbar {...defaultProps} />);
      
      // Delete should be in dropdown (third action)
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      
      // Should have more actions button
      const moreButton = screen.getByRole('button', { name: '' }); // Button with MoreHorizontal icon
      expect(moreButton).toBeInTheDocument();
    });

    it('should disable actions during processing', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          isProcessing={true} 
        />
      );
      
      // Actions should not be visible during processing
      expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    });

    it('should disable specific actions when marked as disabled', () => {
      const actionsWithDisabled = [
        ...mockActions.slice(0, 1),
        {
          ...mockActions[1],
          disabled: true,
        },
      ];
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          actions={actionsWithDisabled}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: 'Approve' });
      expect(approveButton).toBeDisabled();
    });
  });

  describe('Action Execution', () => {
    it('should execute action without confirmation when not required', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn().mockResolvedValue(undefined);
      
      const actionsWithoutConfirmation = [
        {
          id: 'simple',
          label: 'Simple Action',
          icon: Check,
          requiresConfirmation: false,
        },
      ];
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          actions={actionsWithoutConfirmation}
          onAction={mockOnAction}
        />
      );
      
      const actionButton = screen.getByRole('button', { name: 'Simple Action' });
      await user.click(actionButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('simple', ['item1', 'item2']);
    });

    it('should show confirmation dialog for actions requiring confirmation', async () => {
      const user = userEvent.setup();
      
      render(<BulkActionToolbar {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);
      
      expect(screen.getByText('Submit Reports')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to submit these reports?')).toBeInTheDocument();
    });

    it('should execute action after confirmation', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn().mockResolvedValue(undefined);
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          onAction={mockOnAction}
        />
      );
      
      // Click submit button
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);
      
      // Confirm in dialog
      const confirmButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(confirmButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('submit', ['item1', 'item2']);
    });

    it('should cancel action when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn();
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          onAction={mockOnAction}
        />
      );
      
      // Click submit button
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);
      
      // Cancel in dialog
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('Selection Actions', () => {
    it('should call onSelectAll when Select All is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelectAll = jest.fn();
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          onSelectAll={mockOnSelectAll}
        />
      );
      
      const selectAllButton = screen.getByRole('button', { name: 'Select All' });
      await user.click(selectAllButton);
      
      expect(mockOnSelectAll).toHaveBeenCalled();
    });

    it('should call onClearSelection when Clear is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClearSelection = jest.fn();
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          onClearSelection={mockOnClearSelection}
        />
      );
      
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      await user.click(clearButton);
      
      expect(mockOnClearSelection).toHaveBeenCalled();
    });

    it('should disable selection buttons during processing', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          isProcessing={true}
        />
      );
      
      // Selection buttons should not be visible during processing
      expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('should show processing indicator', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          isProcessing={true}
          processingStatus="Processing 2 of 5 reports..."
        />
      );
      
      expect(screen.getByText('Processing 2 of 5 reports...')).toBeInTheDocument();
      // Should have loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show progress bar when progress provided', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          isProcessing={true}
          processingProgress={60}
          processingStatus="Processing..."
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      // Progress bar should be present (hard to test exact value without more complex setup)
      expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('should show default processing message when no status provided', () => {
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          isProcessing={true}
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Common Bulk Actions', () => {
    it('should provide predefined common actions', () => {
      expect(commonBulkActions.submit).toBeDefined();
      expect(commonBulkActions.approve).toBeDefined();
      expect(commonBulkActions.reject).toBeDefined();
      expect(commonBulkActions.delete).toBeDefined();
    });

    it('should have correct properties for submit action', () => {
      const submitAction = commonBulkActions.submit;
      
      expect(submitAction.id).toBe('submit');
      expect(submitAction.label).toBe('Submit');
      expect(submitAction.requiresConfirmation).toBe(true);
      expect(submitAction.confirmationTitle).toBe('Submit Reports');
    });

    it('should have correct properties for delete action', () => {
      const deleteAction = commonBulkActions.delete;
      
      expect(deleteAction.id).toBe('delete');
      expect(deleteAction.label).toBe('Delete');
      expect(deleteAction.variant).toBe('destructive');
      expect(deleteAction.requiresConfirmation).toBe(true);
    });
  });

  describe('Dropdown Menu', () => {
    it('should open dropdown menu for secondary actions', async () => {
      const user = userEvent.setup();
      
      render(<BulkActionToolbar {...defaultProps} />);
      
      // Find and click the more actions button (has MoreHorizontal icon)
      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);
      
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should execute action from dropdown menu', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn().mockResolvedValue(undefined);
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          onAction={mockOnAction}
        />
      );
      
      // Open dropdown
      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);
      
      // Click delete action
      await waitFor(() => {
        const deleteItem = screen.getByText('Delete');
        user.click(deleteItem);
      });
      
      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle action execution errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn().mockRejectedValue(new Error('Action failed'));
      
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const actionsWithoutConfirmation = [
        {
          id: 'failing',
          label: 'Failing Action',
          icon: Check,
          requiresConfirmation: false,
        },
      ];
      
      render(
        <BulkActionToolbar 
          {...defaultProps} 
          actions={actionsWithoutConfirmation}
          onAction={mockOnAction}
        />
      );
      
      const actionButton = screen.getByRole('button', { name: 'Failing Action' });
      await user.click(actionButton);
      
      expect(mockOnAction).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to execute bulk action failing:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});