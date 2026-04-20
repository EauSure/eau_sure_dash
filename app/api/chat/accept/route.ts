import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import type { Chat } from '@/lib/models/Chat';
import { chatAcceptSchema } from '@/lib/models/Chat';
import { requireAdminContext } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatAcceptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(validation.data.userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const userObjectId = new ObjectId(validation.data.userId);
    const now = new Date();
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');

    const chat = await chats.findOne({ userId: userObjectId });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.status !== 'waiting') {
      return NextResponse.json({ error: 'Chat is not waiting' }, { status: 409 });
    }

    await chats.updateOne(
      { _id: chat._id },
      {
        $set: {
          status: 'active',
          startedAt: now,
          endedAt: null,
          suspendedBy: null,
          updatedAt: now,
        },
      }
    );

    const updatedChat = await chats.findOne({ _id: chat._id });
    return NextResponse.json({ chat: serializeChat(updatedChat) });
  } catch (error) {
    console.error('[POST /api/chat/accept]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}