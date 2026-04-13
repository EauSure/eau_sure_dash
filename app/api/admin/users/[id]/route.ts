import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { User } from '@/lib/user';

const allowedRoles = ['admin', 'operator'] as const;
const allowedStatuses = ['active', 'suspended'] as const;

type PatchBody = {
  role?: (typeof allowedRoles)[number];
  status?: (typeof allowedStatuses)[number];
};

function parseObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const objectId = parseObjectId(id);

    if (!objectId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;
    const role = body.role;
    const status = body.status;

    if (!role && !status) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const users = db.collection<User>('users');

    const target = await users.findOne({ _id: objectId });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (token.email && target.email === token.email) {
      return NextResponse.json(
        { error: 'You cannot modify your own account' },
        { status: 400 }
      );
    }

    const updates: Partial<User> = {
      updatedAt: new Date(),
    };

    if (role) {
      updates.role = role === 'admin' ? 'admin' : 'user';
    }

    if (status) {
      updates.status = status;
    }

    await users.updateOne(
      { _id: objectId },
      {
        $set: updates,
      }
    );

    const updatedUser = await users.findOne(
      { _id: objectId },
      {
        projection: {
          password: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
        },
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedUser,
      _id: updatedUser._id.toString(),
      role: updatedUser.role === 'admin' ? 'admin' : 'user',
      status: updatedUser.status === 'suspended' ? 'suspended' : 'active',
    });
  } catch (err) {
    console.error('[PATCH /api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const objectId = parseObjectId(id);

    if (!objectId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const users = db.collection<User>('users');

    const target = await users.findOne({ _id: objectId });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (token.email && target.email === token.email) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    await users.deleteOne({ _id: objectId });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
