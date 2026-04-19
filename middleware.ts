import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'fr', 'ar'] as const;
const defaultLocale = 'fr';
const adminDefaultLocale = 'en';
const apiAuthExclusions = ['/api/tickets', '/api/admin/nodes', '/api/admin/firmware', '/api/firmware'] as const;
const authPages = [
  '/admin/signin',
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

function isValidLocale(locale: string | null | undefined): locale is typeof locales[number] {
  return locales.includes(locale);
}

function isAuthPage(pathname: string): boolean {
  return authPages.some((page) => pathname.includes(page));
}

function stripLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (!locale) {
    return pathname;
  }

  const stripped = pathname.slice(locale.length + 1);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function isAdminAreaPath(pathname: string): boolean {
  const localizedPath = stripLocalePrefix(pathname);
  return localizedPath === '/admin' || localizedPath.startsWith('/admin/');
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (apiAuthExclusions.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let locale = getLocaleFromPath(pathname);
  const userLocaleCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const adminLocaleCookie = request.cookies.get('NEXT_LOCALE_ADMIN')?.value;
  const adminPath = isAdminAreaPath(pathname);

  if (!locale) {
    const preferredLocale = adminPath
      ? adminLocaleCookie || adminDefaultLocale
      : userLocaleCookie || defaultLocale;

    if (isValidLocale(preferredLocale)) {
      const prefixedPath = pathname === '/' ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;
      return NextResponse.redirect(new URL(prefixedPath, request.url));
    }
    locale = adminPath ? adminDefaultLocale : defaultLocale;
  }

  if (isAuthPage(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const operatorSignInPaths = [
      `/${locale}/auth/signin`,
      `/${locale}/signin`,
      '/auth/signin',
      '/signin',
    ];

    if (token?.role === 'admin' && operatorSignInPaths.includes(pathname)) {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }

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
