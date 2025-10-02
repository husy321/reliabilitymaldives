import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoicesPage() {
  const user = await requireRole(["ADMIN", "ACCOUNTS", "MANAGER", "ACCOUNTANT"]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-2">Manage invoicing and billing</p>
        </div>

        {/* KPI/status cards removed per design */}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invoice Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Complete invoicing system coming soon...</p>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Features will include:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Create and send invoices</li>
                <li>• Track payment status</li>
                <li>• Automated reminders</li>
                <li>• Reporting and analytics</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This page is accessible to: {user.role} users
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}