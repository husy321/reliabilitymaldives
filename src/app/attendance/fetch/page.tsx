import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AttendanceFetch } from '@/components/business/attendance/AttendanceFetch';

export default async function AttendanceFetchPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Attendance Fetch</h1>
        <p className="text-muted-foreground">
          Manually fetch attendance data from ZKT devices for a specific date range
        </p>
      </div>
      
      <AttendanceFetch />
    </div>
  );
}