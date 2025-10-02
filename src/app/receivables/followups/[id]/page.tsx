import ReceivablesSubnav from '@/components/business/receivables/ReceivablesSubnav';

export default function FollowupDetailsPage() {
  return (
    <div>
      <div className="mb-4">
        <ReceivablesSubnav
          items={[
            { label: 'Invoice', href: '/receivables' },
            { label: 'Customers', href: '/receivables/customers' },
            { label: 'Follow-ups', href: '/receivables/followups' },
            { label: 'Completed', href: '/receivables/followups/completed' },
          ]}
        />
      </div>
      <h1 className="text-2xl font-semibold mb-4">Follow-up Details</h1>
      <p>Details and logs coming soon.</p>
    </div>
  );
}
