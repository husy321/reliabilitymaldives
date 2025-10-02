import { Skeleton } from "@/components/ui/skeleton";

export default function FollowupsLoading() {
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
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
            <Skeleton className="h-9 w-[150px]" />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <Skeleton className="h-10 flex-1 max-w-sm" />
                <Skeleton className="h-10 w-[120px]" />
                <Skeleton className="h-10 w-[150px]" />
              </div>

              {/* Follow-up cards */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-[180px]" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                    <Skeleton className="h-6 w-[80px]" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
