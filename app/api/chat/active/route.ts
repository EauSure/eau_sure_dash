import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import type { Chat } from '@/lib/models/Chat';
import type { User } from '@/lib/user';

function buildAddress(user: User | null) {
  return user?.address ? [user.address.street, user.address.city, user.address.country].filter(Boolean).join(', ') : '';
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');
    const users = db.collection<User>('users');

    const userId = req.nextUrl.searchParams.get('userId');
    let chat: Chat | null = null;

    if (userId && ObjectId.isValid(userId)) {
      chat = await chats.findOne({ userId: new ObjectId(userId) });
    } else {
      chat = await chats.findOne({ status: { $in: ['active', 'suspended'] } }, { sort: { startedAt: -1, updatedAt: -1 } });
    }

    if (!chat) {
      return NextResponse.json({ chat: null, user: null });
    }

    const user = await users.findOne(
      { _id: chat.userId },
      { projection: { _id: 1, name: 1, email: 1, phone: 1, address: 1, iotNodeCount: 1, status: 1 } }
    );

    return NextResponse.json({
      chat: serializeChat(chat),
      user: user
        ? {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            address: buildAddress(user),
            nodeCount: user.iotNodeCount || 0,
            accountStatus: user.status || 'active',
          }
        : null,
    });
  } catch (error) {
    console.error('[GET /api/chat/active]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}