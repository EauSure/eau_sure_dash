'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LoginLanguageSelector } from '@/components/login-language-selector';
import { PasswordInput } from '@/components/ui/password-input';
import { useT } from '@/lib/useT';

type SignInFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function SignInPage() {
  const router = useRouter();
  const params = useParams<{ locale?: string | string[] }>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const t = useT('home.auth.signin');
  const {
    register,
    handleSubmit,
  } = useForm<SignInFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const locale = Array.isArray(params?.locale)
    ? (params.locale[0] ?? 'fr')
    : (params?.locale ?? 'fr');

  const onSubmit = async (values: SignInFormValues) => {
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        rememberMe: String(values.rememberMe),
        expectedRole: 'operator',
      });

      if (result?.error) {
        setError(t('errors.invalidCredentials'));
      } else {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      }
    } catch {
      setError(t('errors.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <LoginLanguageSelector />
      <div className="absolute top-4 start-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-4">
        <Card className="w-full border-border/60 shadow-none">
          <CardHeader className="space-y-2 px-8 pt-8 pb-3">
            <CardTitle className="text-3xl font-bold tracking-tight">{t('title')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('description')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 px-8 py-4">
              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  required
                  {...register('email', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  {...register('password', { required: true })}
                />
                <div className="text-end">
                  <Link
                    href={`/${locale}/auth/forgot-password`}
                    className="text-[13px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-foreground">{t('rememberMe')}</span>
              </label>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-8 pt-2 pb-8">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('signingIn') : t('submit')}
              </Button>
              <p className="text-[13px] text-muted-foreground text-center">
                {t('noAccount')}{' '}
                <Link
                  href={`/${locale}/auth/signup`}
                  className="font-medium text-foreground hover:underline"
                >
                  {t('signUp')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-[13px] text-muted-foreground text-center">
          {t('adminPrompt')}{' '}
          <Link
            href={`/${locale}/admin/signin`}
            className="font-medium text-foreground hover:underline"
          >
            {t('adminPortalLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
