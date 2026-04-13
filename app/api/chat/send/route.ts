import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';
import { chatSendSchema } from '@/lib/models/Chat';

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
  const email = typeof token?.email === 'string' ? token.email : null;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getUserByEmail(email);
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const validation = chatSendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const now = new Date();
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');

    await chats.updateOne(
      { userId: currentUser._id },
      {
        $setOnInsert: {
          userId: currentUser._id,
          userEmail: currentUser.email,
          createdAt: now,
          messages: [],
        },
        $push: {
          messages: {
            role: 'user',
            text: validation.data.text,
            timestamp: now,
          },
        },
      },
      { upsert: true }
    );

    const chat = await chats.findOne({ userId: currentUser._id });

    return NextResponse.json(serializeChat(chat));
  } catch (error) {
    console.error('[POST /api/chat/send]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}