import { FollowUp, FollowUpPriority } from '@/types/followup';

const priorityOrder: Record<FollowUpPriority, number> = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function sortFollowups(followups: FollowUp[]): FollowUp[] {
  return [...followups].sort((a, b) => {
    const dateCompare = new Date(a.followupDate).getTime() - new Date(b.followupDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}


