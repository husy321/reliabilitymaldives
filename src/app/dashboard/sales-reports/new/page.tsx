import { requireRole } from "@/lib/auth";
import NewSalesReportClient from "./client";

export default async function NewSalesReportPage() {
  // Server-side role verification
  await requireRole(["ADMIN", "MANAGER"]);

  return <NewSalesReportClient />;
}