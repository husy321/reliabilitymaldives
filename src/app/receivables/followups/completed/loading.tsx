import { Skeleton } from "@/components/ui/skeleton";

export default function CompletedFollowupsLoading() {
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
              <Skeleton className="h-6 w-[220px]" />
              <Skeleton className="h-4 w-[350px]" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Date filter */}
              <div className="flex gap-4 mb-6">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[100px]" />
              </div>

              {/* Completed follow-up cards */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-[180px]" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                    <Skeleton className="h-6 w-[90px]" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2 items-center">
                    <Skeleton className="h-4 w-[140px]" />
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
