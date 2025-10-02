import { requireRole } from "@/lib/auth";
import { SalesReportsList } from "@/components/business/sales-reports/SalesReportsList";

export default async function SalesReportsPage() {
  const user = await requireRole(["ADMIN", "ACCOUNTS", "MANAGER"]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SalesReportsList />
      </div>
    </div>
  );
}