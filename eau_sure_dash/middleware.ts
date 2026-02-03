import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
