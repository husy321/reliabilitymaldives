import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentSearch from '@/components/business/DocumentSearch';

// Mock useDebounce hook
jest.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: any, delay: number) => value, // Return value immediately for testing
}));

describe('DocumentSearch Component', () => {
  const mockOnSearch = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        placeholder="Search documents..."
      />
    );

    const input = screen.getByPlaceholderText('Search documents...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls onSearch when user types in search input', async () => {
    const user = userEvent.setup();
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const input = screen.getByPlaceholderText('Search by filename...');
    await user.type(input, 'test document');

    expect(mockOnSearch).toHaveBeenCalledWith('test document');
  });

  it('shows clear button when search has value', async () => {
    const user = userEvent.setup();
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const input = screen.getByPlaceholderText('Search by filename...');
    await user.type(input, 'test');

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('calls onClear and clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const input = screen.getByPlaceholderText('Search by filename...');
    await user.type(input, 'test');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('initializes with provided initial value', () => {
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        initialValue="initial search"
      />
    );

    const input = screen.getByDisplayValue('initial search');
    expect(input).toBeInTheDocument();
  });

  it('does not show clear button when input is empty', () => {
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('calls onSearch with empty string when cleared', async () => {
    const user = userEvent.setup();
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        initialValue="test"
      />
    );

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('handles keyboard events correctly', async () => {
    const user = userEvent.setup();
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const input = screen.getByPlaceholderText('Search by filename...');
    
    await user.type(input, 'test');
    await user.clear(input);
    
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('applies custom placeholder', () => {
    const customPlaceholder = 'Find your documents...';
    render(
      <DocumentSearch
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });
});