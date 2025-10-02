'use client';

import { usePathname } from 'next/navigation';
import { CompletedFollowupsList } from '@/components/followups/CompletedFollowupsList';
import { ReceivablesPageLayout } from '@/components/business/receivables/ReceivablesPageLayout';

export default function CompletedFollowupsPage() {
  const pathname = usePathname();

  return (
    <ReceivablesPageLayout
      title="Completed Follow-ups"
      description="View completed follow-up tasks and logs for receivables"
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
        <CompletedFollowupsList />
      </div>
    </ReceivablesPageLayout>
  );
}
