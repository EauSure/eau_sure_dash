'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { SettingsSyncProvider } from '@/components/settings-sync-provider';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SettingsSyncProvider>{children}</SettingsSyncProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
