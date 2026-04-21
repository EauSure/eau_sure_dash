'use client';

import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useIdleTimeout } from '@/lib/hooks/useIdleTimeout';

export default function HeartbeatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useHeartbeat();
  useIdleTimeout();
  return <>{children}</>;
}
