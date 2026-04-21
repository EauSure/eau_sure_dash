import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import { requireOperatorContext } from '@/lib/server-auth';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';
import { chatRequestSchema } from '@/lib/models/Chat';

export async function POST(req: NextRequest) {
  const auth = await requireOperatorContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentUser = await getUserByEmail(auth.email);
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatRequestSchema.safeParse(body);
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

    const existingChat = await chats.findOne({ userId: currentUser._id });
    if (existingChat && ['waiting', 'active', 'suspended'].includes(existingChat.status)) {
      return NextResponse.json({ error: 'Chat already in progress' }, { status: 409 });
    }

    await chats.updateOne(
      { userId: currentUser._id },
      {
        $setOnInsert: {
          userId: currentUser._id,
          userEmail: currentUser.email,
          createdAt: now,
          messages: [],
        },
        $set: {
          userEmail: currentUser.email,
          status: 'waiting',
          reason: validation.data.reason,
          startedAt: null,
          endedAt: null,
          suspendedBy: null,
          operatorTyping: null,
          adminTyping: null,
          messages: [],
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    const chat = await chats.findOne({ userId: currentUser._id });
    return NextResponse.json(serializeChat(chat));
  } catch (error) {
    console.error('[POST /api/chat/request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
