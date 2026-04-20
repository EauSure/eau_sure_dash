'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
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
        display: 'flex',
        gap: '6px',
      }}
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            background:
              currentLocale === l.code
                ? 'var(--color-background-info)'
                : 'var(--color-background-secondary)',
            color:
              currentLocale === l.code
                ? 'var(--color-text-info)'
                : 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontWeight: currentLocale === l.code ? 500 : 400,
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
