'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { SalesReportForm } from '@/components/forms/SalesReportForm';
import { updateSalesReportAction } from '@/lib/actions/sales-reports';
import type { SalesReportStatus, SalesReportFormData } from '@/types/sales-report';

interface SalesReport {
  id: string;
  outletId: string;
  date: string;
  cashDeposits: number;
  cardSettlements: number;
  totalSales: number;
  status: SalesReportStatus;
  createdAt: string;
  updatedAt: string;
  outlet: {
    id: string;
    name: string;
    location: string;
    managerId: string;
  };
  submittedBy: {
    id: string;
    name: string;
    email: string;
  };
  documents: Array<{
    id: string;
    originalName: string;
    category: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  }>;
}

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
}

interface Props {
  report: SalesReport;
  currentUser: User;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200'
};

export function EditSalesReportClient({ report, currentUser }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toDate = (d: any): Date => (typeof d === 'string' ? parseISO(d) : new Date(d));

  // Convert report data to form format
  const initialFormData: SalesReportFormData = {
    outletId: report.outletId,
    date: toDate(report.date),
    cashDeposits: report.cashDeposits,
    cardSettlements: report.cardSettlements,
    totalSales: report.totalSales,
    status: report.status
  };

  const handleSuccess = async (formData: SalesReportFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await updateSalesReportAction(report.id, formData);
      
      if (result.success) {
        // Redirect to the report detail page
        router.push(`/sales-reports/${report.id}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sales report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Sales Report</h1>
            <p className="text-muted-foreground">
              {report.outlet.name} • {format(toDate(report.date), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>
        
        <Badge className={cn("gap-2", statusColors[report.status])}>
          <Edit className="w-3 h-3" />
          {report.status}
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Information</CardTitle>
          <CardDescription>
            You are editing a {report.status.toLowerCase()} sales report. 
            {report.status === 'REJECTED' && ' You can make changes and resubmit for approval.'}
            {report.status === 'DRAFT' && ' You can modify the details and save or submit for approval.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Original submission:</span>
              <p>{format(toDate(report.createdAt), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Last updated:</span>
              <p>{format(toDate(report.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Submitted by:</span>
              <p>{report.submittedBy.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Sales Report Details
          </CardTitle>
          <CardDescription>
            Update the sales figures and submit for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalesReportForm
            initialData={initialFormData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            mode="edit"
            submitButtonText={report.status === 'DRAFT' ? 'Save Changes' : 'Update & Resubmit'}
            enableMultiOutlet={false} // Disable multi-outlet in edit mode
          />
        </CardContent>
      </Card>
    </div>
  );
}
