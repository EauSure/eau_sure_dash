'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

const SUPPORTED_LOCALES = new Set(['fr', 'en', 'ar']);

export function SettingsSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const hasAppliedLocale = useRef(false);

  useEffect(() => {
    if (session?.user?.theme) {
      setTheme(session.user.theme);
    }
  }, [session?.user?.theme, setTheme]);

  useEffect(() => {
    if (!session || hasAppliedLocale.current) return;

    hasAppliedLocale.current = true;
    const preferredLanguage = session.user?.language;
    const segments = pathname.split('/');
    const currentLocale = segments[1];

    if (
      preferredLanguage &&
      SUPPORTED_LOCALES.has(preferredLanguage) &&
      preferredLanguage !== currentLocale
    ) {
      segments[1] = preferredLanguage;
      router.replace(segments.join('/') || `/${preferredLanguage}`);
    }
  }, [pathname, router, session]);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    fetch('/api/user/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (!cancelled && typeof user?.sidebarCollapsed === 'boolean') {
          localStorage.setItem('sidebarCollapsed', String(user.sidebarCollapsed));
        }
      })
      .catch(() => {
        // Local storage is already a safe fallback for instant sidebar rendering.
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return children;
}
