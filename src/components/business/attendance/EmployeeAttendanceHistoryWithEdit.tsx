'use client';

import React from 'react';
import { EmployeeAttendanceHistory } from './EmployeeAttendanceHistory';
import { AttendanceEditModal } from './AttendanceEditModal';
import { useAttendanceEditStore } from '../../../stores/attendanceEditStore';

import type { AttendanceRecord } from '../../../../types/attendance';

interface StaffProfile {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position?: string;
  joinedDate?: Date;
  email?: string;
  phone?: string;
}

interface EmployeeAttendanceHistoryWithEditProps {
  staffProfile: StaffProfile;
  attendanceRecords: AttendanceRecord[];
  isLoading?: boolean;
  showEditButton?: boolean;
  standardWorkHours?: number;
  standardStartTime?: string;
  standardEndTime?: string;
}

export function EmployeeAttendanceHistoryWithEdit(props: EmployeeAttendanceHistoryWithEditProps) {
  const { isEditModalOpen, selectedRecord, isLoading: editLoading, closeEditModal, editAttendanceRecord } = useAttendanceEditStore();

  return (
    <>
      <EmployeeAttendanceHistory {...props} />

      <AttendanceEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        record={selectedRecord}
        onSave={editAttendanceRecord}
        isLoading={editLoading}
      />
    </>
  );
}