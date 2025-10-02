"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer } from "../../../types/customer";
import { formatCurrencyMvr } from "@/lib/utils";
import { Mail, Phone, MapPin, Calendar, CreditCard, DollarSign, FileText, AlertCircle } from "lucide-react";
import { getCustomerWithInvoicesActionDev } from "@/lib/actions/customers-dev";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomerDetailsDialogProps {
  customer: Customer;
  triggerButton: React.ReactNode;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function formatPaymentTerms(days: number): string {
  if (days === 0) return 'Cash';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function CustomerDetailsDialog({ customer, triggerButton }: CustomerDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer with invoices when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomerData();
    }
  }, [isOpen, customer.id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomerWithInvoicesActionDev(customer.id);
      if (result.success) {
        setCustomerData(result.data);
      } else {
        setError(result.error || 'Failed to load customer details');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const displayCustomer = customerData || customer;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{displayCustomer.name}</DialogTitle>
              <DialogDescription>
                Complete customer information and invoice history
              </DialogDescription>
            </div>
            <Badge
              variant="secondary"
              className={displayCustomer.isActive
                ? "bg-success/10 text-success border-success/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
              }
            >
              {displayCustomer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Landscape Layout: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                Contact Information
              </h4>
              <div className="space-y-2 pl-6">
                {displayCustomer.email ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{displayCustomer.email}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 inline mr-2" />
                    No email
                  </div>
                )}

                {displayCustomer.phone ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{displayCustomer.phone}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 inline mr-2" />
                    No phone
                  </div>
                )}

                {displayCustomer.address ? (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="line-clamp-3">{displayCustomer.address}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    No address
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Financial Summary */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Financial Summary
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Invoices</span>
                  <span className="font-mono text-sm font-semibold">
                    {formatCurrencyMvr(displayCustomer.totalInvoiceAmount || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Paid</span>
                  <span className="font-mono text-sm font-semibold text-success">
                    {formatCurrencyMvr(displayCustomer.totalPaidAmount || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Outstanding</span>
                  <span className={`font-mono text-sm font-semibold ${
                    (displayCustomer.totalOutstanding || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {formatCurrencyMvr(displayCustomer.totalOutstanding || 0)}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-3 w-3" />
                    Payment Terms
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatPaymentTerms(displayCustomer.paymentTerms)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Account Info
              </h4>
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Customer ID</span>
                  <span className="font-mono text-xs truncate ml-2">{displayCustomer.id.slice(0, 8)}...</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(displayCustomer.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(displayCustomer.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Invoices Table */}
          <div className="lg:col-span-2">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice History ({loading ? '...' : customerData?.receivables?.length || 0})
              </h4>

              {loading ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">Invoice #</TableHead>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead className="w-[100px]">Due Date</TableHead>
                        <TableHead className="text-right w-[110px]">Amount</TableHead>
                        <TableHead className="text-right w-[110px]">Paid</TableHead>
                        <TableHead className="text-right w-[110px]">Outstanding</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : customerData?.receivables && customerData.receivables.length > 0 ? (
                <div className="rounded-md border">
                  <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[120px]">Invoice #</TableHead>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead className="w-[100px]">Due Date</TableHead>
                          <TableHead className="text-right w-[110px]">Amount</TableHead>
                          <TableHead className="text-right w-[110px]">Paid</TableHead>
                          <TableHead className="text-right w-[110px]">Outstanding</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerData.receivables.map((invoice: any) => {
                          const outstanding = invoice.amount - invoice.paidAmount;
                          return (
                            <TableRow key={invoice.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs">
                                {invoice.invoiceNumber}
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatCurrencyMvr(invoice.amount)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-success">
                                {formatCurrencyMvr(invoice.paidAmount)}
                              </TableCell>
                              <TableCell className={`text-right font-mono text-xs ${
                                outstanding > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'
                              }`}>
                                {formatCurrencyMvr(outstanding)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    invoice.status === 'PAID'
                                      ? 'bg-success/10 text-success border-success/20'
                                      : invoice.status === 'OVERDUE'
                                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                                      : invoice.status === 'PARTIALLY_PAID'
                                      ? 'bg-warning/10 text-warning border-warning/20'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {invoice.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-md">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No invoices found for this customer</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}