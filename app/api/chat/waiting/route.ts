import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { requireAdminContext } from '@/lib/server-auth';
import type { Chat } from '@/lib/models/Chat';
import type { User } from '@/lib/user';

type WaitingChat = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  nodeCount: number;
  accountStatus: string;
  reason: string;
  status: Chat['status'];
  createdAt: string;
  waitTimeSeconds: number;
};

export async function GET(req: NextRequest) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');
    const users = db.collection<User>('users');

    const waitingChats = await chats.find({ status: 'waiting' }).sort({ createdAt: 1 }).toArray();
    const userIds = waitingChats.map((chat) => chat.userId).filter((id): id is ObjectId => id instanceof ObjectId);
    const userDocs = userIds.length
      ? await users
          .find(
            { _id: { $in: userIds } },
            { projection: { _id: 1, name: 1, email: 1, phone: 1, address: 1, iotNodeCount: 1, status: 1 } }
          )
          .toArray()
      : [];

    const userById = new Map(userDocs.map((user) => [user._id.toString(), user]));
    const now = Date.now();

    const waitingUsers: WaitingChat[] = waitingChats.map((chat) => {
      const user = userById.get(chat.userId.toString());
      const address = user?.address
        ? typeof user.address === 'string'
          ? user.address
          : [user.address.street, user.address.city, user.address.country].filter(Boolean).join(', ')
        : '';

      return {
        userId: chat.userId.toString(),
        name: user?.name || chat.userEmail,
        email: user?.email || chat.userEmail,
        phone: user?.phone || '',
        address,
        nodeCount: user?.iotNodeCount || 0,
        accountStatus: user?.status || 'active',
        reason: chat.reason,
        status: chat.status,
        createdAt: new Date(chat.createdAt).toISOString(),
        waitTimeSeconds: Math.max(0, Math.floor((now - new Date(chat.createdAt).getTime()) / 1000)),
      };
    });

    return NextResponse.json({ waitingUsers });
  } catch (error) {
    console.error('[GET /api/chat/waiting]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
