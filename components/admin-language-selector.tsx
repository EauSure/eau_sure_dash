'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/lib/useT';

const LOCALES = [
  { code: 'fr', labelKey: 'localeNames.fr', flag: 'FR' },
  { code: 'en', labelKey: 'localeNames.en', flag: 'EN' },
  { code: 'ar', labelKey: 'localeNames.ar', flag: 'AR' },
] as const;

export function AdminLanguageSelector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT('common');

  const switchLocale = async (newLocale: string) => {
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale, scope: 'admin' }),
    });

    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.replace(segments.join('/'));
  };

  return (
    <div className="inline-flex items-center">
      <select
        value={currentLocale}
        onChange={(e) => void switchLocale(e.target.value)}
        aria-label={t('language')}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
      >
        {LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag} {t(locale.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}