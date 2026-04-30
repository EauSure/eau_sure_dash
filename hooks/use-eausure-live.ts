'use client';

import { useLiveSensorData } from './useLiveSensorData';

export function useEauSureLive(options?: { pollIntervalMs?: number }) {
  return useLiveSensorData(undefined, undefined, options?.pollIntervalMs);
}
