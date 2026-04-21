'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function useDateFormat() {
  const locale = useLocale();
  const { preferences } = useUserPreferences();

  const formatDate = useCallback(
    (value: Date | string | number) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';

      const parts = new Intl.DateTimeFormat(locale, {
        timeZone: preferences.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);

      const day = parts.find((part) => part.type === 'day')?.value ?? pad(date.getDate());
      const month = parts.find((part) => part.type === 'month')?.value ?? pad(date.getMonth() + 1);
      const year = parts.find((part) => part.type === 'year')?.value ?? String(date.getFullYear());

      if (preferences.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      if (preferences.dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
      return `${day}/${month}/${year}`;
    },
    [locale, preferences.dateFormat, preferences.timezone]
  );

  return { formatDate };
}
