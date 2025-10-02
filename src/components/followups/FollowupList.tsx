"use client";

import React from "react";
import { useFollowupStore } from "@/stores/followup-store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { FollowUp, FollowUpPriority, FollowUpStatus } from "@/types/followup";
import { FollowupDetailsDialog } from './FollowupDetailsDialog';
import { Calendar, Mail, MessageSquare, Phone } from "lucide-react";
import { useStandardTable } from "@/hooks/useStandardTable";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { AccessibleTable } from "@/components/ui/accessible-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";

function formatDate(date: Date): string {
  const dateObj = new Date(date);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}

const PRIORITY_LABEL: Record<FollowUpPriority, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

const METHOD_ICON: Record<string, JSX.Element> = {
  CALL: <Phone className="h-3.5 w-3.5" />,
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  TEXT: <MessageSquare className="h-3.5 w-3.5" />,
};

export function FollowupList({ actionButton }: { actionButton?: React.ReactNode }) {
  const { followups, filters, pagination, loading, setFilters, setPage, setPageSize, fetchFollowups } = useFollowupStore();
  const [search, setSearch] = React.useState("");
  const [priority, setPriority] = React.useState<FollowUpPriority | 'all'>('all');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Define columns for the standardized table
  const columns: ColumnDef<FollowUp>[] = [
    {
      accessorKey: "customer",
      header: ({ column }) => (
        <SortableHeader
          title="Customer"
          column={column}
          onSort={undefined}
          sortField="customer"
        />
      ),
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{followup.customer?.name ?? '-'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "receivable",
      header: "Invoice",
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm">{followup.receivable?.invoiceNumber ?? followup.receivableId.slice(0,8)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "followupDate",
      header: ({ column }) => (
        <SortableHeader
          title="Follow-up"
          column={column}
          onSort={undefined}
          sortField="followupDate"
          icon={<Calendar className="mr-1 h-4 w-4" />}
        />
      ),
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            {formatDate(followup.followupDate)}
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <Badge priority={followup.priority.toLowerCase() as 'high' | 'medium' | 'low'}>
            {PRIORITY_LABEL[followup.priority]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "contactMethod",
      header: "Method",
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="flex items-center gap-2 text-sm">
            {METHOD_ICON[followup.contactMethod]}
          </div>
        );
      },
    },
    {
      accessorKey: "initialNotes",
      header: "Notes",
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="max-w-[360px] truncate">
            {followup.initialNotes ?? '-'}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "View",
      cell: ({ row }) => {
        const followup = row.original;
        return <FollowupDetailsDialog followupId={followup.id} />;
      },
    },
  ];

  // Use the standardized table hook
  const { table, pagination: tablePagination } = useStandardTable({
    data: followups,
    columns,
    totalCount: pagination?.totalCount ?? 0,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? filters.pageSize ?? 20,
    loading,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPageChange: setPage,
  });

  // Initialize on mount
  React.useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Fetch when pagination changes
  React.useEffect(() => {
    if (isInitialized && filters.status === 'active') {
      fetchFollowups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.pageSize, isInitialized]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({
        priority: priority === 'all' ? undefined : priority,
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
    }, 300);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, dateRange]);

  // Trigger fetch when filters object changes (debounced via setFilters above)
  React.useEffect(() => {
    if (isInitialized && filters.status === 'active') {
      fetchFollowups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.priority, filters.startDate, filters.endDate, filters.sortBy, filters.sortOrder, isInitialized]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({ customerId: undefined, receivableId: undefined });
    }, 500);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            placeholder="Search follow-ups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value={FollowUpPriority.HIGH}>High</SelectItem>
              <SelectItem value={FollowUpPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={FollowUpPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-full sm:w-auto">
            <DatePickerWithRange date={dateRange as any} onDateChange={(v: any) => setDateRange(v)} />
          </div>
          {(dateRange.from || dateRange.to) && (
            <Button
              onClick={() => setDateRange({})}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actionButton}
        </div>
      </div>

      <div className="rounded-md border">
        <AccessibleTable
          table={table}
          columns={columns}
          loading={loading}
          caption="Follow-ups table showing customer information, invoice details, priority, and contact method"
          emptyMessage="No follow-ups found."
          loadingMessage="Loading follow-ups..."
        />
      </div>

      <StandardPagination
        pagination={tablePagination}
        onPageChange={setPage}
        loading={loading}
        showPageSizeSelector={true}
        onPageSizeChange={setPageSize}
        variant="simple"
      />
    </div>
  );
}
