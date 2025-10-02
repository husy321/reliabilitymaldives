import { Skeleton } from "@/components/ui/skeleton";

export default function ReceivablesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Subnav skeleton */}
        <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-lg border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="space-y-2">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[350px]" />
            </div>
            <Skeleton className="h-9 w-[140px]" />
          </div>

          {/* Content - Table skeleton */}
          <div className="p-6 space-y-4">
            {/* Search and filters */}
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 flex-1 max-w-sm" />
              <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 py-3">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}

            {/* Pagination skeleton */}
            <div className="flex items-center justify-between pt-4">
              <Skeleton className="h-4 w-[120px]" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
