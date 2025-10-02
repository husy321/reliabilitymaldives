import { render, screen } from '@testing-library/react';
import DashboardWidgets from '../dashboard-widgets';

// Mock the DashboardWidget component to simplify testing
jest.mock('../dashboard-widget', () => {
  return function MockDashboardWidget({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div data-testid="dashboard-widget">
        <h3>{title}</h3>
        {children}
      </div>
    );
  };
});

describe('DashboardWidgets', () => {
  it('renders widgets for ADMIN role', () => {
    render(<DashboardWidgets userRole="ADMIN" />);
    
    // Admin should see all widgets
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Receivables Summary')).toBeInTheDocument();
    expect(screen.getByText('Sales Performance')).toBeInTheDocument();
    expect(screen.getByText('HR Overview')).toBeInTheDocument();
    expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
    expect(screen.getByText('User Activity')).toBeInTheDocument();
  });

  it('renders widgets for SALES role', () => {
    render(<DashboardWidgets userRole="SALES" />);
    
    // Sales should only see sales-related widgets
    expect(screen.queryByText('System Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Receivables Summary')).not.toBeInTheDocument();
    expect(screen.getByText('Sales Performance')).toBeInTheDocument();
    expect(screen.queryByText('HR Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
  });

  it('renders widgets for ACCOUNTS role', () => {
    render(<DashboardWidgets userRole="ACCOUNTS" />);
    
    // Accounts should see financial widgets
    expect(screen.queryByText('System Overview')).not.toBeInTheDocument();
    expect(screen.getByText('Receivables Summary')).toBeInTheDocument();
    expect(screen.queryByText('Sales Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('HR Overview')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
    expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
  });

  it('renders widgets for MANAGER role', () => {
    render(<DashboardWidgets userRole="MANAGER" />);
    
    // Manager should see overview and management widgets
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Receivables Summary')).toBeInTheDocument();
    expect(screen.getByText('Sales Performance')).toBeInTheDocument();
    expect(screen.getByText('HR Overview')).toBeInTheDocument();
    expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
    expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
  });

  it('renders widgets for ACCOUNTANT role', () => {
    render(<DashboardWidgets userRole="ACCOUNTANT" />);
    
    // Accountant should see financial widgets
    expect(screen.queryByText('System Overview')).not.toBeInTheDocument();
    expect(screen.getByText('Receivables Summary')).toBeInTheDocument();
    expect(screen.queryByText('Sales Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('HR Overview')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
    expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
  });

  it('renders widgets in correct priority order', () => {
    render(<DashboardWidgets userRole="ADMIN" />);
    
    const widgets = screen.getAllByTestId('dashboard-widget');
    const widgetTitles = widgets.map(widget => 
      widget.querySelector('h3')?.textContent
    );
    
    // Check that System Overview (priority 1) comes before User Activity (priority 6)
    const systemOverviewIndex = widgetTitles.indexOf('System Overview');
    const userActivityIndex = widgetTitles.indexOf('User Activity');
    expect(systemOverviewIndex).toBeLessThan(userActivityIndex);
  });

  it('applies responsive grid layout classes', () => {
    const { container } = render(<DashboardWidgets userRole="ADMIN" />);
    
    const gridContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    expect(gridContainer).toBeInTheDocument();
  });
});