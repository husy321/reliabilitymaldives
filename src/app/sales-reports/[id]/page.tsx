import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { SalesReportDetailView } from '@/components/business/sales-reports/SalesReportDetailView';

const prisma = new PrismaClient();

interface Props {
  params: { id: string };
}

async function getSalesReport(id: string) {
  try {
    const report = await prisma.salesReport.findUnique({
      where: { id },
      include: {
        outlet: {
          select: {
            id: true,
            name: true,
            location: true,
            managerId: true
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          select: {
            id: true,
            originalName: true,
            category: true,
            fileSize: true,
            mimeType: true,
            createdAt: true
          }
        }
      }
    });

    return report;
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

export default async function SalesReportDetailPage({ params }: Props) {
  const user = await requireRole(['ADMIN', 'ACCOUNTS', 'MANAGER']);
  const report = await getSalesReport(params.id);

  if (!report) {
    notFound();
  }

  // Role-based access control
  if (user.role === 'MANAGER') {
    // Managers can only view reports from their outlets
    if (report.outlet.managerId !== user.id) {
      notFound();
    }
  }
  // ADMIN and ACCOUNTS can view all reports

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SalesReportDetailView report={report} currentUser={user} />
      </div>
    </div>
  );
}


