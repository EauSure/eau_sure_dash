import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { getRequestAuthContext } from '@/lib/server-auth';
import type { User } from '@/lib/user';

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await getRequestAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const users = db.collection<User>('users');

    const now = Date.now();
    const onlineThreshold = new Date(now - OFFLINE_THRESHOLD_MS);

    // Keep presence status consistent with time thresholds to avoid stale online states.
    await users.updateMany(
      {
        'presence.status': { $in: ['online', 'away'] },
        $or: [
          { 'presence.lastSeen': { $lt: onlineThreshold } },
          { 'presence.lastSeen': null },
          { 'presence.lastSeen': { $exists: false } },
        ],
      },
      {
        $set: {
          'presence.status': 'offline',
          updatedAt: new Date(),
        },
      }
    );

    const admin = await users.findOne(
      {
        role: 'admin',
        status: 'active',
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