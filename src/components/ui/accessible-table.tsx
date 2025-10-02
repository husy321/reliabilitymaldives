"use client";

import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { flexRender, Table as TanStackTable } from "@tanstack/react-table";

interface AccessibleTableProps<T> {
  table: TanStackTable<T>;
  caption?: string;
  columns: any[];
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
}

export function AccessibleTable<T>({
  table,
  caption,
  columns,
  loading = false,
  emptyMessage = "No data found.",
  loadingMessage = "Loading...",
  className
}: AccessibleTableProps<T>) {
  return (
    <div className={className}>
      <Table role="table" aria-label={caption}>
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} role="row">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="whitespace-nowrap"
                    scope="col"
                    role="columnheader"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} role="row">
                  {columns.map((_, colIndex) => (
                    <TableCell
                      key={colIndex}
                      role="cell"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-muted/50"
                role="row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} role="cell">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow role="row">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
                role="cell"
                aria-live="polite"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}