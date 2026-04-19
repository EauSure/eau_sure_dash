'use client';

import { useTranslations } from 'next-intl';

export function useT(namespace: string) {
  const t = useTranslations(namespace);

  return (key: string, values?: Record<string, unknown>) => {
    try {
      return t(key, values);
    } catch {
      return `${namespace}.${key}`;
    }
  };
}