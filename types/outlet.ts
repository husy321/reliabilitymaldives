// Outlet status enums
export enum OutletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface Outlet {
  id: string;
  name: string;
  location: string;
  managerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships (will be populated when related models exist)
  // manager: User;
  // salesReports: SalesReport[];
}

export interface OutletFormData {
  name: string;
  location: string;
  managerId: string;
  isActive: boolean;
}

export interface OutletListTableProps {
  outlets: Outlet[];
  currentUserRole: string; // Will be typed with UserRole when available
  totalCount: number;
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onSearch: (searchTerm: string) => void;
  onEdit: (outletId: string) => void;
  onToggleActive: (outletId: string) => Promise<void>;
  loading?: boolean;
}

export interface OutletFormProps {
  outlet?: Outlet;
  onSubmit: (data: OutletFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface OutletSearchFilters {
  searchTerm?: string;
  activeOnly?: boolean;
  managerFilter?: string[];
  createdDateRange?: { from: Date; to: Date };
}

export interface GetOutletsParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  activeOnly?: boolean;
  userRole: string; // Will be typed with UserRole when available
}

export interface GetOutletsResult {
  outlets: Outlet[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Manager selection options for form dropdowns
export interface ManagerOption {
  value: string;
  label: string;
  role: string;
}

// Multi-outlet selection interfaces
export interface OutletOption {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface UseMultiOutletSelectionReturn {
  outlets: OutletOption[];
  selectedOutletIds: string[];        // Multiple selection support
  activeOutletId: string | null;      // Currently active outlet context
  isLoading: boolean;
  error: string | null;
  setSelectedOutletIds: (outletIds: string[]) => void;
  setActiveOutletId: (outletId: string | null) => void;
  refetchOutlets: () => Promise<void>;
}