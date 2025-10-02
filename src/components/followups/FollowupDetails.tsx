'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FollowUp, FollowUpLog, ContactMethod } from '@/types/followup';
import { formatDate } from '@/lib/utils';

export function FollowupDetails({ followupId, onChanged }: { followupId: string; onChanged?: () => void }) {
  const [followup, setFollowup] = useState<FollowUp | null>(null);
  const [logs, setLogs] = useState<FollowUpLog[]>([]);
  const [personContacted, setPersonContacted] = useState('');
  const [outcome, setOutcome] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>(ContactMethod.CALL);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/followups/${followupId}`);
      const json = await res.json();
      if (res.ok) {
        setFollowup(json.data);
        // Use logs from the follow-up data (already included)
        if (json.data?.logs) {
          setLogs(json.data.logs);
        }
      }
    })();
  }, [followupId]);

  const addLog = async () => {
    const payload = { contactDate: new Date(), contactMethod, personContacted, outcome };
    const res = await fetch(`/api/followups/${followupId}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (res.ok) {
      setLogs([j.data, ...logs]);
      onChanged?.();
    }
  };

  const complete = async () => {
    const res = await fetch(`/api/followups/${followupId}/complete`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        setFollowup(json.data);
        // Update logs from the complete response
        if (json.data?.logs) {
          setLogs(json.data.logs);
        }
        onChanged?.();
      }
    }
  };

  const exportPdf = async () => {
    const url = `/api/followups/export?invoiceId=${followup?.receivableId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {followup && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{followup.customer?.name ?? 'Follow-up'}</h2>
            <p className="text-sm text-muted-foreground">Follow-up on {formatDate(new Date(followup.followupDate))}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPdf}>Export</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={followup.status === 'COMPLETED'}>Complete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete Follow-up Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to mark this follow-up as completed? This action will move the follow-up to the completed list and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={complete}>Complete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-2">Logs</h3>
        <div className="space-y-3">
          {logs.map(l => (
            <div key={l.id} className="relative pl-6 pb-4 border-l-2 border-gray-200">
              <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-600 rounded-full" />
              <div className="mb-1 text-sm text-muted-foreground">{new Date(l.contactDate).toLocaleString()}</div>
              <div className="text-sm font-medium">{l.personContacted}</div>
              <div className="text-sm">{l.outcome}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Add Log</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Person contacted" value={personContacted} onChange={(e) => setPersonContacted(e.target.value)} />
          <Input placeholder="Method (CALL/EMAIL/TEXT)" value={contactMethod} onChange={(e) => setContactMethod(e.target.value as ContactMethod)} />
          <Button onClick={addLog}>Add</Button>
        </div>
        <Textarea placeholder="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </div>
    </div>
  );
}
