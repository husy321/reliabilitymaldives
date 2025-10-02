import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { 
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
  getStaffByIdAction,
  searchStaffAction
} from '../../actions/staffActions';
import { staffService } from '../../services/staffService';
import type { CreateStaffRequest, UpdateStaffRequest, Staff } from '../../../types/staff';

// Mock dependencies
jest.mock('next-auth');
jest.mock('next/cache');
jest.mock('../../services/staffService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('Staff Actions', () => {
  const mockAdminSession = {
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'ADMIN'
    }
  };

  const mockNonAdminSession = {
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@company.com',
      name: 'Regular User',
      role: 'SALES'
    }
  };

  const mockStaff: Staff = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    employeeId: 'EMP001',
    name: 'John Doe',
    department: 'IT',
    shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
    isActive: true,
    userId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@company.com',
      name: 'John Doe',
      role: 'ADMIN'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStaffAction', () => {
    const createRequest: CreateStaffRequest = {
      employeeId: 'EMP001',
      name: 'John Doe',
      department: 'IT',
      shiftSchedule: 'Day Shift (9:00 AM - 5:00 PM)',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      isActive: true
    };

    it('should create staff successfully with admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.createStaff.mockResolvedValueOnce(mockStaff);

      const result = await createStaffAction(createRequest);

      expect(result).toEqual({ success: true, data: mockStaff });
      expect(mockStaffService.createStaff).toHaveBeenCalledWith(createRequest);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/staff');
    });

    it('should fail without authentication', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await createStaffAction(createRequest);

      expect(result).toEqual({ 
        success: false, 
        error: 'Authentication required' 
      });
      expect(mockStaffService.createStaff).not.toHaveBeenCalled();
    });

    it('should fail without admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockNonAdminSession);

      const result = await createStaffAction(createRequest);

      expect(result).toEqual({ 
        success: false, 
        error: 'Admin access required' 
      });
      expect(mockStaffService.createStaff).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.createStaff.mockRejectedValueOnce(new Error('Database error'));

      const result = await createStaffAction(createRequest);

      expect(result).toEqual({ 
        success: false, 
        error: 'Database error' 
      });
    });
  });

  describe('updateStaffAction', () => {
    const updateRequest: UpdateStaffRequest = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      name: 'John Smith'
    };

    it('should update staff successfully with admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      const updatedStaff = { ...mockStaff, name: 'John Smith' };
      mockStaffService.updateStaff.mockResolvedValueOnce(updatedStaff);

      const result = await updateStaffAction(updateRequest);

      expect(result).toEqual({ success: true, data: updatedStaff });
      expect(mockStaffService.updateStaff).toHaveBeenCalledWith(updateRequest);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/staff');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/staff/${updatedStaff.id}`);
    });

    it('should fail without admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockNonAdminSession);

      const result = await updateStaffAction(updateRequest);

      expect(result).toEqual({ 
        success: false, 
        error: 'Admin access required' 
      });
    });
  });

  describe('deleteStaffAction', () => {
    const staffId = '223e4567-e89b-12d3-a456-426614174000';

    it('should delete staff successfully with admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.deleteStaff.mockResolvedValueOnce();

      const result = await deleteStaffAction(staffId);

      expect(result).toEqual({ success: true });
      expect(mockStaffService.deleteStaff).toHaveBeenCalledWith(staffId);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/staff');
    });

    it('should fail without admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockNonAdminSession);

      const result = await deleteStaffAction(staffId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Admin access required' 
      });
    });

    it('should handle service errors', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.deleteStaff.mockRejectedValueOnce(new Error('Staff member not found'));

      const result = await deleteStaffAction(staffId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Staff member not found' 
      });
    });
  });

  describe('getStaffByIdAction', () => {
    const staffId = '223e4567-e89b-12d3-a456-426614174000';

    it('should get staff successfully with admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.getStaffById.mockResolvedValueOnce(mockStaff);

      const result = await getStaffByIdAction(staffId);

      expect(result).toEqual({ success: true, data: mockStaff });
      expect(mockStaffService.getStaffById).toHaveBeenCalledWith(staffId);
    });

    it('should return error when staff not found', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.getStaffById.mockResolvedValueOnce(null);

      const result = await getStaffByIdAction(staffId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Staff member not found' 
      });
    });

    it('should fail without admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockNonAdminSession);

      const result = await getStaffByIdAction(staffId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Admin access required' 
      });
    });
  });

  describe('searchStaffAction', () => {
    const searchParams = {
      query: 'John',
      page: 1,
      limit: 10
    };

    const searchResult = {
      staff: [mockStaff],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    };

    it('should search staff successfully with admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.searchStaff.mockResolvedValueOnce(searchResult);

      const result = await searchStaffAction(searchParams);

      expect(result).toEqual({ success: true, data: searchResult });
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith(searchParams);
    });

    it('should fail without admin role', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockNonAdminSession);

      const result = await searchStaffAction(searchParams);

      expect(result).toEqual({ 
        success: false, 
        error: 'Admin access required' 
      });
    });

    it('should handle search errors', async () => {
      mockGetServerSession.mockResolvedValueOnce(mockAdminSession);
      mockStaffService.searchStaff.mockRejectedValueOnce(new Error('Search failed'));

      const result = await searchStaffAction(searchParams);

      expect(result).toEqual({ 
        success: false, 
        error: 'Search failed' 
      });
    });
  });
});