'use client';

import ReceivablesSubnav from '@/components/business/receivables/ReceivablesSubnav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FollowupForm } from '@/components/followups/FollowupForm';

export default function NewFollowupPage() {
  return (
    <div className="space-y-4">
      <div className="mb-1">
        <ReceivablesSubnav
          items={[
            { label: 'Invoice', href: '/receivables' },
            { label: 'Customers', href: '/receivables/customers' },
            { label: 'Follow-ups', href: '/receivables/followups' },
            { label: 'Completed', href: '/receivables/followups/completed' },
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Follow-up</CardTitle>
          <CardDescription>Create a follow-up for an unpaid invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <FollowupForm onSuccess={() => (window.location.href = '/receivables/followups')} />
        </CardContent>
      </Card>
    </div>
  );
}
