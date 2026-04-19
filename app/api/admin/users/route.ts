import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

const AWAY_THRESHOLD_MS = 3 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

type PresenceStatus = 'online' | 'away' | 'offline';

type AdminUserDTO = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  iotNodeCount: number;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  presence: {
    status: PresenceStatus;
    lastSeen: string | null;
  };
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function computeStatus(user: User, now: number): PresenceStatus {
  const storedStatus = user.presence?.status;
  if (storedStatus === 'offline') {
    return 'offline';
  }

  const lastSeenValue = user.presence?.lastSeen;
  if (!lastSeenValue) {
    return 'offline';
  }

  const diff = now - new Date(lastSeenValue).getTime();
  if (diff > OFFLINE_THRESHOLD_MS) {
    return 'offline';
  }
  if (diff > AWAY_THRESHOLD_MS) {
    return 'away';
  }

  return storedStatus === 'away' ? 'away' : 'online';
}

function toAdminUserDTO(user: User, now: number): AdminUserDTO {
  const lastSeenDate = user.presence?.lastSeen ? new Date(user.presence.lastSeen) : null;
  const status = computeStatus(user, now);

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: typeof user.phone === 'string' ? user.phone : '',
    address: {
      street: user.address?.street || '',
      city: user.address?.city || '',
      country: user.address?.country || '',
    },
    iotNodeCount: typeof user.iotNodeCount === 'number' ? user.iotNodeCount : 0,
    role: user.role === 'admin' ? 'admin' : 'user',
    status: user.status === 'suspended' ? 'suspended' : 'active',
    presence: {
      status,
      lastSeen: lastSeenDate ? lastSeenDate.toISOString() : null,
    },
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const users = await db
      .collection<User>('users')
      .find(
        {},
        {
          projection: {
            password: 0,
            resetToken: 0,
            resetTokenExpiry: 0,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const now = Date.now();
    return NextResponse.json(users.map((user) => toAdminUserDTO(user, now)));
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
