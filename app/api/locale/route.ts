import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') || request.headers.get('referer');

    if (origin) {
      const sourceOrigin = new URL(origin).origin;
      if (sourceOrigin !== request.nextUrl.origin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { locale, scope } = body;

    if (!locale || !['en', 'fr', 'ar'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      );
    }

    const cookieScope = scope === 'admin' ? 'admin' : 'user';
    const cookieName = cookieScope === 'admin' ? 'NEXT_LOCALE_ADMIN' : 'NEXT_LOCALE';

    const response = NextResponse.json({ success: true, locale });
    response.cookies.set(cookieName, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Error setting locale:', error);
    return NextResponse.json(
      { error: 'Failed to set locale' },
      { status: 500 }
    );
  }
}
