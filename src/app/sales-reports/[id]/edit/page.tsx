import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { EditSalesReportClient } from '@/components/business/sales-reports/EditSalesReportClient';

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

export default async function EditSalesReportPage({ params }: Props) {
  const user = await requireRole(['ADMIN', 'MANAGER']);
  const report = await getSalesReport(params.id);

  if (!report) {
    notFound();
  }

  // Role-based access control
  if (user.role === 'MANAGER') {
    // Managers can only edit reports from their outlets and only if in DRAFT or REJECTED status
    if (report.outlet.managerId !== user.id || !['DRAFT', 'REJECTED'].includes(report.status)) {
      notFound();
    }
  }
  // ADMIN can edit any report that's not APPROVED

  if (user.role !== 'ADMIN' && report.status === 'APPROVED') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <EditSalesReportClient report={report} currentUser={user} />
      </div>
    </div>
  );
}


