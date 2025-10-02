'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FollowupDetails } from './FollowupDetails';
import { useFollowupStore } from '@/stores/followup-store';

interface FollowupDetailsDialogProps {
  followupId: string;
  trigger?: React.ReactNode;
  title?: string;
}

export function FollowupDetailsDialog({ followupId, trigger, title = 'Follow-up Details' }: FollowupDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const { fetchFollowups } = useFollowupStore();

  const defaultTrigger = (
    <Button variant="outline" size="sm">View</Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <FollowupDetails followupId={followupId} onChanged={fetchFollowups} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


