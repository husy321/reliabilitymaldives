export interface Staff {
  id: string
  employeeId: string
  name: string
  department: string
  shiftSchedule: string
  isActive: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface CreateStaffRequest {
  employeeId: string
  name: string
  department: string
  shiftSchedule: string
  userId: string
  isActive?: boolean
}

export interface UpdateStaffRequest {
  id: string
  employeeId?: string
  name?: string
  department?: string
  shiftSchedule?: string
  isActive?: boolean
}

export interface StaffSearchParams {
  query?: string
  department?: string
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: 'name' | 'department' | 'employeeId' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface StaffSearchResult {
  staff: Staff[]
  total: number
  page: number
  limit: number
  totalPages: number
}