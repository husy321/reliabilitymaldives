import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-[150px]" />
        <Skeleton className="h-5 w-[200px]" />
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm">
            <div className="p-6 space-y-4">
              {/* Widget header */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-[140px]" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>

              {/* Widget content */}
              <div className="space-y-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-4 w-[180px]" />
                <div className="flex items-center gap-2 mt-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
