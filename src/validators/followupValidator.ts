import { z } from 'zod';
import { ContactMethod, FollowUpPriority, FollowUpStatus } from '@/types/followup';

export const createFollowUpSchema = z.object({
  receivableId: z.string().uuid(),
  customerId: z.string().uuid(),
  followupDate: z.coerce.date(),
  priority: z.nativeEnum(FollowUpPriority),
  contactPerson: z.string().min(1),
  contactMethod: z.nativeEnum(ContactMethod),
  initialNotes: z.string().optional(),
});

export const updateFollowUpSchema = z.object({
  followupDate: z.coerce.date().optional(),
  priority: z.nativeEnum(FollowUpPriority).optional(),
  contactPerson: z.string().min(1).optional(),
  contactMethod: z.nativeEnum(ContactMethod).optional(),
  initialNotes: z.string().nullable().optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
});

export const createFollowUpLogSchema = z.object({
  contactDate: z.coerce.date(),
  contactMethod: z.nativeEnum(ContactMethod),
  personContacted: z.string().min(1),
  outcome: z.string().min(1),
  nextStep: z.string().optional(),
  nextStepDate: z.coerce.date().nullable().optional(),
});

export const followUpFiltersSchema = z.object({
  status: z.union([z.nativeEnum(FollowUpStatus), z.literal('all'), z.literal('active')]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  completionStartDate: z.coerce.date().optional(),
  completionEndDate: z.coerce.date().optional(),
  customerId: z.string().uuid().optional(),
  receivableId: z.string().uuid().optional(),
  priority: z.nativeEnum(FollowUpPriority).optional(),
  sortBy: z.enum(['followupDate', 'priority', 'status', 'createdAt', 'completedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});


