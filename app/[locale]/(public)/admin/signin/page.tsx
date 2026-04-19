'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

export default function AdminSignInPage() {
  const router = useRouter();
  const params = useParams<{ locale?: string | string[] }>();
  const t = useTranslations('home.auth.adminSignin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const locale = Array.isArray(params?.locale)
    ? (params.locale[0] ?? 'fr')
    : (params?.locale ?? 'fr');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        expectedRole: 'admin',
        roleMismatchError: '1',
      });

      if (result?.error) {
        if (result.error === 'ROLE_MISMATCH') {
          setError(t('errors.operatorOnlyPortal'));
        } else {
          setError(t('errors.invalidCredentials'));
        }
        setIsLoading(false);
        return;
      }

      await fetch('/api/locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale, scope: 'admin' }),
      }).catch(() => null);

      router.push(`/${locale}/admin`);
      router.refresh();
    } catch {
      setError(t('errors.unexpected'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 end-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-indigo-500/30 shadow-xl shadow-indigo-500/10">
        <CardHeader className="space-y-1">
          <Badge className="mb-2 w-fit bg-indigo-600 text-white hover:bg-indigo-600">
            {t('badge')}
          </Badge>
          <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email">{t('emailLabel')}</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">{t('passwordLabel')}</Label>
              <PasswordInput
                id="admin-password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="text-end">
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? t('signingIn') : t('submit')}
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t('operatorPrompt')}{' '}
              <Link href={`/${locale}/auth/signin`} className="font-medium text-primary hover:underline">
                {t('operatorLink')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
