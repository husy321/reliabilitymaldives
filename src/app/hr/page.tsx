import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HRPage() {
  const user = await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Human Resources</h1>
          <p className="text-muted-foreground mt-2">Employee management and HR operations</p>
        </div>

        {/* KPI/status cards removed per design */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Employee management features coming soon...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance & Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Leave management system coming soon...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This page is accessible to: {user.role} users only
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}