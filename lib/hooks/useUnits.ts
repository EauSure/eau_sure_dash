'use client';

import { useCallback } from 'react';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';

export function useUnits() {
  const { preferences } = useUserPreferences();

  const convertTemp = useCallback(
    (celsius: number) => {
      if (!Number.isFinite(celsius)) return '-';
      if (preferences.tempUnit === 'F') {
        return `${Math.round(((celsius * 9) / 5 + 32) * 10) / 10}°F`;
      }
      return `${Math.round(celsius * 10) / 10}°C`;
    },
    [preferences.tempUnit]
  );

  const convertVolume = useCallback(
    (liters: number) => {
      if (!Number.isFinite(liters)) return '-';
      if (preferences.volumeUnit === 'gal') {
        return `${Math.round(liters * 0.264172 * 10) / 10} gal`;
      }
      return `${Math.round(liters * 10) / 10} L`;
    },
    [preferences.volumeUnit]
  );

  return { convertTemp, convertVolume, tempUnit: preferences.tempUnit, volumeUnit: preferences.volumeUnit };
}
