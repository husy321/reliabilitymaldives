"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFollowUpSchema } from '@/validators/followupValidator';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContactMethod, FollowUpPriority } from '@/types/followup';
import { formatDate } from '@/lib/utils';

type FormValues = z.infer<typeof createFollowUpSchema>;

export function FollowupForm({ onSuccess }: { onSuccess?: (newId?: string) => void }) {
  const form = useForm<FormValues>({ resolver: zodResolver(createFollowUpSchema) });
  const [pendingInvoices, setPendingInvoices] = React.useState<{ id: string; invoiceNumber: string; amount: number; dueDate: string }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [invoiceResults, setInvoiceResults] = React.useState<{ id: string; invoiceNumber: string; amount: number; dueDate: string; customerId: string }[]>([]);
  const [customerResults, setCustomerResults] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedInvoiceSummary, setSelectedInvoiceSummary] = React.useState<{ invoiceNumber: string; amount: number; dueDate: string } | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = React.useState<string>('');

  const handleCustomerBlur = async () => {
    const customerId = form.getValues('customerId');
    if (!customerId) return;
    const res = await fetch(`/api/receivables/pending?customerId=${customerId}`);
    const j = await res.json();
    if (res.ok) {
      setPendingInvoices(j.data);
    }
  };

  // Debounced unified search
  React.useEffect(() => {
    // Don't search if the search term matches the selected customer name (to avoid duplicate calls)
    if (!searchTerm || searchTerm.length < 2 || searchTerm === selectedCustomerName) {
      setInvoiceResults([]);
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const [ir, cr] = await Promise.all([
          fetch(`/api/followups/search/invoice?query=${encodeURIComponent(searchTerm)}`).then(r => r.json()),
          fetch(`/api/followups/search/customer?query=${encodeURIComponent(searchTerm)}`).then(r => r.json()),
        ]);
        if (ir?.data) setInvoiceResults(ir.data);
        if (cr?.data) setCustomerResults(cr.data);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, selectedCustomerName]);

  const chooseInvoice = (inv: { id: string; invoiceNumber: string; amount: number; dueDate: string; customerId: string }) => {
    form.setValue('receivableId', inv.id);
    form.setValue('customerId', inv.customerId);
    setPendingInvoices([{ id: inv.id, invoiceNumber: inv.invoiceNumber, amount: inv.amount, dueDate: inv.dueDate }]);
    setSelectedInvoiceSummary({ invoiceNumber: inv.invoiceNumber, amount: inv.amount, dueDate: inv.dueDate });
    setInvoiceResults([]);
    setCustomerResults([]);
    setSearchTerm('');
    setSelectedCustomerName('');
  };

  const chooseCustomer = async (cust: { id: string; name: string }) => {
    form.setValue('customerId', cust.id);
    setSelectedInvoiceSummary(null);
    setInvoiceResults([]);
    setCustomerResults([]);
    
    // Set the selected customer name first to prevent search effect from running
    setSelectedCustomerName(cust.name);
    setSearchTerm(cust.name);
    
    // Load pending invoices for the chosen customer
    const res = await fetch(`/api/receivables/pending?customerId=${cust.id}`);
    const j = await res.json();
    if (res.ok) setPendingInvoices(j.data);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const j = await res.json();
      if (res.ok) onSuccess?.(j?.data?.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {/* Unified search */}
      <div className="relative">
        <Input
          placeholder="Search customer name or invoice number..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            // Clear selected customer name when user starts typing something different
            if (e.target.value !== selectedCustomerName) {
              setSelectedCustomerName('');
            }
          }}
        />
        {(invoiceResults.length > 0 || customerResults.length > 0) && (
          <div className="absolute z-10 mt-2 w-full rounded-md border bg-background shadow-sm">
            {invoiceResults.length > 0 && (
              <div>
                <div className="px-3 py-1 text-xs text-muted-foreground">Invoices</div>
                {invoiceResults.slice(0,5).map((inv) => (
                  <button
                    key={`inv-${inv.id}`}
                    type="button"
                    onClick={() => chooseInvoice(inv)}
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      <span>${inv.amount.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {customerResults.length > 0 && (
              <div className="border-t">
                <div className="px-3 py-1 text-xs text-muted-foreground">Customers</div>
                {customerResults.slice(0,5).map((c) => (
                  <button
                    key={`cust-${c.id}`}
                    type="button"
                    onClick={() => chooseCustomer(c)}
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <input type="hidden" {...form.register('customerId')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Receivable</label>
          <select
            className="w-full border rounded px-2 py-2"
            onChange={(e) => {
              form.setValue('receivableId', e.target.value)
              const r = pendingInvoices.find(p => p.id === e.target.value)
              if (r) setSelectedInvoiceSummary({ invoiceNumber: r.invoiceNumber, amount: r.amount, dueDate: r.dueDate })
            }}
            value={form.watch('receivableId') as any}
          >
            <option value="">{pendingInvoices.length ? 'Select a pending invoice' : 'No invoices loaded'}</option>
            {pendingInvoices.map((r) => (
              <option key={r.id} value={r.id}>{r.invoiceNumber} — ${r.amount.toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Follow-up Date</label>
          <input type="date" className="w-full border rounded px-2 py-2" onChange={(e) => form.setValue('followupDate', new Date(e.target.value))} />
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Select onValueChange={(v) => form.setValue('priority', v as any)}>
            <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FollowUpPriority.HIGH}>High</SelectItem>
              <SelectItem value={FollowUpPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={FollowUpPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Contact Method</label>
          <Select onValueChange={(v) => form.setValue('contactMethod', v as any)}>
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ContactMethod.CALL}>Call</SelectItem>
              <SelectItem value={ContactMethod.EMAIL}>Email</SelectItem>
              <SelectItem value={ContactMethod.TEXT}>Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Contact Person</label>
          <Input {...form.register('contactPerson')} placeholder="Name" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <Textarea {...form.register('initialNotes')} placeholder="Notes" rows={4} />
        </div>
      </div>
      {selectedInvoiceSummary && (
        <div className="rounded border p-3 text-sm">
          <div className="font-medium">Invoice {selectedInvoiceSummary.invoiceNumber}</div>
          <div>Amount: ${selectedInvoiceSummary.amount.toFixed(2)}</div>
          <div>Due: {formatDate(new Date(selectedInvoiceSummary.dueDate))}</div>
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Follow-up'}</Button>
      </div>
    </form>
  );
}
