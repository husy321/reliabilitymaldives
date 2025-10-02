'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calendar, 
  Building2, 
  User, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  FileText,
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit,
  Download,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { approveSalesReportAction, rejectSalesReportAction, deleteSalesReportAction } from '@/lib/actions/sales-reports';
import type { SalesReportStatus } from '@/types/sales-report';

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

const statusIcons = {
  DRAFT: <Edit className="w-4 h-4" />,
  SUBMITTED: <Clock className="w-4 h-4" />,
  APPROVED: <CheckCircle className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />
};

export function SalesReportDetailView({ report, currentUser }: Props) {
  const router = useRouter();
  const toDate = (d: any): Date => (typeof d === 'string' ? parseISO(d) : new Date(d));
  
  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canApprove = currentUser.role === 'ACCOUNTS' || currentUser.role === 'ADMIN';
  const canEdit = (
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'MANAGER' && 
     report.submittedBy.id === currentUser.id && 
     ['DRAFT', 'REJECTED'].includes(report.status))
  );
  const canDelete = (
    (currentUser.role === 'ADMIN' && report.status !== 'APPROVED') ||
    (currentUser.role === 'MANAGER' && 
     report.submittedBy.id === currentUser.id && 
     report.status === 'DRAFT')
  );

  // Handle approval
  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    
    try {
      const result = await approveSalesReportAction(report.id);
      if (result.success) {
        router.refresh(); // Refresh the page to show updated status
        setApprovalDialogOpen(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve report');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    
    setActionLoading(true);
    setError(null);
    
    try {
      const result = await rejectSalesReportAction(report.id, rejectionReason);
      if (result.success) {
        router.refresh(); // Refresh the page to show updated status
        setRejectionDialogOpen(false);
        setRejectionReason('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject report');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    setActionLoading(true);
    setError(null);
    
    try {
      const result = await deleteSalesReportAction(report.id);
      if (result.success) {
        router.push('/sales-reports'); // Navigate back to list
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setActionLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <h1 className="text-2xl font-bold text-gray-900">Sales Report Details</h1>
            <p className="text-muted-foreground">
              {report.outlet.name} • {format(toDate(report.date), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={cn("gap-2", statusColors[report.status])}>
            {statusIcons[report.status]}
            {report.status}
          </Badge>
          
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/sales-reports/${report.id}/edit`)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
          
          {canApprove && report.status === 'SUBMITTED' && (
            <>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setApprovalDialogOpen(true)}
                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setRejectionDialogOpen(true)}
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </>
          )}
          
          {canDelete && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Outlet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Outlet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Outlet Name</Label>
                  <p className="text-lg font-medium">{report.outlet.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="text-lg">{report.outlet.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Sales Information
              </CardTitle>
              <CardDescription>
                Report for {format(toDate(report.date), 'EEEE, MMMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Receipt className="w-4 h-4" />
                    <Label className="text-sm font-medium">Cash Deposits</Label>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    MVR {report.cashDeposits.toLocaleString()}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <Label className="text-sm font-medium">Card Settlements</Label>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    MVR {report.cardSettlements.toLocaleString()}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <Label className="text-sm font-medium">Total Sales</Label>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    MVR {report.totalSales.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              {/* Calculation Breakdown */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Calculation</Label>
                <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Cash Deposits:</span>
                    <span>MVR {report.cashDeposits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Card Settlements:</span>
                    <span>MVR {report.cardSettlements.toLocaleString()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>MVR {report.totalSales.toLocaleString()}</span>
                  </div>
                  {Math.abs(report.totalSales - (report.cashDeposits + report.cardSettlements)) > 0.01 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Variance:</span>
                      <span>MVR {(report.totalSales - (report.cashDeposits + report.cardSettlements)).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Supporting Documents ({report.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{doc.originalName}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.category} • {formatFileSize(doc.fileSize)} • 
                            {format(toDate(doc.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Report Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {statusIcons[report.status]}
                <div>
                  <p className="font-medium">{report.status}</p>
                  <p className="text-sm text-muted-foreground">Current status</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(toDate(report.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{format(toDate(report.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submitted By */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Submitted By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{report.submittedBy.name}</p>
                <p className="text-sm text-muted-foreground">{report.submittedBy.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => router.push('/sales-reports')}
              >
                <FileText className="w-4 h-4" />
                View All Reports
              </Button>
              
              {(currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => router.push('/dashboard/sales-reports/new')}
                >
                  <Calendar className="w-4 h-4" />
                  Create New Report
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Sales Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this sales report for {report.outlet.name} 
              on {format(toDate(report.date), 'MMM dd, yyyy')}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Sales Report</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this sales report. The manager will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this report is being rejected..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sales report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
