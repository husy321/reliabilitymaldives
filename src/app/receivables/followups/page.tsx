'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFollowupStore } from '@/stores/followup-store';
import { FollowupList } from '@/components/followups/FollowupList';
import { FollowupCreateDialog } from '@/components/followups/FollowupCreateDialog';
import { ReceivablesPageLayout } from '@/components/business/receivables/ReceivablesPageLayout';

export default function FollowupsPage() {
  const { setFilters, fetchFollowups } = useFollowupStore();
  const pathname = usePathname();

  useEffect(() => {
    // Set initial filter to exclude completed follow-ups
    setFilters({ status: 'active' });
    fetchFollowups();
  }, [setFilters, fetchFollowups]);

  return (
    <ReceivablesPageLayout
      title="Follow-ups"
      description="Manage follow-up tasks and logs for receivables"
      action={<FollowupCreateDialog />}
      subnav={{
        items: [
          { label: 'Invoice', href: '/receivables' },
          { label: 'Customers', href: '/receivables/customers' },
          { label: 'Follow-ups', href: '/receivables/followups' },
          { label: 'Completed', href: '/receivables/followups/completed' },
        ]
      }}
      currentPath={pathname}
    >
      <div className="p-6">
        <FollowupList />
      </div>
    </ReceivablesPageLayout>
  );
}
