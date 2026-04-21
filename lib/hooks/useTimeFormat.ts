'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';

export function useTimeFormat() {
  const locale = useLocale();
  const { preferences } = useUserPreferences();

  const formatTime = useCallback(
    (value: Date | string | number, includeSeconds = false) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';

      return new Intl.DateTimeFormat(locale, {
        timeZone: preferences.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: preferences.timeFormat === '12h',
      }).format(date);
    },
    [locale, preferences.timeFormat, preferences.timezone]
  );

  return { formatTime };
}
