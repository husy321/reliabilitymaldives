import { render, screen } from '@testing-library/react';
import DashboardLayout from '../dashboard-layout';

// Mock child components
jest.mock('../navigation', () => {
  return function MockNavigation({ userRole }: { userRole: string }) {
    return <div data-testid="navigation">Navigation for {userRole}</div>;
  };
});

jest.mock('../user-profile', () => {
  return function MockUserProfile({ user }: { user: { name: string } }) {
    return <div data-testid="user-profile">Profile for {user.name}</div>;
  };
});

jest.mock('../../business/notifications/notification-area', () => {
  return function MockNotificationArea() {
    return <div data-testid="notification-area">Notifications</div>;
  };
});

jest.mock('../../business/dashboard/dashboard-widgets', () => {
  return function MockDashboardWidgets({ userRole }: { userRole: string }) {
    return <div data-testid="dashboard-widgets">Widgets for {userRole}</div>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

describe('DashboardLayout', () => {
  const mockUser = {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'ADMIN',
  };

  it('renders all main layout components', () => {
    render(<DashboardLayout user={mockUser} />);
    
    // Check that all main components are rendered
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.getByTestId('notification-area')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-widgets')).toBeInTheDocument();
  });

  it('displays dashboard title and user role badge', () => {
    render(<DashboardLayout user={mockUser} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('displays welcome message with user name', () => {
    render(<DashboardLayout user={mockUser} />);
    
    expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument();
    expect(screen.getByText('Here\'s your dashboard overview. Access your modules through the navigation sidebar.')).toBeInTheDocument();
  });

  it('passes user role to navigation component', () => {
    render(<DashboardLayout user={mockUser} />);
    
    expect(screen.getByText('Navigation for ADMIN')).toBeInTheDocument();
  });

  it('passes user object to user profile component', () => {
    render(<DashboardLayout user={mockUser} />);
    
    expect(screen.getByText('Profile for John Doe')).toBeInTheDocument();
  });

  it('passes user role to dashboard widgets component', () => {
    render(<DashboardLayout user={mockUser} />);
    
    expect(screen.getByText('Widgets for ADMIN')).toBeInTheDocument();
  });

  it('applies correct layout structure classes', () => {
    const { container } = render(<DashboardLayout user={mockUser} />);
    
    // Check for main layout classes
    expect(container.querySelector('.min-h-screen.bg-gray-50')).toBeInTheDocument();
    expect(container.querySelector('.flex')).toBeInTheDocument();
    expect(container.querySelector('.flex-1.lg\\:ml-64')).toBeInTheDocument();
  });

  it('has sticky header with proper styling', () => {
    const { container } = render(<DashboardLayout user={mockUser} />);
    
    const stickyHeader = container.querySelector('.sticky.top-0.z-10.bg-white.border-b.border-gray-200');
    expect(stickyHeader).toBeInTheDocument();
  });

  it('renders welcome card with proper styling', () => {
    render(<DashboardLayout user={mockUser} />);
    
    const welcomeCard = screen.getByText('Welcome back, John Doe!').closest('.mb-6');
    expect(welcomeCard).toBeInTheDocument();
  });

  it('renders different user roles correctly', () => {
    const salesUser = { ...mockUser, role: 'SALES', name: 'Jane Sales' };
    render(<DashboardLayout user={salesUser} />);
    
    expect(screen.getByText('SALES')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Jane Sales!')).toBeInTheDocument();
    expect(screen.getByText('Navigation for SALES')).toBeInTheDocument();
    expect(screen.getByText('Widgets for SALES')).toBeInTheDocument();
  });

  it('applies responsive padding classes', () => {
    const { container } = render(<DashboardLayout user={mockUser} />);
    
    // Check for responsive padding classes
    const headerPadding = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
    const contentPadding = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8.py-6');
    
    expect(headerPadding).toBeInTheDocument();
    expect(contentPadding).toBeInTheDocument();
  });
});