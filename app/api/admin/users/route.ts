import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

type AdminUserDTO = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function toAdminUserDTO(user: User): AdminUserDTO {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
    status: user.status === 'suspended' ? 'suspended' : 'active',
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

    return NextResponse.json(users.map(toAdminUserDTO));
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
