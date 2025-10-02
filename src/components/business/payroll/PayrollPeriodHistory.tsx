'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Eye, Users, DollarSign, Search, Filter, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import type { PayrollHistoryItem } from '@/types/payroll';

interface PayrollPeriodHistoryProps {
  historyItems: PayrollHistoryItem[];
  onViewDetails: (periodId: string) => void;
  onExportClick?: (periodId: string) => void;
  onDownloadExport?: (periodId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function PayrollPeriodHistory({
  historyItems,
  onViewDetails,
  onExportClick,
  onDownloadExport,
  isLoading = false,
  className
}: PayrollPeriodHistoryProps) {
  const [filteredItems, setFilteredItems] = useState(historyItems);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Apply filters
  const applyFilters = () => {
    let filtered = historyItems;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Search filter (by calculated by name or period dates)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.calculatedBy?.toLowerCase().includes(term) ||
        format(item.periodStartDate, 'MMM dd, yyyy').toLowerCase().includes(term) ||
        format(item.periodEndDate, 'MMM dd, yyyy').toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  };

  // Apply filters when dependencies change
  useState(() => {
    applyFilters();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'CALCULATING': return 'bg-blue-100 text-blue-800';
      case 'CALCULATED': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = filteredItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalEmployees = filteredItems.reduce((sum, item) => sum + item.totalEmployees, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Payroll History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-primary">{filteredItems.length}</div>
              <div className="text-sm text-muted-foreground">Periods</div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <div className="text-sm text-muted-foreground">Employee Records</div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Payroll</div>
            </div>

            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-primary">
                ${filteredItems.length > 0 ? (totalAmount / filteredItems.length).toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">Avg per Period</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by period dates or calculated by..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    applyFilters();
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  applyFilters();
                }}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CALCULATING">Calculating</SelectItem>
                  <SelectItem value="CALCULATED">Calculated</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Periods ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading payroll history...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-muted-foreground">
                {historyItems.length === 0 ? 'No payroll periods found.' : 'No periods match your filters.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Calculated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">
                          {format(item.periodStartDate, "MMM dd")} - {format(item.periodEndDate, "MMM dd, yyyy")}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {item.totalEmployees}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">${item.totalAmount.toFixed(2)}</div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {item.calculatedBy || '-'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {item.calculatedAt
                            ? format(item.calculatedAt, "MMM dd, yyyy")
                            : '-'
                          }
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(item.id)}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {item.status === 'APPROVED' && onExportClick && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onExportClick(item.id)}
                              className="h-8 w-8 p-0"
                              title="Export Payroll"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}

                          {item.status === 'APPROVED' && onDownloadExport && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadExport(item.id)}
                              className="h-8 w-8 p-0"
                              title="Download Export"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination could be added here if needed */}
        </CardContent>
      </Card>
    </div>
  );
}