import { renderHook, act, waitFor } from '@testing-library/react';

// Mock all dependencies at the module level
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showError: jest.fn(),
  }),
}));

jest.mock('@/lib/actions/sales-reports', () => ({
  getUserOutletsAction: jest.fn(),
}));

jest.mock('@/stores/outletContextStore', () => ({
  useOutletContextStore: jest.fn(),
}));

// Import after mocking
import { useMultiOutletSelection } from '@/hooks/useMultiOutletSelection';
import { useToast } from '@/hooks/useToast';
import { getUserOutletsAction } from '@/lib/actions/sales-reports';
import { useOutletContextStore } from '@/stores/outletContextStore';

const mockShowError = jest.fn();
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

describe('useMultiOutletSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
    });
    
    (useOutletContextStore as jest.Mock).mockReturnValue({
      selectedOutletIds: [],
      activeOutletId: null,
      setSelectedOutletIds: mockSetSelectedOutletIds,
      setActiveOutletId: mockSetActiveOutletId,
    });
    
    (getUserOutletsAction as jest.Mock).mockResolvedValue({
      success: true,
      data: mockOutlets,
    });
  });

  it('should fetch outlets on mount', async () => {
    const { result } = renderHook(() => useMultiOutletSelection());

    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getUserOutletsAction).toHaveBeenCalled();
    expect(result.current.outlets).toEqual(mockOutlets);
    expect(result.current.error).toBe(null);
  });

  it('should auto-select single outlet when only one available', async () => {
    const singleOutlet = [mockOutlets[0]];
    (getUserOutletsAction as jest.Mock).mockResolvedValue({
      success: true,
      data: singleOutlet,
    });

    renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-1']);
    });
  });

  it('should use default outlet IDs when provided and no current selection', async () => {
    const defaultOutletIds = ['outlet-1', 'outlet-2'];
    
    renderHook(() => useMultiOutletSelection(defaultOutletIds));

    await waitFor(() => {
      expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(defaultOutletIds);
    });
  });

  it('should filter out inactive outlets from default selection', async () => {
    const defaultOutletIds = ['outlet-1', 'outlet-3']; // outlet-3 is inactive
    
    renderHook(() => useMultiOutletSelection(defaultOutletIds));

    await waitFor(() => {
      expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-1']);
    });
  });

  it('should validate selected outlets and remove inactive ones', async () => {
    // Mock store with selected outlets including inactive one
    (useOutletContextStore as jest.Mock).mockReturnValue({
      selectedOutletIds: ['outlet-1', 'outlet-3'], // outlet-3 is inactive
      activeOutletId: 'outlet-3',
      setSelectedOutletIds: mockSetSelectedOutletIds,
      setActiveOutletId: mockSetActiveOutletId,
    });

    renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(mockSetSelectedOutletIds).toHaveBeenCalledWith(['outlet-1']);
    });
  });

  it('should handle fetch error gracefully', async () => {
    const errorMessage = 'Failed to fetch outlets';
    (getUserOutletsAction as jest.Mock).mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(mockShowError).toHaveBeenCalledWith(errorMessage, { title: 'Failed to load outlets' });
  });

  it('should handle network error gracefully', async () => {
    const networkError = new Error('Network error');
    (getUserOutletsAction as jest.Mock).mockRejectedValue(networkError);

    const { result } = renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(mockShowError).toHaveBeenCalledWith('Network error', { title: 'Error loading outlets' });
  });

  it('should refetch outlets when refetchOutlets is called', async () => {
    const { result } = renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    (getUserOutletsAction as jest.Mock).mockClear();

    await act(async () => {
      await result.current.refetchOutlets();
    });

    expect(getUserOutletsAction).toHaveBeenCalledTimes(1);
  });

  it('should return correct interface properties', async () => {
    (useOutletContextStore as jest.Mock).mockReturnValue({
      selectedOutletIds: ['outlet-1', 'outlet-2'],
      activeOutletId: 'outlet-1',
      setSelectedOutletIds: mockSetSelectedOutletIds,
      setActiveOutletId: mockSetActiveOutletId,
    });

    const { result } = renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('outlets');
    expect(result.current).toHaveProperty('selectedOutletIds');
    expect(result.current).toHaveProperty('activeOutletId');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('setSelectedOutletIds');
    expect(result.current).toHaveProperty('setActiveOutletId');
    expect(result.current).toHaveProperty('refetchOutlets');

    expect(result.current.selectedOutletIds).toEqual(['outlet-1', 'outlet-2']);
    expect(result.current.activeOutletId).toBe('outlet-1');
  });

  it('should update active outlet when current active is not in selected outlets', async () => {
    // Mock store with active outlet not in selected outlets
    (useOutletContextStore as jest.Mock).mockReturnValue({
      selectedOutletIds: ['outlet-1', 'outlet-2'],
      activeOutletId: 'outlet-3', // Not in selected outlets
      setSelectedOutletIds: mockSetSelectedOutletIds,
      setActiveOutletId: mockSetActiveOutletId,
    });

    renderHook(() => useMultiOutletSelection());

    await waitFor(() => {
      expect(mockSetActiveOutletId).toHaveBeenCalledWith('outlet-1');
    });
  });
});