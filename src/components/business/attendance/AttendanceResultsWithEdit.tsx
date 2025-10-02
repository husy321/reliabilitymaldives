'use client';

import React from 'react';
import { AttendanceResults } from './AttendanceResults';
import { AttendanceEditModal } from './AttendanceEditModal';
import { useAttendanceEditStore } from '../../../stores/attendanceEditStore';

import type { AttendanceRecord } from '../../../../types/attendance';

interface AttendanceResultsWithEditProps {
  records: AttendanceRecord[];
  title?: string;
  showStats?: boolean;
}

export function AttendanceResultsWithEdit(props: AttendanceResultsWithEditProps) {
  const { isEditModalOpen, selectedRecord, isLoading, closeEditModal, editAttendanceRecord } = useAttendanceEditStore();

  return (
    <>
      <AttendanceResults {...props} />

      <AttendanceEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        record={selectedRecord}
        onSave={editAttendanceRecord}
        isLoading={isLoading}
      />
    </>
  );
}