import { sortFollowups } from '@/utils/followup-utils';
import { FollowUp, FollowUpPriority, FollowUpStatus, ContactMethod } from '@/types/followup';

function makeFU(overrides: Partial<FollowUp>): FollowUp {
  const base: FollowUp = {
    id: 'id',
    receivableId: 'r1',
    customerId: 'c1',
    followupDate: new Date('2025-09-20'),
    priority: FollowUpPriority.MEDIUM,
    contactPerson: 'John',
    contactMethod: ContactMethod.CALL,
    status: FollowUpStatus.PENDING,
    createdById: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    initialNotes: undefined,
    completedAt: undefined,
  };
  return { ...base, ...overrides };
}

describe('sortFollowups', () => {
  it('sorts by date ascending, then priority (HIGH > MEDIUM > LOW)', () => {
    const items: FollowUp[] = [
      makeFU({ id: 'a', followupDate: new Date('2025-09-22'), priority: FollowUpPriority.MEDIUM }),
      makeFU({ id: 'b', followupDate: new Date('2025-09-21'), priority: FollowUpPriority.LOW }),
      makeFU({ id: 'c', followupDate: new Date('2025-09-21'), priority: FollowUpPriority.HIGH }),
    ];
    const sorted = sortFollowups(items);
    expect(sorted.map(i => i.id)).toEqual(['c', 'b', 'a']);
  });
});
