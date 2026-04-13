import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import HeartbeatProvider from '@/components/heartbeat-provider';

export default async function UserDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  if (session.user.role === 'admin') {
    redirect(`/${locale}/admin`);
  }

  return (
    <DashboardLayout>
      <HeartbeatProvider>{children}</HeartbeatProvider>
    </DashboardLayout>
  );
}
