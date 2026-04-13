'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const HEARTBEAT_INTERVAL = 30_000;

export function useHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Presence updates should not crash the UI.
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    const handleUnload = () => {
      navigator.sendBeacon('/api/user/heartbeat/offline');
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [status]);
}
