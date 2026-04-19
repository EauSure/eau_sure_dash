import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

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

    const now = Date.now();
    const onlineThreshold = new Date(now - OFFLINE_THRESHOLD_MS);

    const admin = await users.findOne(
      {
        role: 'admin',
        'presence.lastSeen': { $gte: onlineThreshold },
        'presence.status': { $in: ['online', 'away'] },
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