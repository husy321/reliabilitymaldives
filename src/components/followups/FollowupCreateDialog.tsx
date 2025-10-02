'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FollowupForm } from './FollowupForm';
import { FollowupDetails } from './FollowupDetails';
import { useFollowupStore } from '@/stores/followup-store';

interface FollowupCreateDialogProps {
  triggerButton?: React.ReactNode;
}

export function FollowupCreateDialog({ triggerButton }: FollowupCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { fetchFollowups } = useFollowupStore();
  const [createdId, setCreatedId] = useState<string | null>(null);

  const defaultTrigger = (
    <Button className="flex items-center gap-2" size="sm">
      <Plus className="h-4 w-4" />
      New Follow-up
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Follow-up</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {!createdId ? (
            <FollowupForm onSuccess={async (newId) => { setCreatedId(newId || null); await fetchFollowups(); }} />
          ) : (
            <FollowupDetails followupId={createdId} onChanged={fetchFollowups} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


