'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { staffService } from '../services/staffService';
import type { CreateStaffRequest, UpdateStaffRequest, StaffSearchParams } from '../../types/staff';

/**
 * Check if user has admin role
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  if (session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  
  return session.user;
}

/**
 * Create a new staff member
 */
export async function createStaffAction(data: CreateStaffRequest) {
  try {
    await requireAdmin();
    
    const staff = await staffService.createStaff(data);
    
    revalidatePath('/staff');
    return { success: true, data: staff };
  } catch (error) {
    console.error('Create staff error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create staff member' 
    };
  }
}

/**
 * Update a staff member
 */
export async function updateStaffAction(data: UpdateStaffRequest) {
  try {
    await requireAdmin();
    
    const staff = await staffService.updateStaff(data);
    
    revalidatePath('/staff');
    revalidatePath(`/staff/${staff.id}`);
    return { success: true, data: staff };
  } catch (error) {
    console.error('Update staff error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update staff member' 
    };
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaffAction(id: string) {
  try {
    await requireAdmin();
    
    await staffService.deleteStaff(id);
    
    revalidatePath('/staff');
    return { success: true };
  } catch (error) {
    console.error('Delete staff error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete staff member' 
    };
  }
}

/**
 * Get staff member by ID
 */
export async function getStaffByIdAction(id: string) {
  try {
    await requireAdmin();
    
    const staff = await staffService.getStaffById(id);
    
    if (!staff) {
      return { success: false, error: 'Staff member not found' };
    }
    
    return { success: true, data: staff };
  } catch (error) {
    console.error('Get staff error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get staff member' 
    };
  }
}

/**
 * Search staff members
 */
export async function searchStaffAction(params: StaffSearchParams) {
  try {
    await requireAdmin();
    
    const result = await staffService.searchStaff(params);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Search staff error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to search staff' 
    };
  }
}

/**
 * Get all departments
 */
export async function getDepartmentsAction() {
  try {
    await requireAdmin();
    
    const departments = await staffService.getDepartments();
    
    return { success: true, data: departments };
  } catch (error) {
    console.error('Get departments error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get departments' 
    };
  }
}

/**
 * Get staff statistics
 */
export async function getStaffStatsAction() {
  try {
    await requireAdmin();
    
    const stats = await staffService.getStaffStats();
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Get staff stats error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get staff statistics' 
    };
  }
}