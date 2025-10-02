import { requireAuth } from "@/lib/auth";
import DashboardWidgets from "@/components/business/dashboard/dashboard-widgets";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <span className="text-sm text-muted-foreground">{user.name} ({user.role})</span>
      </div>
      <DashboardWidgets userRole={user.role} />
    </div>
  );
}