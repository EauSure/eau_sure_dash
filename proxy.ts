import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/csrf';

const locales = ['en', 'fr', 'ar'] as const;
const defaultLocale = 'fr';
const adminDefaultLocale = 'fr';
const PUBLIC_PATHS = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/admin/signin',
  '/api/auth',
  '/api/signup',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/locale',
  '/_next',
  '/favicon.ico',
  '/public',
] as const;

function getLocaleFromPath(pathname: string): string | null {
  const firstSegment = pathname.split('/')[1];
  return locales.includes(firstSegment as (typeof locales)[number])
    ? firstSegment
    : null;
}

function isValidLocale(locale: string | null | undefined): locale is typeof locales[number] {
  return !!locale && locales.includes(locale as (typeof locales)[number]);
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

function isPublicPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, '') || '/';

  return PUBLIC_PATHS.some((publicPath) => {
    return (
      withoutLocale === publicPath ||
      withoutLocale.startsWith(`${publicPath}/`) ||
      pathname.startsWith(publicPath)
    );
  });
}

async function fingerprintFromUserAgent(userAgent: string): Promise<string> {
  const encoded = new TextEncoder().encode(userAgent);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Temporary diagnostic logging for redirect-loop triage.
  // Remove once localhost redirect behavior is stable.
  const debugToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  console.log('[middleware]', request.method, pathname, 'token:', !!debugToken, 'role:', debugToken?.role);

  // Step 1: Always bypass public paths before any redirect logic.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (request.method === 'POST' && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

  const token = debugToken;

  // Step 4: Not authenticated -> route to the appropriate sign-in page.
  if (!token) {
    const localizedPath = stripLocalePrefix(pathname);
    if (localizedPath.endsWith('/signin')) {
      return NextResponse.next();
    }

    const isAdminPath = isAdminAreaPath(pathname);
    const signInPath = isAdminPath ? `/${locale}/admin/signin` : `/${locale}/auth/signin`;
    const signInUrl = new URL(signInPath, request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Fingerprint mismatch invalidates the request and forces fresh auth.
  const currentFingerprint = await fingerprintFromUserAgent(request.headers.get('user-agent') || '');
  if (token.fingerprint && token.fingerprint !== currentFingerprint) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
  }

  const localizedPath = stripLocalePrefix(pathname);
  const isAuthPath =
    localizedPath === '/signin' ||
    localizedPath === '/signup' ||
    localizedPath === '/admin/signin' ||
    localizedPath === '/forgot-password' ||
    localizedPath === '/reset-password' ||
    localizedPath === '/forget-password';

  if (isAuthPath) {
    const dest = token.role === 'admin' ? `/${locale}/admin` : `/${locale}/dashboard`;
    if (pathname === dest) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const isDashboardRoute = pathname.startsWith(`/${locale}/dashboard`) || pathname.startsWith('/dashboard');
  const isAdminRoute =
    pathname.startsWith(`/${locale}/admin`) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith(`/${locale}/dashboard/admin`) ||
    pathname.startsWith('/dashboard/admin');

  if (isDashboardRoute || isAdminRoute) {
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};
