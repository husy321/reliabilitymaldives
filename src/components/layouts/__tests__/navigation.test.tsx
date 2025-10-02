import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Navigation from '../navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Navigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation for ADMIN role with all menu items', () => {
    render(<Navigation userRole="ADMIN" />);
    
    // Admin should see all navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Receivables')).toBeInTheDocument();
    expect(screen.getByText('Sales Reports')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('renders filtered navigation for SALES role', () => {
    render(<Navigation userRole="SALES" />);
    
    // Sales should only see Dashboard and Sales Reports
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Receivables')).not.toBeInTheDocument();
    expect(screen.getByText('Sales Reports')).toBeInTheDocument();
    expect(screen.queryByText('HR')).not.toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
  });

  it('renders filtered navigation for ACCOUNTS role', () => {
    render(<Navigation userRole="ACCOUNTS" />);
    
    // Accounts should see Dashboard, Receivables, and Invoices
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Receivables')).toBeInTheDocument();
    expect(screen.queryByText('Sales Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('HR')).not.toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('renders filtered navigation for MANAGER role', () => {
    render(<Navigation userRole="MANAGER" />);
    
    // Manager should see most items except User Management
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Receivables')).toBeInTheDocument();
    expect(screen.getByText('Sales Reports')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    mockUsePathname.mockReturnValue('/receivables');
    render(<Navigation userRole="ADMIN" />);
    
    const receivablesLink = screen.getByText('Receivables').closest('a');
    expect(receivablesLink).toHaveClass('bg-gray-100', 'text-gray-900');
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('text-gray-700', 'hover:bg-gray-50');
  });

  it('renders mobile navigation trigger', () => {
    render(<Navigation userRole="ADMIN" />);
    
    // Mobile menu button should be present
    const mobileMenuButton = screen.getByRole('button');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('renders company name in desktop navigation', () => {
    render(<Navigation userRole="ADMIN" />);
    
    expect(screen.getByText('Reliability Maldives')).toBeInTheDocument();
  });

  it('includes proper link hrefs', () => {
    render(<Navigation userRole="ADMIN" />);
    
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Receivables').closest('a')).toHaveAttribute('href', '/receivables');
    expect(screen.getByText('Sales Reports').closest('a')).toHaveAttribute('href', '/sales-reports');
    expect(screen.getByText('HR').closest('a')).toHaveAttribute('href', '/hr');
    expect(screen.getByText('User Management').closest('a')).toHaveAttribute('href', '/users');
    expect(screen.getByText('Invoices').closest('a')).toHaveAttribute('href', '/invoices');
  });

  it('renders navigation icons', () => {
    render(<Navigation userRole="ADMIN" />);
    
    // Check that each navigation item has an icon (SVG element)
    const navigationItems = [
      'Dashboard',
      'Receivables',
      'Sales Reports',
      'HR',
      'User Management',
      'Invoices'
    ];
    
    navigationItems.forEach(itemText => {
      const linkElement = screen.getByText(itemText).closest('a');
      const icon = linkElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});