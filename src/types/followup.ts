import { Receivable } from '@/types/receivable';
import { Customer } from '@/types/customer';

export enum FollowUpPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum ContactMethod {
  TEXT = 'TEXT',
  CALL = 'CALL',
  EMAIL = 'EMAIL'
}

export interface FollowUp {
  id: string;
  receivableId: string;
  customerId: string;
  followupDate: Date;
  priority: FollowUpPriority;
  contactPerson: string;
  contactMethod: ContactMethod;
  initialNotes?: string;
  status: FollowUpStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;

  receivable?: Receivable;
  customer?: Customer;
}

export interface FollowUpLog {
  id: string;
  followUpId: string;
  contactDate: Date;
  contactMethod: ContactMethod;
  personContacted: string;
  outcome: string;
  nextStep?: string;
  nextStepDate?: Date | null;
  loggedById: string;
  createdAt: Date;
}

export interface CreateFollowUpRequest {
  receivableId: string;
  customerId: string;
  followupDate: Date;
  priority: FollowUpPriority;
  contactPerson: string;
  contactMethod: ContactMethod;
  initialNotes?: string;
}

export interface UpdateFollowUpRequest {
  followupDate?: Date;
  priority?: FollowUpPriority;
  contactPerson?: string;
  contactMethod?: ContactMethod;
  initialNotes?: string | null;
  status?: FollowUpStatus;
}

export interface CreateFollowUpLogRequest {
  contactDate: Date;
  contactMethod: ContactMethod;
  personContacted: string;
  outcome: string;
  nextStep?: string;
  nextStepDate?: Date | null;
}

export interface FollowUpFilters {
  status?: FollowUpStatus | 'all' | 'active';
  startDate?: Date;
  endDate?: Date;
  completionStartDate?: Date;
  completionEndDate?: Date;
  customerId?: string;
  receivableId?: string;
  priority?: FollowUpPriority;
  sortBy?: 'followupDate' | 'priority' | 'status' | 'createdAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}


