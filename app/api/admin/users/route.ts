import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

const ONLINE_THRESHOLD_MS = 60_000;

type AdminUserDTO = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  isOnline: boolean;
  lastSeen: string | null;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function toAdminUserDTO(user: User, now: number): AdminUserDTO {
  const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
  const isOnline =
    user.isOnline === true &&
    !!lastSeenDate &&
    now - lastSeenDate.getTime() < ONLINE_THRESHOLD_MS;

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
    status: user.status === 'suspended' ? 'suspended' : 'active',
    isOnline,
    lastSeen: lastSeenDate ? lastSeenDate.toISOString() : null,
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
