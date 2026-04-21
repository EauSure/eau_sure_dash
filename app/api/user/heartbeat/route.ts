import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieName } from '@/lib/session-cookie';
import { updateUserPresenceByEmail, updateUserPresenceById } from '@/lib/user';

const ONLINE_STATUS = 'online';
const AWAY_STATUS = 'away';

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName,
  });
  const email = typeof token?.email === 'string' ? token.email : null;
  const userId = typeof token?.id === 'string' ? token.id : null;

  if (!email && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({} as { status?: string }));
    const presenceStatus = body.status === AWAY_STATUS ? AWAY_STATUS : ONLINE_STATUS;

    let updated = false;
    if (userId) {
      updated = await updateUserPresenceById(userId, presenceStatus);
    }

    if (!updated && email) {
      updated = await updateUserPresenceByEmail(email, presenceStatus);
    }

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/user/heartbeat]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
