'use client';

import { useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { Shield, Users, Activity, Rocket, Stethoscope } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AdminLanguageSelector } from '@/components/admin-language-selector';
import { useT } from '@/lib/useT';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useT('admin');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminSessionActive = session?.user?.role === 'admin';

  useEffect(() => {
    if (!adminSessionActive) {
      sessionStorage.removeItem('admin_session_active');
      return;
    }

    sessionStorage.setItem('admin_session_active', 'true');

    return () => {
      sessionStorage.removeItem('admin_session_active');
    };
  }, [adminSessionActive]);

  useEffect(() => {
    if (!adminSessionActive) {
      return;
    }

    const clearTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };

    const scheduleLogout = () => {
      clearTimer();

      idleTimerRef.current = setTimeout(async () => {
        try {
          await fetch('/api/user/heartbeat/offline', { keepalive: true, method: 'POST' });
        } catch {
          // Best-effort offline signal; sign-out still runs.
        }

        sessionStorage.removeItem('admin_session_active');
        await signOut({ callbackUrl: `/${locale}/admin/signin` });
      }, 2 * 60 * 60 * 1000);
    };

    const handleActivity = () => {
      scheduleLogout();
    };

    const handleUnload = () => {
      sessionStorage.removeItem('admin_session_active');
      navigator.sendBeacon('/api/user/heartbeat/offline');
    };

    scheduleLogout();

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity));
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearTimer();
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [adminSessionActive, locale]);

  const navigation = [
    { name: t('title'), href: '/admin', icon: Shield },
    { name: t('manageUsers.title'), href: '/admin/manage-users', icon: Users },
    { name: t('superviseSystem.title'), href: '/admin/supervise-system', icon: Activity },
    { name: t('deployUpdates.title'), href: '/admin/deploy-updates', icon: Rocket },
    { name: t('diagnoseProblems.title'), href: '/admin/diagnose-problems', icon: Stethoscope },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      sidebarStorageKey="adminSidebarCollapsed"
      headerActions={<AdminLanguageSelector />}
      userDropdownProps={{
        profileHref: '/admin',
        settingsHref: '/admin',
        showProfileSettings: false,
        signOutCallbackUrl: `/${locale}/admin/signin`,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
