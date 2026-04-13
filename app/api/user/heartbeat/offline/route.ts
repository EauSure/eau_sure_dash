import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { updateUserPresenceByEmail } from '@/lib/user';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === 'string' ? token.email : null;

  if (!email) {
    return new Response(null, { status: 204 });
  }

  try {
    await updateUserPresenceByEmail(email, false);
  } catch (error) {
    console.error('[POST /api/user/heartbeat/offline]', error);
  }

  return new Response(null, { status: 204 });
}
