import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the hook
jest.mock('@/hooks/useMultiOutletSelection', () => ({
  useMultiOutletSelection: jest.fn(),
}));

import { OutletContextSwitcher } from '@/components/business/OutletContextSwitcher';
import { useMultiOutletSelection } from '@/hooks/useMultiOutletSelection';

const mockSetSelectedOutletIds = jest.fn();
const mockSetActiveOutletId = jest.fn();

const mockOutlets = [
  {
    id: 'outlet-1',
    name: 'Downtown Store',
    location: 'Downtown District',
    isActive: true,
  },
  {
    id: 'outlet-2', 
    name: 'Mall Store',
    location: 'Shopping Mall',
    isActive: true,
  },
  {
    id: 'outlet-3',
    name: 'Airport Store',
    location: 'Airport Terminal',
    isActive: false,
  },
];

const mockHookReturn = {
  outlets: mockOutlets,
  selectedOutletIds: ['outlet-1', 'outlet-2'],
  activeOutletId: 'outlet-1',
  isLoading: false,
  error: null,
  setSelectedOutletIds: mockSetSelectedOutletIds,
  setActiveOutletId: mockSetActiveOutletId,
  refetchOutlets: jest.fn(),
};

describe('OutletContextSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMultiOutletSelection as jest.Mock).mockReturnValue(mockHookReturn);
  });

  it('should render loading state', () => {
    (useMultiOutletSelection as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
    });

    render(<OutletContextSwitcher />);

    expect(screen.getByText('Loading outlets...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useMultiOutletSelection as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      error: 'Failed to load outlets',
      outlets: [],
    });

    render(<OutletContextSwitcher />);

    expect(screen.getByText('Failed to load outlets')).toBeInTheDocument();
  });

  it('should render single outlet mode when only one outlet available', () => {
    (useMultiOutletSelection as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      outlets: [mockOutlets[0]],
      selectedOutletIds: ['outlet-1'],
      activeOutletId: 'outlet-1',
    });

    render(<OutletContextSwitcher />);

    expect(screen.getByText('Downtown Store')).toBeInTheDocument();
    expect(screen.getByText('Downtown District')).toBeInTheDocument();
    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
  });

  it('should render single outlet mode when showMultiSelect is false', () => {
    render(<OutletContextSwitcher showMultiSelect={false} />);

    expect(screen.getByText('Downtown Store')).toBeInTheDocument();
    expect(screen.getByText('Downtown District')).toBeInTheDocument();
    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
  });

  it('should display active outlet information', () => {
    render(<OutletContextSwitcher />);

    expect(screen.getByText('Downtown Store')).toBeInTheDocument();
    expect(screen.getByText('Downtown District')).toBeInTheDocument();
    expect(screen.getByText('2 outlets selected')).toBeInTheDocument();
  });

  it('should show manage button when multiple outlets selected', () => {
    render(<OutletContextSwitcher />);

    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('should open outlet selection popup when manage button clicked', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    expect(screen.getByText('Select Outlets')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should display all outlets in selection popup with correct states', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    // Check outlet names are displayed
    expect(screen.getByText('Downtown Store')).toBeInTheDocument();
    expect(screen.getByText('Mall Store')).toBeInTheDocument();
    expect(screen.getByText('Airport Store')).toBeInTheDocument();

    // Check active outlet has badge
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Check checkboxes states
    const downtownCheckbox = screen.getByRole('checkbox', { name: /downtown store/i });
    const mallCheckbox = screen.getByRole('checkbox', { name: /mall store/i });
    const airportCheckbox = screen.getByRole('checkbox', { name: /airport store/i });

    expect(downtownCheckbox).toBeChecked();
    expect(mallCheckbox).toBeChecked();
    expect(airportCheckbox).not.toBeChecked();
    expect(airportCheckbox).toBeDisabled(); // Inactive outlet should be disabled
  });

  it('should handle outlet selection changes', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    const mallCheckbox = screen.getByRole('checkbox', { name: /mall store/i });
    await user.click(mallCheckbox);

    expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-1']); // Removed outlet-2
  });

  it('should handle select all functionality', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    const allButton = screen.getByText('All');
    await user.click(allButton);

    expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-1', 'outlet-2']); // Only active outlets
  });

  it('should handle clear all functionality', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(mockSetSelectedOutletIds).toHaveBeenCalledWith([]);
    expect(mockSetActiveOutletId).toHaveBeenCalledWith(null);
  });

  it('should show outlet switcher when multiple outlets selected', () => {
    render(<OutletContextSwitcher />);

    expect(screen.getByText('Switch Active Outlet')).toBeInTheDocument();
  });

  it('should handle active outlet switching', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    // Click on the select trigger
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    // Wait for dropdown to appear and click Mall Store option
    await waitFor(() => {
      expect(screen.getByText('Mall Store')).toBeVisible();
    });

    const mallOption = screen.getByRole('option', { name: /mall store/i });
    await user.click(mallOption);

    expect(mockSetActiveOutletId).toHaveBeenCalledWith('outlet-2');
  });

  it('should call callback functions when provided', async () => {
    const mockOnActiveOutletChange = jest.fn();
    const mockOnSelectedOutletsChange = jest.fn();
    const user = userEvent.setup();

    render(
      <OutletContextSwitcher
        onActiveOutletChange={mockOnActiveOutletChange}
        onSelectedOutletsChange={mockOnSelectedOutletsChange}
      />
    );

    // Test active outlet change callback
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getByText('Mall Store')).toBeVisible();
    });

    const mallOption = screen.getByRole('option', { name: /mall store/i });
    await user.click(mallOption);

    expect(mockOnActiveOutletChange).toHaveBeenCalledWith('outlet-2');

    // Test selected outlets change callback
    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    const mallCheckbox = screen.getByRole('checkbox', { name: /mall store/i });
    await user.click(mallCheckbox);

    expect(mockOnSelectedOutletsChange).toHaveBeenCalledWith(['outlet-1']);
  });

  it('should switch active outlet when unchecking currently active outlet', async () => {
    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    // Uncheck the active outlet (Downtown Store)
    const downtownCheckbox = screen.getByRole('checkbox', { name: /downtown store/i });
    await user.click(downtownCheckbox);

    expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-2']);
    expect(mockSetActiveOutletId).toHaveBeenCalledWith('outlet-2'); // Should switch to Mall Store
  });

  it('should clear active outlet when no outlets selected', async () => {
    // Start with only one outlet selected
    (useMultiOutletSelection as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      selectedOutletIds: ['outlet-1'],
      activeOutletId: 'outlet-1',
    });

    const user = userEvent.setup();
    render(<OutletContextSwitcher />);

    const manageButton = screen.getByText('Manage');
    await user.click(manageButton);

    // Uncheck the only selected outlet
    const downtownCheckbox = screen.getByRole('checkbox', { name: /downtown store/i });
    await user.click(downtownCheckbox);

    expect(mockSetSelectedOutletIds).toHaveBeenCalledWith([]);
    expect(mockSetActiveOutletId).toHaveBeenCalledWith(null);
  });
});