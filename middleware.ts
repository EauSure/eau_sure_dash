import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'fr', 'ar'] as const;
const defaultLocale = 'fr';
const authPages = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/forget-password',
];

function getLocaleFromPath(pathname: string): string | null {
  const firstSegment = pathname.split('/')[1];
  return locales.includes(firstSegment as (typeof locales)[number])
    ? firstSegment
    : null;
}

function isValidLocale(locale: any): locale is typeof locales[number] {
  return locales.includes(locale);
}

function isAuthPage(pathname: string): boolean {
  return authPages.some((page) => pathname.includes(page));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let locale = getLocaleFromPath(pathname);
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  if (!locale) {
    const preferredLocale = localeCookie || defaultLocale;
    if (isValidLocale(preferredLocale)) {
      const prefixedPath = pathname === '/' ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;
      return NextResponse.redirect(new URL(prefixedPath, request.url));
    }
    locale = defaultLocale;
  }

  if (isAuthPage(pathname)) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};
