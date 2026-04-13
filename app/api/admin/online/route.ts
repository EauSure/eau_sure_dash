import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

const ONLINE_WINDOW_MS = 60_000;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === 'string' ? token.email : null;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const users = db.collection<User>('users');

    const onlineThreshold = new Date(Date.now() - ONLINE_WINDOW_MS);

    const admin = await users.findOne(
      {
        role: 'admin',
        isOnline: true,
        lastSeen: { $gte: onlineThreshold },
      },
      {
        projection: { _id: 1 },
      }
    );

    if (!admin) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('[GET /api/admin/online]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}