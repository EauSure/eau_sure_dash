import createMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'fr', 'ar'] as const;

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'fr',
  localePrefix: 'as-needed'
});

function getLocaleFromPath(pathname: string): string {
  const firstSegment = pathname.split('/')[1];
  return locales.includes(firstSegment as (typeof locales)[number])
    ? firstSegment
    : 'fr';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);

  const isDashboardRoute = pathname.startsWith(`/${locale}/dashboard`) || pathname.startsWith('/dashboard');
  const isAdminRoute =
    pathname.startsWith(`/${locale}/admin`) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith(`/${locale}/dashboard/admin`) ||
    pathname.startsWith('/dashboard/admin');

  if (isDashboardRoute || isAdminRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signInUrl = new URL(`/${locale}/auth/signin`, request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    if (isDashboardRoute && token.role === 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }

    if (isAdminRoute && token.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
