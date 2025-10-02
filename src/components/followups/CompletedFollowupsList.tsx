"use client";

import React from "react";
import { useFollowupStore } from "@/stores/followup-store";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { FollowUp, FollowUpPriority, FollowUpStatus } from "@/types/followup";
import { FollowupDetailsDialog } from './FollowupDetailsDialog';
import { Calendar, CheckCircle2, Mail, MessageSquare, Phone } from "lucide-react";
import { useStandardTable } from "@/hooks/useStandardTable";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { AccessibleTable } from "@/components/ui/accessible-table";
import { ColumnDef } from "@tanstack/react-table";

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

export function CompletedFollowupsList() {
  const { followups, filters, pagination, loading, setFilters, setPage, setPageSize, fetchFollowups } = useFollowupStore();
  const [completionDateRange, setCompletionDateRange] = React.useState<{ from?: Date; to?: Date }>({});
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
      accessorKey: "completedAt",
      header: ({ column }) => (
        <SortableHeader
          title="Completed On"
          column={column}
          onSort={undefined}
          sortField="completedAt"
          icon={<CheckCircle2 className="mr-1 h-4 w-4" />}
        />
      ),
      cell: ({ row }) => {
        const followup = row.original;
        return (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {followup.completedAt ? formatDate(followup.completedAt) : '-'}
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

  // Set status to COMPLETED on mount and fetch immediately
  React.useEffect(() => {
    setFilters({
      status: FollowUpStatus.COMPLETED,
      sortBy: 'completedAt',
      sortOrder: 'desc'
    });
    setIsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch when filters are properly initialized
  React.useEffect(() => {
    if (isInitialized && filters.status === FollowUpStatus.COMPLETED) {
      fetchFollowups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.pageSize, filters.status, isInitialized]);

  // Handle completion date range filter
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({
        completionStartDate: completionDateRange.from,
        completionEndDate: completionDateRange.to,
      });
    }, 300);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionDateRange]);

  // Fetch when completion date filters change
  React.useEffect(() => {
    if (isInitialized && filters.status === FollowUpStatus.COMPLETED) {
      fetchFollowups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.completionStartDate, filters.completionEndDate, isInitialized]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Completion Date:</label>
          <DatePickerWithRange
            date={completionDateRange as any}
            onDateChange={(v: any) => setCompletionDateRange(v)}
          />
          {(completionDateRange.from || completionDateRange.to) && (
            <Button
              onClick={() => setCompletionDateRange({})}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <AccessibleTable
          table={table}
          columns={columns}
          loading={loading}
          caption="Completed follow-ups table showing customer information, invoice details, completion date, and notes"
          emptyMessage="No completed follow-ups found."
          loadingMessage="Loading completed follow-ups..."
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