'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CalendarIcon, ChevronDown, Edit, Eye, MoreVertical, Plus, Search, Trash2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { approveSalesReportAction, rejectSalesReportAction, deleteSalesReportAction } from '@/lib/actions/sales-reports';
import { SalesAnalyticsSummary } from './SalesAnalyticsSummary';
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
    createdAt: string;
  }>;
}

interface SalesReportsListProps {
  className?: string;
}

const statusColors = {
  DRAFT: 'bg-muted text-foreground border-border',
  SUBMITTED: 'bg-accent text-accent-foreground border-border',
  APPROVED: 'bg-primary text-primary-foreground border-border',
  REJECTED: 'bg-destructive text-destructive-foreground border-border',
};

const statusIcons = {
  DRAFT: <Edit className="w-3 h-3" />,
  SUBMITTED: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />
};

export function SalesReportsList({ className }: SalesReportsListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalesReportStatus | 'ALL'>('ALL');
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'totalSales' | 'createdAt' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SalesReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Available outlets for filtering (from reports data)
  const availableOutlets = Array.from(
    new Map(reports.map(report => [report.outlet.id, report.outlet])).values()
  );

  // Fetch sales reports
  const fetchReports = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(outletFilter !== 'ALL' && { outletId: outletFilter })
      });

      const response = await fetch(`/api/sales-reports?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales reports');
      }

      if (data.success) {
        setReports(data.data.reports);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        throw new Error(data.error || 'Failed to fetch sales reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales reports');
    } finally {
      setLoading(false);
    }
  }, [session, currentPage, sortBy, sortOrder, statusFilter, outletFilter]);

  // Fetch reports on component mount and when dependencies change
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filter reports based on search term (client-side)
  const filteredReports = reports.filter(report => 
    report.outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.outlet.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.submittedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle approval
  const handleApprove = async () => {
    if (!selectedReport) return;
    
    setActionLoading(true);
    try {
      const result = await approveSalesReportAction(selectedReport.id);
      if (result.success) {
        await fetchReports(); // Refresh the list
        setApprovalDialogOpen(false);
        setSelectedReport(null);
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
    if (!selectedReport || !rejectionReason.trim()) return;
    
    setActionLoading(true);
    try {
      const result = await rejectSalesReportAction(selectedReport.id, rejectionReason);
      if (result.success) {
        await fetchReports(); // Refresh the list
        setRejectionDialogOpen(false);
        setSelectedReport(null);
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
    if (!selectedReport) return;
    
    setActionLoading(true);
    try {
      const result = await deleteSalesReportAction(selectedReport.id);
      if (result.success) {
        await fetchReports(); // Refresh the list
        setDeleteDialogOpen(false);
        setSelectedReport(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setActionLoading(false);
    }
  };

  // Check user permissions
  const canApprove = session?.user?.role === 'ACCOUNTS' || session?.user?.role === 'ADMIN';
  const canEdit = (report: SalesReport) => {
    if (session?.user?.role === 'ADMIN') return true;
    if (session?.user?.role === 'MANAGER') {
      return report.submittedBy.id === session.user.id && ['DRAFT', 'REJECTED'].includes(report.status);
    }
    return false;
  };
  const canDelete = (report: SalesReport) => {
    if (session?.user?.role === 'ADMIN') return report.status !== 'APPROVED';
    if (session?.user?.role === 'MANAGER') {
      return report.submittedBy.id === session.user.id && report.status === 'DRAFT';
    }
    return false;
  };

  if (loading && reports.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground">
            Manage and review sales reports from all outlets
          </p>
        </div>
        {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
          <Button onClick={() => router.push('/dashboard/sales-reports/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Report
          </Button>
        )}
      </div>

      {/* Analytics Summary */}
      <SalesAnalyticsSummary />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
              <Input
                placeholder="Search outlets, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search outlets or locations"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Outlet Filter */}
            <Select value={outletFilter} onValueChange={setOutletFilter}>
              <SelectTrigger aria-label="Filter by outlet">
                <SelectValue placeholder="Filter by outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outlets</SelectItem>
                {availableOutlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as typeof sortBy);
              setSortOrder(order as typeof sortOrder);
            }}>
              <SelectTrigger aria-label="Sort reports">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="totalSales-desc">Total Sales (High to Low)</SelectItem>
                <SelectItem value="totalSales-asc">Total Sales (Low to High)</SelectItem>
                <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                <SelectItem value="createdAt-desc">Created (Newest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive-foreground">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Reports ({totalCount})</CardTitle>
            {loading && (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <div className="h-4 w-4 rounded-full bg-muted animate-pulse" aria-hidden="true"></div>
                <span className="sr-only">Loading reports…</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
              <p className="text-muted-foreground">
                {reports.length === 0 
                  ? "No sales reports have been created yet."
                  : "No reports match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" aria-busy={loading || undefined}>
              <Table aria-label="Sales reports table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Cash Deposits</TableHead>
                    <TableHead>Card Settlements</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.outlet.name}</div>
                          <div className="text-sm text-muted-foreground">{report.outlet.location}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(report.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        MVR {report.cashDeposits.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        MVR {report.cardSettlements.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        MVR {report.totalSales.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusColors[report.status])}>
                          {statusIcons[report.status]}
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.submittedBy.name}</div>
                          <div className="text-sm text-muted-foreground">{report.submittedBy.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report._count?.documents || 0} document{(report._count?.documents || 0) !== 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                              <span className="sr-only">Open actions menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/sales-reports/${report.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {canEdit(report) && (
                              <DropdownMenuItem 
                                onClick={() => router.push(`/sales-reports/${report.id}/edit`)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            
                            {canApprove && report.status === 'SUBMITTED' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setApprovalDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setRejectionDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {canDelete(report) && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedReport(report);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Sales Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this sales report for {selectedReport?.outlet.name} 
              on {selectedReport && format(parseISO(selectedReport.date), 'MMM dd, yyyy')}?
              This action cannot be undone.
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
