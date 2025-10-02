"use client";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

interface SortableHeaderProps {
  title: string;
  column: any;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SortableHeader({
  title,
  column,
  onSort,
  sortField,
  icon,
  className = "h-8 px-2 font-medium"
}: SortableHeaderProps) {
  const handleSort = () => {
    const isDesc = column.getIsSorted() === "desc";
    const newDirection = isDesc ? "asc" : "desc";
    column.toggleSorting(isDesc);

    if (onSort && sortField) {
      onSort(sortField, newDirection);
    }
  };

  const sortDirection = column.getIsSorted();
  const ariaLabel = sortDirection
    ? `Sort by ${title} ${sortDirection === 'desc' ? 'ascending' : 'descending'}`
    : `Sort by ${title}`;

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className={className}
      aria-label={ariaLabel}
      aria-sort={
        sortDirection === "desc" ? "descending" :
        sortDirection === "asc" ? "ascending" :
        "none"
      }
    >
      {icon}
      {title}
      {sortDirection === "desc" ? (
        <ChevronDownIcon className="ml-2 h-4 w-4" aria-hidden="true" />
      ) : sortDirection === "asc" ? (
        <ChevronUpIcon className="ml-2 h-4 w-4" aria-hidden="true" />
      ) : null}
    </Button>
  );
}