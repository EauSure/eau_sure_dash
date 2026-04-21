'use client';

import { useCallback, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split('/')[1];
  return locale === 'en' || locale === 'fr' || locale === 'ar' ? locale : 'fr';
}

export function useIdleTimeout() {
  const { status } = useSession();
  const pathname = usePathname();
  const { preferences } = useUserPreferences();
  const lastActivityRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signingOutRef = useRef(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || preferences.sessionTimeout <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    signingOutRef.current = false;
    markActivity();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    intervalRef.current = setInterval(() => {
      if (signingOutRef.current) return;

      const timeoutMs = preferences.sessionTimeout * 60 * 1000;
      if (Date.now() - lastActivityRef.current <= timeoutMs) return;

      signingOutRef.current = true;
      navigator.sendBeacon('/api/user/heartbeat/offline');
      void signOut({ callbackUrl: `/${getLocaleFromPath(pathname)}/auth/signin` });
    }, 60 * 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [markActivity, pathname, preferences.sessionTimeout, status]);
}
