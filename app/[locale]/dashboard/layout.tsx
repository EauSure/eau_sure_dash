import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import HeartbeatProvider from '@/components/heartbeat-provider';
import { UserPreferencesProvider } from '@/components/providers/UserPreferencesProvider';
import { dbConnect } from '@/lib/mongodb';
import type { CompleteUserProfile } from '@/types/user-profile';

async function getInitialPreferences(email: string, role?: string): Promise<Partial<CompleteUserProfile> | null> {
  try {
    const client = await dbConnect();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const user = await db.collection('users').findOne(
      { email },
      {
        projection: {
          timezone: 1,
          language: 1,
          compactMode: 1,
          sidebarDefaultCollapsed: 1,
          dateFormat: 1,
          timeFormat: 1,
          notificationsEnabled: 1,
          alertSound: 1,
          alertDisplayThreshold: 1,
          sessionTimeout: 1,
          presenceVisible: 1,
          loginHistory: 1,
          sensorRefreshRate: 1,
          dashboardDefaultTab: 1,
          tempUnit: 1,
          volumeUnit: 1,
          reducedMotion: 1,
          highContrast: 1,
          fontSize: 1,
        },
      }
    );

    if (!user) return null;

    return {
      timezone: typeof user.timezone === 'string' ? user.timezone : 'Africa/Tunis',
      language: typeof user.language === 'string' ? user.language : 'fr',
      compactMode: user.compactMode ?? false,
      sidebarDefaultCollapsed: user.sidebarDefaultCollapsed ?? false,
      dateFormat: user.dateFormat ?? 'DD/MM/YYYY',
      timeFormat: user.timeFormat ?? '24h',
      notificationsEnabled: user.notificationsEnabled ?? false,
      alertSound: user.alertSound ?? false,
      alertDisplayThreshold: user.alertDisplayThreshold ?? 'all',
      sessionTimeout: typeof user.sessionTimeout === 'number' ? user.sessionTimeout : role === 'admin' ? 120 : 60,
      presenceVisible: user.presenceVisible ?? true,
      loginHistory: Array.isArray(user.loginHistory)
        ? user.loginHistory.slice(0, 5).map((entry: { timestamp: Date; timezone?: string }) => ({
            timestamp: entry.timestamp?.toISOString?.() ?? String(entry.timestamp),
            timezone: entry.timezone || user.timezone || 'Africa/Tunis',
          }))
        : [],
      sensorRefreshRate: typeof user.sensorRefreshRate === 'number' ? user.sensorRefreshRate : 10,
      dashboardDefaultTab: user.dashboardDefaultTab ?? 'overview',
      tempUnit: user.tempUnit ?? 'C',
      volumeUnit: user.volumeUnit ?? 'L',
      reducedMotion: user.reducedMotion ?? false,
      highContrast: user.highContrast ?? false,
      fontSize: user.fontSize ?? 'md',
    };
  } catch {
    return null;
  }
}

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

  const initialProfile = session.user.email
    ? await getInitialPreferences(session.user.email, session.user.role)
    : null;

  return (
    <UserPreferencesProvider initialProfile={initialProfile}>
      <DashboardLayout>
        <HeartbeatProvider>{children}</HeartbeatProvider>
      </DashboardLayout>
    </UserPreferencesProvider>
  );
}
