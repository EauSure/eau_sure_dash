'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const AWAY_THRESHOLD_MS = 3 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

type PresenceStatus = 'online' | 'away';

export function useHeartbeat() {
  const { status } = useSession();
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentStatusRef = useRef<PresenceStatus>('online');

  const sendPresence = useCallback(async (presenceStatus: PresenceStatus) => {
    try {
      await fetch('/api/user/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: presenceStatus }),
      });
    } catch {
      // Presence updates should not crash the UI.
    }
  }, []);

  const scheduleAway = useCallback(() => {
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
    }

    awayTimerRef.current = setTimeout(() => {
      currentStatusRef.current = 'away';
      void sendPresence('away');
    }, AWAY_THRESHOLD_MS);
  }, [sendPresence]);

  const handleActivity = useCallback(() => {
    if (currentStatusRef.current === 'away') {
      currentStatusRef.current = 'online';
      void sendPresence('online');
    }

    scheduleAway();
  }, [scheduleAway, sendPresence]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    currentStatusRef.current = 'online';
    void sendPresence('online');
    scheduleAway();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    heartbeatTimerRef.current = setInterval(() => {
      void sendPresence(currentStatusRef.current);
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleUnload = () => {
      navigator.sendBeacon('/api/user/heartbeat/offline');
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [handleActivity, scheduleAway, sendPresence, status]);
}
