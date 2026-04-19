import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { Chat } from '@/lib/models/Chat';
import { chatReplySchema } from '@/lib/models/Chat';
import type { User } from '@/lib/user';

function serializeChat(chat: Chat | null) {
  if (!chat) {
    return {
      chatId: null,
      messages: [],
      createdAt: null,
    };
  }

  return {
    chatId: chat._id.toString(),
    messages: chat.messages.map((message) => ({
      role: message.role,
      text: message.text,
      timestamp: new Date(message.timestamp).toISOString(),
    })),
    createdAt: new Date(chat.createdAt).toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatReplySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const userObjectId = ObjectId.isValid(validation.data.userId)
      ? new ObjectId(validation.data.userId)
      : null;

    if (!userObjectId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const now = new Date();
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const users = db.collection<User>('users');
    const chats = db.collection<Chat>('chats');

    const user = await users.findOne({ _id: userObjectId }, { projection: { _id: 1, email: 1 } });
    if (!user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await chats.updateOne(
      { userId: userObjectId },
      {
        $setOnInsert: {
          userId: userObjectId,
          userEmail: user.email,
          createdAt: now,
        },
        $set: {
          userEmail: user.email,
          updatedAt: now,
        },
        $push: {
          messages: {
            role: 'admin',
            text: validation.data.text,
            timestamp: now,
          },
        },
      },
      { upsert: true }
    );

    const chat = await chats.findOne({ userId: userObjectId });
    return NextResponse.json(serializeChat(chat));
  } catch (error) {
    console.error('[POST /api/chat/reply]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
