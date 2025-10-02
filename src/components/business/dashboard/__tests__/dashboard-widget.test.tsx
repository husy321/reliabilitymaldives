import { render, screen } from '@testing-library/react';
import { BarChart3 } from 'lucide-react';
import DashboardWidget from '../dashboard-widget';

describe('DashboardWidget', () => {
  const mockProps = {
    title: 'Test Widget',
    children: <div>Test Content</div>,
  };

  it('renders widget with title and content', () => {
    render(<DashboardWidget {...mockProps} />);
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with icon when provided', () => {
    render(<DashboardWidget {...mockProps} icon={BarChart3} />);
    
    const icon = screen.getByText('Test Widget').parentElement?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DashboardWidget {...mockProps} loading={true} />);
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    // Check for the spinning loader by class
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Something went wrong';
    render(<DashboardWidget {...mockProps} error={errorMessage} />);
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('applies hover styles', () => {
    render(<DashboardWidget {...mockProps} />);
    
    const card = screen.getByText('Test Widget').closest('.hover\\:shadow-md');
    expect(card).toBeInTheDocument();
  });
});