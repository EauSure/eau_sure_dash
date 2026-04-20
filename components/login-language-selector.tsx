'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

export function LoginLanguageSelector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = async (newLocale: string) => {
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    });
    const segments = pathname.split('/');
    const supportedLocales = ['fr', 'en', 'ar'];
    if (supportedLocales.includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.replace(segments.join('/'));
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '1.5rem',
        insetInlineEnd: '1.5rem',
      }}
    >
      <select
        value={currentLocale}
        onChange={(event) => {
          void switchLocale(event.target.value);
        }}
        aria-label="Select language"
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: 'none',
          paddingInline: '0.25rem',
          paddingBlock: '0.125rem',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.label}
          </option>
        ))}
      </select>
    </div>
  );
}
