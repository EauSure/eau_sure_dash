import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { updateUserPresenceByEmail } from '@/lib/user';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === 'string' ? token.email : null;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await updateUserPresenceByEmail(email, true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/user/heartbeat]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
